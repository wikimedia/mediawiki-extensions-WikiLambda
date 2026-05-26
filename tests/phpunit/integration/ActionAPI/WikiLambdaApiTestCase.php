<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI;

use MediaWiki\Tests\Api\ApiTestCase;

/**
 * @coversNothing
 */
class WikiLambdaApiTestCase extends ApiTestCase {

	/** @inheritDoc */
	public function __construct( $name = null, array $data = [], $dataName = '' ) {
		parent::__construct( $name, $data, $dataName );

		// All our ActionAPIs are specific to repo-mode
		$this->overrideMwServices();
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', true );
		\MediaWiki\Extension\WikiLambda\HookHandler\RepoHooks::registerExtension();
	}

	/**
	 * @param array $zids
	 */
	protected function insertBuiltinObjects( $zids ): void {
		$dataPath = dirname( __DIR__, 4 ) . '/function-schemata/data/definitions';
		foreach ( $zids as $zid ) {
			$data = file_get_contents( "$dataPath/$zid.json" );
			$this->editPage( $zid, $data, '', NS_MAIN );
		}
	}
}
