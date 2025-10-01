<?php
/**
 * WikiLambda function call API
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ActionAPI;

use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\ServerException;
use MediaWiki\Api\ApiMain;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\PoolCounter\PoolCounterWorkViaCallback;
use MediaWiki\Status\Status;

class ApiSupportedProgrammingLanguages extends WikiLambdaApiBase {

	public function __construct( ApiMain $mainModule, string $moduleName ) {
		parent::__construct( $mainModule, $moduleName, 'wikilambda_supported_programming_languages_' );

		$this->setUp();
	}

	/**
	 * TODO (T338251): Factor out some commonality with WikiLambdaApiBase::executeFunctionCall()
	 * rather than rolling our own. (But note different end-point and error messages.)
	 *
	 * @inheritDoc
	 */
	protected function run() {
		// Exit if we're running in non-repo mode (e.g. on a client wiki)
		if ( !$this->getConfig()->get( 'WikiLambdaEnableRepoMode' ) ) {
			WikiLambdaApiBase::dieWithZError(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN,
					[]
				),
				HttpStatus::BAD_REQUEST
			);
		}

		$pageResult = $this->getResult();

		$work = new PoolCounterWorkViaCallback(
			'WikiLambdaSupportedProgrammingLanguages',
			$this->getUser()->getName(),
			[
				'doWork' => function () {
					return $this->orchestrator->getSupportedProgrammingLanguages();
				},
				'error' => function ( Status $status ) {
					$this->dieWithError(
						[ "apierror-wikilambda_supported_programming_languages-concurrency-limit" ],
						null, null, HttpStatus::TOO_MANY_REQUESTS
					);
				} ] );

		try {
			$response = $work->execute();
			$result = [ 'success' => true, 'data' => $response->getBody() ];
		} catch ( ConnectException ) {
			$this->dieWithError(
				[
					"apierror-wikilambda_supported_programming_languages-not-connected",
					$this->orchestratorHost
				],
				null, null, HttpStatus::INTERNAL_SERVER_ERROR
			);
		} catch ( ClientException | ServerException $exception ) {
			$zError = ZErrorFactory::createEvaluationError( $exception->getResponse()->getReasonPhrase(), '' );
			$zResponseMap = ZResponseEnvelope::wrapErrorInResponseMap( $zError );
			$zResponseObject = new ZResponseEnvelope( null, $zResponseMap );
			$result = [ 'data' => $zResponseObject->getSerialized() ];
		}
		$pageResult->addValue( [ 'query' ], $this->getModuleName(), $result );
	}

	/**
	 * @inheritDoc
	 * @codeCoverageIgnore
	 */
	protected function getAllowedParams(): array {
		return [];
	}

	/**
	 * Mark as internal. This isn't meant to be user-facing, and can change at any time.
	 * @return bool
	 */
	public function isInternal() {
		return true;
	}

}
