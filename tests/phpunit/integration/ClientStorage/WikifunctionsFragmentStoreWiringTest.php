<?php

/**
 * WikiLambda integration test for WikifunctionsFragmentStore service wiring
 *
 * This file covers the one piece that can only be exercised against
 * the real service container: that the WikiLambdaClientFragmentStoreBackend
 * config switch resolves to the right concrete WikifunctionsFragmentStore implementation.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ClientStorage;

use InvalidArgumentException;
use MediaWiki\Extension\WikiLambda\ClientStorage\MemcachedWikifunctionsFragmentStore;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWikiIntegrationTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\WikiLambdaServices::buildWikifunctionsFragmentStore
 */
class WikifunctionsFragmentStoreWiringTest extends MediaWikiIntegrationTestCase {

	/**
	 * Drop any cached WikifunctionsFragmentStore so the next resolve picks up the
	 * config override set in this test.
	 */
	private function resetCachedStore(): void {
		$this->getServiceContainer()->resetServiceForTesting( 'WikifunctionsFragmentStore' );
	}

	public function testResolvesToMemcachedWikifunctionsFragmentStoreWhenConfigured(): void {
		$this->overrideConfigValue( 'WikiLambdaClientFragmentStoreBackend', 'memcached' );
		$this->resetCachedStore();

		$this->assertInstanceOf(
			MemcachedWikifunctionsFragmentStore::class,
			WikiLambdaServices::getWikifunctionsFragmentStore()
		);
	}

	public function testThrowsForUnknownBackendValue(): void {
		$this->overrideConfigValue( 'WikiLambdaClientFragmentStoreBackend', 'no-such-backend' );
		$this->resetCachedStore();

		$this->expectException( InvalidArgumentException::class );
		$this->expectExceptionMessageMatches( '/no-such-backend/' );

		WikiLambdaServices::getWikifunctionsFragmentStore();
	}
}
