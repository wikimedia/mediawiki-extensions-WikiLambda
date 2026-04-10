<?php

/**
 * WikiLambda integration test suite for the CacheAbstractContentFragmentJob class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Jobs;

use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiRequest;
use MediaWiki\Extension\WikiLambda\Jobs\CacheAbstractContentFragmentJob;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Jobs\CacheAbstractContentFragmentJob
 * @group Database
 */
class CacheAbstractContentFragmentJobTest extends WikiLambdaIntegrationTestCase {

	private function buildJob( array $overrides = [] ): CacheAbstractContentFragmentJob {
		return new CacheAbstractContentFragmentJob( array_merge( [
			'qid' => 'Q42',
			'language' => 'Z1002',
			'date' => '10-4-2026',
			'functionCall' => [ 'Z1K1' => 'Z7', 'Z7K1' => 'Z825' ],
			'cacheKeyFresh' => 'fresh-key',
			'cacheKeyStale' => 'stale-key',
		], $overrides ) );
	}

	public function testRun_success() {
		$mockRequest = $this->createMock( AbstractWikiRequest::class );
		$mockRequest->expects( $this->once() )
			->method( 'generateSafeFragment' )
			->with(
				[ 'Z1K1' => 'Z7', 'Z7K1' => 'Z825' ],
				'fresh-key',
				'stale-key'
			)
			->willReturn( [ 'success' => true, 'value' => '<b>rendered</b>' ] );

		$this->setService( 'AbstractWikiRequest', $mockRequest );

		$job = $this->buildJob();

		$this->assertTrue( $job->run() );
	}

	public function testRun_failedRender() {
		$mockRequest = $this->createMock( AbstractWikiRequest::class );
		$mockRequest->expects( $this->once() )
			->method( 'generateSafeFragment' )
			->willReturn( [ 'success' => false, 'value' => [ 'msg' => 'some error' ] ] );

		$this->setService( 'AbstractWikiRequest', $mockRequest );

		$job = $this->buildJob();

		// Job returns true even on failed render (no retries)
		$this->assertTrue( $job->run() );
	}

	public function testIgnoreDuplicates() {
		$mockRequest = $this->createMock( AbstractWikiRequest::class );
		$this->setService( 'AbstractWikiRequest', $mockRequest );

		$job = $this->buildJob();

		$this->assertTrue( $job->ignoreDuplicates() );
	}

	public function testAllowRetries() {
		$mockRequest = $this->createMock( AbstractWikiRequest::class );
		$this->setService( 'AbstractWikiRequest', $mockRequest );

		$job = $this->buildJob();

		$this->assertFalse( $job->allowRetries() );
	}

	public function testGetDeduplicationInfo() {
		$mockRequest = $this->createMock( AbstractWikiRequest::class );
		$this->setService( 'AbstractWikiRequest', $mockRequest );

		$job = $this->buildJob();

		$info = $job->getDeduplicationInfo();

		// Deduplication should only keep fragment-defining parameters
		$this->assertSame( 'Q42', $info[ 'params' ][ 'qid' ] );
		$this->assertSame( 'Z1002', $info[ 'params' ][ 'language' ] );
		$this->assertSame( '10-4-2026', $info[ 'params' ][ 'date' ] );
		$this->assertArrayHasKey( 'functionCall', $info[ 'params' ] );

		// Cache keys should NOT be in deduplication info
		$this->assertArrayNotHasKey( 'cacheKeyFresh', $info[ 'params' ] );
		$this->assertArrayNotHasKey( 'cacheKeyStale', $info[ 'params' ] );
	}

	public function testDeduplication_identicalCollapses() {
		$mockRequest = $this->createMock( AbstractWikiRequest::class );
		// Should only be called once despite two jobs being pushed
		$mockRequest->expects( $this->once() )
			->method( 'generateSafeFragment' )
			->willReturn( [ 'success' => true, 'value' => '<b>rendered</b>' ] );
		$this->setService( 'AbstractWikiRequest', $mockRequest );

		$jobQueueGroup = $this->getServiceContainer()->getJobQueueGroup();

		// Push two jobs with all params identical
		$job1 = $this->buildJob();
		$job2 = $this->buildJob();

		$jobQueueGroup->push( $job1 );
		$jobQueueGroup->push( $job2 );

		// Queue should have deduplicated them to a single job
		$this->assertSame( 1, $jobQueueGroup->getQueueSizes()[ 'cacheAbstractContentFragment' ] );

		// Run and verify the queue is drained
		$this->runJobs( [ 'maxJobs' => 2 ], [ 'type' => 'cacheAbstractContentFragment' ] );
		$this->assertSame( 0, $jobQueueGroup->getQueueSizes()[ 'cacheAbstractContentFragment' ] );
	}

	public function testDeduplication_sameFragmentCollapses() {
		$mockRequest = $this->createMock( AbstractWikiRequest::class );
		// Should only be called once despite two jobs being pushed
		$mockRequest->expects( $this->once() )
			->method( 'generateSafeFragment' )
			->willReturn( [ 'success' => true, 'value' => '<b>rendered</b>' ] );
		$this->setService( 'AbstractWikiRequest', $mockRequest );

		$jobQueueGroup = $this->getServiceContainer()->getJobQueueGroup();

		// Push two jobs with identical fragment-defining params but different cache keys
		$job1 = $this->buildJob();
		$job2 = $this->buildJob( [
			'cacheKeyFresh' => 'different-fresh-key',
			'cacheKeyStale' => 'different-stale-key',
		] );

		$jobQueueGroup->push( $job1 );
		$jobQueueGroup->push( $job2 );

		// Queue should have deduplicated them to a single job
		$this->assertSame( 1, $jobQueueGroup->getQueueSizes()[ 'cacheAbstractContentFragment' ] );

		// Run and verify the queue is drained
		$this->runJobs( [ 'maxJobs' => 2 ], [ 'type' => 'cacheAbstractContentFragment' ] );
		$this->assertSame( 0, $jobQueueGroup->getQueueSizes()[ 'cacheAbstractContentFragment' ] );
	}

	public function testDeduplication_differentFragmentKeepsBoth() {
		$mockRequest = $this->createMock( AbstractWikiRequest::class );
		// Should be called twice — once per distinct fragment
		$mockRequest->expects( $this->exactly( 2 ) )
			->method( 'generateSafeFragment' )
			->willReturn( [ 'success' => true, 'value' => '<b>rendered</b>' ] );
		$this->setService( 'AbstractWikiRequest', $mockRequest );

		$jobQueueGroup = $this->getServiceContainer()->getJobQueueGroup();

		$job1 = $this->buildJob();
		$job2 = $this->buildJob( [ 'qid' => 'Q99' ] );

		$jobQueueGroup->push( $job1 );
		$jobQueueGroup->push( $job2 );

		// Different QIDs mean different deduplication keys — both should be queued
		$this->assertSame( 2, $jobQueueGroup->getQueueSizes()[ 'cacheAbstractContentFragment' ] );

		// Run both
		$this->runJobs( [ 'maxJobs' => 2 ], [ 'type' => 'cacheAbstractContentFragment' ] );
		$this->assertSame( 0, $jobQueueGroup->getQueueSizes()[ 'cacheAbstractContentFragment' ] );
	}
}
