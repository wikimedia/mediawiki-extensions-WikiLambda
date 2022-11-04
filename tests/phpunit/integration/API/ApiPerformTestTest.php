<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Api;

use ApiTestCase;

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
	}

	/**
	 * @dataProvider provideExecuteSuccessfully
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiPerformTest::execute
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiPerformTest::executeGenerator
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiPerformTest::run
	 */
	public function testExecuteSuccessfully(
		$requestedZImplementations,
		$requestedZTesters,
		$expectedResults
	) {
		$results = $this->doApiRequestWithToken( [
			'action' => 'wikilambda_perform_test',
			'wikilambda_perform_test_zfunction' => 'Z813',
			'wikilambda_perform_test_zimplementations' => $requestedZImplementations,
			'wikilambda_perform_test_ztesters' => $requestedZTesters
		] )[0]['query']['wikilambda_perform_test'];

		$this->assertEquals( count( $expectedResults ), count( $results ) );

		for ( $i = 0; $i < count( $expectedResults ); $i++ ) {
			$this->assertNotNull(
				$results[$i]['testMetadata']
			);
			$this->assertEquals(
				'Z813',
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
		}
	}

	public function provideExecuteSuccessfully() {
		yield 'Request specifies implementation and tester, both by reference' => [
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
			$this->getTestFileContents( 'new-zimplementation.json' ),
			'',
			[
				[
					'zimplementationId' => 'Z0',
					'ztesterId' => 'Z8130',
					'validateStatus' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z42\"}"
				],
				[
					'zimplementationId' => 'Z0',
					'ztesterId' => 'Z8131',
					'validateStatus' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
				]
			]
		];
		yield 'Request specifies JSON for edited version of existing implementation' => [
			str_replace( "True", "False", $this->getTestFileContents( 'existing-zimplementation.json' ) ),
			'',
			[
				[
					'zimplementationId' => 'Z1000000',
					'ztesterId' => 'Z8130',
					'validateStatus' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z42\"}"
				],
				[
					'zimplementationId' => 'Z1000000',
					'ztesterId' => 'Z8131',
					'validateStatus' => "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
				]
			]
		];
		yield 'Request specifies tester by reference' => [
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
	}
}
