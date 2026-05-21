<?php

/**
 * Base class for WikiLambda integration tests that exercise an Abstract
 * Wikipedia client wiki — i.e. a wiki that renders Abstract Wikipedia
 * articles delivered from a remote AW repo, but does not host abstract
 * content itself.
 *
 * Mode-setup is invoked explicitly by subclasses via setUpAsAbstractClientMode()
 * rather than auto-firing from setUp(), to preserve flexibility for tests
 * that want to flip other settings first.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore;
use Wikimedia\Timestamp\ConvertibleTimestamp;

abstract class WikiLambdaAbstractClientIntegrationTestCase extends WikiLambdaIntegrationTestCase {

	protected function setUpAsAbstractClientMode(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', false );
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractMode', false );
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractClientMode', true );
		$this->overrideConfigValue( 'WikiLambdaClientTargetAPI', 'test.wikifunctions.org' );
		// registerExtension reads the actual globals, not Config — see
		// WikiLambdaRepoModeIntegrationTestCase for the underlying reason.
		$this->setMwGlobals( [
			'wgWikiLambdaEnableRepoMode' => false,
			'wgWikiLambdaEnableAbstractMode' => false,
		] );
		\MediaWiki\Extension\WikiLambda\HookHandler\RepoHooks::registerExtension();
	}

	protected function getPrimaryDB() {
		return $this->getServiceContainer()
			->getConnectionProvider( AWArticleStore::AW_STORAGE_VIRTUAL_DOMAIN )
			->getPrimaryDatabase();
	}

	protected function getReplicaDB() {
		return $this->getServiceContainer()
			->getConnectionProvider( AWArticleStore::AW_STORAGE_VIRTUAL_DOMAIN )
			->getReplicaDatabase();
	}

	protected function tearDown(): void {
		ConvertibleTimestamp::setFakeTime( false );
		parent::tearDown();
	}
}
