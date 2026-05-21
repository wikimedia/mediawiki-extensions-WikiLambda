<?php

/**
 * Base class for WikiLambda integration tests that exercise a Wikifunctions
 * repo wiki — i.e. a wiki that hosts ZObjects in its main namespace.
 *
 * setUp() flips $wgWikiLambdaEnableRepoMode on and re-fires
 * RepoHooks::registerExtension so the repo-mode rights, groups, rate
 * limits, namespace content models, and namespace protection all land in
 * the test's snapshot. We set the actual global directly (not just the
 * Config service) because registerExtension reads the global — it can't
 * call MediaWikiServices during the bootstrap callback path without
 * tripping a deprecation about premature service-container access.
 *
 * On tests that are also `&#64;group Database` Z504 is seeded too, as without
 * it many ZObject loads recur infinitely waiting for a not-found Z504.
 * Non-DB tests skip the seed and still get the registered globals — the
 * editPage call inside insertZids would otherwise throw a hard
 * LogicException complaining about the missing group annotation.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\HookHandler\RepoHooks;

abstract class WikiLambdaRepoModeIntegrationTestCase extends WikiLambdaIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', true );
		$this->setMwGlobals( 'wgWikiLambdaEnableRepoMode', true );
		RepoHooks::registerExtension();

		if ( $this->needsDB() ) {
			// Always register Z504, as otherwise we get an infinite recursion of not finding Z504
			$this->insertZids( [ 'Z504' ] );
		}
	}
}
