<?php

/**
 * WikiLambda integration test suite for the CacheTesterResultsJob class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Jobs;

use MediaWiki\Extension\WikiLambda\Jobs\CacheTesterResultsJob;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\ZObjectStore;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Jobs\CacheTesterResultsJob
 * @group Database
 */
class CacheTesterResultsJobTest extends WikiLambdaIntegrationTestCase {

	private function buildJob( array $overrides = [] ): CacheTesterResultsJob {
		return new CacheTesterResultsJob( array_merge( [
			'functionZid' => 'Z10000',
			'functionRevision' => 1,
			'implementationZid' => 'Z10001',
			'implementationRevision' => 1,
			'testerZid' => 'Z10002',
			'testerRevision' => 1,
			'passed' => true,
			'stashedResult' => '{"Z1K1":"Z40","Z40K1":"Z41"}',
		], $overrides ) );
	}

	public function testRun_successfulInsert() {
		$mockStore = $this->createMock( ZObjectStore::class );
		$mockStore->expects( $this->once() )
			->method( 'insertZTesterResult' )
			->with(
				// functionZid
				'Z10000',
				// functionRevision
				1,
				// implementationZid
				'Z10001',
				// implementationRevision
				1,
				// testerZid
				'Z10002',
				// testerRevision
				1,
				// passed
				true,
				// stashedResult
				'{"Z1K1":"Z40","Z40K1":"Z41"}'
			)
			->willReturn( ZObjectStore::TESTER_RESULT_CACHE_WRITE_INSERTED );

		$this->setService( 'WikiLambdaZObjectStore', $mockStore );

		$job = $this->buildJob();

		$this->assertTrue( $job->run() );
	}

	public function testRun_failedInsert() {
		$mockStore = $this->createMock( ZObjectStore::class );
		$mockStore->expects( $this->once() )
			->method( 'insertZTesterResult' )
			->willReturn( ZObjectStore::TESTER_RESULT_CACHE_WRITE_FAILED );

		$this->setService( 'WikiLambdaZObjectStore', $mockStore );

		$job = $this->buildJob();

		// Job returns true even on failed insert (logs info but doesn't retry)
		$this->assertTrue( $job->run() );
	}

	public function testRun_passesCorrectParameters() {
		$mockStore = $this->createMock( ZObjectStore::class );
		$mockStore->expects( $this->once() )
			->method( 'insertZTesterResult' )
			->with(
				'Z20000',
				42,
				'Z20001',
				7,
				'Z20002',
				3,
				false,
				'{"Z1K1":"Z40","Z40K1":"Z42"}'
			)
			->willReturn( ZObjectStore::TESTER_RESULT_CACHE_WRITE_INSERTED );

		$this->setService( 'WikiLambdaZObjectStore', $mockStore );

		$job = $this->buildJob( [
			'functionZid' => 'Z20000',
			'functionRevision' => 42,
			'implementationZid' => 'Z20001',
			'implementationRevision' => 7,
			'testerZid' => 'Z20002',
			'testerRevision' => 3,
			'passed' => false,
			'stashedResult' => '{"Z1K1":"Z40","Z40K1":"Z42"}',
		] );

		$this->assertTrue( $job->run() );
	}

	public function testRun_staleInsertIsSkipped() {
		$mockStore = $this->createMock( ZObjectStore::class );
		$mockStore->expects( $this->once() )
			->method( 'insertZTesterResult' )
			->willReturn( ZObjectStore::TESTER_RESULT_CACHE_WRITE_STALE );

		$this->setService( 'WikiLambdaZObjectStore', $mockStore );

		$job = $this->buildJob();
		$this->assertTrue( $job->run() );
	}
}
