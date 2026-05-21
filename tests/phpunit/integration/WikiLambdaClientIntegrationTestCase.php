<?php

/**
 * Base class for WikiLambda integration tests that exercise a Wikifunctions
 * client wiki — i.e. a wiki that consumes Wikifunctions via the parser
 * function {{#function:…}}.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

abstract class WikiLambdaClientIntegrationTestCase extends WikiLambdaIntegrationTestCase {

	/**
	 * FIXME (T407066 follow-up): this helper currently also enables
	 * WikiLambdaEnableRepoMode=true, despite the class name implying a
	 * client-only wiki. Callers like ClientHooksTest may depend on the
	 * combined config, so untangling needs a separate audit; for now we
	 * keep the existing behaviour and document the leak.
	 */
	protected function setUpAsClientMode(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', true );
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );
		$this->overrideConfigValue( 'WikiLambdaClientTargetAPI', 'test.wikifunctions.org' );
		// registerExtension reads the actual global, not Config — see
		// WikiLambdaRepoModeIntegrationTestCase for the underlying reason.
		$this->setMwGlobals( 'wgWikiLambdaEnableRepoMode', true );
		\MediaWiki\Extension\WikiLambda\HookHandler\RepoHooks::registerExtension();
	}
}
