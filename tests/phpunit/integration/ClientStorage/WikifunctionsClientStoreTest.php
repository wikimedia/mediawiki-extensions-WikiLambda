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

	// ------------------------------------------------------------------
	// Cache side: fetchFromZObjectCache
	// ------------------------------------------------------------------

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

	// ------------------------------------------------------------------
	// Cache side: makeFunctionCallCacheKey
	// ------------------------------------------------------------------

	public function testMakeFunctionCallCacheKey_isDeterministicAndIncludesPrefix() {
		$call = [
			'target' => 'Z10000',
			'arguments' => [ 'Z10000K1' => 'foo' ],
		];

		$first = $this->store->makeFunctionCallCacheKey( $call );
		$second = $this->store->makeFunctionCallCacheKey( $call );

		$this->assertSame( $first, $second );
		$this->assertStringContainsString(
			WikifunctionsClientStore::CLIENT_FUNCTIONCALL_CACHE_KEY_PREFIX,
			$first
		);
	}

	public function testMakeFunctionCallCacheKey_distinctInputsProduceDistinctKeys() {
		$callOne = [ 'target' => 'Z10000', 'arguments' => [ 'Z10000K1' => 'foo' ] ];
		$callTwo = [ 'target' => 'Z10000', 'arguments' => [ 'Z10000K1' => 'bar' ] ];

		$this->assertNotSame(
			$this->store->makeFunctionCallCacheKey( $callOne ),
			$this->store->makeFunctionCallCacheKey( $callTwo )
		);
	}

	// ------------------------------------------------------------------
	// Cache side: fetchFromFunctionCallCache
	// ------------------------------------------------------------------

	public function testFetchFromFunctionCallCache_returnsNullOnCacheMiss() {
		$cacheKey = $this->store->makeFunctionCallCacheKey( [ 'cache-miss-only' => 'a' ] );
		$this->assertNull( $this->store->fetchFromFunctionCallCache( $cacheKey ) );
	}

	public function testFetchFromFunctionCallCache_returnsWellFormedSuccessEntry() {
		$cacheKey = $this->store->makeFunctionCallCacheKey( [ 'ok-success' => 'a' ] );
		$entry = [ 'success' => true, 'value' => 'hello', 'type' => 'Z6' ];
		$this->cache->set( $cacheKey, $entry );

		$this->assertSame( $entry, $this->store->fetchFromFunctionCallCache( $cacheKey ) );
	}

	public function testFetchFromFunctionCallCache_returnsWellFormedFailureEntry() {
		$cacheKey = $this->store->makeFunctionCallCacheKey( [ 'ok-failure' => 'a' ] );
		$entry = [ 'success' => false, 'errorMessageKey' => 'wikilambda-functioncall-error-message-eval' ];
		$this->cache->set( $cacheKey, $entry );

		$this->assertSame( $entry, $this->store->fetchFromFunctionCallCache( $cacheKey ) );
	}

	/**
	 * Every "corrupted cache" branch: the store should return null AND delete the
	 * bad entry so a subsequent fetch is also a cache miss. Each provider row seeds
	 * a different shape of garbage.
	 *
	 * @dataProvider provideCorruptedCacheEntries
	 */
	public function testFetchFromFunctionCallCache_deletesCorruptedEntry(
		string $label,
		mixed $badEntry
	) {
		$cacheKey = $this->store->makeFunctionCallCacheKey( [ 'corrupt' => $label ] );
		$this->cache->set( $cacheKey, $badEntry );

		$this->assertNull(
			$this->store->fetchFromFunctionCallCache( $cacheKey ),
			"First fetch should return null for corrupted entry: $label"
		);
		$this->assertNull(
			$this->store->fetchFromFunctionCallCache( $cacheKey ),
			"Second fetch should also return null, proving the corrupted entry was deleted: $label"
		);
	}

	public static function provideCorruptedCacheEntries() {
		return [
			'non-array scalar string' => [
				'non-array-string',
				'this-is-not-an-array',
			],
			'missing success key' => [
				'missing-success',
				[ 'value' => 'foo', 'type' => 'Z6' ],
			],
			'non-boolean success key' => [
				'non-bool-success',
				[ 'success' => 1, 'value' => 'foo', 'type' => 'Z6' ],
			],
			'success entry missing value' => [
				'success-missing-value',
				[ 'success' => true, 'type' => 'Z6' ],
			],
			'success entry missing type' => [
				'success-missing-type',
				[ 'success' => true, 'value' => 'foo' ],
			],
			'success entry with non-string value' => [
				'success-nonstring-value',
				[ 'success' => true, 'value' => 42, 'type' => 'Z6' ],
			],
			'success entry with non-string type' => [
				'success-nonstring-type',
				[ 'success' => true, 'value' => 'foo', 'type' => 6 ],
			],
			'failure entry missing errorMessageKey' => [
				'failure-missing-errorkey',
				[ 'success' => false ],
			],
			'failure entry with non-string errorMessageKey' => [
				'failure-nonstring-errorkey',
				[ 'success' => false, 'errorMessageKey' => 12345 ],
			],
		];
	}
}
