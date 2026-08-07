<?php

/**
 * WikiLambda test suite for the MainStash implementation of AWFragmentStore
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentUtils;
use MediaWiki\Extension\WikiLambda\AWStorage\AWFragment;
use MediaWiki\Extension\WikiLambda\AWStorage\MainStashAWFragmentStore;
use MediaWiki\Extension\WikiLambda\Jobs\CacheAbstractContentFragmentJob;
use MediaWiki\Extension\WikiLambda\Language\WikifunctionsLanguage;
use MediaWiki\JobQueue\JobQueueGroup;
use OverflowException;
use Wikimedia\ObjectCache\BagOStuff;
use Wikimedia\ObjectCache\HashBagOStuff;
use Wikimedia\TestingAccessWrapper;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AWStorage\AWFragmentStore
 * @covers \MediaWiki\Extension\WikiLambda\AWStorage\MainStashAWFragmentStore
 */
class MainStashAWFragmentStoreTest extends WikiLambdaAbstractModeIntegrationTestCase {

	private HashBagOStuff $stash;
	private WikifunctionsLanguage $language;

	protected function setUp(): void {
		parent::setUp();

		$this->stash = new HashBagOStuff();
		$this->language = new WikifunctionsLanguage( $this->makeLanguage( 'en' ), 'Z1002' );
	}

	protected function tearDown(): void {
		parent::tearDown();
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

		if ( $jobParams === null ) {
			$jobQueueGroup->expects( $this->never() )->method( 'lazyPush' );
			return $jobQueueGroup;
		}

		$jobQueueGroup->expects( $this->once() )
			->method( 'lazyPush' )
			->with( $this->callback( function ( $job ) use ( $jobParams ) {
				$this->assertInstanceOf( CacheAbstractContentFragmentJob::class, $job );
				$this->assertEquals( $jobParams['fragment'], $job->getParams()['fragment'] );
				$this->assertSame( $jobParams['qid'], $job->getParams()['qid'] );
				$this->assertSame( $jobParams['language'], $job->getParams()['language'] );
				$this->assertSame( $jobParams['datetime'], $job->getParams()['datetime'] );
				return true;
			} ) );

		return $jobQueueGroup;
	}

	/**
	 * Returns a HashBagOStuff subclass that records the TTL and call count
	 * on every set() call, while still writing through to the real store.
	 */
	private function createSpyingStash(): HashBagOStuff {
		return new class( [] ) extends HashBagOStuff {
			public array $ttlsSeen = [];
			public int $setCalls = 0;

			public function set( $key, $value, $exptime = 0, $flags = 0 ) {
				$this->ttlsSeen[] = $exptime;
				$this->setCalls++;
				return parent::set( $key, $value, $exptime, $flags );
			}
		};
	}

	// MainStashAWFragmentStore Getter
	// ===============================

	public function testGetterMissingValue(): void {
		$fragment = [ 'Z1K1' => 'Z89' ];
		$qid = 'Q42';
		$datetime = '20260812202900';

		// Missing fragment should trigger a revalidate job
		$jobQueueGroup = $this->createMockJobQueueGroup( [
			'fragment' => $fragment,
			'qid' => $qid,
			'language' => 'Z1002',
			'datetime' => $datetime,
		] );

		$fragmentStore = new MainStashAWFragmentStore( $jobQueueGroup, $this->stash );

		$result = $fragmentStore->getRenderedAWFragment(
			$fragment,
			$qid,
			$this->language,
			$datetime
		);

		$this->assertInstanceOf( AWFragment::class, $result );
		$this->assertTrue( $result->isMissing() );
		$this->assertFalse( $result->isFresh() );
		$this->assertFalse( $result->isStale() );
		$this->assertSame( [], $result->getValue() );
	}

	public function testGetterMissingValue_noRevalidate(): void {
		$fragment = [ 'Z1K1' => 'Z89' ];
		$qid = 'Q42';
		$datetime = '20260812202900';

		// Mock job queue to assert that no job is created
		$jobQueueGroup = $this->createMockJobQueueGroup();

		$fragmentStore = new MainStashAWFragmentStore( $jobQueueGroup, $this->stash );

		$result = $fragmentStore->getRenderedAWFragment(
			$fragment,
			$qid,
			$this->language,
			$datetime,
			/* revalidate= */ false
		);

		$this->assertInstanceOf( AWFragment::class, $result );
		$this->assertTrue( $result->isMissing() );
		$this->assertFalse( $result->isFresh() );
		$this->assertFalse( $result->isStale() );
		$this->assertSame( [], $result->getValue() );
	}

	public function testGetterFreshValue(): void {
		$qid = 'Q42';
		$fragment = [ 'Z1K1' => 'Z89' ];
		$fragmentKey = AbstractContentUtils::makeCacheKeyForAbstractFragment( $fragment );

		// Mock job queue to assert that no revalidate job is created with a fresh fragment
		$jobQueueGroup = $this->createMockJobQueueGroup();
		$fragmentStore = new MainStashAWFragmentStore( $jobQueueGroup, $this->stash );

		// Set fragment at 2026-08-12 20:29
		$renderTime = '20260312202900';
		$fragmentStore->setRenderedAWFragment(
			$qid,
			$this->language->getZid(),
			$renderTime,
			$fragmentKey,
			[ 'success' => true, 'value' => '<b>fresh</b>' ]
		);

		// Get fragment an hour later, at 2026-08-12 21:29
		$readTime = '20260312212900';
		$result = $fragmentStore->getRenderedAWFragment(
			$fragment,
			$qid,
			$this->language,
			$readTime
		);

		// Fragment rendered one hour ago (within MAX_AGE_HOURS) is marked as fresh
		$this->assertInstanceOf( AWFragment::class, $result );
		$this->assertFalse( $result->isMissing() );
		$this->assertTrue( $result->isFresh() );
		$this->assertFalse( $result->isStale() );
	}

	public function testGetterStaleValue(): void {
		$qid = 'Q42';
		$fragment = [ 'Z1K1' => 'Z89' ];
		$fragmentKey = AbstractContentUtils::makeCacheKeyForAbstractFragment( $fragment );

		// Set fragment at 2026-08-12 20:29
		$renderTime = '20260812202900';
		// Get fragment 31 hours later, at 2026-08-14 03:29
		$readTime = '20260814032900';

		// Mock job queue to assert that no revalidate job is created with a fresh fragment
		$jobQueueGroup = $this->createMockJobQueueGroup( [
			'fragment' => $fragment,
			'qid' => $qid,
			'language' => 'Z1002',
			'datetime' => $readTime,
		] );
		$fragmentStore = new MainStashAWFragmentStore( $jobQueueGroup, $this->stash );

		// Set the fragment in the store
		$fragmentStore->setRenderedAWFragment(
			$qid,
			$this->language->getZid(),
			$renderTime,
			$fragmentKey,
			[ 'success' => true, 'value' => '<b>stale</b>' ]
		);

		// Read the fragment from the store 31 hours later
		$result = $fragmentStore->getRenderedAWFragment(
			$fragment,
			$qid,
			$this->language,
			$readTime
		);

		// Fragment rendered 31 hours ago (out of MAX_AGE_HOURS + MAX_AGE_VARIANCE) is marked as stale
		$this->assertInstanceOf( AWFragment::class, $result );
		$this->assertFalse( $result->isMissing() );
		$this->assertFalse( $result->isFresh() );
		$this->assertTrue( $result->isStale() );
	}

	public function testGetterStaleValue_noRevalidate(): void {
		$qid = 'Q42';
		$fragment = [ 'Z1K1' => 'Z89' ];
		$fragmentKey = AbstractContentUtils::makeCacheKeyForAbstractFragment( $fragment );

		// Set fragment at 2026-08-12 20:29
		$renderTime = '20260812202900';
		// Get fragment 31 hours later, at 2026-08-14 03:29
		$readTime = '20260814032900';

		// Mock job queue to assert that no revalidate job is created with a fresh fragment
		$jobQueueGroup = $this->createMockJobQueueGroup();
		$fragmentStore = new MainStashAWFragmentStore( $jobQueueGroup, $this->stash );

		// Set the fragment in the store
		$fragmentStore->setRenderedAWFragment(
			$qid,
			$this->language->getZid(),
			$renderTime,
			$fragmentKey,
			[ 'success' => true, 'value' => '<b>stale</b>' ]
		);

		// Read the fragment from the store 31 hours later
		$result = $fragmentStore->getRenderedAWFragment(
			$fragment,
			$qid,
			$this->language,
			$readTime,
			/* revalidate=false */ false
		);

		// Fragment rendered 31 hours ago (out of MAX_AGE_HOURS + MAX_AGE_VARIANCE) is marked as stale
		$this->assertInstanceOf( AWFragment::class, $result );
		$this->assertFalse( $result->isMissing() );
		$this->assertFalse( $result->isFresh() );
		$this->assertTrue( $result->isStale() );
	}

	// MainStashAWFragmentStore Setter
	// ===============================

	public function testSetterAddsRenderDate(): void {
		$renderTime = '20260812202900';

		$qid = 'Q42';
		$fragment = [ 'Z1K1' => 'Z89' ];
		$fragmentKey = AbstractContentUtils::makeCacheKeyForAbstractFragment( $fragment );

		$fragmentStore = new MainStashAWFragmentStore( $this->createMockJobQueueGroup(), $this->stash );
		$fragmentStore->setRenderedAWFragment(
			$qid,
			$this->language->getZid(),
			$renderTime,
			$fragmentKey,
			[ 'success' => true, 'value' => '<b>content</b>' ]
		);

		$result = $fragmentStore->getRenderedAWFragment( $fragment, $qid, $this->language, $renderTime );
		$fragmentStoredValue = $result->getValue();

		$this->assertArrayHasKey( 'renderDate', $fragmentStoredValue );
		$this->assertSame( $renderTime, $fragmentStoredValue['renderDate'] );
	}

	public function testSetterSuccessfulFragment(): void {
		$stash = $this->createSpyingStash();
		$fragmentStore = new MainStashAWFragmentStore( $this->createMockJobQueueGroup(), $stash );

		// Successful fragment stored for TTL_MONTH
		$successfulFragment = [ 'success' => true, 'value' => '<b>fresh</b>' ];

		$result = $fragmentStore->setRenderedAWFragment(
			'Q42',
			'Z1002',
			'20260812202900',
			'some-fragment-key',
			$successfulFragment
		);

		$this->assertTrue( $result );
		$this->assertCount( 1, $stash->ttlsSeen );
		$this->assertSame( BagOStuff::TTL_MONTH, $stash->ttlsSeen[0] );
	}

	public function testSetterFailedFragment_badRequest(): void {
		$stash = $this->createSpyingStash();
		$fragmentStore = new MainStashAWFragmentStore( $this->createMockJobQueueGroup(), $stash );

		// Fragments failed with BAD_REQUEST stored as successful ones, for TTL_MONTH
		$badRequestFragment = [ 'success' => false, 'value' => [ 'httpStatusCode' => 400 ] ];

		$fragmentStore->setRenderedAWFragment(
			'Q42',
			'Z1002',
			'20260812202900',
			'some-fragment-key',
			$badRequestFragment
		);

		$this->assertCount( 1, $stash->ttlsSeen );
		$this->assertSame( BagOStuff::TTL_MONTH, $stash->ttlsSeen[0] );
	}

	public function testSetterFailedFragment_transientError(): void {
		$stash = $this->createSpyingStash();
		$fragmentStore = new MainStashAWFragmentStore( $this->createMockJobQueueGroup(), $stash );

		// Fragments failed with a transient error (http 5xx or 429/408)
		// are stored when theres no previously stored value
		$transientErrorFragment = [ 'success' => false, 'value' => [ 'httpStatusCode' => 429 ] ];

		$fragmentStore->setRenderedAWFragment(
			'Q42',
			'Z1002',
			'20260812202900',
			'some-fragment-key',
			$transientErrorFragment
		);

		$this->assertCount( 1, $stash->ttlsSeen );
		$this->assertSame( BagOStuff::TTL_MINUTE, $stash->ttlsSeen[0] );
	}

	public function testSetterFailedFragment_transientError_noOverwrite(): void {
		$qid = 'Q42';
		$fragment = [ 'Z1K1' => 'Z89' ];
		$fragmentKey = AbstractContentUtils::makeCacheKeyForAbstractFragment( $fragment );

		$stash = $this->createSpyingStash();
		$fragmentStore = new MainStashAWFragmentStore( $this->createMockJobQueueGroup(), $stash );

		// Store a successful value first
		$successfulFragment = [ 'success' => true, 'value' => '<b>fresh</b>' ];
		$fragmentStore->setRenderedAWFragment(
			$qid,
			$this->language->getZid(),
			'20260812202900',
			$fragmentKey,
			$successfulFragment
		);
		$setCallsAfterSuccess = $stash->setCalls;

		// Fragments failed with a transient error (http 5xx or 429/408)
		// should not overwrite a previously existing value
		$transientErrorFragment = [ 'success' => false, 'value' => [ 'httpStatusCode' => 500 ] ];

		$result = $fragmentStore->setRenderedAWFragment(
			$qid,
			$this->language->getZid(),
			'20260812203000',
			$fragmentKey,
			$transientErrorFragment
		);

		$this->assertFalse( $result );
		$this->assertSame( $setCallsAfterSuccess, $stash->setCalls );

		$persistedValue = $fragmentStore->getRenderedAWFragment(
			$fragment,
			$qid,
			$this->language,
			'20260812203100',
		);

		$successfulFragment['renderDate'] = '20260812202900';
		$this->assertEquals( $successfulFragment, $persistedValue->getValue() );
	}

	public function testSetterRejectsOversizedPayload(): void {
		$oversized = str_repeat( 'a', MainStashAWFragmentStore::MAX_PAYLOAD_BYTES + 1 );
		$fragmentStore = new MainStashAWFragmentStore( $this->createMockJobQueueGroup(), $this->stash );

		$this->expectException( OverflowException::class );
		$this->expectExceptionMessageMatches( '/Q42.*Z1002.*MainStash limit/' );

		$fragmentStore->setRenderedAWFragment(
			'Q42',
			'Z1002',
			'20260812202900',
			'some-fragment-key',
			[ 'success' => true, 'value' => $oversized ]
		);
	}

	// getFragmentRecencyFlag
	// ======================

	public function testGetFragmentRecencyFlag(): void {
		$storeWrapper = TestingAccessWrapper::newFromObject(
			new MainStashAWFragmentStore( $this->createMockJobQueueGroup(), $this->stash )
		);

		// Variable window from 24 hours to 30 hours, mid point at +27 hours
		$renderDate = '20260812202900';
		$midWindow = '20260813232900';

		$value = [
			'success' => true,
			'value' => '<b>content</b>',
			'renderDate' => $renderDate
		];

		$results = [];
		for ( $i = 0; $i < 100; $i++ ) {
			$results[] = $storeWrapper->getFragmentRecencyFlag( $midWindow, $value );
		}

		// At mid window, we get both fresh and stale fragments
		$this->assertContains( AWFragment::AVAILABILITY_FRESH, $results );
		$this->assertContains( AWFragment::AVAILABILITY_STALE, $results );
	}
}
