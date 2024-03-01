<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Api;

use ApiTestCase;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\API\ApiFunctionCall
 * @group API
 * @group Standalone
 * @group medium
 */
class ApiFunctionCallTest extends ApiTestCase {

	/**
	 * Reads file contents from test data directory.
	 *
	 * @param string $fileName
	 * @return string file contents
	 */
	private function readTestFile( $fileName ): string {
		// @codingStandardsIgnoreLine
		$baseDir = __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'test_data';
		$fullFile = $baseDir . DIRECTORY_SEPARATOR . $fileName;
		return file_get_contents( $fullFile );
	}

	/**
	 * Reads file contents from test data directory as JSON array.
	 *
	 * @param string $fileName
	 * @return array file contents (JSON-decoded)
	 */
	private function readTestFileAsArray( $fileName ): array {
		return json_decode( $this->readTestFile( $fileName ), true );
	}

	/**
	 * @group Broken
	 * @dataProvider provideExecuteSuccessfulViaBetaCluster
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiFunctionCall::execute
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiFunctionCall::executeGenerator
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiFunctionCall::run
	 */
	public function testExecuteSuccessfulViaBetaCluster(
		$requestString,
		$expectedString
	) {
		$result = [];
		$orchestrationResult = [];

		// Beta cluster doesn't like all these tests, so retry until it does.
		for ( $i = 0; $i < 4; $i++ ) {
			if ( array_key_exists( 'success', $orchestrationResult ) ) {
				break;
			}
			if ( $i > 0 ) {
				sleep( pow( 2, $i ) );
			}
			$result = $this->doApiRequest( [
				'action' => 'wikilambda_function_call',
				'wikilambda_function_call_zobject' => $requestString
			] );
			$orchestrationResult = $result[0]['query']['wikilambda_function_call'];
		}

		$this->assertArrayHasKey( 'success', $orchestrationResult );
		$this->assertTrue( $orchestrationResult['success'] );

		$expected = json_decode( $expectedString, true );
		if ( $expected == null ) {
			$expected = $expectedString;
		}
		$resultEnvelope = json_decode( $orchestrationResult[ 'data' ], true );
		$actualString = $resultEnvelope[ 'Z22K1' ];
		$actual = $actualString;
		$this->assertEquals( $expected, $actual );
		// TODO (T314609): Also test error cases.
	}

	public function provideExecuteSuccessfulViaBetaCluster() {
		// TODO (T311801): Share this logic with the ApiFunctionCall examples.
		yield 'Manual echo' => [
			'{"Z1K1": "Z7", "Z7K1": "Z801", "Z801K1": "Hello, testers!" }',
			'Hello, testers!'
		];

		yield 'Invoke built-in Z802/If with false predicate' => [
			$this->readTestFile( 'Z902_false.json' ),
			"{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z42\"}"
		];

		yield 'Invoke user-written JavaScript code' => [
			$this->readTestFile( 'evaluated-js.json' ),
			"13"
		];

		yield 'Invoke user-written Python 3 code' => [
			$this->readTestFile( 'evaluated-python.json' ),
			"13"
		];

		yield 'Invoke a composition: if first argument is true, sort second; else, return it intact' => [
			$this->readTestFile( 'example-composition.json' ),
			'        abcddeeeefghhijklmnoooopqrrttuuvwxyz'
		];

		// @phpcs:ignore Generic.Files.LineLength.TooLong
		yield 'Invoke the \"not empty\" function as a composition: returns true iff input list contains at least one element' => [
			$this->readTestFile( 'example-notempty.json' ),
			"{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
		];

		// @phpcs:ignore Generic.Files.LineLength.TooLong
		yield 'Invoke the Map function: given a function and a list of strings, return the result of running the function over each string' => [
			$this->readTestFile( 'example-map.json' ),
			// @phpcs:ignore Generic.Files.LineLength.TooLong
			"[{\"Z1K1\":\"Z4\",\"Z4K1\":\"Z6\",\"Z4K2\":[\"Z3\",{\"Z1K1\":\"Z3\",\"Z3K1\":\"Z6\",\"Z3K2\":\"Z6K1\",\"Z3K3\":{\"Z1K1\":\"Z12\",\"Z12K1\":[\"Z11\",{\"Z1K1\":\"Z11\",\"Z11K1\":\"Z1002\",\"Z11K2\":\"value\"}]}}],\"Z4K3\":\"Z106\"},\"acab\",\"acab\",\"bacab\"]"
		];

		// @phpcs:ignore Generic.Files.LineLength.TooLong
		yield 'Invoke the Apply function: given a function and a string, return the result of running the function over the string' => [
			$this->readTestFile( 'example-apply.json' ),
			"{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
		];

		yield 'Invoke a function that returns the first element of a typed List' => [
			$this->readTestFile( 'example-generic-list.json' ),
			'who are these coming to the sacrifice'
		];

		yield 'Invoke a function that returns the second element of a Pair<String,Pair<String,Bool>>' => [
			$this->readTestFile( 'example-generic-pair.json' ),
			// @phpcs:ignore Generic.Files.LineLength.TooLong
			"{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
		];

		/*
		 *
		 * TODO (T318363): Re-enable this once request entities are not too large.
		// @phpcs:ignore Generic.Files.LineLength.TooLong
		yield 'Invoke a function that maps the element of a generic Map at a given key to a string version of its value' => [
			$this->readTestFile( 'example-generic-map.json' ),
			// @phpcs:ignore Generic.Files.LineLength.TooLong
			"{\"Z1K1\":{\"Z1K1\":\"Z4\",\"Z4K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z883\",\"Z883K1\":\"Z6\",\"Z883K2\":\"Z6\"},\"Z4K2\":[\"Z3\",{\"Z1K1\":\"Z3\",\"Z3K1\":{\"Z1K1\":\"Z4\",\"Z4K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z881\",\"Z881K1\":{\"Z1K1\":\"Z4\",\"Z4K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z6\"},\"Z4K2\":[\"Z3\",{\"Z1K1\":\"Z3\",\"Z3K1\":\"Z6\",\"Z3K2\":\"K1\",\"Z3K3\":{\"Z1K1\":\"Z12\",\"Z12K1\":[\"Z11\",{\"Z1K1\":\"Z11\",\"Z11K1\":\"Z1002\",\"Z11K2\":\"first\"}]}},{\"Z1K1\":\"Z3\",\"Z3K1\":\"Z6\",\"Z3K2\":\"K2\",\"Z3K3\":{\"Z1K1\":\"Z12\",\"Z12K1\":[\"Z11\",{\"Z1K1\":\"Z11\",\"Z11K1\":\"Z1002\",\"Z11K2\":\"second\"}]}}],\"Z4K3\":\"Z831\"}},\"Z4K2\":[\"Z3\",{\"Z1K1\":\"Z3\",\"Z3K1\":{\"Z1K1\":\"Z4\",\"Z4K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z6\"},\"Z4K2\":[\"Z3\",{\"Z1K1\":\"Z3\",\"Z3K1\":\"Z6\",\"Z3K2\":\"K1\",\"Z3K3\":{\"Z1K1\":\"Z12\",\"Z12K1\":[\"Z11\",{\"Z1K1\":\"Z11\",\"Z11K1\":\"Z1002\",\"Z11K2\":\"first\"}]}},{\"Z1K1\":\"Z3\",\"Z3K1\":\"Z6\",\"Z3K2\":\"K2\",\"Z3K3\":{\"Z1K1\":\"Z12\",\"Z12K1\":[\"Z11\",{\"Z1K1\":\"Z11\",\"Z11K1\":\"Z1002\",\"Z11K2\":\"second\"}]}}],\"Z4K3\":\"Z831\"},\"Z3K2\":\"K1\",\"Z3K3\":{\"Z1K1\":\"Z12\",\"Z12K1\":[\"Z11\",{\"Z1K1\":\"Z11\",\"Z11K1\":\"Z1002\",\"Z11K2\":\"head\"}]}},{\"Z1K1\":\"Z3\",\"Z3K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z881\",\"Z881K1\":{\"Z1K1\":\"Z4\",\"Z4K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z6\"},\"Z4K2\":[\"Z3\",{\"Z1K1\":\"Z3\",\"Z3K1\":\"Z6\",\"Z3K2\":\"K1\",\"Z3K3\":{\"Z1K1\":\"Z12\",\"Z12K1\":[\"Z11\",{\"Z1K1\":\"Z11\",\"Z11K1\":\"Z1002\",\"Z11K2\":\"first\"}]}},{\"Z1K1\":\"Z3\",\"Z3K1\":\"Z6\",\"Z3K2\":\"K2\",\"Z3K3\":{\"Z1K1\":\"Z12\",\"Z12K1\":[\"Z11\",{\"Z1K1\":\"Z11\",\"Z11K1\":\"Z1002\",\"Z11K2\":\"second\"}]}}],\"Z4K3\":\"Z831\"}},\"Z3K2\":\"K2\",\"Z3K3\":{\"Z1K1\":\"Z12\",\"Z12K1\":[\"Z11\",{\"Z1K1\":\"Z11\",\"Z11K1\":\"Z1002\",\"Z11K2\":\"tail\"}]}}],\"Z4K3\":\"Z831\"},\"Z3K2\":\"K1\",\"Z3K3\":{\"Z1K1\":\"Z12\",\"Z12K1\":[\"Z11\",{\"Z1K1\":\"Z11\",\"Z11K1\":\"Z1002\",\"Z11K2\":\"elements\"}]}}],\"Z4K3\":\"Z831\"},\"K1\":[{\"Z1K1\":\"Z4\",\"Z4K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z6\"},\"Z4K2\":[\"Z3\",{\"Z1K1\":\"Z3\",\"Z3K1\":\"Z6\",\"Z3K2\":\"K1\",\"Z3K3\":{\"Z1K1\":\"Z12\",\"Z12K1\":[\"Z11\",{\"Z1K1\":\"Z11\",\"Z11K1\":\"Z1002\",\"Z11K2\":\"first\"}]}},{\"Z1K1\":\"Z3\",\"Z3K1\":\"Z6\",\"Z3K2\":\"K2\",\"Z3K3\":{\"Z1K1\":\"Z12\",\"Z12K1\":[\"Z11\",{\"Z1K1\":\"Z11\",\"Z11K1\":\"Z1002\",\"Z11K2\":\"second\"}]}}],\"Z4K3\":\"Z831\"},{\"Z1K1\":{\"Z1K1\":\"Z4\",\"Z4K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z6\"},\"Z4K2\":[\"Z3\",{\"Z1K1\":\"Z3\",\"Z3K1\":\"Z6\",\"Z3K2\":\"K1\",\"Z3K3\":{\"Z1K1\":\"Z12\",\"Z12K1\":[\"Z11\",{\"Z1K1\":\"Z11\",\"Z11K1\":\"Z1002\",\"Z11K2\":\"first\"}]}},{\"Z1K1\":\"Z3\",\"Z3K1\":\"Z6\",\"Z3K2\":\"K2\",\"Z3K3\":{\"Z1K1\":\"Z12\",\"Z12K1\":[\"Z11\",{\"Z1K1\":\"Z11\",\"Z11K1\":\"Z1002\",\"Z11K2\":\"second\"}]}}],\"Z4K3\":\"Z831\"},\"K1\":\"true?\",\"K2\":\"True\"}]}"
		];
		*/

		yield 'Invoke Python function using a user-defined type' => [
			$this->readTestFile( 'example-user-defined-python.json' ),
			// @phpcs:ignore Generic.Files.LineLength.TooLong
			"{\"Z1K1\":{\"Z1K1\":\"Z4\",\"Z4K1\":\"Z1000000\",\"Z4K2\":[\"Z3\",{\"Z1K1\":\"Z3\",\"Z3K1\":\"Z6\",\"Z3K2\":\"Z1000000K1\",\"Z3K3\":\"Z1000\"}],\"Z4K3\":\"Z831\"},\"Z1000000K1\":\"5\"}"
		];

		yield 'Invoke JavaScript function using a user-defined type' => [
			$this->readTestFile( 'example-user-defined-javascript.json' ),
			// @phpcs:ignore Generic.Files.LineLength.TooLong
			"{\"Z1K1\":{\"Z1K1\":\"Z4\",\"Z4K1\":\"Z1000000\",\"Z4K2\":[\"Z3\",{\"Z1K1\":\"Z3\",\"Z3K1\":\"Z6\",\"Z3K2\":\"Z1000000K1\",\"Z3K3\":\"Z1000\"}],\"Z4K3\":\"Z831\"},\"Z1000000K1\":\"5\"}"
		];

		$ZMillion = $this->readTestFileAsArray( 'user-defined-validation-type.json' );
		$validationZ7 = $this->readTestFileAsArray( 'example-user-defined-validation.json' );
		$ZMillion["Z4K3"]["Z8K1"][1]["Z17K1"] = $ZMillion;
		$validationZ7["Z801K1"]["Z1K1"] = $ZMillion;

		// TODO (T314609): This test currently does nothing!
		yield 'Invoke user-defined validation function implemented in Python' => [
			json_encode( $validationZ7 ),
			'Z24',
			// @phpcs:ignore Generic.Files.LineLength.TooLong
			"{\"Z1K1\":\"Z5\",\"Z5K1\":{\"Z1K1\":\"Z518\",\"Z518K1\":{\"Z1K1\":\"Z4\",\"Z4K1\":\"Z1000000\",\"Z4K2\":[{\"Z1K1\":\"Z3\",\"Z3K1\":\"Z6\",\"Z3K2\":\"Z1000000K1\",\"Z3K3\":\"Z1000\"}],\"Z4K3\":{\"Z1K1\":\"Z8\",\"Z8K1\":[{\"Z1K1\":\"Z17\",\"Z17K1\":{\"Z1K1\":\"Z4\",\"Z4K1\":\"Z1000000\",\"Z4K2\":[{\"Z1K1\":\"Z3\",\"Z3K1\":\"Z6\",\"Z3K2\":\"Z1000000K1\",\"Z3K3\":\"Z1000\"}],\"Z4K3\":{\"Z1K1\":\"Z8\",\"Z8K1\":[{\"Z1K1\":\"Z17\",\"Z17K1\":\"Z1000000\",\"Z17K2\":\"Z1001K1\",\"Z17K3\":{\"Z1K1\":\"Z12\",\"Z12K1\":[]}}],\"Z8K2\":\"Z4\",\"Z8K3\":[],\"Z8K4\":[{\"Z1K1\":\"Z14\",\"Z14K1\":\"Z1001\",\"Z14K3\":{\"Z1K1\":\"Z16\",\"Z16K1\":{\"Z1K1\":\"Z61\",\"Z61K1\":\"python-3\"},\"Z16K2\":\"def Z1001(Z1001K1):\\n  if Z1001K1.Z1000000K1 != 'A':\\n    raise Exception('does that look like an A to you???')\\n  return Z1001K1\"}}],\"Z8K5\":\"Z1001\"}},\"Z17K2\":\"Z1001K1\",\"Z17K3\":{\"Z1K1\":\"Z12\",\"Z12K1\":[]}}],\"Z8K2\":\"Z4\",\"Z8K3\":[],\"Z8K4\":[{\"Z1K1\":\"Z14\",\"Z14K1\":\"Z1001\",\"Z14K3\":{\"Z1K1\":\"Z16\",\"Z16K1\":{\"Z1K1\":\"Z61\",\"Z61K1\":\"python-3\"},\"Z16K2\":\"def Z1001(Z1001K1):\\n  if Z1001K1.Z1000000K1 != 'A':\\n    raise Exception('does that look like an A to you???')\\n  return Z1001K1\"}}],\"Z8K5\":\"Z1001\"}},\"Z518K2\":{\"Z1K1\":{\"Z1K1\":\"Z4\",\"Z4K1\":\"Z1000000\",\"Z4K2\":[{\"Z1K1\":\"Z3\",\"Z3K1\":\"Z6\",\"Z3K2\":\"Z1000000K1\",\"Z3K3\":\"Z1000\"}],\"Z4K3\":{\"Z1K1\":\"Z8\",\"Z8K1\":[{\"Z1K1\":\"Z17\",\"Z17K1\":{\"Z1K1\":\"Z4\",\"Z4K1\":\"Z1000000\",\"Z4K2\":[{\"Z1K1\":\"Z3\",\"Z3K1\":\"Z6\",\"Z3K2\":\"Z1000000K1\",\"Z3K3\":\"Z1000\"}],\"Z4K3\":{\"Z1K1\":\"Z8\",\"Z8K1\":[{\"Z1K1\":\"Z17\",\"Z17K1\":\"Z1000000\",\"Z17K2\":\"Z1001K1\",\"Z17K3\":{\"Z1K1\":\"Z12\",\"Z12K1\":[]}}],\"Z8K2\":\"Z4\",\"Z8K3\":[],\"Z8K4\":[{\"Z1K1\":\"Z14\",\"Z14K1\":\"Z1001\",\"Z14K3\":{\"Z1K1\":\"Z16\",\"Z16K1\":{\"Z1K1\":\"Z61\",\"Z61K1\":\"python-3\"},\"Z16K2\":\"def Z1001(Z1001K1):\\n  if Z1001K1.Z1000000K1 != 'A':\\n    raise Exception('does that look like an A to you???')\\n  return Z1001K1\"}}],\"Z8K5\":\"Z1001\"}},\"Z17K2\":\"Z1001K1\",\"Z17K3\":{\"Z1K1\":\"Z12\",\"Z12K1\":[]}}],\"Z8K2\":\"Z4\",\"Z8K3\":[],\"Z8K4\":[{\"Z1K1\":\"Z14\",\"Z14K1\":\"Z1001\",\"Z14K3\":{\"Z1K1\":\"Z16\",\"Z16K1\":{\"Z1K1\":\"Z61\",\"Z61K1\":\"python-3\"},\"Z16K2\":\"def Z1001(Z1001K1):\\n  if Z1001K1.Z1000000K1 != 'A':\\n    raise Exception('does that look like an A to you???')\\n  return Z1001K1\"}}],\"Z8K5\":\"Z1001\"}},\"Z1000000K1\":\"a\"},\"Z518K3\":{\"Z1K1\":\"Z5\",\"Z5K2\":\"does that look like an A to you???\"}}}}",
		];

		yield 'Generate a Z4/Type with a user-defined function and use that Z4/Type as a ZObject\'s Z1K1/Type' => [
			$this->readTestFile( 'example-user-defined-generic-type.json' ),
			// @phpcs:ignore Generic.Files.LineLength.TooLong
			"{\"Z1K1\":{\"Z1K1\":\"Z4\",\"Z4K1\":\"Z10101\",\"Z4K2\":[\"Z3\",{\"Z1K1\":\"Z3\",\"Z3K1\":\"Z6\",\"Z3K2\":\"K1\",\"Z3K3\":\"Z1000\"},{\"Z1K1\":\"Z3\",\"Z3K1\":\"Z40\",\"Z3K2\":\"K2\",\"Z3K3\":\"Z1000\"}],\"Z4K3\":\"Z831\"},\"K1\":\"TRUE\",\"K2\":{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}}"
		];

		$curryImplementation = $this->readTestFileAsArray( 'curry-implementation-Z10088.json' );
		$curryFunction = $this->readTestFileAsArray( 'curry-Z10087.json' );
		$curryFunction["Z8K4"][1] = $curryImplementation;
		$curryFunctionCall = $this->readTestFileAsArray( 'curry-call-Z30086.json' );
		$curryFunctionCall["Z8K4"][1]["Z14K2"]["Z7K1"]["Z7K1"] = $curryFunction;
		$andFunction = $this->readTestFileAsArray( 'and-Z10007.json' );
		$curry = [
			"Z1K1" => "Z7",
			"Z7K1" => $curryFunctionCall,
			"Z30086K1" => $andFunction,
			"Z30086K2" => [
				"Z1K1" => "Z40",
				"Z40K1" => "Z41"
			],
			"Z30086K3" => [
				"Z1K1" => "Z40",
				"Z40K1" => "Z41"
			]
		];

		yield 'Create and invoke a curried function' => [
			json_encode( $curry ),
			"{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}",
			'Z24',
		];
	}
}
