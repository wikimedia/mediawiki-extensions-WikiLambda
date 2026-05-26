<?php

namespace MediaWiki\Extension\WikiLambda\ActionAPI;

use MediaWiki\Api\ApiBase;
use MediaWiki\Api\ApiMain;
use MediaWiki\Api\ApiUsageException;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\OrchestratorException;
use MediaWiki\Extension\WikiLambda\OrchestratorRequest;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\PoolCounter\PoolCounterWorkViaCallback;
use MediaWiki\Status\Status;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerInterface;
use stdClass;
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

	protected LoggerInterface $logger;
	protected ?OrchestratorRequest $orchestrator;

	public const FUNCTIONCALL_POOL_COUNTER_TYPE = 'WikiLambdaFunctionCall';
	public const INSTRUMENT_NAME = 'WikiLambdaApi';
	public const SCHEMA_ID = '/analytics/mediawiki/product_metrics/wikilambda/api/2.0.0';

	public function __construct(
		ApiMain $mainModule,
		string $moduleName,
		string $modulePrefix = '',
		protected readonly bool $isPublicApi = false
	) {
		parent::__construct( $mainModule, $moduleName, $modulePrefix );
	}

	/**
	 * @param ?OrchestratorRequest $orchestrator
	 */
	protected function setUp( ?OrchestratorRequest $orchestrator = null ): void {
		$this->setLogger( LoggerFactory::getInstance( 'WikiLambda' ) );
		$this->orchestrator = $orchestrator;
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
	 * @throws ApiUsageException
	 */
	public static function dieWithZError( $zerror, $code = HttpStatus::BAD_REQUEST ): never {
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
	 * @param ZFunctionCall|stdClass $zObject - Function call, either canonical or normal form.
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

		// Initial LOG: request and flags
		$this->getLogger()->debug( __METHOD__ . ' called', [
			'request' => $zObjectAsString,
			'validate' => $validate,
			'bypassCache' => $bypassCache,
		] );

		// 1. Check that input ZObject is a (normal or canonical) Z7/Function Call
		// Exit with failed response if zObject is:
		// * null, a string, not an object, doesn't have Z1K1 or Z1K1 is not Z7
		if ( !ZObjectUtils::isFunctionCall( $zObjectAsStdClass ) ) {
			$this->failWithTypeMismatch( $zObjectAsStdClass );
		}

		// 2. Check that the user has the appropriate permissions to run the function call
		// 2.a. User can execute functions from public or internal API
		$executionRight = $this->isPublicApi ? 'wikifunctions-run' : 'wikilambda-execute';
		if ( !$userAuthority->isAllowed( $executionRight ) ) {
			$this->failWithPermissionDenied( $executionRight, $zObjectAsStdClass );
		}

		// 2.b. If user is trying to run unsaved code (a literal function with a literal implementation)
		// from the internal API, check for special right. From public API, always deny.
		if ( $isUnsavedCode &&
			( $this->isPublicApi || !$userAuthority->isAllowed( 'wikilambda-execute-unsaved-code' ) ) ) {
			$this->failWithPermissionDenied( 'wikilambda-execute-unsaved-code', $zObjectAsStdClass );
		}

		// 2.c. User can bypass the cache if flag bypassCache is true
		if ( $bypassCache && !$userAuthority->isAllowed( 'wikilambda-bypass-cache' ) ) {
			$this->failWithPermissionDenied( 'wikilambda-bypass-cache', $zObjectAsStdClass );
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
				'error' => function ( Status $status ) use ( $queryArguments, $userName, $method ): never {
					$this->getLogger()->info(
						'{method} rejected {caller} request due to too many requests from source "{user}"',
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

		} catch ( OrchestratorException $exception ) {
			// OrchestratorException can contain:
			// * ConnectException: thrown when networking error
			// * TooManyRedirectsException: in case of too many redirects are followed.
			// See: https://docs.guzzlephp.org/en/stable/quickstart.html#exceptions
			$this->getLogger()->error(
				__METHOD__ . ' failed to execute. {reason}: {exception}',
				[
					'reason' => $exception->getPrevious()->getMessage(),
					'request' => $zObjectAsString,
					'exception' => $exception,
				]
			);

			// One ZError to rule them all: Connection Failure
			$zError = ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_CONNECTION_FAILURE,
				[ 'host' => $this->orchestrator->getHost() ]
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
		// if TestKitchen isn't enabled, this will be a no-op.
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
	protected function submitMetricsEvent( $action, $eventData ): void {
		$services = MediaWikiServices::getInstance();
		if ( $services->hasService( 'TestKitchen.InstrumentManager' ) ) {
			$instrumentManager = $services->getService( 'TestKitchen.InstrumentManager' );
			$instrument = $instrumentManager->getInstrument( self::INSTRUMENT_NAME );
			$instrument->setSchema( self::SCHEMA_ID );
			$instrument->send( $action, $eventData );
		}
	}

	/**
	 * Determines whether the input function call might execute unsaved code.
	 *
	 * To do this, we look at the function called by the function call (Z7K1)
	 * and, if the function is a literal, we explore its implementations.
	 * If any of the implementations is a literal, we consider it unsaved
	 * code, unless it's implementing Run Abstract Fragment/Z825 function.
	 *
	 * TODO figure out a better way to allow execution of fragments, which
	 * are unsaved code in the strict sense, but should be allowed to run:
	 * * E.g. if the implementation is literal, but is a composition, we can
	 *   allow it, but if any nested implementation has code, we should stop it.
	 * * E.g. if the literal implementation implements Z825, but does it by
	 *   a code implementation, we should mark it as unsaved code.
	 *
	 * @param stdClass $functionCall
	 * @return bool
	 */
	protected function hasUnsavedCode( $functionCall ): bool {
		// If function is not an object, no danger; exit early
		if (
			!property_exists( $functionCall, ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION ) ||
			!is_object( $functionCall->{ ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION } )
		) {
			return false;
		}

		$function = $functionCall->{ ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION };

		// If function has no implementations, no danger; exit early
		if (
			!property_exists( $function, ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS ) ||
			count( $function->{ ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS } ) <= 1
		) {
			return false;
		}

		$implementations = $function->{ ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS };

		// We loop through all implementations for a chance of unsaved code;
		// the orchestrator will try them in order, and if it finds a non valid
		// implementation, it will continue with the next, making it possible to
		// bypass this security check if we only checked for the first.
		foreach ( array_slice( $implementations, 1 ) as $implementation ) {
			// If implementation is a zid, no danger; continue
			if ( !is_object( $implementation ) ) {
				continue;
			}

			// If implementation is a literal, danger! mark as unsaved code,
			// except when implementing Run Abstract Fragment/Z825 function.
			if (
				property_exists( $implementation, ZTypeRegistry::Z_IMPLEMENTATION_FUNCTION ) &&
				$implementation->{ ZTypeRegistry::Z_IMPLEMENTATION_FUNCTION } !== ZTypeRegistry::Z_RUN_ABSTRACT_FRAGMENT
			) {
				return true;
			}
		}

		// All checks passed, no danger
		return false;
	}

	/**
	 * @param stdClass $zobject
	 * @throws ApiUsageException
	 */
	protected function failWithTypeMismatch( $zobject ): never {
		// Failure Level #1: Bad Request, return Z22/Response Envalope with error
		$this->getLogger()->info(
			__METHOD__ . ' prevented from executing request "{request}" for user "{user}", not a valid Z7',
			[
				'request' => json_encode( $zobject ),
				'user' => $this->getUser()->getName(),
			]
		);

		$zError = ZErrorFactory::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_OBJECT_TYPE_MISMATCH,
			[
				'expected' => ZTypeRegistry::Z_FUNCTIONCALL,
				'actual' => $zobject
			]
		);
		self::dieWithZError( $zError, HttpStatus::BAD_REQUEST );
	}

	/**
	 * @param string $right
	 * @param stdClass $zobject
	 * @throws ApiUsageException
	 */
	protected function failWithPermissionDenied( $right, $zobject ): never {
		$action = $this->msg( "action-$right" )->text();

		// Failure Level #3: Execution is forbidden, die with error
		$this->getLogger()->info(
			__METHOD__ . ' prevented from executing, user "{user}" is not allowed to {action}',
			[
				'request' => $zobject,
				'right' => $right,
				'action' => $action,
				'user' => $this->getUser()->getName(),
			]
		);

		$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN, [] );
		self::dieWithZError( $zError, HttpStatus::FORBIDDEN );
	}
}
