<?php

/**
 * WikiLambda integration test abstract class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWikiIntegrationTestCase;

abstract class WikiLambdaClientIntegrationTestCase extends MediaWikiIntegrationTestCase {
	protected function setUpAsClientMode(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', true );
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );
		$this->overrideConfigValue( 'WikiLambdaClientTargetAPI', 'test.wikifunctions.org' );
		\MediaWiki\Extension\WikiLambda\HookHandler\RepoHooks::registerExtension();
	}
}
