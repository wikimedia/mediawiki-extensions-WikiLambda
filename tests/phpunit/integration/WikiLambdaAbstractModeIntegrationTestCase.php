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
 * setUp() also registers the abstract test namespace (2300) itself, rather
 * than relying on RepoHooks::onMediaWikiServices(). That hook wires the
 * namespaces named in the host wiki's WikiLambdaAbstractNamespaces, but it
 * fires once at bootstrap and no-ops when abstract mode is off there — and on
 * a production-like dev farm abstract content lives in NS_MAIN, so 2300 is
 * never registered. Without this, canBeUsedOn() rejects a 2300 title and every
 * abstract-namespace edit fails with content-not-allowed-here. We register via
 * overrideConfigValues() (not the raw globals the hook writes) so the service
 * container — and thus NamespaceInfo / the content language — is rebuilt and
 * the namespace resolves mid-test. The merges are additive, so a subclass that
 * also enables repo mode keeps NS_MAIN's ZObject content model.
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
use MediaWiki\MainConfigNames;

abstract class WikiLambdaAbstractModeIntegrationTestCase extends WikiLambdaIntegrationTestCase {

	/**
	 * The abstract namespace these tests host content in, matching the
	 * WikiLambdaAbstractNamespaces default in extension.json. Subclasses refer to
	 * the same ID through their own TEST_ABSTRACT_NS constant.
	 */
	private const ABSTRACT_NS = 2300;
	private const ABSTRACT_NS_NAME = 'Abstract_Wikipedia';
	private const ABSTRACT_NS_QID = 'Q50081413';

	protected function setUp(): void {
		parent::setUp();

		$config = $this->getServiceContainer()->getMainConfig();

		$this->overrideConfigValues( [
			'WikiLambdaEnableAbstractMode' => true,
			// canBeUsedOn() gates on this map, so the test namespace must be a key.
			'WikiLambdaAbstractNamespaces' =>
				[ self::ABSTRACT_NS => [ self::ABSTRACT_NS_NAME, self::ABSTRACT_NS_QID ] ]
				+ $config->get( 'WikiLambdaAbstractNamespaces' ),
			MainConfigNames::ExtraNamespaces =>
				[
					self::ABSTRACT_NS => self::ABSTRACT_NS_NAME,
					self::ABSTRACT_NS + 1 => self::ABSTRACT_NS_NAME . '_talk',
				]
				+ $config->get( MainConfigNames::ExtraNamespaces ),
			MainConfigNames::NamespaceContentModels =>
				[ self::ABSTRACT_NS => CONTENT_MODEL_ABSTRACT ]
				+ $config->get( MainConfigNames::NamespaceContentModels ),
			MainConfigNames::NamespaceProtection =>
				[ self::ABSTRACT_NS => [ 'wikilambda-abstract-edit', 'wikilambda-abstract-create' ] ]
				+ $config->get( MainConfigNames::NamespaceProtection ),
			MainConfigNames::ContentNamespaces => array_values( array_unique(
				array_merge( $config->get( MainConfigNames::ContentNamespaces ), [ self::ABSTRACT_NS ] )
			) ),
		] );

		$this->setMwGlobals( 'wgWikiLambdaEnableAbstractMode', true );
		RepoHooks::registerExtension();
	}
}
