<?php

namespace MediaWiki\Extension\WikiLambda\API;

use ApiBase;
use FormatJson;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\ServerException;
use MediaWiki\Extension\WikiLambda\OrchestratorRequest;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\MediaWikiServices;
use PoolCounterWorkViaCallback;
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
abstract class WikiLambdaApiBase extends ApiBase {

	/** @var OrchestratorRequest */
	protected $orchestrator;

	/** @var string */
	protected $orchestratorHost;

	protected function setUpOrchestrator() {
		$config = MediaWikiServices::getInstance()->getConfigFactory()->makeConfig( 'WikiLambda' );
		$this->orchestratorHost = $config->get( 'WikiLambdaOrchestratorLocation' );
		$client = new Client( [ "base_uri" => $this->orchestratorHost ] );
		$this->orchestrator = new OrchestratorRequest( $client );
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
	 * @param ZFunctionCall $zObject
	 * @param bool $validate
	 * @return ZResponseEnvelope
	 */
	protected function executeFunctionCall( $zObject, $validate ) {
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

			$responseContents = FormatJson::decode( $response->getBody()->getContents() );
			$responseObject = ZObjectFactory::create( $responseContents );
			'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope $responseObject';
			return $responseObject;
		} catch ( ConnectException $exception ) {
			$this->dieWithError( [ "apierror-wikilambda_function_call-not-connected", $this->orchestratorHost ] );
		} catch ( ClientException | ServerException $exception ) {
			if ( $exception->getResponse()->getStatusCode() === 404 ) {
				$this->dieWithError( [ "apierror-wikilambda_function_call-not-connected", $this->orchestratorHost ] );
			}
			$zErrorObject = ApiFunctionCall::wrapMessageInZError(
				$exception->getResponse()->getReasonPhrase(),
				$zObject
			);
			$zResponseMap = ZResponseEnvelope::wrapErrorInResponseMap( $zErrorObject );
			return new ZResponseEnvelope( null, $zResponseMap );
		} catch ( \Exception $exception ) {
			$zErrorObject = ApiFunctionCall::wrapMessageInZError(
				$exception->getMessage(),
				$zObject
			);
			$zResponseMap = ZResponseEnvelope::wrapErrorInResponseMap( $zErrorObject );
			return new ZResponseEnvelope( null, $zResponseMap );
		}
	}

}
