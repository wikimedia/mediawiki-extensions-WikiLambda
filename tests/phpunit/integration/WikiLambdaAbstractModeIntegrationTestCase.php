<?php

/**
 * Base class for WikiLambda integration tests that exercise an Abstract
 * Wikipedia repo wiki — i.e. a wiki that hosts Abstract Wikipedia content
 * (in its configured abstract namespace) and can be edited locally.
 *
 * setUp() enables abstract mode and registers the test abstract namespace via
 * AbstractModeTestConfigTrait; see that trait for why the namespace has to be
 * registered by the test rather than left to RepoHooks::onMediaWikiServices().
 * Tests that sit on a MediaWiki core base class (e.g. SpecialPageTestBase) can
 * use the trait directly.
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

abstract class WikiLambdaAbstractModeIntegrationTestCase extends WikiLambdaIntegrationTestCase {

	use AbstractModeTestConfigTrait;

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsAbstractMode();
	}
}
