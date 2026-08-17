<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\PublicApi;

use MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI\WikiLambdaApiTestCase;
use MediaWiki\Extension\WikiLambda\Tests\Integration\MockOrchestratorRequest;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

/**
 * @covers \MediaWiki\Extension\WikiLambda\PublicAPI\PublicApiRun
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\WikiLambdaApiBase
 * @group API
 * @group Standalone
 * @group Database
 */
class PublicApiRunTest extends WikiLambdaApiTestCase {

	protected function setUp(): void {
		parent::setUp();
		$mock = new MockOrchestratorRequest();
		$this->setService( 'WikiLambdaOrchestratorRequest', $mock );
	}

	/**
	 * @dataProvider provideExecuteSuccessfulViaMock
	 */
	public function testExecuteSuccessfulViaMock(
		$requestString,
		$expectedString = null,
		$callBack = null,
		$expectedError = null,
		$expectedThrownError = null
	) {
		if ( $expectedThrownError ) {
			$this->expectExceptionMessage( $expectedThrownError );
		}

		$result = $this->doApiRequest( [
			'action' => 'wikifunctions_run',
			'function_call' => $requestString,
		] );

		if ( $expectedThrownError ) {
			return;
		}

		$orchestrationResult = $result[0]['wikifunctions_run'];

		$expected = json_decode( $expectedString, true ) ?? $expectedString;
		$resultEnvelope = json_decode( $orchestrationResult[ 'data' ], true );
		$actualString = $resultEnvelope[ 'Z22K1' ];
		$actual = $actualString;
		$callBack ??= $this->assertEquals( ... );
		$callBack( $expected, $actual );
		// TODO (T314609): Also test error cases.
	}

	public static function provideExecuteSuccessfulViaMock() {
		yield 'Manual echo' => [
			'{"Z1K1": "Z7", "Z7K1": "Z801", "Z801K1": "Hello, testers!" }',
			'Hello, testers!'
		];

		yield 'Invoke built-in Z802/If with false predicate' => [
			ZObjectUtils::readTestFile( 'Z902_false.json' ),
			"{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z42\"}"
		];

		yield 'Invoke user-written JavaScript code' => [
			ZObjectUtils::readTestFile( 'evaluated-js.json' ),
			"13",
			null,
			null,
			// Public API rejects unsaved-code inputs; $expectedString above isn't used currently
			'Error of type Z559'
		];

		$Z823 = [
			"Z1K1" => "Z7",
			"Z7K1" => "Z823",
			"Z823K1" => [
				"Z1K1" => "Z99",
				"Z99K1" => [
					"Z1K1" => "Z7",
					"Z7K1" => "Z802",
					"Z802K1" => "Z41",
					"Z802K2" => "the truth",
					"Z802K3" => "the facts"
				]
			]
		];
		yield 'Ensure Z823 propagates invariants' => [
			json_encode( $Z823 ),
			// @phpcs:ignore Generic.Files.LineLength.TooLong
			"{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z1\",\"Z882K2\":\"Z1\"},\"K1\":\"the truth\",\"K2\":{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z883\",\"Z883K1\":\"Z6\",\"Z883K2\":\"Z1\"},\"K1\":[{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},\"K1\":\"implementationId\",\"K2\":{\"Z1K1\":\"Z6\",\"Z6K1\":\"Z902\"}},{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},\"K1\":\"implementationType\",\"K2\":\"BuiltIn\"},{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},\"K1\":\"orchestrationMemoryUsage\",\"K2\":\"91.91 MiB\"},{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},\"K1\":\"orchestrationCpuUsage\",\"K2\":\"24.322 ms\"},{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},\"K1\":\"orchestrationStartTime\",\"K2\":\"2023-03-21T22:34:23.609Z\"},{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},\"K1\":\"orchestrationEndTime\",\"K2\":\"2023-03-21T22:34:23.642Z\"},{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},\"K1\":\"orchestrationDuration\",\"K2\":\"33 ms\"},{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},\"K1\":\"orchestrationHostname\",\"K2\":\"22ca7c26028f\"}]}}",
			null,
			static function ( $expected, $actual ) {
				self::assertEquals( $expected['Z1K1'], $actual['Z1K1'] );
				self::assertEquals( $expected['K1'], $actual['K1'] );
				// TODO (T314609): Also test that metadata has correct keys.
			}
		];

		// A Z825/Run Abstract Fragment implementation is exempt from the unsaved-code
		// check, because Abstract Wikipedia renders its fragments that way with no user
		// account. Code below that composition must not inherit the exemption.
		$nestedCode = [
			'Z1K1' => 'Z14',
			'Z14K1' => 'Z999',
			'Z14K3' => [
				'Z1K1' => 'Z16',
				'Z16K1' => [ 'Z1K1' => 'Z61', 'Z61K1' => 'python-3' ],
				'Z16K2' => 'def Z999():\n\treturn "pwned"',
			],
		];
		$nestedFunction = [
			'Z1K1' => 'Z8',
			'Z8K1' => [ 'Z17' ],
			'Z8K2' => 'Z6',
			'Z8K3' => [ 'Z20' ],
			'Z8K4' => [ 'Z14', $nestedCode ],
			'Z8K5' => 'Z999',
		];
		$z825Wrapper = [
			'Z1K1' => 'Z7',
			'Z7K1' => [
				'Z1K1' => 'Z8',
				'Z8K1' => [ 'Z17' ],
				'Z8K2' => 'Z89',
				'Z8K3' => [ 'Z20' ],
				'Z8K4' => [
					'Z14',
					[
						'Z1K1' => 'Z14',
						'Z14K1' => 'Z825',
						'Z14K2' => [ 'Z1K1' => 'Z7', 'Z7K1' => $nestedFunction ],
					],
				],
				'Z8K5' => 'Z825',
			],
			'Z825K1' => [ 'Z1K1' => 'Z6091', 'Z6091K1' => 'Q42' ],
			'Z825K2' => [ 'Z1K1' => 'Z9', 'Z9K1' => 'Z100' ],
			'Z825K3' => [ 'Z1K1' => 'Z6', 'Z6K1' => '2026-08-15' ],
		];
		yield 'Reject code nested below a Z825 composition' => [
			json_encode( $z825Wrapper ),
			null,
			null,
			null,
			'Error of type Z559'
		];

		// TODO (T325593): Call the example-timeout example; ensure the correct error is returned.
	}
}
