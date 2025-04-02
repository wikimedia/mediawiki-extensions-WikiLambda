<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI;

use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Tests\Api\ApiTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\ApiFunctionCall
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\WikiLambdaApiBase
 * @group API
 * @group Standalone
 * @group Database
 */
class ApiFunctionCallTest extends ApiTestCase {

	/**
	 * Reads file contents from test data directory as JSON array.
	 *
	 * @param string $fileName
	 * @return array file contents (JSON-decoded)
	 */
	private static function readTestFileAsArray( $fileName ): array {
		return json_decode( ZObjectUtils::readTestFile( $fileName ), true );
	}

	/**
	 * Note that these are integration tests, not end-to-end tests. They never actually hit an instance
	 * of the function-orchestrator, just a mock of it; they let us confirm that, if the orchestrator
	 * were to be called, the response would go through the API handler as intended.
	 *
	 * For actual end-to-end testing of this, see the Catalyst system.
	 *
	 * @dataProvider provideExecuteSuccessfulViaMock
	 */
	public function testExecuteSuccessfulViaMock(
		$requestString,
		$expectedString = null,
		$callBack = null,
		$expectedError = null
	) {
		$result = [];
		$orchestrationResult = [];

		$result = $this->doApiRequest( [
			'action' => 'wikilambda_function_call',
			'wikilambda_function_call_zobject' => $requestString
		] );
		$orchestrationResult = $result[0]['wikilambda_function_call'];

		$this->assertArrayHasKey( 'success', $orchestrationResult );
		$this->assertTrue( $orchestrationResult['success'] );

		$expected = json_decode( $expectedString, true ) ?? $expectedString;
		$resultEnvelope = json_decode( $orchestrationResult[ 'data' ], true );

		if ( !$resultEnvelope ) {
			var_dump( $orchestrationResult );
		}

		$actualString = $resultEnvelope[ 'Z22K1' ];

		$actual = $actualString;
		$callBack ??= function ( $expected, $actual ) {
			$this->assertEquals( $expected, $actual );
		};
		$callBack( $expected, $actual );
		// TODO (T314609): Also test error cases.
	}

	public static function provideExecuteSuccessfulViaMock() {
		// TODO (T311801): Items below are the user-facing examples from ApiFunctionCall; maybe share the definitons?
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
			"13"
		];

		yield 'Invoke user-written Python 3 code' => [
			ZObjectUtils::readTestFile( 'evaluated-python.json' ),
			"13"
		];

		// Disabled because this makes an Object key that JSON doesn't like
		// yield 'Invoke a composition: if first argument is true, sort second; else, return it intact' => [
		// 	ZObjectUtils::readTestFile( 'example-composition.json' ),
		// 	'        abcddeeeefghhijklmnoooopqrrttuuvwxyz'
		// ];

		// @phpcs:ignore Generic.Files.LineLength.TooLong
		yield 'Invoke the \"not empty\" function as a composition: returns true iff input list contains at least one element' => [
			ZObjectUtils::readTestFile( 'example-notempty.json' ),
			"{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
		];

		// @phpcs:ignore Generic.Files.LineLength.TooLong
		yield 'Invoke the Map function: given a function and a list of strings, return the result of running the function over each string' => [
			ZObjectUtils::readTestFile( 'example-map.json' ),
			// @phpcs:ignore Generic.Files.LineLength.TooLong
			'[{"Z1K1":"Z4","Z4K1":"Z6","Z4K2":["Z3",{"Z1K1":"Z3","Z3K1":"Z6","Z3K2":"Z6K1","Z3K3":{"Z1K1":"Z12","Z12K1":["Z11",{"Z1K1":"Z11","Z11K1":"Z1002","Z11K2":"value"}]}}],"Z4K3":"Z106","Z4K4":"Z866"},"acab","acab","bacab"]'
		];

		// @phpcs:ignore Generic.Files.LineLength.TooLong
		yield 'Invoke the Apply function: given a function and a string, return the result of running the function over the string' => [
			ZObjectUtils::readTestFile( 'example-apply.json' ),
			"{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
		];

		yield 'Invoke a function that returns the first element of a typed List' => [
			ZObjectUtils::readTestFile( 'example-generic-list.json' ),
			'who are these coming to the sacrifice'
		];

		yield 'Invoke a function that returns the second element of a Pair<String,Boolean>' => [
			ZObjectUtils::readTestFile( 'example-generic-pair.json' ),
			// @phpcs:ignore Generic.Files.LineLength.TooLong
			"{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
		];

		yield 'Invoke a function that returns the second element of a Pair<String,Pair<String,String>>' => [
			ZObjectUtils::readTestFile( 'example-generic-pair-2.json' ),
			// @phpcs:ignore Generic.Files.LineLength.TooLong
			'{"Z1K1":{"Z1K1":"Z7","Z7K1":"Z882","Z882K1":"Z6","Z882K2":"Z6"},"K1":"Where the pot\'s not","K2":"is where it\'s useful."}'
		];

		// @phpcs:ignore Generic.Files.LineLength.TooLong
		yield 'Invoke a function that maps the element of a typed Map at a given key to a string version of its value' => [
			ZObjectUtils::readTestFile( 'example-generic-map.json' ),
			// @phpcs:ignore Generic.Files.LineLength.TooLong
			'{"Z1K1":{"Z1K1":"Z7","Z7K1":"Z883","Z883K1":"Z6","Z883K2":"Z6"},"K1":[{"Z1K1":"Z7","Z7K1":"Z882","Z882K1":"Z6","Z882K2":"Z6"},{"Z1K1":{"Z1K1":"Z7","Z7K1":"Z882","Z882K1":"Z6","Z882K2":"Z6"},"K1":"true?","K2":"true"}]}'
		];

		yield 'Invoke JavaScript function using a user-defined type' => [
			ZObjectUtils::readTestFile( 'example-user-defined-javascript.json' ),
			// @phpcs:ignore Generic.Files.LineLength.TooLong
			"{\"Z1K1\":\"Z1000000\",\"Z1000000K1\":\"5\"}"
		];

		$ZMillion = self::readTestFileAsArray( 'user-defined-validation-type.json' );
		$validationZ7 = self::readTestFileAsArray( 'example-user-defined-validation.json' );
		$ZMillion["Z4K3"]["Z8K1"][1]["Z17K1"] = $ZMillion;
		$validationZ7["Z801K1"]["Z1K1"] = $ZMillion;

		// yield 'Invoke user-defined validation function implemented in Python' => [
		// 	json_encode( $validationZ7 ),
		// 	'Z24',
		// 	null,
		// 	// @phpcs:ignore Generic.Files.LineLength.TooLong
		// "{\"Z1K1\":\"Z5\",\"Z5K1\":{\"Z1K1\":\"Z518\",\"Z518K1\":{\"Z1K1\":\"Z4\",\"Z4K1\":\"Z1000000\",\"Z4K2\":[{\"Z1K1\":\"Z3\",\"Z3K1\":\"Z6\",\"Z3K2\":\"Z1000000K1\",\"Z3K3\":\"Z400\"}],\"Z4K3\":{\"Z1K1\":\"Z8\",\"Z8K1\":[{\"Z1K1\":\"Z17\",\"Z17K1\":{\"Z1K1\":\"Z4\",\"Z4K1\":\"Z1000000\",\"Z4K2\":[{\"Z1K1\":\"Z3\",\"Z3K1\":\"Z6\",\"Z3K2\":\"Z1000000K1\",\"Z3K3\":\"Z400\"}],\"Z4K3\":{\"Z1K1\":\"Z8\",\"Z8K1\":[{\"Z1K1\":\"Z17\",\"Z17K1\":\"Z1000000\",\"Z17K2\":\"Z1001K1\",\"Z17K3\":{\"Z1K1\":\"Z12\",\"Z12K1\":[]}}],\"Z8K2\":\"Z4\",\"Z8K3\":[],\"Z8K4\":[{\"Z1K1\":\"Z14\",\"Z14K1\":\"Z1001\",\"Z14K3\":{\"Z1K1\":\"Z16\",\"Z16K1\":{\"Z1K1\":\"Z61\",\"Z61K1\":\"python-3\"},\"Z16K2\":\"def Z1001(Z1001K1):\\n  if Z1001K1.Z1000000K1 != 'A':\\n    raise Exception('does that look like an A to you???')\\n  return Z1001K1\"}}],\"Z8K5\":\"Z1001\"}},\"Z17K2\":\"Z1001K1\",\"Z17K3\":{\"Z1K1\":\"Z12\",\"Z12K1\":[]}}],\"Z8K2\":\"Z4\",\"Z8K3\":[],\"Z8K4\":[{\"Z1K1\":\"Z14\",\"Z14K1\":\"Z1001\",\"Z14K3\":{\"Z1K1\":\"Z16\",\"Z16K1\":{\"Z1K1\":\"Z61\",\"Z61K1\":\"python-3\"},\"Z16K2\":\"def Z1001(Z1001K1):\\n  if Z1001K1.Z1000000K1 != 'A':\\n    raise Exception('does that look like an A to you???')\\n  return Z1001K1\"}}],\"Z8K5\":\"Z1001\"}},\"Z518K2\":{\"Z1K1\":{\"Z1K1\":\"Z4\",\"Z4K1\":\"Z1000000\",\"Z4K2\":[{\"Z1K1\":\"Z3\",\"Z3K1\":\"Z6\",\"Z3K2\":\"Z1000000K1\",\"Z3K3\":\"Z400\"}],\"Z4K3\":{\"Z1K1\":\"Z8\",\"Z8K1\":[{\"Z1K1\":\"Z17\",\"Z17K1\":{\"Z1K1\":\"Z4\",\"Z4K1\":\"Z1000000\",\"Z4K2\":[{\"Z1K1\":\"Z3\",\"Z3K1\":\"Z6\",\"Z3K2\":\"Z1000000K1\",\"Z3K3\":\"Z400\"}],\"Z4K3\":{\"Z1K1\":\"Z8\",\"Z8K1\":[{\"Z1K1\":\"Z17\",\"Z17K1\":\"Z1000000\",\"Z17K2\":\"Z1001K1\",\"Z17K3\":{\"Z1K1\":\"Z12\",\"Z12K1\":[]}}],\"Z8K2\":\"Z4\",\"Z8K3\":[],\"Z8K4\":[{\"Z1K1\":\"Z14\",\"Z14K1\":\"Z1001\",\"Z14K3\":{\"Z1K1\":\"Z16\",\"Z16K1\":{\"Z1K1\":\"Z61\",\"Z61K1\":\"python-3\"},\"Z16K2\":\"def Z1001(Z1001K1):\\n  if Z1001K1.Z1000000K1 != 'A':\\n    raise Exception('does that look like an A to you???')\\n  return Z1001K1\"}}],\"Z8K5\":\"Z1001\"}},\"Z17K2\":\"Z1001K1\",\"Z17K3\":{\"Z1K1\":\"Z12\",\"Z12K1\":[]}}],\"Z8K2\":\"Z4\",\"Z8K3\":[],\"Z8K4\":[{\"Z1K1\":\"Z14\",\"Z14K1\":\"Z1001\",\"Z14K3\":{\"Z1K1\":\"Z16\",\"Z16K1\":{\"Z1K1\":\"Z61\",\"Z61K1\":\"python-3\"},\"Z16K2\":\"def Z1001(Z1001K1):\\n  if Z1001K1.Z1000000K1 != 'A':\\n    raise Exception('does that look like an A to you???')\\n  return Z1001K1\"}}],\"Z8K5\":\"Z1001\"}},\"Z1000000K1\":\"a\"},\"Z518K3\":{\"Z1K1\":\"Z5\",\"Z5K2\":\"does that look like an A to you???\"}}}}",
		// ];

		yield 'Generate a Z4/Type with a user-defined function and use that Z4/Type as a ZObject\'s Z1K1/Type' => [
			ZObjectUtils::readTestFile( 'example-user-defined-generic-type.json' ),
			// @phpcs:ignore Generic.Files.LineLength.TooLong
			'{"Z1K1":{"Z1K1":"Z7","Z7K1":{"Z1K1":"Z8","Z8K1":["Z17"],"Z8K2":"Z4","Z8K3":["Z20"],"Z8K4":["Z14",{"Z1K1":"Z14","Z14K1":"Z10106","Z14K2":{"Z1K1":"Z4","Z4K1":"Z10101","Z4K2":["Z3",{"Z1K1":"Z3","Z3K1":"Z6","Z3K2":"K1","Z3K3":"Z400"},{"Z1K1":"Z3","Z3K1":"Z40","Z3K2":"K2","Z3K3":"Z400"}],"Z4K3":"Z831"}}],"Z8K5":"Z10106"}},"K1":"TRUE","K2":{"Z1K1":"Z40","Z40K1":"Z41"}}'
		];

		$curryImplementation = self::readTestFileAsArray( 'curry-implementation-Z409.json' );
		$curryFunction = self::readTestFileAsArray( 'curry-Z408.json' );
		$curryFunction["Z8K4"][1] = $curryImplementation;
		$curryFunctionCall = self::readTestFileAsArray( 'curry-call-Z410.json' );
		$curryFunctionCall["Z8K4"][1]["Z14K2"]["Z7K1"]["Z7K1"] = $curryFunction;
		$andFunction = self::readTestFileAsArray( 'and-Z407.json' );
		$curry = [
			"Z1K1" => "Z7",
			"Z7K1" => $curryFunctionCall,
			"Z410K1" => $andFunction,
			"Z410K2" => [
				"Z1K1" => "Z40",
				"Z40K1" => "Z41"
			],
			"Z410K3" => [
				"Z1K1" => "Z40",
				"Z40K1" => "Z41"
			]
		];

		yield 'Create and invoke a curried function' => [
			json_encode( $curry ),
			"{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
		];

		yield 'Supply an implementation with an unsupported language; back off to the second' => [
			ZObjectUtils::readTestFile( 'example-bad-first-implementation.json' ),
			"{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}",
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

		// TODO (T325593): Call the example-timeout example; ensure the correct error is returned.
	}

	/**
	 * Special tests for AppArmor;
	 *
	 * @group Broken
	 * @group WikiLambdaAppArmor
	 */
	public function testExecuteCheckAppArmor() {
		$compositionZ7String = '{ "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" }, "Z7K1": "Z802", '
			. '"Z802K1": { "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z40" }, "Z40K1": { "Z1K1": "Z9", "Z9K1": "Z42" } }, '
			. '"Z802K2": { "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z10" }, "Z10K1": { "Z1K1": "Z6", "Z6K1": '
			. '"arbitrary ZObject" }, "Z10K2": { "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z10" } } }, '
			. '"Z802K3": { "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z40" }, "Z40K1": { "Z1K1": "Z9", "Z9K1": "Z42" } } }';
		$compositionResult = $this->doApiRequest( [
			'action' => 'wikilambda_function_call',
			'wikilambda_function_call_zobject' => $compositionZ7String
		] );
		$this->assertTrue( $compositionResult[0]['wikilambda_function_call']['success'] );
		$compositionData = json_decode( $compositionResult[0]['wikilambda_function_call']['data'], true );
		$this->assertNotEquals( 'Z24', $compositionData[ 'Z22K1' ] );

		$pythonZ7String = '{ "Z1K1": "Z7", "Z7K1": { "Z1K1": "Z8", "Z8K1": [ "Z17", { "Z1K1": "Z17", "Z17K1": "Z6", '
			. '"Z17K2": { "Z1K1": "Z6", "Z6K1": "Z400K1" }, "Z17K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }, '
			. '{ "Z1K1": "Z17", "Z17K1": "Z6", "Z17K2": { "Z1K1": "Z6", "Z6K1": "Z400K2" }, "Z17K3": '
			. '{ "Z1K1": "Z12", "Z12K1": [ "Z11" ] } } ], "Z8K2": "Z1", "Z8K3": [ "Z20" ], "Z8K4": [ "Z14", '
			. '{ "Z1K1": "Z14", "Z14K1": "Z400", "Z14K3": { "Z1K1": "Z16", "Z16K1": "Z610", "Z16K2": '
			. '"def Z400(Z400K1, Z400K2):\n    return str(int(Z400K1) + int(Z400K2))" } } ], "Z8K5": "Z400" }, '
			. '"Z400K1": "5", "Z400K2": "8" }';
		$pythonResult = $this->doApiRequest( [
			'action' => 'wikilambda_function_call',
			'wikilambda_function_call_zobject' => $pythonZ7String
		] );
		$this->assertTrue( $pythonResult[0]['wikilambda_function_call']['success'] );
		$pythonData = json_decode( $pythonResult[0]['wikilambda_function_call']['data'], true );
		$this->assertNotEquals( 'Z24', $pythonData['Z22K1'] );

		$disallowedPythonZ7String = '{ "Z1K1": "Z7", "Z7K1": { "Z1K1": "Z8", "Z8K1": [ "Z17" ], "Z8K2": "Z1", '
			. '"Z8K3": [ "Z20" ], "Z8K4": [ "Z14", { "Z1K1": "Z14", "Z14K1": "Z400", "Z14K3": { "Z1K1": "Z16", '
			. '"Z16K1": "Z610", "Z16K2": "def Z400():\n    import socket\n    thatsock = socket.socket(socket.'
			. 'AF_PACKET, socket.SOCK_DGRAM)\n    return \'i did a bad :(\'" } } ], "Z8K5": "Z400" } }';
		$disallowedPythonResult = $this->doApiRequest( [
			'action' => 'wikilambda_function_call',
			'wikilambda_function_call_zobject' => $disallowedPythonZ7String
		] );
		$this->assertTrue( $disallowedPythonResult[0]['wikilambda_function_call']['success'] );
		$disallowedPythonData = json_decode(
			$disallowedPythonResult[0]['wikilambda_function_call']['data'],
			true
		);
		$this->assertEquals( 'Z24', $disallowedPythonData['Z22K1'] );
		$this->assertStringContainsString(
			'Operation not permitted',
			$disallowedPythonResult[0]['wikilambda_function_call']['data']
		);
	}
}
