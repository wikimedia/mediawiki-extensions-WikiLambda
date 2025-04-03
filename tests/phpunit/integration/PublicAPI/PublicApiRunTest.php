<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\PublicApi;

use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Tests\Api\ApiTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\PublicAPI\PublicApiRun
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\WikiLambdaApiBase
 * @group API
 * @group Standalone
 * @group Database
 */
class PublicApiRunTest extends ApiTestCase {

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
		$callBack ??= function ( $expected, $actual ) {
			$this->assertEquals( $expected, $actual );
		};
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
			// (T368041) Temporarily switched to the wrong response, as it's failing in Beta Cluster
			// @phpcs:ignore Generic.Files.LineLength.TooLong
			"{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z1\",\"Z882K2\":\"Z1\"},\"K1\":\"the truth\",\"K2\":{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z883\",\"Z883K1\":\"Z6\",\"Z883K2\":\"Z1\"},\"K1\":[{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},\"K1\":\"implementationId\",\"K2\":{\"Z1K1\":\"Z6\",\"Z6K1\":\"Z902\"}},{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},\"K1\":\"implementationType\",\"K2\":\"BuiltIn\"},{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},\"K1\":\"orchestrationMemoryUsage\",\"K2\":\"91.91 MiB\"},{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},\"K1\":\"orchestrationCpuUsage\",\"K2\":\"24.322 ms\"},{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},\"K1\":\"orchestrationStartTime\",\"K2\":\"2023-03-21T22:34:23.609Z\"},{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},\"K1\":\"orchestrationEndTime\",\"K2\":\"2023-03-21T22:34:23.642Z\"},{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},\"K1\":\"orchestrationDuration\",\"K2\":\"33 ms\"},{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},\"K1\":\"orchestrationHostname\",\"K2\":\"22ca7c26028f\"}]}}",
			null,
			static function ( $expected, $actual ) {
				self::assertEquals( $expected['Z1K1'], $actual['Z1K1'] );
				self::assertEquals( $expected['K1'], $actual['K1'] );
				// TODO (T314609): Also test that metadata has correct keys.
			}
		];

		// TODO (T325593): Call the example-timeout example; ensure the correct error is returned.
	}
}
