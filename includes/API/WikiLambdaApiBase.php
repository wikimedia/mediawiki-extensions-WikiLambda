<?php

namespace MediaWiki\Extension\WikiLambda\API;

use ApiBase;
use ApiUsageException;
use FormatJson;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\ServerException;
use MediaWiki\Extension\WikiLambda\OrchestratorRequest;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\Status\Status;
use PoolCounterWorkViaCallback;
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

	/** @var OrchestratorRequest */
	protected $orchestrator;

	/** @var string */
	protected $orchestratorHost;

	/** @var LoggerInterface */
	protected $logger;

	protected function setUp() {
		$this->setLogger( LoggerFactory::getInstance( 'WikiLambda' ) );

		$services = MediaWikiServices::getInstance();

		$config = $services->getConfigFactory()->makeConfig( 'WikiLambda' );
		$this->orchestratorHost = $config->get( 'WikiLambdaOrchestratorLocation' );
		$client = new Client( [ "base_uri" => $this->orchestratorHost ] );
		$this->orchestrator = new OrchestratorRequest( $client );
	}

	/**
	 * @param ZError $zerror
	 */
	public function dieWithZError( $zerror ) {
		try {
			$errorData = $zerror->getErrorData();
		} catch ( ZErrorException $e ) {
			// Generating the human-readable error data itself threw. Oh dear.
			$this->getLogger()->warning(
				__METHOD__ . ' called but an error was thrown when trying to report an error',
				[
					'zerror' => $zerror->getSerialized(),
					'error' => $e,
				]
			);

			$errorData = [
				'zerror' => $zerror->getSerialized()
			];
		}

		parent::dieWithError(
			[ 'wikilambda-zerror', $zerror->getZErrorType() ],
			null,
			$errorData
		);
	}

	/**
	 * @param string $errorMessage
	 * @param string $zFunctionCallString
	 * @return ZResponseEnvelope
	 */
	private function returnWithZError( $errorMessage, $zFunctionCallString ): ZResponseEnvelope {
		$zErrorObject = ApiFunctionCall::wrapMessageInZError(
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
			$this->dieWithError( [ "apierror-wikilambda_function_call-not-a-function" ] );
		}

		$this->getLogger()->debug(
			__METHOD__ . ' called',
			[
				'zObject' => $zObjectAsString,
				'validate' => $validate,
			]
		);

		// Unlike the Special pages, we don't have a helpful userCanExecute() method
		if ( !$this->getContext()->getAuthority()->isAllowed( 'wikilambda-execute' ) ) {
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN, [] );
			$this->dieWithZError( $zError );
		}

		$queryArguments = [
			'zobject' => $zObjectAsStdClass,
			'doValidate' => $validate
		];
		try {
			$work = new PoolCounterWorkViaCallback(
				'WikiLambdaFunctionCall',
				$this->getUser()->getName(),
				[
					'doWork' => function () use ( $queryArguments ) {
						return $this->orchestrator->orchestrate( $queryArguments );
					},
					'error' => function ( Status $status ) {
						$this->dieWithError( [ "apierror-wikilambda_function_call-concurrency-limit" ] );
					}
				]
			);
			$response = $work->execute();

			$this->getLogger()->debug(
				__METHOD__ . ' executed successfully',
				[
					'zObject' => $zObjectAsString,
					'validate' => $validate,
					'response' => $response,
				]
			);

			$responseContents = FormatJson::decode( $response );

			try {
				$responseObject = ZObjectFactory::create( $responseContents );
			} catch ( ZErrorException $e ) {
				$this->dieWithError( [
					'apierror-wikilambda_function_call-response-malformed',
					$e->getZErrorMessage()
				] );
			}
			'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope $responseObject';
			return $responseObject;
		} catch ( ConnectException $exception ) {
			$this->dieWithError( [ "apierror-wikilambda_function_call-not-connected", $this->orchestratorHost ] );
		} catch ( ClientException | ServerException $exception ) {
			if ( $exception->getResponse()->getStatusCode() === 404 ) {
				$this->dieWithError( [ "apierror-wikilambda_function_call-not-connected", $this->orchestratorHost ] );
			}

			$this->getLogger()->warning(
				__METHOD__ . ' failed to execute with a ClientException/ServerException: {exception}',
				[
					'zObject' => $zObjectAsString,
					'validate' => $validate,
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
					'zObject' => $zObjectAsString,
					'validate' => $validate,
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
					'zObject' => $zObjectAsString,
					'validate' => $validate,
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
					'zObject' => $zObjectAsString,
					'validate' => $validate,
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
					'zObject' => $zObjectAsString,
					'validate' => $validate,
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
	public function setLogger( LoggerInterface $logger ) {
		$this->logger = $logger;
	}

	/** @inheritDoc */
	public function getLogger() {
		return $this->logger;
	}
}
