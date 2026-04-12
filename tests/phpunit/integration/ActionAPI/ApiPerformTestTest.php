<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI;

use MediaWiki\Api\ApiUsageException;
use MediaWiki\Extension\WikiLambda\ActionAPI\ApiPerformTest;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjects\ZBoolean;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedMap;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedPair;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Title\Title;
use Wikimedia\Rdbms\IDBAccessObject;
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
	 * @dataProvider provideExecuteSuccessfully
	 * TODO (T374242): Fix Beta Cluster so we can re-enable these tests.
	 * @group Broken
	 */
	public function testExecuteSuccessfully(
		$requestedFunction,
		$requestedZImplementations,
		$requestedZTesters,
		$expectedResults,
		$expectedThrownError = null
	) {
		if ( $expectedThrownError ) {
			$this->expectExceptionMessage( $expectedThrownError );
		}

		$results = $this->doApiRequestWithToken( [
			'action' => 'wikilambda_perform_test',
			'wikilambda_perform_test_zfunction' => $requestedFunction,
			'wikilambda_perform_test_zimplementations' => $requestedZImplementations,
			'wikilambda_perform_test_ztesters' => $requestedZTesters
		] )[0]['query']['wikilambda_perform_test'];

		if ( $expectedThrownError ) {
			return;
		}

		$this->assertSameSize( $expectedResults, $results );

		for ( $i = 0; $i < count( $expectedResults ); $i++ ) {
			$this->assertNotNull(
				$results[$i]['testMetadata'],
				'We should have a meta-data field returned for each result'
			);
			$this->assertEquals(
				$requestedFunction,
				$results[$i]['zFunctionId'],
				'We should have the correct Function ZID returned for each result'
			);
			$this->assertEquals(
				$expectedResults[$i]['zimplementationId'],
				$results[$i]['zImplementationId'],
				'We should have the correct Implementation ZID returned for each result'
			);
			$this->assertEquals(
				$expectedResults[$i]['ztesterId'],
				$results[$i]['zTesterId'],
				'We should have the correct Tester ZID returned for each result'
			);
			$this->assertEquals(
				json_decode( $expectedResults[$i]['validateStatus'] ),
				json_decode( $results[$i]['validateStatus'] ),
				'We should have the correct validation status returned for each result'
			);
			if ( array_key_exists( 'expectedValue', $expectedResults[$i] ) ) {
				$actualExpectedValueItem = current( array_filter(
					json_decode( $results[$i]['testMetadata'] )->K1,
					static function ( $item ) {
						return property_exists( $item, 'K1' ) && $item->K1 === 'expectedTestResult';
					}
				) );
				$this->assertNotFalse(
					$actualExpectedValueItem,
					'We should have the expected value specified for each appropriate result'
				);
				$this->assertEquals(
					json_decode( $expectedResults[$i]['expectedValue'] ),
					$actualExpectedValueItem->K2,
					'We should have the correct expected value returned for each result'
				);
			}
			if ( array_key_exists( 'actualValue', $expectedResults[$i] ) ) {
				$actualActualValueItem = current( array_filter(
					json_decode( $results[$i]['testMetadata'] )->K1,
					static function ( $item ) {
						return property_exists( $item, 'K1' ) && $item->K1 === 'actualTestResult';
					}
				) );
				$this->assertNotFalse(
					$actualActualValueItem,
					'We should have the actual value specified for each appropriate result'
				);
				$this->assertEquals(
					json_decode( $expectedResults[$i]['actualValue'] ),
					$actualActualValueItem->K2,
					'We should have the correct actual value returned for each result'
				);
			}
			if ( array_key_exists( 'functionCallErrorType', $expectedResults[$i] ) ) {
				$this->assertEquals(
					'errors',
					json_decode( $results[$i]['testMetadata'] )->K1[1]->K1,
					'We should have an errors block returned for each appropriate result'
				);
				$this->assertEquals(
					$expectedResults[$i]['functionCallErrorType'],
					json_decode( $results[$i]['testMetadata'] )->K1[1]->K2->{ZTypeRegistry::Z_ERROR_TYPE},
					'We should have the correct error type returned for each appropriate result'
				);
			}
			if ( array_key_exists( 'validationCallErrorType', $expectedResults[$i] ) ) {
				$this->assertEquals(
					'validateErrors',
					json_decode( $results[$i]['testMetadata'] )->K1[9]->K1,
					'We should have a validation errors block returned for each appropriate result'
				);
				$this->assertEquals(
					$expectedResults[$i]['validationCallErrorType'],
					json_decode( $results[$i]['testMetadata'] )->K1[9]->K2->{ZTypeRegistry::Z_ERROR_TYPE},
					'We should have the correct validation error type returned for each appropriate result'
				);
			}
		}

		// Checks related to ApiPerformTest::maybeUpdateImplementationRanking
		$targetTitle = Title::newFromText( $requestedFunction, NS_MAIN );
		$functionRevisionBefore = $targetTitle->getLatestRevID( IDBAccessObject::READ_LATEST );
		$targetObject = $this->store->fetchZObjectByTitle( $targetTitle );
		$targetFunction = $targetObject->getInnerZObject();
		'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZFunction $targetFunction';
		$targetImplementationZids = $targetFunction->getImplementationZids();
		$targetTesterZids = $targetFunction->getTesterZids();
		if ( count( $targetImplementationZids ) <= 1 ||
			array_diff( $targetImplementationZids, $requestedZImplementations ) ||
			array_diff( $targetTesterZids, $requestedZTesters ) ) {
			// No update to implementation ranking should be done
			$this->assertEquals( $functionRevisionBefore,
				$targetTitle->getLatestRevID( IDBAccessObject::READ_LATEST ) );
		}
	}

	public static function provideExecuteSuccessfully() {
		yield 'Request specifies implementation and tester, both by reference' => [
			'Z813',
			'Z913',
			'Z8130',
			[
				[
					'zimplementationId' => 'Z913',
					'ztesterId' => 'Z8130',
					'validateStatus' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
				]
			]
		];

		yield 'Request specifies implementation by reference' => [
			'Z813',
			'Z913',
			'',
			[
				[
					'zimplementationId' => 'Z913',
					'ztesterId' => 'Z8130',
					'validateStatus' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
				],
				[
					'zimplementationId' => 'Z913',
					'ztesterId' => 'Z8131',
					'validateStatus' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
				]
			]
		];

		// TODO (T371837): Fix Beta Cluster so we can re-enable this test.
		// yield 'Request specifies JSON for new implementation' => [
		// 	'Z813',
		// 	self::getTestFileContents( 'new-zimplementation.json' ),
		// 	'',
		// 	[
		// 		[
		// 			'zimplementationId' => 'Z0',
		// 			'ztesterId' => 'Z8130',
		// 			'validateStatus' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z42\"}",
		// 			'expectedValue' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}",
		// 			'actualValue' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z42\"}"
		// 		],
		// 		[
		// 			'zimplementationId' => 'Z0',
		// 			'ztesterId' => 'Z8131',
		// 			'validateStatus' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
		// 		]
		// 	]
		// ];

		// TODO (T371837): Fix Beta Cluster so we can re-enable this test.
		// yield 'Request specifies JSON for edited version of existing implementation' => [
		// 	'Z813',
		// 	str_replace( "true", "false", self::getTestFileContents( 'existing-zimplementation.json' ) ),
		// 	'',
		// 	[
		// 		[
		// 			'zimplementationId' => 'Z1000000',
		// 			'ztesterId' => 'Z8130',
		// 			'validateStatus' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z42\"}",
		// 			'expectedValue' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}",
		// 			'actualValue' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z42\"}"
		// 		],
		// 		[
		// 			'zimplementationId' => 'Z1000000',
		// 			'ztesterId' => 'Z8131',
		// 			'validateStatus' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
		// 		]
		// 	]
		// ];

		yield 'Request specifies tester by reference' => [
			'Z813',
			'',
			'Z8130',
			[
				[
					'zimplementationId' => 'Z913',
					'ztesterId' => 'Z8130',
					'validateStatus' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
				]
			]
		];

		yield 'Request specifies JSON for new tester' => [
			'Z813',
			'',
			self::getTestFileContents( 'new-ztester.json' ),
			[
				[
					'zimplementationId' => 'Z913',
					'ztesterId' => 'Z0',
					'validateStatus' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z42\"}",
					'expectedValue' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z42\"}",
					'actualValue' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
				]
			]
		];

		yield 'Request specifies JSON for edited version of existing tester' => [
			'Z813',
			'',
			str_replace( "Z41", "Z42", self::getTestFileContents( 'existing-ztester.json' ) ),
			[
				[
					'zimplementationId' => 'Z913',
					'ztesterId' => 'Z2000000',
					'validateStatus' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z42\"}",
					'expectedValue' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z42\"}",
					'actualValue' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
				]
			]
		];

		yield 'Request specifies non-existent function' => [
			'Z123456789',
			'',
			'',
			[],
			'Perform test error: \'Z123456789\' isn\'t a known Object'
		];

		yield 'Request specifies non-existent implementation' => [
			'Z813',
			'Z123456789',
			'Z8130',
			[
				[
					'zimplementationId' => 'Z123456789',
					'ztesterId' => 'Z8130',
					'validateStatus' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z42\"}",
					// Error in evaluation
					// TODO (T367089): This should be Z504 instead of Z503
					// 'functionCallErrorType' => 'Z504',
					'functionCallErrorType' => 'Z503',
				]
			],
		];

		yield 'Request specifies non-existent tester' => [
			'Z813',
			'',
			'Z123456789',
			[],
			'Perform test error: \'Z123456789\' isn\'t a known Object'
		];

		yield 'Request specifies non-function as function' => [
			'Z8130',
			'',
			'',
			[],
			'Perform test error: \'Z8130\' isn\'t a function'
		];

		yield 'Request specifies non-implementation as implementation, by reference' => [
			'Z813',
			'Z8130',
			'Z8130',
			[
				[
					'zimplementationId' => 'Z8130',
					'ztesterId' => 'Z8130',
					'validateStatus' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z42\"}",
					// Not wellformed error
					// TODO (T367089): This should be Z504 instead of Z503
					// 'functionCallErrorType' => 'Z517'
					'functionCallErrorType' => 'Z503'
				]
			],
		];

		yield 'Request specifies non-implementation as implementation, by JSON' => [
			'Z813',
			self::getTestFileContents( 'existing-ztester.json' ),
			'',
			[],
			'Perform test error: \'{ "Z1K1": "Z20", "Z20K1": "Z813", "Z20K2": { "Z1K1": "Z7", "Z7K1": "Z813", ' .
				'"Z813K1": [ "Z1" ] }, "Z20K3": { "Z1K1": "Z7", "Z7K1": "Z844", "Z844K2": { "Z1K1": "Z40", "Z40K1": ' .
				'"Z41" } } }\' isn\'t an implementation'
		];

		yield 'Request specifies non-tester as tester' => [
			'Z813',
			'',
			'Z1000000',
			[],
			'Perform test error: \'{ "Z1K1": "Z14", "Z14K1": "Z813", "Z14K3": { "Z1K1": "Z16", "Z16K1": ' .
				'"Z600", "Z16K2": "function Z813( Z813K1 ) { return true; }" } }\' isn\'t a test case.'
		];

		/* Temporarily skipped
		yield 'Request specifies implementation that throws an error' => [
			'Z813',
			str_replace(
				"return false",
				"throw new Error( 'some error' )",
				self::getTestFileContents( 'new-zimplementation.json' ) ),
			'Z8130',
			[
				[
					'zimplementationId' => 'Z0',
					'ztesterId' => 'Z8130',
					'validateStatus' => "\"Z42\"",
					// Error in evaluation
					'functionCallErrorType' => 'Z507'
				]
			]
		]; */

		yield 'Request specifies tester that throws an error' => [
			'Z813',
			'',
			// Adjust tester so that its validation call tries to call boolean equality on a non-boolean
			str_replace( "Z42", "not a boolean", self::getTestFileContents( 'new-ztester.json' ) ),
			[
				[
					'zimplementationId' => 'Z913',
					'ztesterId' => 'Z0',
					'validateStatus' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z42\"}",
					'expectedValue' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"not a boolean\"}",
					'actualValue' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
				]
			]
		];

		yield 'Request with no implementations or testers specified' => [
			'Z813',
			'',
			'',
			[
				[
					'zimplementationId' => 'Z913',
					'ztesterId' => 'Z8130',
					'validateStatus' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
				],
				[
					'zimplementationId' => 'Z913',
					'ztesterId' => 'Z8131',
					'validateStatus' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
				]
			]
		];
	}

	/**
	 * This now doesn't work, because we're mocking the request without trying the network.
	 *
	 * @group Broken
	 */
	public function testExecuteFailure_noServer() {
		$this->overrideConfigValue(
			'WikiLambdaOrchestratorLocation',
			'https://wikifunctions-not-the-orchestrator.wmflabs.org'
		);

		$this->expectExceptionMessage(
			'Could not resolve host \'https://wikifunctions-not-the-orchestrator.wmflabs.org\', probably because the ' .
			'orchestrator is not running. Please consult the README to add the orchestrator to your docker-compose ' .
			'configuration.' );

		$results = $this->doApiRequestWithToken( [
			'action' => 'wikilambda_perform_test',
			'wikilambda_perform_test_zfunction' => 'Z813',
			'wikilambda_perform_test_zimplementations' => 'Z913',
			'wikilambda_perform_test_ztesters' => 'Z8130'
		] )[0]['query']['wikilambda_perform_test'];
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
