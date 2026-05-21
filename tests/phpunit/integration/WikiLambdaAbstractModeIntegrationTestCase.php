<?php

/**
 * Base class for WikiLambda integration tests that exercise an Abstract
 * Wikipedia repo wiki — i.e. a wiki that hosts Abstract Wikipedia content
 * (in its configured abstract namespace) and can be edited locally.
 *
 * setUp() flips $wgWikiLambdaEnableAbstractMode on and re-fires
 * RepoHooks::registerExtension so the abstract-mode user rights
 * (wikilambda-abstract-create, wikilambda-abstract-edit) land in the
 * test's snapshot. We set the actual global directly (not just the
 * Config service) because registerExtension reads the global — see
 * WikiLambdaRepoModeIntegrationTestCase for the underlying reason.
 *
 * Note: in practice WMF-hosted abstract repo wikis (Wikifunctions) also
 * have repo mode on. Tests that need both modes can either extend
 * WikiLambdaRepoModeIntegrationTestCase and add their own abstract-mode
 * override, or extend this class and add a repo-mode override — pick the
 * one that more closely matches the subject under test.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\HookHandler\RepoHooks;

abstract class WikiLambdaAbstractModeIntegrationTestCase extends WikiLambdaIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractMode', true );
		$this->setMwGlobals( 'wgWikiLambdaEnableAbstractMode', true );
		RepoHooks::registerExtension();
	}
}
