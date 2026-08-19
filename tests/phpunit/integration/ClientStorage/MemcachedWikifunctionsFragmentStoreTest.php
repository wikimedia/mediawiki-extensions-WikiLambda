<?php

/**
 * WikiLambda test suite for the Memcached implementation of WikifunctionsFragmentStore
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper;
use MediaWiki\Extension\WikiLambda\ClientStorage\MemcachedWikifunctionsFragmentStore;
use MediaWiki\Extension\WikiLambda\ClientStorage\WikifunctionsFragmentStore;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ClientStorage\WikifunctionsFragmentStore
 * @covers \MediaWiki\Extension\WikiLambda\ClientStorage\MemcachedWikifunctionsFragmentStore
 */
class MemcachedWikifunctionsFragmentStoreTest extends WikiLambdaClientIntegrationTestCase {

	private WikifunctionsFragmentStore $store;
	private MemcachedWrapper $cache;

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsClientMode();
		$this->store = WikiLambdaServices::getWikifunctionsFragmentStore();
		$this->cache = WikiLambdaServices::getMemcachedWrapper();
	}

	/**
	 * @param string $key
	 * @param mixed $value
	 * @return MemcachedWrapper
	 */
	private function createMockMemcachedGetter( $key, $value = false ): MemcachedWrapper {
		$cache = $this->createMock( MemcachedWrapper::class );
		$cache
			->method( 'makeKey' )
			->willReturn( $key );
		$cache
			->method( 'get' )
			->willReturnCallback( static function ( $k ) use ( $key, $value ) {
				return $k === $key ? $value : false;
			} );
		return $cache;
	}

	public function testGetter_mockMemcached(): void {
		$mockMemcached = $this->createMockMemcachedGetter( 'some-fragment-key', [
			'success' => true,
			'value' => 'text',
			'type' => 'Z6'
		] );

		$store = new MemcachedWikifunctionsFragmentStore( $mockMemcached );
		$response = $store->getRenderedFragment( 'some-fragment-key' );

		$this->assertTrue( $response['success'] );
	}

	public function testFetchFromFunctionCallCache_returnsNullOnCacheMiss() {
		$cacheKey = $this->store->makeFragmentKey( [ 'cache-miss-only' => 'a' ] );
		$this->assertNull( $this->store->getRenderedFragment( $cacheKey ) );
	}

	public function testFetchFromFunctionCallCache_returnsWellFormedSuccessEntry() {
		$cacheKey = $this->store->makeFragmentKey( [ 'ok-success' => 'a' ] );
		$entry = [ 'success' => true, 'value' => 'hello', 'type' => 'Z6' ];
		$this->cache->set( $cacheKey, $entry );

		$this->assertSame( $entry, $this->store->getRenderedFragment( $cacheKey ) );
	}

	public function testFetchFromFunctionCallCache_returnsWellFormedFailureEntry() {
		$cacheKey = $this->store->makeFragmentKey( [ 'ok-failure' => 'a' ] );
		$entry = [ 'success' => false, 'errorMessageKey' => 'wikilambda-functioncall-error-message-eval' ];
		$this->cache->set( $cacheKey, $entry );

		$this->assertSame( $entry, $this->store->getRenderedFragment( $cacheKey ) );
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
		$cacheKey = $this->store->makeFragmentKey( [ 'corrupt' => $label ] );
		$this->cache->set( $cacheKey, $badEntry );

		$this->assertNull(
			$this->store->getRenderedFragment( $cacheKey ),
			"First fetch should return null for corrupted entry: $label"
		);
		$this->assertNull(
			$this->store->getRenderedFragment( $cacheKey ),
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

	// makeFragmentKey
	// ===============

	public function testMakeFragmentKey_isDeterministicAndIncludesPrefix() {
		$call = [
			'target' => 'Z10000',
			'arguments' => [ 'Z10000K1' => 'foo' ],
		];

		$first = $this->store->makeFragmentKey( $call );
		$second = $this->store->makeFragmentKey( $call );

		$this->assertSame( $first, $second );
		$this->assertStringContainsString(
			WikifunctionsFragmentStore::CLIENT_FUNCTIONCALL_CACHE_KEY_PREFIX,
			$first
		);
	}

	public function testFragmentKey_distinctInputsProduceDistinctKeys() {
		$callOne = [ 'target' => 'Z10000', 'arguments' => [ 'Z10000K1' => 'foo' ] ];
		$callTwo = [ 'target' => 'Z10000', 'arguments' => [ 'Z10000K1' => 'bar' ] ];

		$this->assertNotSame(
			$this->store->makeFragmentKey( $callOne ),
			$this->store->makeFragmentKey( $callTwo )
		);
	}
}
