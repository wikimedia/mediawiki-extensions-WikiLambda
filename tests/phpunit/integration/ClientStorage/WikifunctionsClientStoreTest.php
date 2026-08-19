<?php

/**
 * WikiLambda integration test suite for WikifunctionsClientStore's function-call
 * and ZObject cache surface (MemcachedWrapper).
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper;
use MediaWiki\Extension\WikiLambda\ClientStorage\WikifunctionsClientStore;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectStore;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ClientStorage\WikifunctionsClientStore
 *
 * @group Database
 */
class WikifunctionsClientStoreTest extends WikiLambdaClientIntegrationTestCase {

	private WikifunctionsClientStore $store;
	private MemcachedWrapper $cache;

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsClientMode();
		$this->store = WikiLambdaServices::getWikifunctionsClientStore();
		$this->cache = WikiLambdaServices::getMemcachedWrapper();
	}

	public function testFetchFromZObjectCache_returnsNullOnCacheMiss() {
		$this->assertNull( $this->store->fetchFromZObjectCache( 'Z12345NotCached' ) );
	}

	public function testFetchFromZObjectCache_returnsDecodedJsonOnHit() {
		$zid = 'Z10100';
		$cacheKey = $this->cache->makeKey( ZObjectStore::ZOBJECT_CACHE_KEY_PREFIX, $zid );
		$payload = [ 'Z1K1' => 'Z2', 'Z2K1' => [ 'Z1K1' => 'Z6', 'Z6K1' => $zid ] ];
		$this->cache->set( $cacheKey, json_encode( $payload ) );

		$this->assertSame( $payload, $this->store->fetchFromZObjectCache( $zid ) );
	}

	public function testFetchFromZObjectCache_returnsNullOnCorruptedJson() {
		$zid = 'Z10101';
		$cacheKey = $this->cache->makeKey( ZObjectStore::ZOBJECT_CACHE_KEY_PREFIX, $zid );
		$this->cache->set( $cacheKey, 'not-valid-json{' );

		// json_decode returns null for invalid JSON; the store returns that null
		// and logs a warning as a side effect.
		$this->assertNull( $this->store->fetchFromZObjectCache( $zid ) );
	}
}
