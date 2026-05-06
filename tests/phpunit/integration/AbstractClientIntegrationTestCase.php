<?php

/**
 * WikiLambda integration test abstract class for Abstract Wikipedia Client
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore;
use MediaWikiIntegrationTestCase;
use Wikimedia\Timestamp\ConvertibleTimestamp;

abstract class AbstractClientIntegrationTestCase extends MediaWikiIntegrationTestCase {

	protected function setUpAsAbstractClientMode(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', false );
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractMode', false );
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractClientMode', true );
		$this->overrideConfigValue( 'WikiLambdaClientTargetAPI', 'test.wikifunctions.org' );
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
