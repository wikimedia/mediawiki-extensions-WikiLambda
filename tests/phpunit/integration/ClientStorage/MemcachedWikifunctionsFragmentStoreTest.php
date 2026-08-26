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
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use Wikimedia\TestingAccessWrapper;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ClientStorage\WikifunctionsFragmentStore
 * @covers \MediaWiki\Extension\WikiLambda\ClientStorage\MemcachedWikifunctionsFragmentStore
 */
class MemcachedWikifunctionsFragmentStoreTest extends WikiLambdaClientIntegrationTestCase {

	private WikifunctionsFragmentStore $store;
	private MemcachedWrapper $cache;
	private TestingAccessWrapper $wrapper;

	private array $functionCall;

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsClientMode();
		$this->store = WikiLambdaServices::getWikifunctionsFragmentStore();
		$this->cache = WikiLambdaServices::getMemcachedWrapper();
		$this->wrapper = TestingAccessWrapper::newFromObject( $this->store );

		$this->functionCall = [
			'target' => 'Z10000',
			'arguments' => [ 'Z10000K1' => 'foo' ],
			'renderLang' => 'en',
			'parseLang' => 'en',
			'temporalArgs' => []
		];
	}

	// Getter
	// ======

	/**
	 * Tests that the MemcachedWrapper methods are called with the right parameters
	 */
	public function testGetter_mockMemcached(): void {
		$expectedInput = $this->functionCall;
		unset( $expectedInput['temporalArgs'] );

		$expectedKey = 'mocked-cache-key';
		$expectedValue = [ 'success' => true, 'value' => 'text', 'type' => 'Z6' ];

		$cache = $this->createMock( MemcachedWrapper::class );
		$cache
			->expects( $this->once() )
			->method( 'makeKey' )
			->with(
				WikifunctionsFragmentStore::CLIENT_FUNCTIONCALL_CACHE_KEY_PREFIX,
				json_encode( $expectedInput )
			)
			->willReturn( $expectedKey );
		$cache
			->expects( $this->once() )
			->method( 'get' )
			->with( $expectedKey )
			->willReturn( $expectedValue );

		$store = new MemcachedWikifunctionsFragmentStore( $cache );

		$this->assertSame( $expectedValue, $store->getRenderedFragment( $this->functionCall ) );
	}

	public function testGetter_returnsNullOnCacheMiss() {
		$this->assertNull( $this->store->getRenderedFragment( $this->functionCall ) );
	}

	public function testGetter_returnsWellFormedSuccessEntry() {
		// Bypass the store setter and set the value in MemcachedWrapper directly
		$cacheKey = $this->wrapper->makeFragmentKey( $this->functionCall );
		$entry = [ 'success' => true, 'value' => 'hello', 'type' => 'Z6' ];
		$this->cache->set( $cacheKey, $entry );

		$this->assertSame( $entry, $this->store->getRenderedFragment( $this->functionCall ) );
	}

	public function testGetter_returnsWellFormedFailureEntry() {
		// Bypass the store setter and set the value in MemcachedWrapper directly
		$cacheKey = $this->wrapper->makeFragmentKey( $this->functionCall );
		$entry = [ 'success' => false, 'errorMessageKey' => 'wikilambda-functioncall-error-message-eval' ];
		$this->cache->set( $cacheKey, $entry );

		$this->assertSame( $entry, $this->store->getRenderedFragment( $this->functionCall ) );
	}

	/**
	 * Every "corrupted cache" branch: the store should return null AND delete the
	 * bad entry so a subsequent fetch is also a cache miss. Each provider row seeds
	 * a different shape of garbage.
	 *
	 * @dataProvider provideCorruptedCacheEntries
	 */
	public function testGetter_deletesCorruptedEntry(
		string $label,
		mixed $badEntry
	) {
		$cacheKey = $this->wrapper->makeFragmentKey( $this->functionCall );
		$this->cache->set( $cacheKey, $badEntry );

		$this->assertNull(
			$this->store->getRenderedFragment( $this->functionCall ),
			"First fetch should return null for corrupted entry: $label"
		);
		$this->assertNull(
			$this->store->getRenderedFragment( $this->functionCall ),
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

	// Setter
	// ======

	/**
	 * Tests that the MemcachedWrapper methods are called with the right parameters
	 */
	public function testSetter_mockMemcached(): void {
		$expectedInput = $this->functionCall;
		unset( $expectedInput['temporalArgs'] );

		$expectedKey = 'mocked-cache-key';
		$expectedValue = [ 'success' => true, 'value' => 'text', 'type' => 'Z6' ];
		$httpStatusCode = 200;

		$cache = $this->createMock( MemcachedWrapper::class );
		$cache
			->expects( $this->once() )
			->method( 'makeKey' )
			->with(
				WikifunctionsFragmentStore::CLIENT_FUNCTIONCALL_CACHE_KEY_PREFIX,
				json_encode( $expectedInput )
			)
			->willReturn( $expectedKey );
		$cache
			->expects( $this->once() )
			->method( 'set' )
			->with(
				$expectedKey,
				$expectedValue,
				$this->anything()
			)
			->willReturn( true );

		$store = new MemcachedWikifunctionsFragmentStore( $cache );

		$this->assertTrue( $store->setRenderedFragment( $this->functionCall, $expectedValue, $httpStatusCode ) );
	}

	/**
	 * Tests that setRenderedFragment passes the right TTL to the cache depending
	 * on the value and/or HTTP status code returned by the Wikifunctions orchestrator.
	 *
	 * @dataProvider provideSetter_TTL
	 */
	public function testSetter_TTL( array $value, int $httpStatusCode, int $expectedTTL ): void {
		$expectedInput = $this->functionCall;
		unset( $expectedInput['temporalArgs'] );

		$expectedKey = 'mocked-cache-key';

		$cache = $this->createMock( MemcachedWrapper::class );
		$cache
			->expects( $this->once() )
			->method( 'makeKey' )
			->with(
				WikifunctionsFragmentStore::CLIENT_FUNCTIONCALL_CACHE_KEY_PREFIX,
				json_encode( $expectedInput )
			)
			->willReturn( $expectedKey );
		$cache
			->expects( $this->once() )
			->method( 'set' )
			->with(
				$expectedKey,
				$value,
				$expectedTTL
			)
			->willReturn( true );

		$store = new MemcachedWikifunctionsFragmentStore( $cache );

		$this->assertTrue( $store->setRenderedFragment( $this->functionCall, $value, $httpStatusCode ) );
	}

	public static function provideSetter_TTL(): array {
		return [
			'success (HTTP 200) caches for TTL_MONTH' => [
				/* value= */ [ 'success' => true, 'value' => '<b>naranjas</b>', 'type' => 'Z89' ],
				/* httpStatusCode= */ HttpStatus::OK,
				/* expectedTTL= */ MemcachedWrapper::TTL_MONTH,
			],
			'bad request (HTTP 400) caches for TTL_WEEK' => [
				/* value= */ [ 'success' => false, 'errorMessageKey' => 'some-error-msg-code' ],
				/* httpStatusCode= */ HttpStatus::BAD_REQUEST,
				/* expectedTTL= */ MemcachedWrapper::TTL_WEEK,
			],
			'not found (HTTP 404) caches for TTL_WEEK' => [
				/* value= */ [ 'success' => false, 'errorMessageKey' => 'some-error-msg-code' ],
				/* httpStatusCode= */ 404,
				/* expectedTTL= */ MemcachedWrapper::TTL_WEEK,
			],
			'too many requests (HTTP 429) caches for TTL_MINUTE' => [
				/* value= */ [ 'success' => false, 'errorMessageKey' => 'some-error-msg-code' ],
				/* httpStatusCode= */ HttpStatus::TOO_MANY_REQUESTS,
				/* expectedTTL= */ MemcachedWrapper::TTL_MINUTE,
			],
			'server error (HTTP 500) caches for TTL_MINUTE' => [
				/* value= */ [ 'success' => false, 'errorMessageKey' => 'some-error-msg-code' ],
				/* httpStatusCode= */ HttpStatus::INTERNAL_SERVER_ERROR,
				/* expectedTTL= */ MemcachedWrapper::TTL_MINUTE,
			],
			'service unavailable (HTTP 503) caches for TTL_MINUTE' => [
				/* value= */ [ 'success' => false, 'errorMessageKey' => 'some-error-msg-code' ],
				/* httpStatusCode= */ HttpStatus::SERVICE_UNAVAILABLE,
				/* expectedTTL= */ MemcachedWrapper::TTL_MINUTE,
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

		$first = $this->wrapper->makeFragmentKey( $call );
		$second = $this->wrapper->makeFragmentKey( $call );

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
			$this->wrapper->makeFragmentKey( $callOne ),
			$this->wrapper->makeFragmentKey( $callTwo )
		);
	}
}
