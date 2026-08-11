<?php

/**
 * WikiLambda test suite for the RDBMS implementation of AWArticleStore
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\AWStorage\AWFragment;
use MediaWiki\Extension\WikiLambda\AWStorage\MemcachedAWFragmentStore;
use MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper;
use MediaWiki\Extension\WikiLambda\Jobs\CacheAbstractContentFragmentJob;
use MediaWiki\Extension\WikiLambda\Language\WikifunctionsLanguage;
use MediaWiki\JobQueue\JobQueueGroup;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AWStorage\MemcachedAWFragmentStore
 */
class MemcachedAWFragmentStoreTest extends WikiLambdaAbstractModeIntegrationTestCase {

	/**
	 * makeKey returns fresh and stale cache keys
	 * get( fresh-cache-key ) returns $freshValue or false
	 * get( stale-cache-key ) returns $staleValue or false
	 *
	 * @param array|false $freshValue
	 * @param array|false $staleValue
	 * @return MemcachedWrapper
	 */
	private function createMockMemcachedGetter( $freshValue = false, $staleValue = false ): MemcachedWrapper {
		// Mock fresh cache hit: fresh value is available
		$cache = $this->createMock( MemcachedWrapper::class );

		// Mock cache key creation:
		// * when called with $date (5 args), return 'fresh-cache-key'
		// * when called without $date (4 args), return 'stale-cache-key'
		$cache
			->method( 'makeKey' )
			->willReturnCallback( static function ( ...$args ) {
				return ( count( $args ) === 5 ) ? 'fresh-cache-key' : 'stale-cache-key';
			} );

		// Mock cache access: miss for 'fresh-cache-key' but hit for 'stale-cache-key'
		$cache
			->method( 'get' )
			->willReturnCallback( static function ( $key ) use ( $freshValue, $staleValue ) {
				return ( $key === 'fresh-cache-key' ) ?
					json_encode( $freshValue ) :
					json_encode( $staleValue );
			} );

		return $cache;
	}

	/**
	 * makeKey returns fresh and stale cache keys
	 * set( value ) with freshTTL and staleTTL
	 *
	 * @param array $expectValue
	 * @param array $expectCalls
	 * @return MemcachedWrapper
	 */
	private function createMockMemcachedSetter( $expectValue, $expectCalls ): MemcachedWrapper {
		// Mock fresh cache hit: fresh value is available
		$cache = $this->createMock( MemcachedWrapper::class );

		// Mock cache key creation:
		// * when called with $date (5 args), return 'fresh-cache-key'
		// * when called without $date (4 args), return 'stale-cache-key'
		$cache
			->method( 'makeKey' )
			->willReturnCallback( static function ( ...$args ) {
				return ( count( $args ) === 5 ) ? 'fresh-cache-key' : 'stale-cache-key';
			} );

		// Mock cache setter, called count( $expectCalls ) times, with the given key and ttl args
		$cache
			->expects( $this->exactly( count( $expectCalls ) ) )
			->method( 'set' )
			->willReturnCallback(
				function ( $actualKey, $actualValue, $actualTTL ) use ( $expectValue, $expectCalls ) {
					if ( array_key_exists( $actualKey, $expectCalls ) ) {
						$this->assertSame( json_encode( $expectValue ), $actualValue );
						$this->assertSame( $expectCalls[ $actualKey ], $actualTTL );
						return true;
					}
					return false;
				} );

		return $cache;
	}

	/**
	 * Return a JobQueueGroup mock:
	 * * if jobParams=null, no job is queued
	 * * if jobParams is array, job is queued with given params
	 *
	 * @param ?array $jobParams
	 * @return JobQueueGroup
	 */
	private function createMockJobQueueGroup( ?array $jobParams = null ): JobQueueGroup {
		$jobQueueGroup = $this->createMock( JobQueueGroup::class );

		// Mock nothing queued
		if ( $jobParams === null ) {
			$jobQueueGroup->expects( $this->never() )->method( 'lazyPush' );
			return $jobQueueGroup;
		}

		// Mock job queued with given parameters
		$jobQueueGroup->expects( $this->once() )
			->method( 'lazyPush' )
			->with( $this->callback( function ( $job ) use ( $jobParams ) {
				// Assert that called job is the right type
				$this->assertInstanceOf( CacheAbstractContentFragmentJob::class, $job );

				// Assert that job was called with correct parameters
				$this->assertEquals( $jobParams['fragment'], $job->getParams()[ 'fragment' ] );
				$this->assertSame( $jobParams['qid'], $job->getParams()[ 'qid' ] );
				$this->assertSame( $jobParams['language'], $job->getParams()[ 'language' ] );
				$this->assertSame( $jobParams['datetime'], $job->getParams()[ 'datetime' ] );

				return true;
			} ) );

		return $jobQueueGroup;
	}

	// MemcachedAWFragmentStore Getter
	// ===============================

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\AWStorage\MemcachedAWFragmentStore::getRenderedAWFragment
	 */
	public function testGetterFreshValue(): void {
		$fragment = [ 'Z1K1' => 'Z89' ];
		$qid = 'Q42';
		$language = new WikifunctionsLanguage( $this->makeLanguage( 'en' ), 'Z1002' );
		$datetime = '20260515040500';

		// Mock for MemcachedWrapper; fresh value is available
		$cachedPayload = [ 'success' => true, 'value' => '<b>fresh</b>' ];
		$objectCache = $this->createMockMemcachedGetter( $cachedPayload );

		// Mock for JobQueueGroup; no job is ever queued
		$jobQueueGroup = $this->createMockJobQueueGroup();

		$fragmentStore = new MemcachedAWFragmentStore( $jobQueueGroup, $objectCache );

		$result = $fragmentStore->getRenderedAWFragment(
			$fragment,
			$qid,
			$language,
			$datetime
		);

		$this->assertInstanceOf( AWFragment::class, $result );
		$this->assertFalse( $result->isMissing() );
		$this->assertTrue( $result->isFresh() );
		$this->assertFalse( $result->isStale() );
		$this->assertSame( $cachedPayload, $result->getValue() );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\AWStorage\MemcachedAWFragmentStore::getRenderedAWFragment
	 */
	public function testGetterStaleValue(): void {
		$fragment = [ 'Z1K1' => 'Z89' ];
		$qid = 'Q42';
		$language = new WikifunctionsLanguage( $this->makeLanguage( 'en' ), 'Z1002' );
		$datetime = '20260515040500';

		// Mock for MemcachedWrapper; stale value is available
		$cachedPayload = [ 'success' => true, 'value' => '<b>stale</b>' ];
		$objectCache = $this->createMockMemcachedGetter( false, $cachedPayload );

		// Mock jobQueueGroup to assert that revalidate job is pushed to the queue
		$jobQueueGroup = $this->createMockJobQueueGroup( [
			'fragment' => $fragment,
			'qid'  => $qid,
			'language' => 'Z1002',
			'datetime' => $datetime
		] );

		$fragmentStore = new MemcachedAWFragmentStore( $jobQueueGroup, $objectCache );

		$result = $fragmentStore->getRenderedAWFragment(
			$fragment,
			$qid,
			$language,
			$datetime
		);

		$this->assertInstanceOf( AWFragment::class, $result );
		$this->assertFalse( $result->isMissing() );
		$this->assertFalse( $result->isFresh() );
		$this->assertTrue( $result->isStale() );
		$this->assertSame( $cachedPayload, $result->getValue() );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\AWStorage\MemcachedAWFragmentStore::getRenderedAWFragment
	 */
	public function testGetterMissingValue(): void {
		$fragment = [ 'Z1K1' => 'Z89' ];
		$qid = 'Q42';
		$language = new WikifunctionsLanguage( $this->makeLanguage( 'en' ), 'Z1002' );
		$datetime = '20260515040500';

		// Mock for MemcachedWrapper; no value is available
		$objectCache = $this->createMockMemcachedGetter();

		// Mock jobQueueGroup to assert that revalidate job is pushed to the queue
		$jobQueueGroup = $this->createMockJobQueueGroup( [
			'fragment' => $fragment,
			'qid'  => $qid,
			'language' => 'Z1002',
			'datetime' => $datetime
		] );

		$fragmentStore = new MemcachedAWFragmentStore( $jobQueueGroup, $objectCache );

		$result = $fragmentStore->getRenderedAWFragment(
			$fragment,
			$qid,
			$language,
			$datetime
		);

		$this->assertInstanceOf( AWFragment::class, $result );
		$this->assertTrue( $result->isMissing() );
		$this->assertFalse( $result->isFresh() );
		$this->assertFalse( $result->isStale() );
		$this->assertSame( [], $result->getValue() );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\AWStorage\MemcachedAWFragmentStore::getRenderedAWFragment
	 */
	public function testGetterMissingValue_noRevalidate(): void {
		$fragment = [ 'Z1K1' => 'Z89' ];
		$qid = 'Q42';
		$language = new WikifunctionsLanguage( $this->makeLanguage( 'en' ), 'Z1002' );
		$datetime = '20260515040500';

		// Mock for MemcachedWrapper; no value is available
		$objectCache = $this->createMockMemcachedGetter();

		// Mock for JobQueueGroup; no job is ever queued
		$jobQueueGroup = $this->createMockJobQueueGroup();

		$fragmentStore = new MemcachedAWFragmentStore( $jobQueueGroup, $objectCache );

		$result = $fragmentStore->getRenderedAWFragment(
			$fragment,
			$qid,
			$language,
			$datetime,
			/* revalidate= */ false
		);

		$this->assertInstanceOf( AWFragment::class, $result );
		$this->assertTrue( $result->isMissing() );
		$this->assertFalse( $result->isFresh() );
		$this->assertFalse( $result->isStale() );
		$this->assertSame( [], $result->getValue() );
	}

	// MemcachedAWFragmentStore Setter
	// ===============================

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\AWStorage\MemcachedAWFragmentStore::setRenderedAWFragment
	 */
	public function testSetterSuccessfulFragment(): void {
		$qid = 'Q42';
		$languageZid = 'Z1002';
		$datetime = '20260515040500';
		$fragmentKey = 'some-fragment-key';
		$value = [ 'success' => true, 'value' => '<b>fresh</b>' ];

		// Mock for MemcachedWrapper; set successful value for week and month
		$expectCalls = [
			'fresh-cache-key' => MemcachedWrapper::TTL_WEEK,
			'stale-cache-key' => MemcachedWrapper::TTL_MONTH
		];
		$objectCache = $this->createMockMemcachedSetter( $value, $expectCalls );

		// Mock for JobQueueGroup; no job is ever queued
		$jobQueueGroup = $this->createMockJobQueueGroup();

		$fragmentStore = new MemcachedAWFragmentStore( $jobQueueGroup, $objectCache );

		$fragmentStore->setRenderedAWFragment(
			$qid,
			$languageZid,
			$datetime,
			$fragmentKey,
			$value
		);
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\AWStorage\MemcachedAWFragmentStore::setRenderedAWFragment
	 */
	public function testSetterFailedFragment_http400(): void {
		$qid = 'Q42';
		$languageZid = 'Z1002';
		$datetime = '20260515040500';
		$fragmentKey = 'some-fragment-key';
		$value = [ 'success' => false, 'value' => [ 'httpStatusCode' => 400 ] ];

		// Mock for MemcachedWrapper; set bad request failure for week and month
		$expectCalls = [
			'fresh-cache-key' => MemcachedWrapper::TTL_WEEK,
			'stale-cache-key' => MemcachedWrapper::TTL_MONTH
		];
		$objectCache = $this->createMockMemcachedSetter( $value, $expectCalls );

		// Mock for JobQueueGroup; no job is ever queued
		$jobQueueGroup = $this->createMockJobQueueGroup();

		$fragmentStore = new MemcachedAWFragmentStore( $jobQueueGroup, $objectCache );

		$fragmentStore->setRenderedAWFragment(
			$qid,
			$languageZid,
			$datetime,
			$fragmentKey,
			$value
		);
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\AWStorage\MemcachedAWFragmentStore::setRenderedAWFragment
	 */
	public function testSetterFailedFragment_http500(): void {
		$qid = 'Q42';
		$languageZid = 'Z1002';
		$datetime = '20260515040500';
		$fragmentKey = 'some-fragment-key';
		$value = [ 'success' => false, 'value' => [ 'httpStatusCode' => 500 ] ];

		// Mock for MemcachedWrapper; set failure value for minute (only fresh)
		$expectCalls = [
			'fresh-cache-key' => MemcachedWrapper::TTL_MINUTE,
			'stale-cache-key' => MemcachedWrapper::TTL_MONTH
		];
		$objectCache = $this->createMockMemcachedSetter( $value, $expectCalls );

		// Mock for JobQueueGroup; no job is ever queued
		$jobQueueGroup = $this->createMockJobQueueGroup();

		$fragmentStore = new MemcachedAWFragmentStore( $jobQueueGroup, $objectCache );

		$fragmentStore->setRenderedAWFragment(
			$qid,
			$languageZid,
			$datetime,
			$fragmentKey,
			$value
		);
	}
}
