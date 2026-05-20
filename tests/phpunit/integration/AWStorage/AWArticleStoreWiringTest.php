<?php

/**
 * WikiLambda integration test for AWArticleStore service wiring
 *
 * The MainStashAWArticleStore class itself is covered by its unit tests
 * against HashBagOStuff. This file covers the one piece that can only be
 * exercised against the real service container: that the
 * WikiLambdaAWArticleStoreBackend config switch resolves to the right
 * concrete AWArticleStore implementation.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\AWStorage;

use InvalidArgumentException;
use MediaWiki\Extension\WikiLambda\AWStorage\DBAWArticleStore;
use MediaWiki\Extension\WikiLambda\AWStorage\MainStashAWArticleStore;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWikiIntegrationTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\WikiLambdaServices::buildAWArticleStore
 */
class AWArticleStoreWiringTest extends MediaWikiIntegrationTestCase {

	/**
	 * Drop any cached AWArticleStore so the next resolve picks up the
	 * config override set in this test.
	 */
	private function resetCachedStore(): void {
		$this->getServiceContainer()->resetServiceForTesting( 'AbstractWikiArticleStore' );
	}

	public function testResolvesToDBAWArticleStoreByDefault(): void {
		$this->overrideConfigValue( 'WikiLambdaAWArticleStoreBackend', 'db' );
		$this->resetCachedStore();

		$this->assertInstanceOf(
			DBAWArticleStore::class,
			WikiLambdaServices::getAWArticleStore()
		);
	}

	public function testResolvesToMainStashAWArticleStoreWhenConfigured(): void {
		$this->overrideConfigValue( 'WikiLambdaAWArticleStoreBackend', 'mainstash' );
		$this->resetCachedStore();

		$this->assertInstanceOf(
			MainStashAWArticleStore::class,
			WikiLambdaServices::getAWArticleStore()
		);
	}

	public function testThrowsForUnknownBackendValue(): void {
		$this->overrideConfigValue( 'WikiLambdaAWArticleStoreBackend', 'no-such-backend' );
		$this->resetCachedStore();

		$this->expectException( InvalidArgumentException::class );
		$this->expectExceptionMessageMatches( '/no-such-backend/' );

		WikiLambdaServices::getAWArticleStore();
	}
}
