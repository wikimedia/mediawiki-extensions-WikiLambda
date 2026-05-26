<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI;

use MediaWiki\Api\ApiUsageException;
use MediaWiki\Extension\WikiLambda\Jobs\CacheTesterResultsJob;
use MediaWiki\Extension\WikiLambda\Jobs\ExecuteTestAndCacheJob;
use MediaWiki\Extension\WikiLambda\OrchestratorRequest;
use MediaWiki\Extension\WikiLambda\ZObjects\ZBoolean;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\JobQueue\JobQueueGroup;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\ApiPerformTest
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\WikiLambdaApiBase
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZFunction
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils
 * @group Database
 * @group API
 */
class ApiPerformTestTest extends WikiLambdaApiTestCase {

	public function addDBDataOnce(): void {
		// insert builtin function, tests and implementation
		$this->insertBuiltinObjects( [
			/* dependencies: */ 'Z14', 'Z16', 'Z17', 'Z20', 'Z40', 'Z61',
			/* function: */	'Z813',
			/* tests: */	'Z8130', 'Z8131',
			/* implementation: */	'Z913'
		] );
		// insert non-builtin and disconnected test and implementation
		$this->editPage( 'Z1000000', self::getTestFileContents( 'existing-zimplementation.json' ), '', NS_MAIN );
		$this->editPage( 'Z2000000', self::getTestFileContents( 'existing-ztester.json' ), '', NS_MAIN );
	}

	/**
	 * Tests that requesting a non-existent function ZID returns a 404 error.
	 */
	public function testError_unknownFunctionZid(): void {
		$this->mockOrchestrator();
		$this->mockJobQueueGroup();

		$this->expectApiErrorCode( 'wikilambda-performtest-error-unknown-zid' );

		$this->doApiRequestWithToken( [
			'action' => 'wikilambda_perform_test',
			'format' => 'json',
			'wikilambda_perform_test_zfunction' => 'Z999999',
		] );
	}

	/**
	 * Tests that requesting a ZID that exists but is not a Z8/Function returns a 400 error.
	 */
	public function testError_nonFunctionZid(): void {
		$this->mockOrchestrator();
		$this->mockJobQueueGroup();

		$this->expectApiErrorCode( 'wikilambda-performtest-error-nonfunction' );

		$this->doApiRequestWithToken( [
			'action' => 'wikilambda_perform_test',
			'format' => 'json',
			'wikilambda_perform_test_zfunction' => 'Z913',
		] );
	}

	/**
	 * Tests that requesting tests for inline implementation requires some extra permissions
	 */
	public function testError_noUnsavedCodePermissions(): void {
		$this->mockOrchestrator();
		$this->mockJobQueueGroup();

		$inlineImp = self::getTestFileContents( 'new-zimplementation.json' );
		$inlineImp = str_replace( '|', '🪈', json_encode( json_decode( $inlineImp ) ) );

		$powerlessUser = $this->getTestUser()->getAuthority();

		// Powerful user needs create-implementation rights
		$this->overrideUserPermissions( $powerlessUser, [ 'wikilambda-create-implementation' ] );
		try {
			$this->doApiRequestWithToken(
				[
					'action' => 'wikilambda_perform_test',
					'format' => 'json',
					'wikilambda_perform_test_zfunction' => 'Z813',
					'wikilambda_perform_test_zimplementations' => $inlineImp,
					'wikilambda_perform_test_ztesters' => 'Z8130',
				],
				null,
				$powerlessUser
			);
			$this->fail( "Expected ApiUsateException but none was thrown" );
		} catch ( ApiUsageException $e ) {
			$this->assertSame( 'Error of type Z559', $e->getMessage() );
		}

		// Powerful user needs execute-unsaved-code rights
		$this->overrideUserPermissions( $powerlessUser, [ 'wikilambda-execute-unsaved-code' ] );
		try {
			$this->doApiRequestWithToken(
				[
					'action' => 'wikilambda_perform_test',
					'format' => 'json',
					'wikilambda_perform_test_zfunction' => 'Z813',
					'wikilambda_perform_test_zimplementations' => $inlineImp,
					'wikilambda_perform_test_ztesters' => 'Z8130',
				],
				null,
				$powerlessUser
			);
			$this->fail( "Expected ApiUsateException but none was thrown" );
		} catch ( ApiUsageException $e ) {
			$this->assertSame( 'Error of type Z559', $e->getMessage() );
		}
	}

	/**
	 * Tests that validation errors on one implementation or a tester is
	 * not fatal and doesn't end the call, just adds validateErrors to
	 * the metadata and keeps on going.
	 *
	 * NOTE: there are a lot more cases than this, but we are just trying
	 * one and hoping that all validation issues have the same behavior.
	 */
	public function testError_notReallyFatal(): void {
		$this->mockOrchestrator();
		$this->mockJobQueueGroup();

		$this->insertTestResult( 'Z813', 'Z913', 'Z8130', true, $this->makeZ22( true ) );

		[ $response ] = $this->doApiRequestWithToken( [
			'action' => 'wikilambda_perform_test',
			'format' => 'json',
			'wikilambda_perform_test_zfunction' => 'Z813',
			// Z913 is valid, Z999999 does not exist
			'wikilambda_perform_test_zimplementations' => 'Z913|Z999999',
			'wikilambda_perform_test_ztesters' => 'Z8130',
		] );

		$results = $response['query']['wikilambda_perform_test'];
		$this->assertCount( 2, $results );

		foreach ( $results as $result ) {
			if ( $result[ 'zImplementationId' ] === 'Z999999' ) {
				// Wrong implementation zid
				$this->assertFalse( $this->isZTrue( $result[ 'validateStatus' ] ) );
				$error = $this->getMetadataKey( 'validateErrors', $result[ 'testMetadata' ] );
				$this->assertSame( 'Z500', $error[ 'Z5K1' ] );
				$this->assertSame( "Perform test error: 'Z999999' isn't an implementation.",
					$error[ 'Z5K2' ][ 'K1' ] );
			} else {
				// Correct implementation zid
				$this->assertTrue( $this->isZTrue( $result[ 'validateStatus' ] ) );
				$this->assertFalse( $this->getMetadataKey( 'validateErrors', $result[ 'testMetadata' ] ) );
			}
		}
	}

	/**
	 * Tests the API contract to make sure that the requested tests
	 * and implementations are tested and returned as expected:
	 * * when something is not specified, it will by default test only conected items,
	 * * when requesting tests for objects that are not connected, it will test them,
	 * * it runs all combinations of selected tests against all selected implementations.
	 *
	 * @dataProvider provideResultMatrix
	 */
	public function testResultMatrix_cachedResults(
		array $requestParams,
		array $expectedTests,
		array $expectedImplementations
	): void {
		$this->mockOrchestrator();
		$this->mockJobQueueGroup();

		// Mock the content of the test result table
		$this->insertTestResult( 'Z813', 'Z913', 'Z8130', true, $this->makeZ22( true ) );
		$this->insertTestResult( 'Z813', 'Z913', 'Z8131', true, $this->makeZ22( true ) );
		$this->insertTestResult( 'Z813', 'Z913', 'Z2000000', true, $this->makeZ22( true ) );
		$this->insertTestResult( 'Z813', 'Z1000000', 'Z8130', true, $this->makeZ22( true ) );
		$this->insertTestResult( 'Z813', 'Z1000000', 'Z8131', true, $this->makeZ22( true ) );
		$this->insertTestResult( 'Z813', 'Z1000000', 'Z2000000', true, $this->makeZ22( true ) );

		[ $response ] = $this->doApiRequestWithToken( array_merge( [
			'action' => 'wikilambda_perform_test',
			'format' => 'json'
		], $requestParams ) );

		$this->assertArrayHasKey( 'query', $response );
		$results = $response['query']['wikilambda_perform_test'];
		$this->assertIsArray( $results );

		// There must be N x M results (all combinations of test-implementation)
		$expectedCount = count( $expectedTests ) * count( $expectedImplementations );
		$this->assertCount( $expectedCount, $results );

		// All expected tests are tested
		$actualTests = array_column( $results, 'zTesterId' );
		foreach ( $expectedTests as $zid ) {
			$this->assertContains( $zid, $actualTests );
		}

		// All expected implementations are tested
		$actualImplementations = array_column( $results, 'zImplementationId' );
		foreach ( $expectedImplementations as $zid ) {
			$this->assertContains( $zid, $actualImplementations );
		}

		// All items have a validateStatus and testMetadata
		foreach ( $results as $result ) {
			$this->assertSame( 'Z813', $result['zFunctionId'] );
			$this->assertContains( $result['zTesterId'], $expectedTests );
			$this->assertContains( $result['zImplementationId'], $expectedImplementations );
			$this->assertArrayHasKey( 'validateStatus', $result );
			$this->assertTrue( $this->isZTrue( $result['validateStatus'] ) );
			$this->assertArrayHasKey( 'testMetadata', $result );
		}
	}

	public static function provideResultMatrix(): iterable {
		yield 'when requested for function Zid, tests connected tests and implementations' => [
			'requestParams' => [
				'wikilambda_perform_test_zfunction' => 'Z813'
			],
			'expectedTests' => [ 'Z8130', 'Z8131' ],
			'expectedImplementations' => [ 'Z913' ],
		];

		yield 'when requested for disconnected implementation, tests againsts all connected tests' => [
			'requestParams' => [
				'wikilambda_perform_test_zfunction' => 'Z813',
				'wikilambda_perform_test_zimplementations' => 'Z1000000'
			],
			'expectedTests' => [ 'Z8130', 'Z8131' ],
			'expectedImplementations' => [ 'Z1000000' ],
		];

		yield 'when requested for connected test, tests against all connected implementations' => [
			'requestParams' => [
				'wikilambda_perform_test_zfunction' => 'Z813',
				'wikilambda_perform_test_ztesters' => 'Z8130'
			],
			'expectedTests' => [ 'Z8130' ],
			'expectedImplementations' => [ 'Z913' ],
		];

		yield 'when requested for all connected and disconnected objects, tests everything' => [
			'requestParams' => [
				'wikilambda_perform_test_zfunction' => 'Z813',
				'wikilambda_perform_test_zimplementations' => 'Z913|Z1000000',
				'wikilambda_perform_test_ztesters' => 'Z8130|Z8131|Z2000000',
			],
			'expectedTests' => [ 'Z8130', 'Z8131', 'Z2000000' ],
			'expectedImplementations' => [ 'Z913', 'Z1000000' ],
		];
	}

	/**
	 * Tests inline literal implementations and tests in the request
	 *
	 * @dataProvider provideInlineObjects
	 */
	public function testInlineObjects(
		array $requestParams,
		array $expectedTests,
		array $expectedImplementations
	): void {
		$this->mockJobQueueGroup();
		$mockOrchestrateTest = self::buildOrchestratorTestResponse( true );
		$this->mockOrchestrator( $mockOrchestrateTest );

		[ $response ] = $this->doApiRequestWithToken( array_merge( [
			'action' => 'wikilambda_perform_test',
			'format' => 'json'
		], $requestParams ) );

		$this->assertArrayHasKey( 'query', $response );
		$results = $response['query']['wikilambda_perform_test'];
		$this->assertIsArray( $results );

		// There must be N x M results (all combinations of test-implementation)
		$expectedCount = count( $expectedTests ) * count( $expectedImplementations );
		$this->assertCount( $expectedCount, $results );

		// All expected tests are tested
		$actualTests = array_column( $results, 'zTesterId' );
		foreach ( $expectedTests as $zid ) {
			$this->assertContains( $zid, $actualTests );
		}

		// All expected implementations are tested
		$actualImplementations = array_column( $results, 'zImplementationId' );
		foreach ( $expectedImplementations as $zid ) {
			$this->assertContains( $zid, $actualImplementations );
		}

		// All items have a validateStatus and testMetadata
		foreach ( $results as $result ) {
			$this->assertSame( 'Z813', $result['zFunctionId'] );
			$this->assertContains( $result['zTesterId'], $expectedTests );
			$this->assertContains( $result['zImplementationId'], $expectedImplementations );
			$this->assertArrayHasKey( 'validateStatus', $result );
			$this->assertTrue( $this->isZTrue( $result['validateStatus'] ) );
			$this->assertArrayHasKey( 'testMetadata', $result );
		}
	}

	public static function provideInlineObjects(): iterable {
		$inlineImp = self::getTestFileContents( 'new-zimplementation.json' );
		$inlineImp = str_replace( '|', '🪈', json_encode( json_decode( $inlineImp ) ) );

		yield 'when requested for an inline implementation, runs against connected tests' => [
			'requestParams' => [
				'wikilambda_perform_test_zfunction' => 'Z813',
				'wikilambda_perform_test_zimplementations' => $inlineImp,
			],
			'expectedTests' => [ 'Z8130', 'Z8131' ],
			'expectedImplementations' => [ null ],
		];

		yield 'when requested for an inline implementation and all tests, runs against all tests' => [
			'requestParams' => [
				'wikilambda_perform_test_zfunction' => 'Z813',
				'wikilambda_perform_test_zimplementations' => $inlineImp,
				'wikilambda_perform_test_ztesters' => 'Z8130|Z8131|Z2000000',
			],
			'expectedTests' => [ 'Z8130', 'Z8131', 'Z2000000' ],
			'expectedImplementations' => [ null ],
		];

		$inlineTest = self::getTestFileContents( 'new-ztester.json' );
		$inlineTest = str_replace( '|', '🪈', json_encode( json_decode( $inlineTest ) ) );

		yield 'when requested for an inline test, runs against connected implementations' => [
			'requestParams' => [
				'wikilambda_perform_test_zfunction' => 'Z813',
				'wikilambda_perform_test_ztesters' => $inlineTest,
			],
			'expectedTests' => [ null ],
			'expectedImplementations' => [ 'Z913' ],
		];

		yield 'when requested for an inline test and all implementations, runs against all implementations' => [
			'requestParams' => [
				'wikilambda_perform_test_zfunction' => 'Z813',
				'wikilambda_perform_test_zimplementations' => 'Z913|Z1000000',
				'wikilambda_perform_test_ztesters' => $inlineTest,
			],
			'expectedTests' => [ null ],
			'expectedImplementations' => [ 'Z913', 'Z1000000' ],
		];
	}

	/**
	 * @dataProvider provideOrchestratorResults
	 */
	public function testOrchestratorReturned(
		array|false $orchestratorResponse,
		string $expectedJob,
		bool $expectPassed,
		bool $expectPending
	): void {
		$this->mockOrchestrator( $orchestratorResponse );
		$this->mockJobQueueGroup( 4, $expectedJob );

		[ $response ] = $this->doApiRequestWithToken( [
			'action' => 'wikilambda_perform_test',
			'wikilambda_perform_test_zfunction' => 'Z813',
			'wikilambda_perform_test_zimplementations' => 'Z913|Z1000000',
			'wikilambda_perform_test_ztesters' => 'Z8130|Z8131',
			'format' => 'json'
		] );

		$this->assertArrayHasKey( 'query', $response );
		$results = $response['query']['wikilambda_perform_test'];
		$this->assertIsArray( $results );
		$this->assertCount( 4, $results );

		$expectedTests = [ 'Z8130', 'Z8131' ];
		$expectedImplementations = [ 'Z913', 'Z1000000' ];

		foreach ( $results as $result ) {
			$this->assertSame( 'Z813', $result['zFunctionId'] );
			$this->assertContains( $result['zTesterId'], $expectedTests );
			$this->assertContains( $result['zImplementationId'], $expectedImplementations );
			$this->assertArrayHasKey( 'validateStatus', $result );
			$this->assertArrayHasKey( 'testMetadata', $result );
			// passed or failed?
			$this->assertSame( $expectPassed, $this->isZTrue( $result['validateStatus'] ) );
			// pending or ready?
			$this->assertSame( $expectPending, $this->hasPendingKey( $result['testMetadata'] ) );
		}
	}

	public static function provideOrchestratorResults(): iterable {
		// Tests when results are not cached but they are returned successfully by
		// orchestrator::orchestrateTestExecution, because they are cached in a
		// different layer and they can be immediately retrieved.
		yield 'all pass' => [
			'orchestratorResponse' => self::buildOrchestratorTestResponse( true ),
			'expectedJob' => CacheTesterResultsJob::class,
			'expectPassed' => true,
			'expectPending' => false
		];

		// Tests when results are not cached but they are returned successfully by
		// orchestrator::orchestrateTestExecution, because they are cached in a
		// different layer and they can be immediately retrieved.
		yield 'all fail' => [
			'orchestratorResponse' => self::buildOrchestratorTestResponse( false ),
			'expectedJob' => CacheTesterResultsJob::class,
			'expectPassed' => false,
			'expectPending' => false
		];

		// Tests when results are not cached and orchestrator::orchestrateTestExecution
		// also didn't return anything, because the relevant calls were also not cached
		yield 'all pending' => [
			'orchestratorResponse' => false,
			'expectedJob' => ExecuteTestAndCacheJob::class,
			'expectPassed' => false,
			'expectPending' => true
		];
	}

	// /**
	// * Build an ApiPerformTest module with a FauxRequest, inject a mock orchestrator
	// * that returns the given responses in sequence, execute, and return the result array.
	// *
	// * We're here to test the API code and business logic, not the OrchestratorRequest class nor
	// * the function-orchestrator/function-evaluator services themselves, so we mock the responses.
	// *
	// * @param array $apiParams Request parameters (without module prefix)
	// * @param array $orchestratorResponses Sequential return values for orchestrate()
	// * @return array The result array from the API
	// */
	// private function executeWithMockedOrchestrator( array $apiParams, array $orchestratorResponses ): array {
	// 	$prefixed = [ 'action' => 'wikilambda_perform_test' ];
	// 	foreach ( $apiParams as $k => $v ) {
	// 		$prefixed[ 'wikilambda_perform_test_' . $k ] = $v;
	// 	}

	// 	$request = new FauxRequest( $prefixed, true );
	// 	$context = new DerivativeContext( RequestContext::getMain() );
	// 	$context->setRequest( $request );
	// 	$context->setUser( $this->getTestSysop()->getUser() );

	// 	$main = new ApiMain( $context, true );
	// 	$module = new ApiPerformTest( $main, 'wikilambda_perform_test', $this->store );

	// 	$mock = $this->createMock( OrchestratorRequest::class );
	// 	$mock->method( 'orchestrate' )
	// 		->willReturnOnConsecutiveCalls( ...$orchestratorResponses );
	// 	TestingAccessWrapper::newFromObject( $module )->orchestrator = $mock;

	// 	$module->execute();
	// 	$data = $module->getResult()->getResultData();
	// 	return $data['query']['wikilambda_perform_test'] ?? [];
	// }

	// public function testRun_happyPath_singleImplMultipleTesters() {
	// 	$results = $this->executeWithMockedOrchestrator(
	// 		[ 'zfunction' => 'Z813', 'zimplementations' => 'Z913', 'ztesters' => 'Z8130|Z8131' ],
	// 		[
	// 			self::makePassingZ22(), self::makePassingZ22(),
	// 			self::makePassingZ22(), self::makePassingZ22(),
	// 		]
	// 	);

	// 	$this->assertCount( 2, $results );
	// 	$this->assertSame( 'Z8130', $results[0]['zTesterId'] );
	// 	$this->assertSame( 'Z8131', $results[1]['zTesterId'] );
	// }

	// public function testRun_testPassesButValidationFails() {
	// 	// The first response (test execution) needs a ZTypedMap as Z22K2 because the
	// 	// validation-failure path calls $testMetadata->setValueForKey() to store the
	// 	// actual/expected values on it.
	// 	$results = $this->executeWithMockedOrchestrator(
	// 		[ 'zfunction' => 'Z813', 'zimplementations' => 'Z913', 'ztesters' => 'Z8130' ],
	// 		[ self::makePassingZ22( true ), self::makeFailingZ22() ]
	// 	);

	// 	$this->assertCount( 1, $results );
	// 	$status = json_decode( $results[0]['validateStatus'], true );
	// 	$this->assertSame( 'Z42', $status['Z40K1'] ?? $status );
	// }

	// public function testRun_nonExistentImplementation_returnsValidationError() {
	// 	$results = $this->executeWithMockedOrchestrator(
	// 		[ 'zfunction' => 'Z813', 'zimplementations' => 'Z123456789', 'ztesters' => 'Z8130' ],
	// 		[]
	// 	);

	// 	$this->assertCount( 1, $results );
	// 	$this->assertSame( 'Z123456789', $results[0]['zImplementationId'] );
	// 	$status = json_decode( $results[0]['validateStatus'], true );
	// 	$this->assertSame( 'Z42', $status['Z40K1'] ?? $status );
	// }

	// public function testRun_defaultsToConnectedImplsAndTesters() {
	// 	$results = $this->executeWithMockedOrchestrator(
	// 		[ 'zfunction' => 'Z813' ],
	// 		[
	// 			self::makePassingZ22(), self::makePassingZ22(),
	// 			self::makePassingZ22(), self::makePassingZ22(),
	// 		]
	// 	);

	// 	$this->assertCount( 2, $results );
	// 	$this->assertSame( 'Z913', $results[0]['zImplementationId'] );
	// 	$this->assertSame( 'Z913', $results[1]['zImplementationId'] );
	// }

	// public function testRun_orchestratorConnectionFailure_diesWithError() {
	// 	$this->expectException( ApiUsageException::class );

	// 	$request = new FauxRequest( [
	// 		'action' => 'wikilambda_perform_test',
	// 		'wikilambda_perform_test_zfunction' => 'Z813',
	// 		'wikilambda_perform_test_zimplementations' => 'Z913',
	// 		'wikilambda_perform_test_ztesters' => 'Z8130',
	// 	], true );
	// 	$context = new DerivativeContext( RequestContext::getMain() );
	// 	$context->setRequest( $request );
	// 	$context->setUser( $this->getTestSysop()->getUser() );

	// 	$main = new ApiMain( $context, true );
	// 	$module = new ApiPerformTest( $main, 'wikilambda_perform_test', $this->store );

	// 	$mock = $this->createMock( OrchestratorRequest::class );
	// 	$mock->method( 'orchestrate' )
	// 		->willThrowException( new ConnectException(
	// 			'Connection refused',
	// 			new GuzzleRequest( 'POST', 'http://orchestrator.invalid' )
	// 		) );
	// 	TestingAccessWrapper::newFromObject( $module )->orchestrator = $mock;
	// 	TestingAccessWrapper::newFromObject( $module )->orchestratorHost = 'http://orchestrator.invalid';

	// 	$module->execute();
	// }

	// // ------------------------------------------------------------------
	// // Early-exit guards in run() — these die before any orchestrator call
	// // ------------------------------------------------------------------

	// public function testRun_diesForNonexistentFunction() {
	// 	$this->expectException( ApiUsageException::class );
	// 	$this->expectExceptionMessage( 'Z999999' );

	// 	$this->doApiRequestWithToken( [
	// 		'action' => 'wikilambda_perform_test',
	// 		'wikilambda_perform_test_zfunction' => 'Z999999',
	// 	] );
	// }

	// public function testRun_diesForNonFunctionZid() {
	// 	// Z8130 is a tester (Z20), not a function (Z8)
	// 	$this->expectException( ApiUsageException::class );
	// 	$this->expectExceptionMessage( 'Z8130' );

	// 	$this->doApiRequestWithToken( [
	// 		'action' => 'wikilambda_perform_test',
	// 		'wikilambda_perform_test_zfunction' => 'Z8130',
	// 	] );
	// }

	private function mockOrchestrator( $returnValue = null ): void {
		$mock = $this->createMock( OrchestratorRequest::class );
		if ( $returnValue === null ) {
			$mock
				->expects( $this->never() )
				->method( 'orchestrateTestExecution' );
		} else {
			$mock
				->method( 'orchestrateTestExecution' )
				->willReturn( $returnValue );
		}

		$this->setService( 'WikiLambdaOrchestratorRequest', $mock );
	}

	private function mockJobQueueGroup( int $expectedCount = 0, string $expectedJob = '' ): void {
		$mock = $this->createMock( JobQueueGroup::class );
		if ( $expectedCount === 0 ) {
			$mock
				->expects( $this->never() )
				->method( 'push' );
		} else {
			$mock
				->expects( $this->exactly( $expectedCount ) )
				->method( 'push' )
				->willReturnCallback( function ( $job ) use ( $expectedJob ) {
					$this->assertInstanceOf( $expectedJob, $job );
				} );
		}

		$this->setService( 'JobQueueGroup', $mock );
	}

	private function isZTrue( string $encodedBool ): bool {
		$zbool = json_decode( $encodedBool, true );
		return ( is_string( $zbool ) && $zbool === 'Z41' ) ||
		( is_array( $zbool ) && $zbool[ 'Z40K1'] === 'Z41' );
	}

	private function getMetadataKey( string $key, string $zmap ) {
		$map = json_decode( $zmap, true );
		$list = is_array( $map ) && array_key_exists( 'K1', $map ) ?
		array_slice( $map[ 'K1' ], 1 ) : [];
		foreach ( $list as $pair ) {
			if ( $pair[ 'K1' ] === $key ) {
				return $pair[ 'K2' ];
			}
		}
		return false;
	}

	private function hasPendingKey( string $zmap ): bool {
		$value = $this->getMetadataKey( 'pending', $zmap );
		if ( $value !== false ) {
			return is_array( $value ) ?
				$value[ 'Z40K1' ] === 'Z41' :
				$value === 'Z41';
		}
		return false;
	}

	private static function getTestFileContents( $fileName ): string {
		$baseDir = dirname( __DIR__, 2 ) . '/test_data/perform_test';
		$fullFile = $baseDir . DIRECTORY_SEPARATOR . $fileName;
		return file_get_contents( $fullFile );
	}

	/**
	 * Inserts a row into wikilambda_ztester_results
	 *
	 * @param string $functionZid
	 * @param string $implementationZid
	 * @param string $testZid
	 * @param bool $passed
	 * @param string $stashedResult
	 */
	private function insertTestResult(
		string $functionZid,
		string $implementationZid,
		string $testZid,
		bool $passed,
		string $stashedResult
	): void {
		$db = $this->getDb();
		$db->newInsertQueryBuilder()
			->insertInto( 'wikilambda_ztester_results' )
			->row( [
				'wlztr_zfunction_zid' => $functionZid,
				'wlztr_zfunction_revision' => self::makeRevId( $functionZid ),
				'wlztr_zimplementation_zid' => $implementationZid,
				'wlztr_zimplementation_revision' => self::makeRevId( $implementationZid ),
				'wlztr_ztester_zid' => $testZid,
				'wlztr_ztester_revision' => self::makeRevId( $testZid ),
				'wlztr_pass' => (int)$passed,
				'wlztr_returnobject' => $stashedResult,
			] )
			->caller( __METHOD__ )
			->execute();
	}

	/**/
	private static function makeRevId( $zid ) {
		$title = Title::newFromText( $zid, NS_MAIN );
		return $title->getLatestRevID();
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
	private static function makeZ22( bool $passed, array $metadata = [] ): string {
		$responseEnv = self::buildResponseEnvelope( $passed, $metadata );
		return json_encode( $responseEnv->getSerialized() );
	}

	/**/
	private static function buildOrchestratorTestResponse( $passed, $metadata = [] ): array {
		$hasErrors = array_key_exists( 'errors', $metadata );
		$responseEnv = self::buildResponseEnvelope( $passed, $metadata );
		return [
			'passed' => $passed,
			'value' => $responseEnv->getZValue(),
			'metadata' => $responseEnv->getZMetadata(),
			'hasErrors' => $hasErrors,
		];
	}
}
