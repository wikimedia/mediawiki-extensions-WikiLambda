<?php

namespace MediaWiki\Extension\WikiLambda\ActionAPI;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\ServerException;
use MediaWiki\Api\ApiBase;
use MediaWiki\Api\ApiUsageException;
use MediaWiki\Extension\EventLogging\EventLogging;
use MediaWiki\Extension\WikiLambda\OrchestratorRequest;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Tests\Integration\MockOrchestratorRequest;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\Json\FormatJson;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\PoolCounter\PoolCounterWorkViaCallback;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\Status\Status;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerInterface;
use Wikimedia\RequestTimeout\RequestTimeoutException;

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

	public const FUNCTIONCALL_POOL_COUNTER_TYPE = 'WikiLambdaFunctionCall';

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
		// Exit if we're running in non-repo mode (e.g. on a client wiki)
		if ( !$this->getConfig()->get( 'WikiLambdaEnableRepoMode' ) ) {
			self::dieWithZError(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN,
					[]
				),
				501
			);
		}

		$this->run();
	}

	/**
	 * @inheritDoc
	 */
	protected function run() {
		// Throw, not implemented
		self::dieWithZError(
			ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
				[ 'You must implement your run() method when using WikiLambdaApiBase' ]
			),
			501
		);
	}

	/**
	 * @param ZError $zerror The ZError object to return to the user
	 * @param int $code HTTP error code, defaulting to 400/Bad Request
	 * @return never
	 */
	public static function dieWithZError( $zerror, $code = 400 ) {
		try {
			$errorData = $zerror->getErrorData();
		} catch ( ZErrorException $e ) {
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
	 * @param string $errorMessage
	 * @param string $zFunctionCallString
	 * @return ZResponseEnvelope
	 */
	private function returnWithZError( $errorMessage, $zFunctionCallString ): ZResponseEnvelope {
		$zErrorObject = ZErrorFactory::wrapMessageInZError(
			$errorMessage,
			$zFunctionCallString
		);
		$zResponseMap = ZResponseEnvelope::wrapErrorInResponseMap( $zErrorObject );
		return new ZResponseEnvelope( null, $zResponseMap );
	}

	/**
	 * @param ZFunctionCall|\stdClass $zObject
	 * @param bool $validate
	 * @return ZResponseEnvelope
	 */
	protected function executeFunctionCall( $zObject, $validate ) {
		$zObjectAsStdClass = ( $zObject instanceof ZFunctionCall ) ? $zObject->getSerialized() : $zObject;
		$zObjectAsString = json_encode( $zObjectAsStdClass );

		if ( $zObjectAsStdClass->Z1K1 !== 'Z7' && $zObjectAsStdClass->Z1K1->Z9K1 !== 'Z7' ) {
			$this->getLogger()->info(
				__METHOD__ . ' prevented from executing request "{request}" for user "{user}", not a valid Z7',
				[
					'request' => $zObjectAsString,
					'user' => $this->getContext()->getAuthority()->getUser()->getName(),
				]
			);
			$this->dieWithError( [ "apierror-wikilambda_function_call-not-a-function" ], null, null, 400 );
		}

		$this->getLogger()->debug(
			__METHOD__ . ' called',
			[
				'request' => $zObjectAsString,
				'validate' => $validate,
			]
		);

		// Unlike the Special pages, we don't have a helpful userCanExecute() method
		if ( !$this->getContext()->getAuthority()->isAllowed( 'wikilambda-execute' ) ) {
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN, [] );
			$this->getLogger()->info(
				__METHOD__ . ' prevented from executing for user "{user}", user not allowed',
				[
					'request' => $zObjectAsString,
					'user' => $this->getContext()->getAuthority()->getUser()->getName(),
				]
			);
			self::dieWithZError( $zError, 403 );
		}

		$queryArguments = [
			'zobject' => $zObjectAsStdClass,
			'doValidate' => $validate
		];
		try {
			$work = new PoolCounterWorkViaCallback(
				self::FUNCTIONCALL_POOL_COUNTER_TYPE,
				$this->getUser()->getName(),
				[
					'doWork' => function () use ( $queryArguments ) {
						return $this->orchestrator->orchestrate( $queryArguments );
					},
					'error' => function ( Status $status ) {
						$this->dieWithError(
							[ "apierror-wikilambda_function_call-concurrency-limit" ],
							null, null, 429
						);
					}
				]
			);
			$response = $work->execute();

			$this->getLogger()->debug(
				__METHOD__ . ' executed successfully',
				[
					'request' => $zObjectAsString,
					'response' => $response,
				]
			);

			$responseContents = FormatJson::decode( $response );

			try {
				$responseObject = ZObjectFactory::create( $responseContents );
			} catch ( ZErrorException $e ) {
				$this->getLogger()->error(
					__METHOD__ . ' failed to execute, server response error: {exception}',
					[
						'request' => $zObjectAsString,
						'response' => $response,
						'exception' => $e,
					]
				);

				$this->dieWithError(
					[
						'apierror-wikilambda_function_call-response-malformed',
						$e->getZErrorMessage()
					],
					null, null, 500
				);
			}
			'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope $responseObject';
			return $responseObject;
		} catch ( ConnectException $exception ) {
			$this->getLogger()->error(
				__METHOD__ . ' failed to execute, server connection error: {exception}',
				[
					'request' => $zObjectAsString,
					'exception' => $exception,
				]
			);
			$this->dieWithError(
				[ "apierror-wikilambda_function_call-not-connected", $this->orchestratorHost ],
				null, null, 503
			);
		} catch ( ClientException | ServerException $exception ) {
			if ( $exception->getResponse()->getStatusCode() === 404 ) {
				$this->getLogger()->error(
					__METHOD__ . ' failed to execute, server not found error: {exception}',
					[
						'request' => $zObjectAsString,
						'exception' => $exception,
					]
				);
				$this->dieWithError(
					[ "apierror-wikilambda_function_call-not-connected", $this->orchestratorHost ],
					null, null, 503
				);
			}

			$this->getLogger()->error(
				__METHOD__ . ' failed to execute with a ClientException/ServerException: {exception}',
				[
					'request' => $zObjectAsString,
					'exception' => $exception,
				]
			);

			return $this->returnWithZError(
				$exception->getResponse()->getReasonPhrase(),
				$zObjectAsString
			);
		} catch ( RequestTimeoutException $exception ) {
			$this->getLogger()->warning(
				__METHOD__ . ' failed to execute with a RequestTimeoutException: {exception}',
				[
					'request' => $zObjectAsString,
					'exception' => $exception,
				]
			);

			return $this->returnWithZError(
				$exception->getMessage(),
				$zObjectAsString
			);
		} catch ( ApiUsageException $exception ) {
			// This is almost certainly a user-limit-error, and not worth worrying in the middleware
			// about, so only log as debug() not warning()
			$this->getLogger()->debug(
				__METHOD__ . ' failed to execute with a ApiUsageException: {exception}',
				[
					'request' => $zObjectAsString,
					'exception' => $exception,
				]
			);

			return $this->returnWithZError(
				$exception->getMessage(),
				$zObjectAsString
			);
		} catch ( ZErrorException $exception ) {
			// This is almost certainly a user-error, and not worth worrying in the middleware
			// about, so only log as debug() not warning()
			$this->getLogger()->debug(
				__METHOD__ . ' failed to execute with a ZErrorException: {exception}',
				[
					'request' => $zObjectAsString,
					'exception' => $exception,
				]
			);

			return $this->returnWithZError(
				$exception->getZErrorMessage(),
				$zObjectAsString
			);
		} catch ( \Exception $exception ) {

			$this->getLogger()->warning(
				__METHOD__ . ' failed to execute with a general Exception: {exception}',
				[
					'request' => $zObjectAsString,
					'exception' => $exception,
				]
			);

			return $this->returnWithZError(
				$exception->getMessage(),
				$zObjectAsString
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
	 * @param string $action An arbitrary string describing what's being recorded
	 * @param array $eventData Key-value pairs stating various characteristics of the action;
	 *  these must conform to the specified schema.
	 */
	public function submitMetricsEvent( $action, $eventData ) {
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
