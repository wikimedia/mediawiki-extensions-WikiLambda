<?php

namespace MediaWiki\Extension\WikiLambda\API;

use ApiBase;
use GuzzleHttp\Client;
use MediaWiki\Extension\WikiLambda\OrchestratorRequest;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\MediaWikiServices;

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
}
