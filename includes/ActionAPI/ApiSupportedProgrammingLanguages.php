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

use MediaWiki\Api\ApiMain;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\OrchestratorRequest;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use Wikimedia\Stats\StatsFactory;

class ApiSupportedProgrammingLanguages extends WikiLambdaApiBase {

	public function __construct(
		ApiMain $mainModule,
		string $moduleName,
		StatsFactory $statsFactory,
		OrchestratorRequest $orchestrator,
	) {
		parent::__construct(
			$mainModule,
			$moduleName,
			$statsFactory,
			'wikilambda_supported_programming_languages_'
		);

		$this->setUp( $orchestrator );
	}

	/**
	 * @inheritDoc
	 */
	protected function run() {
		$response = $this->runOrchestratorWork(
			'WikiLambdaSupportedProgrammingLanguages',
			'apierror-wikilambda_supported_programming_languages-concurrency-limit',
			fn () => $this->orchestrator->getSupportedProgrammingLanguages()
		);

		if ( $response->getStatusCode() < HttpStatus::BAD_REQUEST ) {
			$result = [ 'success' => true, 'data' => $response->getBody() ];
		} else {
			$zError = ZErrorFactory::createEvaluationError( $response->getReasonPhrase(), '' );
			$zResponseMap = ZResponseEnvelope::wrapErrorInResponseMap( $zError );
			$zResponseObject = new ZResponseEnvelope( null, $zResponseMap );
			$result = [ 'data' => $zResponseObject->getSerialized() ];
		}
		$this->getResult()->addValue( [ 'query' ], $this->getModuleName(), $result );
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
