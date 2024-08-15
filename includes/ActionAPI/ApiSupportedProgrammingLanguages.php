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
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\PoolCounter\PoolCounterWorkViaCallback;
use MediaWiki\Status\Status;

class ApiSupportedProgrammingLanguages extends WikiLambdaApiBase {

	/**
	 * @inheritDoc
	 */
	public function __construct( $query, $moduleName ) {
		parent::__construct( $query, $moduleName, 'wikilambda_supported_programming_languages_' );

		$this->setUp();
	}

	/**
	 * @inheritDoc
	 */
	public function execute() {
		$this->run();
	}

	/**
	 * TODO (T338251): Factor out some commonality with WikiLambdaApiBase::executeFunctionCall()
	 * rather than rolling our own. (But note different end-point and error messages.)
	 *
	 * @inheritDoc
	 */
	protected function run() {
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
						null, null, 429
					);
				} ] );

		try {
			$response = $work->execute();
			$result = [ 'success' => true, 'data' => $response->getBody() ];
		} catch ( ConnectException $exception ) {
			$this->dieWithError(
				[
					"apierror-wikilambda_supported_programming_languages-not-connected",
					$this->orchestratorHost
				],
				null, null, 500
			);
		} catch ( ClientException | ServerException $exception ) {
			$zError = ZErrorFactory::wrapMessageInZError( $exception->getResponse()->getReasonPhrase(), '' );
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
