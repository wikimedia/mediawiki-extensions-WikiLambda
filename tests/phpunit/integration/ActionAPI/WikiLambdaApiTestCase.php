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

	/**
	 * Most ActionAPIs in this extension are repo-mode-only. With the extension
	 * now defaulting to client-only (I337b83112), enable repo mode explicitly
	 * in setUp() so RepoHooks::registerExtension fires for each test. (Doing
	 * this in __construct, as we used to, doesn't survive
	 * MediaWikiIntegrationTestCase::setUp resetting service overrides.)
	 *
	 * Exception: ApiAbstractWikiRunFragment, which runs in Abstract mode
	 */
	protected function setUp(): void {
		parent::setUp();
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', true );
		$this->setMwGlobals( 'wgWikiLambdaEnableRepoMode', true );
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
