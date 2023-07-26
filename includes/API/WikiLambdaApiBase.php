<?php

namespace MediaWiki\Extension\WikiLambda\API;

use ApiBase;
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
use MediaWiki\Permissions\PermissionManager;
use PoolCounterWorkViaCallback;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerInterface;
use Status;

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

	/** @var PermissionManager */
	protected $permissionManager;

	protected function setUp() {
		$this->setLogger( LoggerFactory::getInstance( 'WikiLambda' ) );

		$services = MediaWikiServices::getInstance();

		$config = $services->getConfigFactory()->makeConfig( 'WikiLambda' );
		$this->orchestratorHost = $config->get( 'WikiLambdaOrchestratorLocation' );
		$client = new Client( [ "base_uri" => $this->orchestratorHost ] );
		$this->orchestrator = new OrchestratorRequest( $client );

		$this->permissionManager = $services->getPermissionManager();
	}

	/**
	 * @param ZError $zerror
	 */
	public function dieWithZError( $zerror ) {
		parent::dieWithError(
			[ 'wikilambda-zerror', $zerror->getZErrorType() ],
			null,
			$zerror->getErrorData()
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
	 * @param ZFunctionCall $zObject
	 * @param bool $validate
	 * @return ZResponseEnvelope
	 */
	protected function executeFunctionCall( $zObject, $validate ) {
		$this->getLogger()->debug(
			__METHOD__ . ' called',
			[
				'zObject' => $zObject,
				'validate' => $validate,
			]
		);

		// Unlike the Special pages, we don't have a helpful userCanExecute() method
		if ( !$this->permissionManager->userHasRight( $this->getContext()->getUser(), 'wikilambda-execute' ) ) {
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN, [] );
			$this->dieWithZError( $zError );
		}

		$queryArguments = [
			'zobject' => $zObject->getSerialized(),
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
					'zObject' => $zObject,
					'validate' => $validate,
					'response' => $response,
				]
			);

			$responseContents = FormatJson::decode( $response );
			$responseObject = ZObjectFactory::create( $responseContents );
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
					'zObject' => $zObject,
					'validate' => $validate,
					'exception' => $exception,
				]
			);

			return $this->returnWithZError(
				$exception->getResponse()->getReasonPhrase(),
				$zObject->getSerialized()
			);
		} catch ( ZErrorException $exception ) {
			// This is almost certainly a user-error, and not worth worrying in the middleware
			// about, so only log as debug() not warning()
			$this->getLogger()->debug(
				__METHOD__ . ' failed to execute with a ZErrorException: {exception}',
				[
					'zObject' => $zObject,
					'validate' => $validate,
					'exception' => $exception,
				]
			);

			return $this->returnWithZError(
				$exception->getZErrorMessage(),
				$zObject->getSerialized()
			);
		} catch ( \Exception $exception ) {

			$this->getLogger()->warning(
				__METHOD__ . ' failed to execute with a general Exception: {exception}',
				[
					'zObject' => $zObject,
					'validate' => $validate,
					'exception' => $exception,
				]
			);

			return $this->returnWithZError(
				$exception->getMessage(),
				$zObject->getSerialized()
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
