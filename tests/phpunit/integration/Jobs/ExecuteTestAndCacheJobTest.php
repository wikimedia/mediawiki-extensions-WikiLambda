<?php

/**
 * WikiLambda integration test suite for the CacheTesterResultsJob class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Jobs;

use MediaWiki\Extension\WikiLambda\Jobs\ExecuteTestAndCacheJob;
use MediaWiki\Extension\WikiLambda\Jobs\UpdateImplementationsJob;
use MediaWiki\Extension\WikiLambda\OrchestratorRequest;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\ZObjects\ZBoolean;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\JobQueue\JobQueueGroup;
use stdClass;
use Wikimedia\TestingAccessWrapper;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Jobs\ExecuteTestAndCacheJob
 * @covers \MediaWiki\Extension\WikiLambda\Jobs\StoreTestResultTrait
 * @group Database
 */
class ExecuteTestAndCacheJobTest extends WikiLambdaIntegrationTestCase {

	private const DEFAULT_PARAMS = [
		'functionZid' => 'Z10000',
		'functionRevision' => 1,
		'implementationZid' => 'Z10001',
		'implementationRevision' => 2,
		'testZid' => 'Z10002',
		'testRevision' => 3
	];

	// Helpers
	// =======

	/**/
	private static function buildStoredResult( $passed, $duration ): string {
		$metadata = [ 'orchestrationDuration' => new ZString( $duration ) ];
		$response = self::buildResponseEnvelope( $passed, $metadata );
		return json_encode( $response->getSerialized() );
	}

	/**/
	private static function buildTestStatusRows( array $testResults ): array {
		// Remove the Z to just have an integer be a unique revision id.
		// We don't need to, revisions could all be the same integer,
		// but this is more accurate to have one zid-one revid
		$toRevId = static function ( string $zid ): int {
			return (int)substr( $zid, 1 );
		};

		$rows = [];
		foreach ( $testResults as $values ) {
			$rows[] = [
				'implementationZid' => $values[0],
				'implementationRevision' => $toRevId( $values[0] ),
				'testZid' => $values[1],
				'testRevision' => $toRevId( $values[1] ),
				'hasResult' => 1,
				'passed' => $values[6],
				// NOTE: we only use orchestrationDuration key; if we need to include more
				// just edit buildStoredResult to add the additional keys and pass all values
				'result' => self::buildStoredResult( $values[6], $values[5] )
			];
		}
		return $rows;
	}

	/**/
	private static function buildResponseEnvelope( $passed, $metadata = [] ): ZResponseEnvelope {
		$responseEnv = new ZResponseEnvelope( new ZBoolean( $passed ), null );
		foreach ( $metadata as $key => $value ) {
			$responseEnv->setMetaDataValue( $key, $value );
		}
		return $responseEnv;
	}

	/**/
	private static function buildOrchestratorTestResponse( $passed, $metadata = [] ): array {
		$hasErrors = array_key_exists( 'errors', $metadata );
		$responseEnv = self::buildResponseEnvelope( $passed, $metadata );
		return [
			'passed'    => $passed,
			'value'     => $responseEnv->getZValue(),
			'metadata'  => $responseEnv->getZMetadata(),
			'hasErrors' => $hasErrors,
		];
	}

	/**/
	private function buildJob( array $overrides = [] ): ExecuteTestAndCacheJob {
		return new ExecuteTestAndCacheJob( array_merge(
			self::DEFAULT_PARAMS,
			[
				'testCall' => (object)[],
				'validationCall' => (object)[],
				'firstImplementation' => 'Z10001'
			],
			$overrides
		) );
	}

	// Service Mocks
	// =============

	/**/
	private function mockZObjectStore(
		array $overrides = [],
		array $testStatusRows = []
	): void {
		$params = array_merge(
			self::DEFAULT_PARAMS,
			[
				'passed' => true,
				'stashedResult' => ( self::buildResponseEnvelope( true, [] ) )->getSerialized()
			],
			$overrides
		);

		$mockStore = $this->createMock( ZObjectStore::class );

		// Mock insertZTesterResult to check whether test results are persisted
		$mockStore
			->expects( $this->once() )
			->method( 'insertZTesterResult' )
			->with(
					$params[ 'functionZid' ],
					$params[ 'functionRevision' ],
					$params[ 'implementationZid' ],
					$params[ 'implementationRevision' ],
					$params[ 'testZid' ],
					$params[ 'testRevision' ],
					$params[ 'passed' ],
					$this->callback( static function ( $stashedResult ) use ( $params ) {
						$actual = json_decode( $stashedResult );
						$expected = $params[ 'stashedResult' ];
						return $actual->Z22K1->Z40K1 === $expected->Z22K1->Z40K1;
					} )
		)
		->willReturn( ZObjectStore::TESTER_RESULT_CACHE_WRITE_INSERTED );

		// Mock getTestStatusForLatestRevisions to check the reorder of implementations
		$mockStore
			->expects( $this->once() )
			->method( 'getTestStatusForLatestRevisions' )
			->with( $params[ 'functionZid' ], $params[ 'functionRevision' ] )
			->willReturn( $testStatusRows );

		$this->setService( 'WikiLambdaZObjectStore', $mockStore );
	}

	/**/
	private function mockZObjectStoreNoCalls(): void {
		$mockStore = $this->createMock( ZObjectStore::class );
		$mockStore
			->expects( $this->never() )
			->method( 'insertZTesterResult' );

		$mockStore
			->expects( $this->never() )
			->method( 'getTestStatusForLatestRevisions' );

		$this->setService( 'WikiLambdaZObjectStore', $mockStore );
	}

	/**/
	private function mockOrchestrator( ?array $returnValue = null ): void {
		$mock = $this->createMock( OrchestratorRequest::class );

		$mock
			->expects( $this->once() )
			->method( 'orchestrateTestExecution' )
			->with(
				$this->anything(),
				$this->anything(),
				/* evaluateOnMiss= */ true
			)
			->willReturn( $returnValue );

		$this->setService( 'WikiLambdaOrchestratorRequest', $mock );
	}

	/**/
	private function mockJobQueueGroup(
		int $expectedCount = 0,
		string $expectedJob = '',
		?array $expectedJobParams = null
	): void {
		$mock = $this->createMock( JobQueueGroup::class );
		if ( $expectedCount === 0 ) {
			$mock
				->expects( $this->never() )
				->method( 'push' );
		} else {
			$mock
				->expects( $this->exactly( $expectedCount ) )
				->method( 'push' )
				->willReturnCallback( function ( $job ) use ( $expectedJob, $expectedJobParams ) {
					$this->assertInstanceOf( $expectedJob, $job );
					if ( $expectedJobParams !== null ) {
						$this->assertArrayContains( $expectedJobParams, $job->getParams() );
					}
				} );
		}

		$this->setService( 'JobQueueGroup', $mock );
	}

	// Test cases!
	// ===========

	/**
	 * Tests the successful execution of a test given referenced objects (with their zids
	 * and revisions), so:
	 * * OrchestratorRequest::orchestrateTestExecution returns a successful passing result,
	 * * ZObjectStore::insertZTesterResult is called with the passing result,
	 * * ZObjectStore::getTestStatusForLatestRevisions returns incomplete test status,
	 *   so maybeUpdateImplementationRanking is skipped
	 */
	public function testRun_successfulExecutionAndStorage() {
		$this->mockOrchestrator( self::buildOrchestratorTestResponse( true ) );

		$testStatusRows = [ array_merge( self::DEFAULT_PARAMS, [ 'hasResult' => 0 ] ) ];
		$this->mockZObjectStore( [], $testStatusRows );
		$this->mockJobQueueGroup();

		$job = $this->buildJob();
		$this->assertTrue( $job->run() );
	}

	/**
	 * Tests the successful execution fo a test given an inline literal implementation, so:
	 * * OrchestratorRequest::orchestrateTestExecution returns a successful passing result
	 * * because immplementation revision is null, exits early, so
	 * * ZObjectStore::insertZTesterResult is never called, and
	 * * ZObjectStore::getTestStatusForLatestRevisions is never called
	 */
	public function testRun_successfulExecutionNoStorage() {
		$this->mockOrchestrator( self::buildOrchestratorTestResponse( true ) );

		$this->mockZObjectStoreNoCalls();
		$this->mockJobQueueGroup();

		$job = $this->buildJob( [
			'implementationZid' => null,
			'implementationRevision' => null,
		] );
		$this->assertTrue( $job->run() );
	}

	/**
	 * Tests the successful execution of a test when after executing and storing the
	 * results, it finds that all the connected objects are now updated in the
	 * tests results table.
	 * This triggers maybeUpdateImplementationRanking to be run.
	 * We assert the update ranking is called by forcing it to make a change:
	 * * firstImplementation is Z10001
	 * * bestImplementation is Z10003
	 */
	public function testRun_successfulExecutionAndRankingUpdate() {
		$this->mockOrchestrator( self::buildOrchestratorTestResponse( true ) );
		$testStatusRows = [
			[
				'implementationZid' => 'Z10001',
				'implementationRevision' => 1,
				'testZid' => 'Z10002',
				'testRevision' => 2,
				'hasResult' => 1,
				'passed' => true,
				// First implementation takes 100x times longer than the other one
				'result' => self::buildStoredResult( true, "10.0 ms" )
			],
			[
				'implementationZid' => 'Z10003',
				'implementationRevision' => 3,
				'testZid' => 'Z10002',
				'testRevision' => 2,
				'hasResult' => 1,
				'passed' => true,
				'result' => self::buildStoredResult( true, "0.1 ms" )
			],
		];

		$this->mockZObjectStore( [], $testStatusRows );
		$this->mockJobQueueGroup( 1, UpdateImplementationsJob::class );

		$job = $this->buildJob();
		$this->assertTrue( $job->run() );
	}

	/**
	 * Regression test: when this job runs out-of-process via EventBus, the
	 * JobQueue round-trips its params through JSON, so the stdClass testCall
	 * and validationCall that ApiPerformTest enqueued arrive here decoded as
	 * associative arrays. The job must re-hydrate them to stdClass before
	 * calling orchestrateTestExecution(), which type-hints stdClass; otherwise
	 * the job throws a TypeError on every async execution.
	 */
	public function testRun_rehydratesArrayParamsToStdClass() {
		$mock = $this->createMock( OrchestratorRequest::class );
		$mock
			->expects( $this->once() )
			->method( 'orchestrateTestExecution' )
			->with(
				$this->isInstanceOf( stdClass::class ),
				$this->isInstanceOf( stdClass::class ),
				/* evaluateOnMiss= */ true
			)
			->willReturn( self::buildOrchestratorTestResponse( true ) );
		$this->setService( 'WikiLambdaOrchestratorRequest', $mock );

		$testStatusRows = [ array_merge( self::DEFAULT_PARAMS, [ 'hasResult' => 0 ] ) ];
		$this->mockZObjectStore( [], $testStatusRows );
		$this->mockJobQueueGroup();

		// Mimic the associative-array shape that survives JobQueue serialisation,
		// rather than the stdClass that buildJob() otherwise injects.
		$job = $this->buildJob( [
			'testCall' => [ 'Z1K1' => 'Z7', 'Z7K1' => 'Z10000' ],
			'validationCall' => [ 'Z1K1' => 'Z7', 'Z7K1' => 'Z866' ],
		] );
		$this->assertTrue( $job->run() );
	}

	/**
	 * @dataProvider provideCompareImplementationStats
	 */
	public function testCompareImplementationStats( array $a, array $b, int $expected, string $description ) {
		$wrapper = TestingAccessWrapper::newFromClass( ExecuteTestAndCacheJob::class );
		$this->assertSame( $expected, $wrapper->compareImplementationStats( $a, $b ), $description );
	}

	public static function provideCompareImplementationStats() {
		yield 'Fewer failures wins' => [
			[ 'numFailed' => 0, 'averageTime' => 500 ],
			[ 'numFailed' => 1, 'averageTime' => 100 ],
			-1,
			'Fewer failures should rank higher regardless of speed',
		];

		yield 'More failures loses' => [
			[ 'numFailed' => 2, 'averageTime' => 100 ],
			[ 'numFailed' => 0, 'averageTime' => 500 ],
			1,
			'More failures should rank lower regardless of speed',
		];

		yield 'Equal failures, faster wins' => [
			[ 'numFailed' => 0, 'averageTime' => 100 ],
			[ 'numFailed' => 0, 'averageTime' => 500 ],
			-1,
			'Faster average should rank higher when failures are equal',
		];

		yield 'Equal failures, slower loses' => [
			[ 'numFailed' => 0, 'averageTime' => 500 ],
			[ 'numFailed' => 0, 'averageTime' => 100 ],
			1,
			'Slower average should rank lower when failures are equal',
		];

		yield 'Identical stats' => [
			[ 'numFailed' => 1, 'averageTime' => 300 ],
			[ 'numFailed' => 1, 'averageTime' => 300 ],
			0,
			'Identical stats should compare as equal',
		];
	}

	/**
	 * Tests the ranking decision logic in maybeUpdateImplementationRanking without
	 * any DB writes. We mock the JobQueueGroup and assert purely on whether the
	 * UpdateImplementationsJob was pushed (and with what ranking). The actual DB
	 * persistence of the ranking is tested separately in UpdateImplementationsJobTest.
	 *
	 * @dataProvider provideMaybeUpdateImplementationRanking
	 */
	public function testMaybeUpdateImplementationRanking(
		array $implementationDurations,
		?array $expectedRanking
	) {
		$functionZid = 'Z813';
		$functionRevision = 1;
		$firstImplementation = 'Z91300';

		// Depending on whether we want to update ranking or not, there will be one job or none
		if ( !$expectedRanking ) {
			$this->mockJobQueueGroup();
		} else {
			$this->mockJobQueueGroup( 1, UpdateImplementationsJob::class, [
				'functionZid' => $functionZid,
				'functionRevision' => $functionRevision,
				'implementationRankingZids' => $expectedRanking
			] );
		}

		$job = $this->buildJob( [
			'functionZid' => $functionZid,
			'functionRevision' => $functionRevision,
			'firstImplementation' => $firstImplementation,
		] );

		$testStatusRows = self::buildTestStatusRows( $implementationDurations );

		$job->maybeUpdateImplementationRanking(
			$functionZid,
			$functionRevision,
			$testStatusRows
		);
	}

	/**
	 * Each data set mocks the following values for a test run:
	 * Implementation, tester, OrchestratorCPU, EvaluatorCPU, ExecutorCPU
	 * OrchestratorDuration, status
	 * The ranking algorithm doesn't necessarily use all of these metadata elements, but we
	 * keep them around in case the algorithm evolves.
	 *
	 * OrchestratorDuration was added for T369587. For convenience, it was derived by adding
	 * OrchestratorCPU, EvaluatorCPU, and ExecutorCPU (but can easily be changed as needs evolve).
	 */
	public static function provideMaybeUpdateImplementationRanking() {
		yield 'Request specifies orchestrationCpuUsage values calling for an update' => [
			[
				// Implementation, tester, OrchestratorCPU, EvaluatorCPU, ExecutorCPU,
				// OrchestratorDuration, status
				[ 'Z91300', 'Z8130', '620.049 ms', null, null, '620.049 ms', true ],
				[ 'Z91300', 'Z8131', '670 ms', null, null, '670 ms', true ],
				[ 'Z91301', 'Z8130', '520.026 ms', null, null, '520.026 ms', true ],
				[ 'Z91301', 'Z8131', '500 ms', null, null, '500 ms', true ],
				[ 'Z91302', 'Z8130', '420.026 ms', null, null, '420.026 ms', true ],
				[ 'Z91302', 'Z8131', '420.02 ms', null, null, '420.02 ms', true ]
			],
			[ 'Z91302', 'Z91301', 'Z91300' ]
		];
		yield 'Request specifies orchestrationCpuUsage values calling for NO update' => [
			[
				// Implementation, tester, OrchestratorCPU, EvaluatorCPU, ExecutorCPU,
				// OrchestratorDuration, status
				[ 'Z91300', 'Z8130', '420.026 ms', null, null, '420.026 ms', true ],
				[ 'Z91300', 'Z8131', '420.02 ms', null, null, '420.02 ms', true ],
				[ 'Z91301', 'Z8130', '520.026 ms', null, null, '520.026 ms', true ],
				[ 'Z91301', 'Z8131', '500 ms', null, null, '500 ms', true ],
				[ 'Z91302', 'Z8130', '620.049 ms', null, null, '620.049 ms', true ],
				[ 'Z91302', 'Z8131', '670 ms', null, null, '670 ms', true ]
			],
			null
		];
		yield 'Request specifies ..CpuUsage values calling for an update' => [
			[
				// Implementation, tester, OrchestratorCPU, EvaluatorCPU, ExecutorCPU,
				// OrchestratorDuration, status
				[ 'Z91300', 'Z8130', '1620.049 ms', '20.049 ms', '20.040 ms', '1660.138 ms', true ],
				[ 'Z91300', 'Z8131', '1670 ms', '20.049 ms', '20.000 ms', '1710.049 ms', true ],
				[ 'Z91301', 'Z8130', '520.026 ms', '520.026 ms', '520.026 ms', '1560.078 ms', true ],
				[ 'Z91301', 'Z8131', '500 ms', null, '520.026 ms', '1020.026 ms', true ],
				[ 'Z91302', 'Z8130', '520.026 ms', '520.026 ms', '520.026 ms', '1560.078 ms', true ],
				[ 'Z91302', 'Z8131', '500 ms', '10 ms', '520.026 ms', '1030.026 ms', true ]
			],
			[ 'Z91301', 'Z91302', 'Z91300' ]
		];
		yield 'Request specifies ..CpuUsage values calling for NO update' => [
			[
				// Implementation, tester, OrchestratorCPU, EvaluatorCPU, ExecutorCPU,
				// OrchestratorDuration, status
				[ 'Z91300', 'Z8130', '520.026 ms', '520.026 ms', '520.026 ms', '1560.078 ms', true ],
				[ 'Z91300', 'Z8131', '500 ms', null, '520.026 ms', '1020.026 ms', true ],
				[ 'Z91301', 'Z8130', '520.026 ms', '520.026 ms', '520.026 ms', '1560.078 ms', true ],
				[ 'Z91301', 'Z8131', '500 ms', '10 ms', '520.026 ms', '1030.026 ms', true ],
				[ 'Z91302', 'Z8130', '1620.049 ms', '20.049 ms', '20.040 ms', '1660.138 ms', true ],
				[ 'Z91302', 'Z8131', '1670 ms', '20.049 ms', '20.000 ms', '1710.049 ms', true ]
			],
			null
		];
		yield 'Request specifies validateStatus values calling for an update' => [
			[
				// Implementation, tester, OrchestratorCPU, EvaluatorCPU, ExecutorCPU,
				// OrchestratorDuration, status
				[ 'Z91300', 'Z8130', '420.026 ms', null, null, '420.026 ms', true ],
				[ 'Z91300', 'Z8131', '420.02 ms', null, null, '420.02 ms', false ],
				[ 'Z91301', 'Z8130', '520.026 ms', null, null, '520.026 ms', true ],
				[ 'Z91301', 'Z8131', '500 ms', null, null, '500 ms', true ],
				[ 'Z91302', 'Z8130', '620.049 ms', null, null, '620.049 ms', true ],
				[ 'Z91302', 'Z8131', '670 ms', null, null, '670 ms', true ]
			],
			[ 'Z91301', 'Z91302', 'Z91300' ]
		];
		yield 'Request specifies validateStatus values calling for an update (2)' => [
			[
				// Implementation, tester, OrchestratorCPU, EvaluatorCPU, ExecutorCPU,
				// OrchestratorDuration, status
				[ 'Z91300', 'Z8130', '420.026 ms', null, null, '420.026 ms', false ],
				[ 'Z91300', 'Z8131', '420.02 ms', null, null, '420.02 ms', false ],
				[ 'Z91301', 'Z8130', '520.026 ms', null, null, '520.026 ms', true ],
				[ 'Z91301', 'Z8131', '500 ms', null, null, '500 ms', false ],
				[ 'Z91302', 'Z8130', '620.049 ms', null, null, '620.049 ms', false ],
				[ 'Z91302', 'Z8131', '670 ms', null, null, '670 ms', true ]
			],
			[ 'Z91301', 'Z91302', 'Z91300' ]
		];
		yield 'Request specifies validateStatus values calling for NO update' => [
			[
				// Implementation, tester, OrchestratorCPU, EvaluatorCPU, ExecutorCPU,
				// OrchestratorDuration, status
				[ 'Z91300', 'Z8130', '620.049 ms', null, null, '620.049 ms', true ],
				[ 'Z91300', 'Z8131', '670 ms', null, null, '670 ms', true ],
				[ 'Z91301', 'Z8130', '520.026 ms', null, null, '520.026 ms', true ],
				[ 'Z91301', 'Z8131', '500 ms', null, null, '500 ms', false ],
				[ 'Z91302', 'Z8130', '420.026 ms', null, null, '420.026 ms', false ],
				[ 'Z91302', 'Z8131', '420.02 ms', null, null, '420.02 ms', true ]
			],
			null
		];
		yield 'Request specifies validateStatus+metadata values calling for an update' => [
			[
				// Implementation, tester, OrchestratorCPU, EvaluatorCPU, ExecutorCPU,
				// OrchestratorDuration, status
				[ 'Z91300', 'Z8130', '520.026 ms', '520.026 ms', '20.049 ms', '1060.101 ms', true ],
				[ 'Z91300', 'Z8131', '500 ms', '520.026 ms', '20.049 ms', '1040.075 ms', false ],
				[ 'Z91301', 'Z8130', '620.049 ms', '620.049 ms', null, '1240.098 ms', true ],
				[ 'Z91301', 'Z8131', '670 ms', '620.049 ms', null, '1290.049 ms', false ],
				[ 'Z91302', 'Z8130', '420.026 ms', '420.026 ms', null, '840.052 ms', true ],
				[ 'Z91302', 'Z8131', '420.02 ms', '420.026 ms', null, '840.046 ms', false ]
			],
			[ 'Z91302', 'Z91300', 'Z91301' ]
		];
		yield 'Request specifies validateStatus+metadata values calling for NO update' => [
			[
				// Implementation, tester, OrchestratorCPU, EvaluatorCPU, ExecutorCPU,
				// OrchestratorDuration, status
				[ 'Z91300', 'Z8130', '420.026 ms', null, null, '420.026 ms', true ],
				[ 'Z91300', 'Z8131', '420.02 ms', null, null, '420.02 ms', false ],
				[ 'Z91301', 'Z8130', '520.026 ms', null, null, '520.026 ms', true ],
				[ 'Z91301', 'Z8131', '500 ms', null, null, '500 ms', false ],
				[ 'Z91302', 'Z8130', '620.049 ms', null, null, '620.049 ms', true ],
				[ 'Z91302', 'Z8131', '670 ms', null, null, '670 ms', false ]
			],
			null
		];
		yield 'Bailing due to relativeThreshold' => [
			[
				// Implementation, tester, OrchestratorCPU, EvaluatorCPU, ExecutorCPU,
				// OrchestratorDuration, status
				// Average time for Z91302 >= $relativeThreshold * average time for Z91300;
				// only marginally better so we don't update.
				// $relativeThreshold is defined in ApiPerformTest.php
				[ 'Z91300', 'Z8130', '620.049 ms', null, null, '620.049 ms', true ],
				[ 'Z91300', 'Z8131', '670 ms', null, null, '670 ms', true ],
				[ 'Z91301', 'Z8130', '540.026 ms', null, null, '540.026 ms', true ],
				[ 'Z91301', 'Z8131', '540 ms', null, null, '540 ms', true ],
				[ 'Z91302', 'Z8130', '520.026 ms', null, null, '520.026 ms', true ],
				[ 'Z91302', 'Z8131', '520.02 ms', null, null, '520.02 ms', true ]
			],
			null
		];
		yield 'NOT Bailing due to relativeThreshold, because of status values' => [
			[
				// Implementation, tester, OrchestratorCPU, EvaluatorCPU, ExecutorCPU,
				// OrchestratorDuration, status
				// Average time for Z91302 >= $relativeThreshold * average time for Z91300,
				// BUT Z91300 has a false status, so we SHOULD update.
				// $relativeThreshold is defined in ApiPerformTest.php
				[ 'Z91300', 'Z8130', '620.049 ms', null, null, '620.049 ms', true ],
				[ 'Z91300', 'Z8131', '670 ms', null, null, '670 ms', false ],
				[ 'Z91301', 'Z8130', '540.026 ms', null, null, '540.026 ms', true ],
				[ 'Z91301', 'Z8131', '540 ms', null, null, '540 ms', true ],
				[ 'Z91302', 'Z8130', '520.026 ms', null, null, '520.026 ms', true ],
				[ 'Z91302', 'Z8131', '520.02 ms', null, null, '520.02 ms', true ]
			],
			[ 'Z91302', 'Z91301', 'Z91300' ]
		];
		yield 'Request specifies only a single test result' => [
			[
				// Implementation, tester, OrchestratorCPU, EvaluatorCPU, ExecutorCPU,
				// OrchestratorDuration, status
				[ 'Z91300', 'Z8130', '420.026 ms', null, null, '420.026 ms', true ]
			],
			null
		];
		yield 'Request specifies a proper subset of the attached implementations' => [
			[
				// Implementation, tester, OrchestratorCPU, EvaluatorCPU, ExecutorCPU,
				// OrchestratorDuration, status
				[ 'Z91300', 'Z8130', '420.026 ms', null, null, '420.026 ms', true ],
				[ 'Z91300', 'Z8131', '420.02 ms', null, null, '420.02 ms', false ],
				[ 'Z91301', 'Z8130', '520.026 ms', null, null, '520.026 ms', true ],
				[ 'Z91301', 'Z8131', '500 ms', null, null, '500 ms', false ]
			],
			null
		];
		yield 'Request specifies a proper subset of the attached testers' => [
			[
				// Implementation, tester, OrchestratorCPU, EvaluatorCPU, ExecutorCPU,
				// OrchestratorDuration, status
				[ 'Z91300', 'Z8130', '420.026 ms', null, null, '420.026 ms', true ],
				[ 'Z91301', 'Z8130', '520.026 ms', null, null, '520.026 ms', true ],
				[ 'Z91302', 'Z8130', '620.049 ms', null, null, '620.049 ms', true ]
			],
			null
		];
	}
}
