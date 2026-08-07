<?php

/**
 * WikiLambda integration test for AWFragmentStore service wiring
 *
 * This file covers the one piece that can only be exercised against
 * the real service container: that the WikiLambdaAWFragmentStoreBackend
 * config switch resolves to the right concrete AWFragmentStore implementation.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\AWStorage;

use InvalidArgumentException;
use MediaWiki\Extension\WikiLambda\AWStorage\MemcachedAWFragmentStore;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWikiIntegrationTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\WikiLambdaServices::buildAWFragmentStore
 */
class AWFragmentStoreWiringTest extends MediaWikiIntegrationTestCase {

	/**
	 * Drop any cached AWFragmentStore so the next resolve picks up the
	 * config override set in this test.
	 */
	private function resetCachedStore(): void {
		$this->getServiceContainer()->resetServiceForTesting( 'AbstractWikiFragmentStore' );
	}

	public function testResolvesToMemcachedAWFragmentStoreWhenConfigured(): void {
		$this->overrideConfigValue( 'WikiLambdaAWFragmentStoreBackend', 'memcached' );
		$this->resetCachedStore();

		$this->assertInstanceOf(
			MemcachedAWFragmentStore::class,
			WikiLambdaServices::getAWFragmentStore()
		);
	}

	public function testThrowsForUnknownBackendValue(): void {
		$this->overrideConfigValue( 'WikiLambdaAWFragmentStoreBackend', 'no-such-backend' );
		$this->resetCachedStore();

		$this->expectException( InvalidArgumentException::class );
		$this->expectExceptionMessageMatches( '/no-such-backend/' );

		WikiLambdaServices::getAWFragmentStore();
	}
}
