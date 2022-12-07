<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Api;

use ApiTestCase;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\API\ApiPerformTest
 * @group API
 * @group Database
 * @group medium
 */
class ApiPerformTestTest extends ApiTestCase {
	private function insertBuiltinObjects( $zids ): void {
		$dataPath = dirname( __DIR__, 4 ) . '/function-schemata/data/definitions';
		foreach ( $zids as $zid ) {
			$data = file_get_contents( "$dataPath/$zid.json" );
			$this->editPage( $zid, $data, '', NS_MAIN );
		}
	}

	private function getTestFileContents( $fileName ): string {
		// @codingStandardsIgnoreLine
		$baseDir = __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'test_data' . DIRECTORY_SEPARATOR . 'perform_test';
		$fullFile = $baseDir . DIRECTORY_SEPARATOR . $fileName;
		return file_get_contents( $fullFile );
	}

	protected function setUp(): void {
		parent::setUp();

		$this->tablesUsed[] = 'wikilambda_zobject_labels';
		$this->tablesUsed[] = 'wikilambda_zobject_function_join';
	}

	public function addDBData() {
		$this->insertBuiltinObjects( [ 'Z14', 'Z16', 'Z17', 'Z20', 'Z40', 'Z61', 'Z813', 'Z8130', 'Z8131', 'Z913' ] );
		$this->editPage( 'Z1000000', $this->getTestFileContents( 'existing-zimplementation.json' ), '', NS_MAIN );
		$this->editPage( 'Z2000000', $this->getTestFileContents( 'existing-ztester.json' ), '', NS_MAIN );
	}

	/**
	 * @dataProvider provideExecuteSuccessfully
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiPerformTest::__construct
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiPerformTest::execute
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiPerformTest::executeGenerator
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiPerformTest::executeFunctionCall
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiPerformTest::getZid
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiPerformTest::getImplementationListEntry
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiPerformTest::getTesterObject
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiPerformTest::isFalse
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiPerformTest::run
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

		$this->assertEquals( count( $expectedResults ), count( $results ) );

		for ( $i = 0; $i < count( $expectedResults ); $i++ ) {
			$this->assertNotNull(
				$results[$i]['testMetadata']
			);
			$this->assertEquals(
				$requestedFunction,
				$results[$i]['zFunctionId']
			);
			$this->assertEquals(
				$expectedResults[$i]['zimplementationId'],
				$results[$i]['zImplementationId']
			);
			$this->assertEquals(
				$expectedResults[$i]['ztesterId'],
				$results[$i]['zTesterId']
			);
			$this->assertEquals(
				json_decode( $expectedResults[$i]['validateStatus'] ),
				json_decode( $results[$i]['validateStatus'] )
			);
			if ( array_key_exists( 'expectedValue', $expectedResults[$i] ) ) {
				$actualExpectedValueItem = current( array_filter(
					json_decode( $results[$i]['testMetadata'] )->K1,
					static function ( $item ) {
						return property_exists( $item, 'K1' ) && $item->K1 === 'expectedTestResult';
					}
				) );
				$this->assertNotFalse( $actualExpectedValueItem );
				$this->assertEquals(
					json_decode( $expectedResults[$i]['expectedValue'] ),
					$actualExpectedValueItem->K2
				);
			}
			if ( array_key_exists( 'actualValue', $expectedResults[$i] ) ) {
				$actualActualValueItem = current( array_filter(
					json_decode( $results[$i]['testMetadata'] )->K1,
					static function ( $item ) {
						return property_exists( $item, 'K1' ) && $item->K1 === 'actualTestResult';
					}
				) );
				$this->assertNotFalse( $actualActualValueItem );
				$this->assertEquals(
					json_decode( $expectedResults[$i]['actualValue'] ),
					$actualActualValueItem->K2
				);
			}
			if ( array_key_exists( 'functionCallErrorType', $expectedResults[$i] ) ) {
				$this->assertEquals(
					'errors',
					json_decode( $results[$i]['testMetadata'] )->K1[1]->K1
				);
				$this->assertEquals(
					$expectedResults[$i]['functionCallErrorType'],
					json_decode( $results[$i]['testMetadata'] )->K1[1]->K2->{ZTypeRegistry::Z_ERROR_TYPE}
				);
			}
			if ( array_key_exists( 'validationCallErrorType', $expectedResults[$i] ) ) {
				$this->assertEquals(
					'validateErrors',
					json_decode( $results[$i]['testMetadata'] )->K1[9]->K1
				);
				$this->assertEquals(
					$expectedResults[$i]['validationCallErrorType'],
					json_decode( $results[$i]['testMetadata'] )->K1[9]->K2->{ZTypeRegistry::Z_ERROR_TYPE}
				);
			}
		}
	}

	public function provideExecuteSuccessfully() {
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
		yield 'Request specifies JSON for new implementation' => [
			'Z813',
			$this->getTestFileContents( 'new-zimplementation.json' ),
			'',
			[
				[
					'zimplementationId' => 'Z0',
					'ztesterId' => 'Z8130',
					'validateStatus' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z42\"}",
					'expectedValue' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}",
					'actualValue' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z42\"}"
				],
				[
					'zimplementationId' => 'Z0',
					'ztesterId' => 'Z8131',
					'validateStatus' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
				]
			]
		];
		yield 'Request specifies JSON for edited version of existing implementation' => [
			'Z813',
			str_replace( "True", "False", $this->getTestFileContents( 'existing-zimplementation.json' ) ),
			'',
			[
				[
					'zimplementationId' => 'Z1000000',
					'ztesterId' => 'Z8130',
					'validateStatus' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z42\"}",
					'expectedValue' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}",
					'actualValue' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z42\"}"
				],
				[
					'zimplementationId' => 'Z1000000',
					'ztesterId' => 'Z8131',
					'validateStatus' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
				]
			]
		];
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
			$this->getTestFileContents( 'new-ztester.json' ),
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
			str_replace( "Z41", "Z42", $this->getTestFileContents( 'existing-ztester.json' ) ),
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
			'Perform test error: \'Z123456789\' isn\'t a known ZObject'
		];
		yield 'Request specifies non-existent implementation' => [
			'Z813',
			'Z123456789',
			'Z8130',
			[
				[
					'zimplementationId' => 'Z123456789',
					'ztesterId' => 'Z8130',
					'validateStatus' => "\"Z42\"",
					// Error in evaluation
					'functionCallErrorType' => 'Z507',
				]
			],
		];
		yield 'Request specifies non-existent tester' => [
			'Z813',
			'',
			'Z123456789',
			[],
			'Perform test error: \'Z123456789\' isn\'t a known ZObject'
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
					'validateStatus' => "\"Z42\"",
					// Not wellformed error
					'functionCallErrorType' => 'Z502'
				]
			],
		];
		yield 'Request specifies non-implementation as implementation, by JSON' => [
			'Z813',
			$this->getTestFileContents( 'existing-ztester.json' ),
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
			'Perform test error: \'{ "Z1K1": "Z14", "Z14K1": "Z813", "Z14K3": { "Z1K1": "Z16", "Z16K1": { "Z1K1": ' .
				'"Z61", "Z61K1": "python" }, "Z16K2": "def Z813(Z813K1):\n\treturn True" } }\' isn\'t a tester.'
		];
		yield 'Request specifies implementation that throws an error' => [
			'Z813',
			str_replace(
				"return False", "throw 'some error'", $this->getTestFileContents( 'new-zimplementation.json' ) ),
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
		];
		yield 'Request specifies tester that throws an error' => [
			'Z813',
			'',
			// Adjust tester so that its validation call tries to call boolean equality on a non-boolean
			str_replace( "Z42", "not a boolean", $this->getTestFileContents( 'new-ztester.json' ) ),
			[
				[
					'zimplementationId' => 'Z913',
					'ztesterId' => 'Z0',
					'validateStatus' => "\"Z42\"",
					// Error in evaluation
					'validationCallErrorType' => 'Z518'
				]
			]
		];
	}
}
