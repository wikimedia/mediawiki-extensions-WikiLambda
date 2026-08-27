<?php

/**
 * WikiLambda test suite for the Memcached implementation of WikifunctionsFragmentStore
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ClientStorage\MainStashWikifunctionsFragmentStore;
use MediaWiki\Extension\WikiLambda\ClientStorage\WikifunctionsFragmentStore;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use Wikimedia\ObjectCache\BagOStuff;
use Wikimedia\ObjectCache\HashBagOStuff;
use Wikimedia\TestingAccessWrapper;
use Wikimedia\Timestamp\ConvertibleTimestamp;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ClientStorage\WikifunctionsFragmentStore
 * @covers \MediaWiki\Extension\WikiLambda\ClientStorage\MainStashWikifunctionsFragmentStore
 */
class MainStashWikifunctionsFragmentStoreTest extends WikiLambdaClientIntegrationTestCase {

	private WikifunctionsFragmentStore $store;
	private HashBagOStuff $stash;
	private TestingAccessWrapper $wrapper;

	private array $functionCall;

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsClientMode();

		$this->stash = new HashBagOStuff();
		$this->store = new MainStashWikifunctionsFragmentStore( $this->stash );
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
	 * Tests that the MainStash methods are called with the right parameters
	 *
	 * @dataProvider provideMockMainStash
	 */
	public function testGetter_mockMainStash( $inputCall, $keyedCall ): void {
		$expectedKey = 'mocked-cache-key';
		$expectedValue = [
			'success' => true,
			'value' => 'text',
			'type' => 'Z6',
			'renderDate' => '20260828121500'
		];

		$stash = $this->createMock( BagOStuff::class );

		// Assert that makeGlobalKey is called with the right parameters
		$stash
			->expects( $this->once() )
			->method( 'makeGlobalKey' )
			->with(
				WikifunctionsFragmentStore::CLIENT_FUNCTIONCALL_CACHE_KEY_PREFIX,
				json_encode( $keyedCall )
			)
			->willReturn( $expectedKey );

		// Assert that get is called with the produced key
		$stash
			->expects( $this->once() )
			->method( 'get' )
			->with( $expectedKey )
			->willReturn( $expectedValue );

		$store = new MainStashWikifunctionsFragmentStore( $stash );

		$this->assertSame( $expectedValue, $store->getRenderedFragment( $inputCall ) );
	}

	public static function provideMockMainStash() {
		yield 'fragment with no temporal args builds key with all args' => [
			[
				'target' => 'Z10000',
				'arguments' => [ 'Z10000K1' => 'foo' ],
				'renderLang' => 'en',
				'parseLang' => 'en',
				'temporalArgs' => []
			],
			[
				'target' => 'Z10000',
				'arguments' => [ 'Z10000K1' => 'foo' ],
				'renderLang' => 'en',
				'parseLang' => 'en',
			]
		];

		yield 'fragment with temporal args sets them to blank string for cache key' => [
			[
				'target' => 'Z10000',
				'arguments' => [
					'Z10000K1' => 'foo',
					'Z10000K2' => '2026-08-28',
					'Z10000K3' => '2025'
				],
				'renderLang' => 'en',
				'parseLang' => 'en',
				'temporalArgs' => [
					'Z10000K2',
					'Z10000K3',
					// make sure a non-existing key isn't added
					'Z10000K4'
				]
			],
			[
				'target' => 'Z10000',
				'arguments' => [
					'Z10000K1' => 'foo',
					'Z10000K2' => '',
					'Z10000K3' => ''
				],
				'renderLang' => 'en',
				'parseLang' => 'en',
			]
		];
	}

	public function testGetter_returnsNullOnCacheMiss() {
		$this->assertNull( $this->store->getRenderedFragment( $this->functionCall ) );
	}

	public function testGetter_returnsWellFormedSuccessEntry() {
		// Bypass the store setter and set the value in the stash directly
		$cacheKey = $this->wrapper->makeFragmentKey( $this->functionCall );
		$entry = [ 'success' => true, 'value' => 'hello', 'type' => 'Z6' ];
		$this->stash->set( $cacheKey, $entry );

		$this->assertSame( $entry, $this->store->getRenderedFragment( $this->functionCall ) );
	}

	public function testGetter_returnsWellFormedFailureEntry() {
		// Bypass the store setter and set the value in the stash directly
		$cacheKey = $this->wrapper->makeFragmentKey( $this->functionCall );
		$entry = [ 'success' => false, 'errorMessageKey' => 'wikilambda-functioncall-error-message-eval' ];
		$this->stash->set( $cacheKey, $entry );

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
		$this->stash->set( $cacheKey, $badEntry );

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
	 * Tests that the MainStash methods are called with the right parameters
	 *
	 * @dataProvider provideMockMainStash
	 */
	public function testSetter_mockMainStash( $inputCall, $keyedCall ): void {
		$httpStatusCode = 200;
		$expectedKey = 'mocked-cache-key';
		$expectedValue = [
			'success' => true,
			'value' => 'text',
			'type' => 'Z6',
			'renderDate' => '20260828121500'
		];

		$stash = $this->createMock( BagOStuff::class );

		// Assert that makeGlobalKey is called with the right parameters
		$stash
			->expects( $this->once() )
			->method( 'makeGlobalKey' )
			->with(
				WikifunctionsFragmentStore::CLIENT_FUNCTIONCALL_CACHE_KEY_PREFIX,
				json_encode( $keyedCall )
			)
			->willReturn( $expectedKey );

		// Assert that get is called with the produced key
		$stash
			->expects( $this->once() )
			->method( 'set' )
			->with(
				$expectedKey,
				$expectedValue,
				$this->anything()
			)
			->willReturn( true );

		$store = new MainStashWikifunctionsFragmentStore( $stash );

		$this->assertTrue( $store->setRenderedFragment( $inputCall, $expectedValue, $httpStatusCode ) );
	}

	/**
	 * Tests that setRenderedFragment passes the right TTL to the cache depending
	 * on the value and/or HTTP status code returned by the Wikifunctions orchestrator.
	 *
	 * @dataProvider provideSetter_TTL
	 */
	public function testSetter_TTL( array $value, int $httpStatusCode, int $expectedTTL ): void {
		$expectedKey = 'mocked-cache-key';
		$stash = $this->createMock( BagOStuff::class );

		// Assert that makeGlobalKey is called
		$stash
			->expects( $this->once() )
			->method( 'makeGlobalKey' )
			->willReturn( $expectedKey );

		// Assert that get is called with the produced key
		$stash
			->expects( $this->once() )
			->method( 'set' )
			->with(
				$expectedKey,
				$value,
				$expectedTTL
			)
			->willReturn( true );

		$store = new MainStashWikifunctionsFragmentStore( $stash );

		$this->assertTrue( $store->setRenderedFragment( $this->functionCall, $value, $httpStatusCode ) );
	}

	public static function provideSetter_TTL(): array {
		$goodValue = [
			'success' => true,
			'value' => 'text',
			'type' => 'Z6',
			'renderDate' => '20260828121500'
		];
		$badValue = [
			'success' => false,
			'value' => 'some-error-message-key',
			'renderDate' => '20260828121500'
		];
		return [
			'success (HTTP 200) caches for TTL_MONTH' => [
				/* value= */ $goodValue,
				/* httpStatusCode= */ HttpStatus::OK,
				/* expectedTTL= */ BagOStuff::TTL_MONTH,
			],
			'bad request (HTTP 400) caches for TTL_WEEK' => [
				/* value= */ $badValue,
				/* httpStatusCode= */ HttpStatus::BAD_REQUEST,
				/* expectedTTL= */ BagOStuff::TTL_WEEK,
			],
			'not found (HTTP 404) caches for TTL_WEEK' => [
				/* value= */ $badValue,
				/* httpStatusCode= */ HttpStatus::NOT_FOUND,
				/* expectedTTL= */ BagOStuff::TTL_WEEK,
			],
			'too many requests (HTTP 429) caches for TTL_MINUTE' => [
				/* value= */ $badValue,
				/* httpStatusCode= */ HttpStatus::TOO_MANY_REQUESTS,
				/* expectedTTL= */ BagOStuff::TTL_MINUTE,
			],
			'server error (HTTP 500) caches for TTL_MINUTE' => [
				/* value= */ $badValue,
				/* httpStatusCode= */ HttpStatus::INTERNAL_SERVER_ERROR,
				/* expectedTTL= */ BagOStuff::TTL_MINUTE,
			],
			'service unavailable (HTTP 503) caches for TTL_MINUTE' => [
				/* value= */ $badValue,
				/* httpStatusCode= */ HttpStatus::SERVICE_UNAVAILABLE,
				/* expectedTTL= */ BagOStuff::TTL_MINUTE,
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

	// isStaleFragment
	// ===============

	/**
	 * @dataProvider provideIsStaleFragment
	 */
	public function testIsStaleFragment( $inputCall, $inputValue, $expectedResult ) {
		ConvertibleTimestamp::setFakeTime( '20260828121500' );

		$isStale = $this->store->isStaleFragment( $inputCall, $inputValue );
		$this->assertSame( $expectedResult, $isStale );

		ConvertibleTimestamp::setFakeTime( false );
	}

	public static function provideIsStaleFragment() {
		$call = [
			'target' => 'Z10000',
			'arguments' => [ 'Z10000K1' => 'foo' ],
			'renderLang' => 'en',
			'parseLang' => 'en',
		];

		$value = [
			'success' => true,
			'value' => '<b>fragment result</b>',
			'type' => 'Z89',
		];

		yield 'call with old value and no temporal args key' => [
			$call,
			[ 'renderDate' => '20220827050200' ] + $value,
			false
		];

		yield 'call with old value and no temporal args content' => [
			[ 'temporalArgs' => [] ] + $call,
			[ 'renderDate' => '20220827050200' ] + $value,
			false
		];

		yield 'call with old temporal/dynamic argument, but no render date' => [
			[
				'arguments' => [ 'Z10000K1' => '27-08-2022' ],
				'temporalArgs' => [ 'Z10000K1' ]
			] + $call,
			$value,
			true
		];

		yield 'call with fresh temporal/dynamic argument, but no render date' => [
			[
				'arguments' => [ 'Z10000K1' => '28-08-2026' ],
				'temporalArgs' => [ 'Z10000K1' ],
			] + $call,
			$value,
			false
		];

		yield 'call with old temporal/dynamic argument, and 2-day old render date' => [
			[
				'arguments' => [ 'Z10000K1' => '27-08-2022' ],
				'temporalArgs' => [ 'Z10000K1' ]
			] + $call,
			[ 'renderDate' => '20260826000000' ] + $value,
			true
		];

		yield 'call with fresh temporal/dynamic argument, and fresh render date' => [
			[
				'arguments' => [ 'Z10000K1' => '28-08-2026' ],
				'temporalArgs' => [ 'Z10000K1' ],
			] + $call,
			[ 'renderDate' => '20260828000000' ] + $value,
			false
		];
	}
}
