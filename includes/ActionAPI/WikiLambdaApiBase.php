<?php

namespace MediaWiki\Extension\WikiLambda\ActionAPI;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Exception\TooManyRedirectsException;
use JsonException;
use MediaWiki\Api\ApiBase;
use MediaWiki\Api\ApiMain;
use MediaWiki\Api\ApiUsageException;
use MediaWiki\Extension\EventLogging\EventLogging;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\OrchestratorRequest;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\Tests\Integration\MockOrchestratorRequest;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\PoolCounter\PoolCounterWorkViaCallback;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\Status\Status;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerInterface;
use Wikimedia\RequestTimeout\TimeoutException;

/**
 * WikiLambda Base API util
 *
 * This abstract class extends the Wikimedia's ApiBase class
 * and provides specific additional methods.
 *
 * @stable to extend
 *
 * @ingroup API
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
abstract class WikiLambdaApiBase extends ApiBase implements LoggerAwareInterface {

	protected OrchestratorRequest $orchestrator;
	protected string $orchestratorHost;
	protected LoggerInterface $logger;
	protected bool $isPublicApi;

	public const FUNCTIONCALL_POOL_COUNTER_TYPE = 'WikiLambdaFunctionCall';

	public function __construct(
		ApiMain $mainModule,
		string $moduleName,
		string $modulePrefix = '',
		bool $isPublicApi = false
	) {
		parent::__construct( $mainModule, $moduleName, $modulePrefix );

		$this->isPublicApi = $isPublicApi;
	}

	protected function setUp() {
		$this->setLogger( LoggerFactory::getInstance( 'WikiLambda' ) );

		// TODO (T330033): Consider injecting this service rather than just fetching from main
		$services = MediaWikiServices::getInstance();

		if ( defined( 'MW_PHPUNIT_TEST' ) ) {
			// Phan is unhappy because, altough it's a sub-class, this is not loaded in prod code.
			// @phan-suppress-next-line PhanTypeMismatchPropertyReal, PhanUndeclaredClassMethod
			$this->orchestrator = new MockOrchestratorRequest();
		} else {
			$config = $services->getConfigFactory()->makeConfig( 'WikiLambda' );
			$this->orchestratorHost = $config->get( 'WikiLambdaOrchestratorLocation' );
			$client = new Client( [ "base_uri" => $this->orchestratorHost ] );
			$this->orchestrator = new OrchestratorRequest( $client );
		}
	}

	/**
	 * @inheritDoc
	 */
	public function execute() {
		if ( !$this->getConfig()->get( 'WikiLambdaEnableRepoMode' ) ) {
			// Failure Level #3: Service is not available in a non-repo mode (e.g. client wiki),
			// die with error (throws ApiUsageException)

			// FIXME: shouldn't we return FORBIDDEN or even NOT_IMPLEMENTED instead of BAD_REQUEST?
			// Train of thought, on multiple-request APIs like perform test, a BAD_REQUEST response
			// means we'll abandon that one and go for the next. but WikiLambdaEnableRepoMode means
			// that's not only a problem of the request, but that this particular service (client api)
			// doesn't allow that kind of request. This feels more like a 403 than a 400
			self::dieWithZError(
				ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN, [] ),
				HttpStatus::BAD_REQUEST
			);
		}

		$this->run();
	}

	/**
	 * @inheritDoc
	 */
	protected function run() {
		// Failure Level #3: Service is not implemented, die with error
		// (throws ApiUsageException)
		self::dieWithZError(
			ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
				[ 'You must implement your run() method when using WikiLambdaApiBase' ]
			),
			HttpStatus::NOT_IMPLEMENTED
		);
	}

	/**
	 * @param ZError $zerror The ZError object to return to the user
	 * @param int $code HTTP error code, defaulting to 400/Bad Request
	 * @return never
	 * @throws ApiUsageException
	 */
	public static function dieWithZError( $zerror, $code = HttpStatus::BAD_REQUEST ) {
		try {
			$errorData = $zerror->getErrorData();
		} catch ( ZErrorException ) {
			$errorData = [
				'zerror' => $zerror->getSerialized()
			];
		}

		// Copied from ApiBase in an ugly way, so that we can be static.
		throw ApiUsageException::newWithMessage(
			null,
			[ 'wikilambda-zerror', $zerror->getZErrorType() ],
			null,
			$errorData,
			$code
		);
	}

	/**
	 * Execute the Function Call passed as parameter.
	 *
	 * The following error handling contract enables the caller APIs to
	 * continue with more calls or exit early as needed:
	 *
	 * * If the orchestrator executes the function call successfully,
	 *   (even if the response contains an error)
	 *   it will return the resulting Response Envelope/Z22 object.
	 *
	 * * Failure Level #1: Request Failure.
	 *   If the orchestrator fails to execute this particular function
	 *   call, it will build and return a failure Response Envelope/Z22 object.
	 *
	 * * Failure Level #2: Temporary Service Failure.
	 *   If the orchestrator fails to execute the function call due to
	 *   service issues that might be temporary, such as:
	 *   * the concurrency limit was reached,
	 *   it will throw an exception so that the caller can decide how to handle it.
	 *
	 * * Failure Level #3: Execution Prohibited.
	 *   If the orchestrator fails to execute the function call due to
	 *   service issues that will make any call impossible, such as:
	 *   * the user doesn't have execute permission,
	 *   * the backend server is not reachable,
	 *   * the service is not implemented or disabled (e.g. client mode),
	 *   it will directly die with error.
	 *
	 * @param ZFunctionCall|\stdClass $zObject - Function call, either canonical or normal form.
	 * @param array $flags - Array with the boolean flags 'validate', 'bypassCache' and 'isUnsavedCode'
	 * @return array - Response from the orchestrator, with the keys 'result' and 'httpStatusCode'
	 * @throws ApiUsageException
	 */
	protected function executeFunctionCall( $zObject, $flags ) {
		// Extract flags and set their default values
		$validate = (bool)( $flags[ 'validate' ] ?? true );
		$bypassCache = (bool)( $flags[ 'bypassCache' ] ?? false );
		$isUnsavedCode = (bool)( $flags[ 'isUnsavedCode' ] ?? false );

		$zObjectAsStdClass = ( $zObject instanceof ZFunctionCall ) ? $zObject->getSerialized() : $zObject;
		$zObjectAsString = json_encode( $zObjectAsStdClass );

		// Get user authority and user name for rights, pool counter and logging
		$userAuthority = $this->getContext()->getAuthority();
		$userName = $userAuthority->getUser()->getName();

		// 1. Check that input ZObject is a (normal or canonical) Z7/Function Call
		// Exit with failed response if zObject is:
		// * null, a string, not an object, doesn't have Z1K1 or Z1K1 is not Z7
		if (
			!is_object( $zObjectAsStdClass ) ||
			!isset( $zObjectAsStdClass->Z1K1 ) ||
			(
				$zObjectAsStdClass->Z1K1 !== 'Z7' &&
				(
					!is_object( $zObjectAsStdClass->Z1K1 ) ||
					$zObjectAsStdClass->Z1K1->Z9K1 !== 'Z7'
				)
			)
		) {
			// Failure Level #1: Bad Request, return Z22/Response Envalope with error
			$this->getLogger()->info(
				__METHOD__ . ' prevented from executing request "{request}" for user "{user}", not a valid Z7',
				[
					'request' => $zObjectAsString,
					'user' => $userName,
				]
			);
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_OBJECT_TYPE_MISMATCH, [
				'expected' => ZTypeRegistry::Z_FUNCTION,
				'actual' => $zObjectAsStdClass
			] );
			self::dieWithZError( $zError, HttpStatus::BAD_REQUEST );
		}

		// LOG: request and flags
		$this->getLogger()->debug(
			__METHOD__ . ' called',
			[
				'request' => $zObjectAsString,
				'validate' => $validate,
				'bypassCache' => $bypassCache
			]
		);

		// 2. Check that the user has the appropriate permissions to run the function call
		// 2.a. User can execute functions from public or internal API
		$executionRight = $this->isPublicApi ? 'wikifunctions-run' : 'wikilambda-execute';
		if ( !$userAuthority->isAllowed( $executionRight ) ) {
			$this->getLogger()->info(
				__METHOD__ . ' prevented from executing for user "{user}", user not allowed',
				[
					'request' => $zObjectAsString,
					'user' => $userName,
				]
			);

			// Failure Level #3: Execution is forbidden, die with error
			// (throws ApiUsageException)
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN, [] );
			self::dieWithZError( $zError, HttpStatus::FORBIDDEN );
		}

		// 2.b. If user is trying to run unsaved code (a literal function with a literal implementation)
		// from the internal API, check for special right. From public API, always deny.
		if (
			$isUnsavedCode &&
			( $this->isPublicApi || !$userAuthority->isAllowed( 'wikilambda-execute-unsaved-code' ) )
		) {
			$this->getLogger()->info(
				__METHOD__ . ' prevented from executing unsaved code for user "{user}", user not allowed',
				[
					'request' => $zObjectAsString,
					'user' => $userName,
				]
			);

			// Failure Level #3: Execution is forbidden, die with error
			// (throws ApiUsageException)
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN, [] );
			self::dieWithZError( $zError, HttpStatus::FORBIDDEN );
		}

		// 2.b. User can bypass the cache if flag bypassCache is true
		if ( $bypassCache && !$userAuthority->isAllowed( 'wikilambda-bypass-cache' ) ) {
			$this->getLogger()->info(
				__METHOD__ . ' prevented from executing with cache bypass for user "{user}", user not allowed',
				[
					'request' => $zObjectAsString,
					'user' => $userName,
				]
			);

			// Failure Level #3: Execution is forbidden, die with error
			// (throws ApiUsageException)
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN, [] );
			self::dieWithZError( $zError, HttpStatus::FORBIDDEN );
		}

		// 3. Call OrchestratorRequest::orchestrate if there are not too many requests
		// being run at the same time by the same user.
		$queryArguments = [
			'zobject' => $zObjectAsStdClass,
			'doValidate' => $validate
		];
		try {
			$method = __METHOD__;
			$work = new PoolCounterWorkViaCallback( self::FUNCTIONCALL_POOL_COUNTER_TYPE, $userName, [
				'doWork' => function () use ( $queryArguments, $bypassCache, $method ) {
					$this->getLogger()->debug(
						'{method} running {caller} request',
						[
							'method' => $method,
							'caller' => static::class,
							'query' => $queryArguments
						]
					);
					return $this->orchestrator->orchestrate( $queryArguments, $bypassCache );
				},
				// Failure Level #2: Execution is temporarily forbidden due to too many requests
				// at once. Throw an exception so that the caller API can handle it as needed.
				// E.g. FunctionCall might want to die with error, while PerformTest will
				// return normally with all those tests that could be run before.
				'error' => function ( Status $status ) use ( $queryArguments, $userName, $method ) {
					$this->getLogger()->info(
						'{ethod} rejected {caller} request due to too many requests from source "{user}"',
						[
							'method' => $method,
							'caller' => static::class,
							'user' => $userName,
							'query' => $queryArguments
						]
					);
					$this->dieWithError(
						[ "apierror-wikilambda_function_call-concurrency-limit" ],
						null, null, HttpStatus::TOO_MANY_REQUESTS
					);
				}
			] );

			$response = $work->execute();

			$this->getLogger()->debug(
				__METHOD__ . ' executed successfully',
				[
					'request' => $zObjectAsString,
					'response' => $response[ 'result' ],
				]
			);

			// 4. Everything went well: return the raw orchestrator response
			// (an array with 'result' and 'httpStatus' keys) so that the caller
			// does whatever they need (e.g. ApiPerformTest will convert it to a
			// response envelope object, while ApiFunctionCall will just track the
			// http status and return the result string without validating it)
			return $response;

		} catch ( ConnectException $exception ) {
			// ConnectException exception is thrown in the event of a networking error.
			// See: https://docs.guzzlephp.org/en/stable/quickstart.html#exceptions

			// Failure Level #3: Service is not available, die with error
			// (throws ApiUsageException)
			$this->getLogger()->error(
				__METHOD__ . ' failed to execute, server connection error: {exception}',
				[
					'request' => $zObjectAsString,
					'exception' => $exception,
				]
			);

			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_CONNECTION_FAILURE,
				[ 'host' => $this->orchestratorHost ]
			);
			self::dieWithZError( $zError, HttpStatus::SERVICE_UNAVAILABLE );

		} catch ( TooManyRedirectsException $exception ) {
			// TooManyRedirectsException is thrown when too many redirects are followed.
			// See: https://docs.guzzlephp.org/en/stable/quickstart.html#exceptions

			// Failure Level #3: Service is not available, die with error
			// (throws ApiUsageException)
			$this->getLogger()->error(
				__METHOD__ . ' failed to execute, too many redirects error: {exception}',
				[
					'request' => $zObjectAsString,
					'exception' => $exception,
				]
			);

			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_CONNECTION_FAILURE,
				[ 'host' => $this->orchestratorHost ]
			);
			self::dieWithZError( $zError, HttpStatus::SERVICE_UNAVAILABLE );

		} catch ( GuzzleException $exception ) {
			// This should not happen, but just in case we ever change http_errors => false to something else
			// See: https://docs.guzzlephp.org/en/stable/quickstart.html#exceptions

			// Failure Level #3: Service is not available as it returned Not Found, die with error
			// (throws ApiUsageException)
			$this->getLogger()->error(
				__METHOD__ . ' failed to execute with an uncaught GuzzleException: {exception}',
				[
					'request' => $zObjectAsString,
					'exception' => $exception,
				]
			);

			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_CONNECTION_FAILURE,
				[ 'host' => $this->orchestratorHost ]
			);
			self::dieWithZError( $zError, HttpStatus::SERVICE_UNAVAILABLE );

		} catch ( TimeoutException $exception ) {
			// An exception generated by the RequestTimeout library.
			// See: https://doc.wikimedia.org/mediawiki-libs-RequestTimeout/master/

			// Failure Level #3: This request timed out, fully end the request
			// (throws ApiUsageException)
			$this->getLogger()->warning(
				__METHOD__ . ' failed to execute with a TimeoutException: {exception}',
				[
					'request' => $zObjectAsString,
					'exception' => $exception,
				]
			);

			$this->dieWithError(
				[ "timeouterror-text", $exception->getLimit() ],
				null, null, HttpStatus::SERVICE_UNAVAILABLE
			);
		}
	}

	/**
	 * Converts a response string into a valid ZResponseEnvelope and
	 * handles all possible errors from the conversion.
	 *
	 * If the response cannot be validated or the response type is
	 * not correct, it builds a new failure Response Envelope/Z22
	 * with the error details in its "errors" key.
	 *
	 * All errors captured and returned in this method will be wrapped
	 * in a Z507/Evaluator error, as they are errors carried by the
	 * response from the orchestrator service.
	 *
	 * This method will NOT throw any exception nor cause the API
	 * to die with error.
	 *
	 * @param string $response The JSON string being decoded
	 * @param string $call The JSON string of the function call
	 * @return ZResponseEnvelope
	 */
	protected function getResponseEnvelope( string $response, string $call ): ZResponseEnvelope {
		// Decode string JSON into stdClass
		try {
			$responseContents = json_decode( $response, false, 512, JSON_THROW_ON_ERROR );
		} catch ( JsonException $e ) {
			$this->getLogger()->error(
				__METHOD__ . ' failed to execute, server response not valid Json: {exception}',
				[
					'request' => $call,
					'response' => $response,
					'exception' => $e,
				]
			);
			// ZError: Invalid JSON returned by the evaluator
			$zErrorJson = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_INVALID_JSON, [
				'message' => $e->getMessage(),
				'data' => $response
			] );
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_EVALUATION, [
				'functionCall' => $call,
				'error' => $zErrorJson
			] );
			return $this->getFailedResponseEnvelope( $zError );
		}

		// Convert stdClass into ZObject by passing it through ZObjectFactory::create
		try {
			$responseObject = ZObjectFactory::create( $responseContents );
		} catch ( ZErrorException $e ) {
			$this->getLogger()->error(
				__METHOD__ . ' failed to execute, server response not wellformed: {exception}',
				[
					'request' => $call,
					'response' => $response,
					'exception' => $e,
				]
			);
			// ZError: Invalid ZObject returned by the evaluator
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_EVALUATION, [
				'functionCall' => $call,
				'error' => $e->getZError()
			] );
			return $this->getFailedResponseEnvelope( $zError );
		}

		// Check that returned object is of the right type
		if ( !( $responseObject instanceof ZResponseEnvelope ) ) {
			$this->getLogger()->error(
				__METHOD__ . ' failed to execute, server response was not a Response Envelope',
				[
					'request' => $call,
					'response' => $response
				]
			);
			// ZError: Invalid ZObject returned by the evaluator
			$zErrorType = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_OBJECT_TYPE_MISMATCH, [
				'expected' => ZTypeRegistry::Z_RESPONSEENVELOPE,
				'actual' => $response
			] );
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_EVALUATION, [
				'functionCall' => $call,
				'error' => $zErrorType
			] );
			return $this->getFailedResponseEnvelope( $zError );
		}

		// Response Envelope returned by the orchestrator is valid!
		return $responseObject;
	}

	/**
	 * Builds and returns a Z22/ResponseEnvelope object wrapping a failure, so:
	 * * Z22K1 is Void/Z24, and
	 * * Z22K2 contains a Map with an "error" key with the given zError object
	 *
	 * @param ZError $zErrorObject
	 * @return ZResponseEnvelope
	 */
	private function getFailedResponseEnvelope( $zErrorObject ): ZResponseEnvelope {
		$zResponseMap = ZResponseEnvelope::wrapErrorInResponseMap( $zErrorObject );
		return new ZResponseEnvelope( null, $zResponseMap );
	}

	/** @inheritDoc */
	public function setLogger( LoggerInterface $logger ): void {
		$this->logger = $logger;
	}

	/** @inheritDoc */
	public function getLogger(): LoggerInterface {
		return $this->logger;
	}

	/**
	 * Constructs and submits a metrics event representing this call.
	 *
	 * @param int $httpStatus
	 * @param string|null $function
	 * @param float $start
	 * @return void
	 */
	protected function submitFunctionCallEvent( $httpStatus, $function, $start ): void {
		$duration = 1000 * ( microtime( true ) - $start );

		// Module name: wikilambda_function_call | wikilambda_run | wikilambda_perform_test
		$action = $this->getModuleName();

		$eventData = [
			'http' => [ 'status_code' => $httpStatus ],
			'total_time_ms' => $duration,
		];
		if ( $function !== null ) {
			$eventData['function'] = $function;
		}

		// This is our submission to the Analytics / metrics system (private data stream);
		// if EventLogging isn't enabled, this will be a no-op.
		$this->submitMetricsEvent( $action, $eventData );

		// (T390548) This is our submission to the Prometheus / SLO system (public data stream).
		// Note: There is already a metric stream provided out-of-the-box from us being part of the Action API,
		// mediawiki_api_executeTiming_seconds{module="wikilambda_function_call",…}, but that does not include
		// the HTTP status code, so we have to track our own.
		MediaWikiServices::getInstance()->getStatsFactory()->withComponent( 'WikiLambda' )
			// Will end up as 'mediawiki.WikiLambda.mw_to_orchestrator_api_call_seconds{status=…}'
			->getTiming( 'mw_to_orchestrator_api_call_seconds' )
			// Note: We intentionally don't log the function here, for cardinality reasons
			->setLabel( 'status', (string)$httpStatus )
			// The "observe" method takes milliseconds.
			->observe( $duration );
	}

	/**
	 * @param string $action An arbitrary string describing what's being recorded
	 * @param array $eventData Key-value pairs stating various characteristics of the action;
	 *  these must conform to the specified schema.
	 * @return void
	 */
	protected function submitMetricsEvent( $action, $eventData ) {
		if ( ExtensionRegistry::getInstance()->isLoaded( 'EventLogging' ) ) {
			EventLogging::getMetricsPlatformClient()->submitInteraction(
				'mediawiki.product_metrics.wikilambda_api',
				'/analytics/mediawiki/product_metrics/wikilambda/api/1.0.0',
				$action,
				$eventData );
		} else {
			$this->getLogger()->debug(
				__METHOD__ . ' unable to submit event; EventLogging not loaded',
				[
					'action' => $action,
					'eventData' => $eventData
				]
			);
		}
	}
}
