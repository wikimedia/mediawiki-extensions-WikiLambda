<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI;

use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Psr7\Request as GuzzleRequest;
use MediaWiki\Api\ApiMain;
use MediaWiki\Api\ApiUsageException;
use MediaWiki\Context\DerivativeContext;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\ActionAPI\ApiPerformTest;
use MediaWiki\Extension\WikiLambda\OrchestratorRequest;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjects\ZBoolean;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedMap;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedPair;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Request\FauxRequest;
use Wikimedia\TestingAccessWrapper;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\ApiPerformTest
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\WikiLambdaApiBase
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZFunction
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils
 * @group API
 * @group Database
 * @group Standalone
 */
class ApiPerformTestTest extends WikiLambdaApiTestCase {

	private ZObjectStore $store;

	private function insertBuiltinObjects( $zids ): void {
		$dataPath = dirname( __DIR__, 4 ) . '/function-schemata/data/definitions';
		foreach ( $zids as $zid ) {
			$data = file_get_contents( "$dataPath/$zid.json" );
			$this->editPage( $zid, $data, '', NS_MAIN );
		}
	}

	private static function getTestFileContents( $fileName ): string {
		// phpcs:ignore Generic.Files.LineLength.TooLong
		$baseDir = __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'test_data' . DIRECTORY_SEPARATOR . 'perform_test';
		$fullFile = $baseDir . DIRECTORY_SEPARATOR . $fileName;
		return file_get_contents( $fullFile );
	}

	protected function setUp(): void {
		parent::setUp();

		$this->store = WikiLambdaServices::getZObjectStore();
	}

	public function addDBData() {
		$this->insertBuiltinObjects( [ 'Z14', 'Z16', 'Z17', 'Z20', 'Z40', 'Z61', 'Z813', 'Z8130', 'Z8131', 'Z913' ] );
		$this->editPage( 'Z1000000', self::getTestFileContents( 'existing-zimplementation.json' ), '', NS_MAIN );
		$this->editPage( 'Z2000000', self::getTestFileContents( 'existing-ztester.json' ), '', NS_MAIN );
	}

	/**
	 * Build an ApiPerformTest module with a FauxRequest, inject a mock orchestrator
	 * that returns the given responses in sequence, execute, and return the result array.
	 *
	 * We're here to test the API code and business logic, not the OrchestratorRequest class nor
	 * the function-orchestrator/function-evaluator services themselves, so we mock the responses.
	 *
	 * @param array $apiParams Request parameters (without module prefix)
	 * @param array $orchestratorResponses Sequential return values for orchestrate()
	 * @return array The result array from the API
	 */
	private function executeWithMockedOrchestrator( array $apiParams, array $orchestratorResponses ): array {
		$prefixed = [ 'action' => 'wikilambda_perform_test' ];
		foreach ( $apiParams as $k => $v ) {
			$prefixed[ 'wikilambda_perform_test_' . $k ] = $v;
		}

		$request = new FauxRequest( $prefixed, true );
		$context = new DerivativeContext( RequestContext::getMain() );
		$context->setRequest( $request );
		$context->setUser( $this->getTestSysop()->getUser() );

		$main = new ApiMain( $context, true );
		$module = new ApiPerformTest( $main, 'wikilambda_perform_test', $this->store );

		$mock = $this->createMock( OrchestratorRequest::class );
		$mock->method( 'orchestrate' )
			->willReturnOnConsecutiveCalls( ...$orchestratorResponses );
		TestingAccessWrapper::newFromObject( $module )->orchestrator = $mock;

		$module->execute();
		$data = $module->getResult()->getResultData();
		return $data['query']['wikilambda_perform_test'] ?? [];
	}

	private static function makeZ22( string $boolZid, bool $withMap = false ): array {
		$metadata = $withMap
			? '{"Z1K1":{"Z1K1":"Z7","Z7K1":"Z883","Z883K1":"Z6","Z883K2":"Z1"},"K1":["Z882"]}'
			: '{"Z1K1":"Z9","Z9K1":"Z24"}';
		return [
			'result' => '{"Z1K1":"Z22",'
				. '"Z22K1":{"Z1K1":"Z40","Z40K1":"' . $boolZid . '"},'
				. '"Z22K2":' . $metadata . '}',
			'httpStatusCode' => 200,
		];
	}

	private static function makePassingZ22( bool $withMap = false ): array {
		return self::makeZ22( 'Z41', $withMap );
	}

	private static function makeFailingZ22(): array {
		return self::makeZ22( 'Z42' );
	}

	public function testRun_happyPath_singleImplSingleTester() {
		$results = $this->executeWithMockedOrchestrator(
			[ 'zfunction' => 'Z813', 'zimplementations' => 'Z913', 'ztesters' => 'Z8130' ],
			[ self::makePassingZ22(), self::makePassingZ22() ]
		);

		$this->assertCount( 1, $results );
		$this->assertSame( 'Z813', $results[0]['zFunctionId'] );
		$this->assertSame( 'Z913', $results[0]['zImplementationId'] );
		$this->assertSame( 'Z8130', $results[0]['zTesterId'] );
	}

	public function testRun_happyPath_singleImplMultipleTesters() {
		$results = $this->executeWithMockedOrchestrator(
			[ 'zfunction' => 'Z813', 'zimplementations' => 'Z913', 'ztesters' => 'Z8130|Z8131' ],
			[
				self::makePassingZ22(), self::makePassingZ22(),
				self::makePassingZ22(), self::makePassingZ22(),
			]
		);

		$this->assertCount( 2, $results );
		$this->assertSame( 'Z8130', $results[0]['zTesterId'] );
		$this->assertSame( 'Z8131', $results[1]['zTesterId'] );
	}

	public function testRun_testPassesButValidationFails() {
		// The first response (test execution) needs a ZTypedMap as Z22K2 because the
		// validation-failure path calls $testMetadata->setValueForKey() to store the
		// actual/expected values on it.
		$results = $this->executeWithMockedOrchestrator(
			[ 'zfunction' => 'Z813', 'zimplementations' => 'Z913', 'ztesters' => 'Z8130' ],
			[ self::makePassingZ22( true ), self::makeFailingZ22() ]
		);

		$this->assertCount( 1, $results );
		$status = json_decode( $results[0]['validateStatus'], true );
		$this->assertSame( 'Z42', $status['Z40K1'] ?? $status );
	}

	public function testRun_nonExistentImplementation_returnsValidationError() {
		$results = $this->executeWithMockedOrchestrator(
			[ 'zfunction' => 'Z813', 'zimplementations' => 'Z123456789', 'ztesters' => 'Z8130' ],
			[]
		);

		$this->assertCount( 1, $results );
		$this->assertSame( 'Z123456789', $results[0]['zImplementationId'] );
		$status = json_decode( $results[0]['validateStatus'], true );
		$this->assertSame( 'Z42', $status['Z40K1'] ?? $status );
	}

	public function testRun_defaultsToConnectedImplsAndTesters() {
		$results = $this->executeWithMockedOrchestrator(
			[ 'zfunction' => 'Z813' ],
			[
				self::makePassingZ22(), self::makePassingZ22(),
				self::makePassingZ22(), self::makePassingZ22(),
			]
		);

		$this->assertCount( 2, $results );
		$this->assertSame( 'Z913', $results[0]['zImplementationId'] );
		$this->assertSame( 'Z913', $results[1]['zImplementationId'] );
	}

	public function testRun_orchestratorConnectionFailure_diesWithError() {
		$this->expectException( ApiUsageException::class );

		$request = new FauxRequest( [
			'action' => 'wikilambda_perform_test',
			'wikilambda_perform_test_zfunction' => 'Z813',
			'wikilambda_perform_test_zimplementations' => 'Z913',
			'wikilambda_perform_test_ztesters' => 'Z8130',
		], true );
		$context = new DerivativeContext( RequestContext::getMain() );
		$context->setRequest( $request );
		$context->setUser( $this->getTestSysop()->getUser() );

		$main = new ApiMain( $context, true );
		$module = new ApiPerformTest( $main, 'wikilambda_perform_test', $this->store );

		$mock = $this->createMock( OrchestratorRequest::class );
		$mock->method( 'orchestrate' )
			->willThrowException( new ConnectException(
				'Connection refused',
				new GuzzleRequest( 'POST', 'http://orchestrator.invalid' )
			) );
		TestingAccessWrapper::newFromObject( $module )->orchestrator = $mock;
		TestingAccessWrapper::newFromObject( $module )->orchestratorHost = 'http://orchestrator.invalid';

		$module->execute();
	}

	// ------------------------------------------------------------------
	// Early-exit guards in run() — these die before any orchestrator call
	// ------------------------------------------------------------------

	public function testRun_diesForNonexistentFunction() {
		$this->expectException( ApiUsageException::class );
		$this->expectExceptionMessage( 'Z999999' );

		$this->doApiRequestWithToken( [
			'action' => 'wikilambda_perform_test',
			'wikilambda_perform_test_zfunction' => 'Z999999',
		] );
	}

	public function testRun_diesForNonFunctionZid() {
		// Z8130 is a tester (Z20), not a function (Z8)
		$this->expectException( ApiUsageException::class );
		$this->expectExceptionMessage( 'Z8130' );

		$this->doApiRequestWithToken( [
			'action' => 'wikilambda_perform_test',
			'wikilambda_perform_test_zfunction' => 'Z8130',
		] );
	}

	// ------------------------------------------------------------------
	// isFalse() — static private helper
	// ------------------------------------------------------------------

	/**
	 * @dataProvider provideIsFalse
	 */
	public function testIsFalse( $input, bool $expected, string $description ) {
		$wrapper = TestingAccessWrapper::newFromClass( ApiPerformTest::class );
		$this->assertSame( $expected, $wrapper->isFalse( $input ), $description );
	}

	public static function provideIsFalse() {
		yield 'Raw string Z42 (false)' => [
			ZTypeRegistry::Z_BOOLEAN_FALSE,
			true,
			'Z42 string should be false',
		];

		yield 'Raw string Z41 (true)' => [
			ZTypeRegistry::Z_BOOLEAN_TRUE,
			false,
			'Z41 string should not be false',
		];

		yield 'ZReference to Z42' => [
			new ZReference( ZTypeRegistry::Z_BOOLEAN_FALSE ),
			true,
			'Reference to Z42 should be false',
		];

		yield 'ZReference to Z41' => [
			new ZReference( ZTypeRegistry::Z_BOOLEAN_TRUE ),
			false,
			'Reference to Z41 should not be false',
		];

		yield 'ZBoolean with false identity' => [
			new ZBoolean( new ZReference( ZTypeRegistry::Z_BOOLEAN_FALSE ) ),
			true,
			'ZBoolean(Z42) should be false',
		];

		yield 'ZBoolean with true identity' => [
			new ZBoolean( new ZReference( ZTypeRegistry::Z_BOOLEAN_TRUE ) ),
			false,
			'ZBoolean(Z41) should not be false',
		];

		yield 'stdClass Z9/Z42 reference' => [
			(object)[
				ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_REFERENCE,
				ZTypeRegistry::Z_REFERENCE_VALUE => ZTypeRegistry::Z_BOOLEAN_FALSE,
			],
			true,
			'stdClass reference to Z42 should be false',
		];

		yield 'stdClass Z40 boolean with Z42 value' => [
			(object)[
				ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_BOOLEAN,
				ZTypeRegistry::Z_BOOLEAN_VALUE => ZTypeRegistry::Z_BOOLEAN_FALSE,
			],
			true,
			'stdClass boolean with Z42 value should be false',
		];

		yield 'Arbitrary string' => [
			'not-a-boolean',
			false,
			'Arbitrary string should not be false',
		];
	}

	// ------------------------------------------------------------------
	// compareImplementationStats() — static private helper
	// ------------------------------------------------------------------

	/**
	 * @dataProvider provideCompareImplementationStats
	 */
	public function testCompareImplementationStats( array $a, array $b, int $expected, string $description ) {
		$wrapper = TestingAccessWrapper::newFromClass( ApiPerformTest::class );
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

	// ------------------------------------------------------------------
	// maybeUpdateImplementationRanking
	// ------------------------------------------------------------------

	/**
	 * Tests the ranking decision logic in maybeUpdateImplementationRanking without
	 * any DB writes. We mock the JobQueueGroup and assert purely on whether the
	 * UpdateImplementationsJob was pushed (and with what ranking). The actual DB
	 * persistence of the ranking is tested separately in UpdateImplementationsJobTest.
	 *
	 * @dataProvider provideMaybeUpdateImplementationRanking
	 */
	public function testMaybeUpdateImplementationRanking(
		$testResults,
		$expectedRanking
	) {
		$functionZid = 'Z813';
		$functionRevision = 1;

		// The initial ranking order: Z91300 is "currently first".
		$attachedImplementationZids = [ 'Z91300', 'Z91301', 'Z91302' ];
		$attachedTesterZids = [ 'Z8130', 'Z8131' ];

		// Build the $implementationMap from the provider data.
		$implementationMap = [];
		foreach ( $testResults as $values ) {
			$metadataMap = $this->makeMetadataMap( array_slice( $values, 2, 4 ) );
			$implementationMap[ $values[ 0 ] ][ $values[ 1 ] ][ 'testMetadata' ] = $metadataMap;
			$implementationMap[ $values[ 0 ] ][ $values[ 1 ] ][ 'validateStatus' ] =
				$this->makeZBoolean( $values[ 6 ] );
		}

		// Mock the job queue to capture whether a ranking update job is pushed.
		$pushedJob = null;
		$mockQueue = $this->createMock( \MediaWiki\JobQueue\JobQueueGroup::class );
		$mockQueue->method( 'push' )
			->willReturnCallback( static function ( $job ) use ( &$pushedJob ) {
				$pushedJob = $job;
			} );
		$this->setService( 'JobQueueGroup', $mockQueue );

		ApiPerformTest::maybeUpdateImplementationRanking( $functionZid, $functionRevision,
			$implementationMap, $attachedImplementationZids, $attachedTesterZids );

		if ( !$expectedRanking ) {
			$this->assertNull( $pushedJob, 'No UpdateImplementationsJob should be pushed' );
		} else {
			$this->assertNotNull( $pushedJob, 'An UpdateImplementationsJob should be pushed' );
			$this->assertSame(
				$expectedRanking,
				$pushedJob->getParams()['implementationRankingZids'],
				'The ranking in the pushed job should match the expected order'
			);
		}
	}

	/**
	 * Each data set mocks the following values for a test run:
	 *   Implementation, tester, OrchestratorCPU, EvaluatorCPU, ExecutorCPU
	 *   OrchestratorDuration, status
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

	private function makeMetadataMap( $values ) {
		$pairType = ZTypedPair::buildType( 'Z6', 'Z1' );
		$map = new ZTypedMap(
			ZTypedMap::buildType( 'Z6', 'Z1' ),
			new ZTypedList( ZTypedList::buildType( $pairType ) )
		);
		if ( $values[ 0 ] ) {
			$map->setValueForKey( new ZString( "orchestrationCpuUsage" ),
				new ZString( $values[ 0 ] ) );
		}
		if ( $values[ 1 ] ) {
			$map->setValueForKey( new ZString( "evaluationCpuUsage" ),
				new ZString( $values[ 1 ] ) );
		}
		if ( $values[ 2 ] ) {
			$map->setValueForKey( new ZString( "executionCpuUsage" ),
				new ZString( $values[ 2 ] ) );
		}
		if ( $values[ 3 ] ) {
			$map->setValueForKey( new ZString( "orchestrationDuration" ),
				new ZString( $values[ 3 ] ) );
		}
		return $map;
	}

	private function makeZBoolean( $value ) {
		if ( $value === true ) {
			return new ZReference( ZTypeRegistry::Z_BOOLEAN_TRUE );
		} else {
			return new ZReference( ZTypeRegistry::Z_BOOLEAN_FALSE );
		}
	}
}
