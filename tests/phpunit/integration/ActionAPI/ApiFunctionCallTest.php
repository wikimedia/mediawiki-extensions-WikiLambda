<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI;

use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Psr7\Request;
use MediaWiki\Api\ApiUsageException;
use MediaWiki\Extension\WikiLambda\OrchestratorException;
use MediaWiki\Extension\WikiLambda\OrchestratorRequest;
use MediaWiki\Extension\WikiLambda\Tests\Integration\MockOrchestratorRequest;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use Wikimedia\RequestTimeout\TimeoutException;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\ApiFunctionCall
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\WikiLambdaApiBase
 * @group API
 * @group Standalone
 * @group Database
 */
class ApiFunctionCallTest extends WikiLambdaApiTestCase {

	protected function setUp(): void {
		parent::setUp();
		$mock = new MockOrchestratorRequest();
		$this->setService( 'WikiLambdaOrchestratorRequest', $mock );
	}

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
	 * of the function-orchestrator, just a mock of it; they let us confirm that:
	 * * if the orchestrator were to be called, the response would go through the API handler as intended.
	 * * depending on the returned response from the orchestrator, the Api builds its response as intended.
	 *
	 * For actual end-to-end testing of this, see the Catalyst system.
	 *
	 * @dataProvider provideExecuteSuccessfulViaMock
	 */
	public function testExecuteSuccessfulViaMock(
		$requestString,
		$expectedString = null,
		$callBack = null,
	) {
		$result = [];
		$orchestrationResult = [];

		// Run the request
		$result = $this->doApiRequest( [
			'action' => 'wikilambda_function_call',
			'wikilambda_function_call_zobject' => $requestString
		] );
		$orchestrationResult = $result[0]['wikilambda_function_call'];

		$this->assertArrayHasKey( 'success', $orchestrationResult );
		$this->assertTrue( $orchestrationResult['success'], 'Expected success but got failure' );

		$expected = json_decode( $expectedString, true ) ?? $expectedString;
		$resultEnvelope = json_decode( $orchestrationResult['data'], true );

		// Compare bodies by running assertEquals or callback static function if available
		$actualString = $resultEnvelope['Z22K1'];
		$actual = $actualString;
		$callBack ??= $this->assertEquals( ... );
		$callBack( $expected, $actual );
	}

	public static function provideExecuteSuccessfulViaMock() {
		// TODO (T311801): Items below are the user-facing examples from ApiFunctionCall; maybe share the definitons?

		yield 'Manual echo' => [
			/* requestString= */ '{"Z1K1": "Z7", "Z7K1": "Z801", "Z801K1": "Hello, testers!" }',
			/* expectedString= */ 'Hello, testers!'
		];

		yield 'Invoke built-in Z802/If with false predicate' => [
			/* requestString= */ ZObjectUtils::readTestFile( 'Z902_false.json' ),
			/* expectedString= */ "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z42\"}"
		];

		yield 'Invoke user-written JavaScript code' => [
			/* requestString= */ ZObjectUtils::readTestFile( 'evaluated-js.json' ),
			/* expectedString= */ "13"
		];

		yield 'Invoke user-written Python 3 code' => [
			/* requestString= */ ZObjectUtils::readTestFile( 'evaluated-python.json' ),
			/* expectedString= */ "13"
		];

		yield 'Invoke a composition: if first argument is true, sort second; else, return it intact' => [
			/* requestString= */ ZObjectUtils::readTestFile( 'example-composition.json' ),
			/* expectedString= */ '        abcddeeeefghhijklmnoooopqrrttuuvwxyz'
		];

		// @phpcs:ignore Generic.Files.LineLength.TooLong
		yield 'Invoke the \"not empty\" function as a composition: returns true iff input list contains at least one element' => [
			/* requestString= */ ZObjectUtils::readTestFile( 'example-notempty.json' ),
			/* expectedString= */ "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
		];

		// @phpcs:ignore Generic.Files.LineLength.TooLong
		yield 'Invoke the Map function: given a function and a list of strings, return the result of running the function over each string' => [
			/* requestString= */ ZObjectUtils::readTestFile( 'example-map.json' ),
			// @phpcs:ignore Generic.Files.LineLength.TooLong
			/* expectedString= */ '[{"Z1K1":"Z4","Z4K1":"Z6","Z4K2":["Z3",{"Z1K1":"Z3","Z3K1":"Z6","Z3K2":"Z6K1","Z3K3":{"Z1K1":"Z12","Z12K1":["Z11",{"Z1K1":"Z11","Z11K1":"Z1002","Z11K2":"value"}]}}],"Z4K3":"Z106","Z4K4":"Z866"},"acab","acab","bacab"]'
		];

		// @phpcs:ignore Generic.Files.LineLength.TooLong
		yield 'Invoke the Apply function: given a function and a string, return the result of running the function over the string' => [
			/* requestString= */ ZObjectUtils::readTestFile( 'example-apply.json' ),
			/* expectedString= */ "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
		];

		yield 'Invoke a function that returns the first element of a typed List' => [
			/* requestString= */ ZObjectUtils::readTestFile( 'example-generic-list.json' ),
			/* expectedString= */ 'who are these coming to the sacrifice'
		];

		yield 'Invoke a function that returns the second element of a Pair<String,Boolean>' => [
			/* requestString= */ ZObjectUtils::readTestFile( 'example-generic-pair.json' ),
			// @phpcs:ignore Generic.Files.LineLength.TooLong
			/* expectedString= */ "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
		];

		yield 'Invoke a function that returns the second element of a Pair<String,Pair<String,String>>' => [
			/* requestString= */ ZObjectUtils::readTestFile( 'example-generic-pair-2.json' ),
			// @phpcs:ignore Generic.Files.LineLength.TooLong
			/* expectedString= */ '{"Z1K1":{"Z1K1":"Z7","Z7K1":"Z882","Z882K1":"Z6","Z882K2":"Z6"},"K1":"Where the pot\'s not","K2":"is where it\'s useful."}'
		];

		// @phpcs:ignore Generic.Files.LineLength.TooLong
		yield 'Invoke a function that maps the element of a typed Map at a given key to a string version of its value' => [
			/* requestString= */ ZObjectUtils::readTestFile( 'example-generic-map.json' ),
			// @phpcs:ignore Generic.Files.LineLength.TooLong
			/* expectedString= */ '{"Z1K1":{"Z1K1":"Z7","Z7K1":"Z883","Z883K1":"Z6","Z883K2":"Z6"},"K1":[{"Z1K1":"Z7","Z7K1":"Z882","Z882K1":"Z6","Z882K2":"Z6"},{"Z1K1":{"Z1K1":"Z7","Z7K1":"Z882","Z882K1":"Z6","Z882K2":"Z6"},"K1":"true?","K2":"true"}]}'
		];

		yield 'Invoke JavaScript function using a user-defined type' => [
			/* requestString= */ ZObjectUtils::readTestFile( 'example-user-defined-javascript.json' ),
			// @phpcs:ignore Generic.Files.LineLength.TooLong
			/* expectedString= */ "{\"Z1K1\":\"Z1000000\",\"Z1000000K1\":\"5\"}"
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
			/* requestString= */ ZObjectUtils::readTestFile( 'example-user-defined-generic-type.json' ),
			// @phpcs:ignore Generic.Files.LineLength.TooLong
			/* expectedString= */ '{"Z1K1":{"Z1K1":"Z7","Z7K1":{"Z1K1":"Z8","Z8K1":["Z17"],"Z8K2":"Z4","Z8K3":["Z20"],"Z8K4":["Z14",{"Z1K1":"Z14","Z14K1":"Z10106","Z14K2":{"Z1K1":"Z4","Z4K1":"Z10101","Z4K2":["Z3",{"Z1K1":"Z3","Z3K1":"Z6","Z3K2":"K1","Z3K3":"Z400"},{"Z1K1":"Z3","Z3K1":"Z40","Z3K2":"K2","Z3K3":"Z400"}],"Z4K3":"Z831"}}],"Z8K5":"Z10106"}},"K1":"TRUE","K2":{"Z1K1":"Z40","Z40K1":"Z41"}}'
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
			/* requestString= */ json_encode( $curry ),
			/* expectedString= */ "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}"
		];

		yield 'Supply an implementation with an unsupported language; back off to the second' => [
			/* requestString= */ ZObjectUtils::readTestFile( 'example-bad-first-implementation.json' ),
			/* expectedString= */ "{\"Z1K1\":\"Z40\",\"Z40K1\":\"Z41\"}",
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
			/* requestString= */ json_encode( $Z823 ),
			// @phpcs:ignore Generic.Files.LineLength.TooLong
			/* expectedString= */ "{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z1\",\"Z882K2\":\"Z1\"},\"K1\":\"the truth\",\"K2\":{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z883\",\"Z883K1\":\"Z6\",\"Z883K2\":\"Z1\"},\"K1\":[{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},\"K1\":\"implementationId\",\"K2\":{\"Z1K1\":\"Z6\",\"Z6K1\":\"Z902\"}},{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},\"K1\":\"implementationType\",\"K2\":\"BuiltIn\"},{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},\"K1\":\"orchestrationMemoryUsage\",\"K2\":\"91.91 MiB\"},{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},\"K1\":\"orchestrationCpuUsage\",\"K2\":\"24.322 ms\"},{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},\"K1\":\"orchestrationStartTime\",\"K2\":\"2023-03-21T22:34:23.609Z\"},{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},\"K1\":\"orchestrationEndTime\",\"K2\":\"2023-03-21T22:34:23.642Z\"},{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},\"K1\":\"orchestrationDuration\",\"K2\":\"33 ms\"},{\"Z1K1\":{\"Z1K1\":\"Z7\",\"Z7K1\":\"Z882\",\"Z882K1\":\"Z6\",\"Z882K2\":\"Z1\"},\"K1\":\"orchestrationHostname\",\"K2\":\"22ca7c26028f\"}]}}",
			/* callBack= */ static function ( $expected, $actual ) {
				self::assertEquals( $expected['Z1K1'], $actual['Z1K1'] );
				self::assertEquals( $expected['K1'], $actual['K1'] );
				// TODO (T314609): Also test that metadata has correct keys.
			}
		];
	}

	/**
	 * Tests ApiFunctionCall in failure cases:
	 * * When ApiUsageException is thrown by the OrchestratorRequest, the Api rethrows it
	 * * When OrchestratorRequest returns a valid response but the response contains a failure:
	 *   * Wraps orchestratorHttpStatusCode in the request
	 *   * If the status code is >= 500, returns success=false, else returns success=true
	 *
	 * NOTE: these are integration tests, not end-to-end tests. They never actually hit an instance
	 * of the function-orchestrator, just a mock of it; they let us confirm that:
	 * * if the orchestrator were to be called, the response would go through the API handler as intended.
	 * * depending on the returned response from the orchestrator, the Api builds its response as intended.
	 *
	 * For actual end-to-end testing of this, see the Catalyst system.
	 *
	 * @dataProvider provideExecuteFailedViaMock
	 */
	public function testExecuteFailedViaMock(
		$requestString,
		$expectedSuccess = null,
		$expectedHttpStatusCode = null,
	) {
		// Run the request
		$result = $this->doApiRequest( [
			'action' => 'wikilambda_function_call',
			'wikilambda_function_call_zobject' => $requestString
		] );
		$orchestrationResult = $result[0]['wikilambda_function_call'];

		// Assert status key
		$this->assertArrayHasKey( 'success', $orchestrationResult );
		$this->assertSame( $expectedSuccess, $orchestrationResult['success'] );

		// Assert that orchestrator's httpStatusCode gets propagated
		$this->assertArrayHasKey( 'orchestratorHttpStatusCode', $orchestrationResult );
		$actualHttpStatusCode = $orchestrationResult['orchestratorHttpStatusCode'];
		$this->assertSame( $expectedHttpStatusCode, $actualHttpStatusCode );

		// Assert that response body contains the result from the orchestrator
		$this->assertArrayHasKey( 'data', $orchestrationResult );
		$resultEnvelope = json_decode( $orchestrationResult['data'], true );

		// Compare bodies by running assertEquals or callback static function if available
		$actualValue = $resultEnvelope['Z22K1'];
		$actualMetadata = $resultEnvelope['Z22K2'];
		$this->assertEquals( 'Z24', $resultEnvelope['Z22K1'] );
	}

	public static function provideExecuteFailedViaMock() {
		// (T314609) Orchestrator error cases
		// ==================================

		yield 'Orchestrator returns 400: error in evaluation (Z507)' => [
			/* requestString= */ '{"Z1K1":"Z7","Z7K1":"Z801","Z801K1":"mock-400-error-in-evaluation"}',
			/* expectedSuccess= */ true,
			/* expectedHttpStatusCode= */ 400,
		];

		yield 'Orchestrator returns 401: user not permitted to evaluate function (Z559)' => [
			/* requestString= */ '{"Z1K1":"Z7","Z7K1":"Z801","Z801K1":"mock-401-unauthorized"}',
			/* expectedSuccess= */ true,
			/* expectedHttpStatusCode= */ 401,
		];

		yield 'Orchestrator returns 403: disallowed root object (Z553)' => [
			/* requestString= */ '{"Z1K1":"Z7","Z7K1":"Z801","Z801K1":"mock-403-forbidden"}',
			/* expectedSuccess= */ true,
			/* expectedHttpStatusCode= */ 403,
		];

		yield 'Orchestrator returns 404: ZID not found (Z504)' => [
			/* requestString= */ '{"Z1K1":"Z7","Z7K1":"Z801","Z801K1":"mock-404-zid-not-found"}',
			/* expectedSuccess= */ true,
			/* expectedHttpStatusCode= */ 404,
		];

		yield 'Orchestrator returns 408: orchestrator time limit reached (Z574)' => [
			/* requestString= */ '{"Z1K1":"Z7","Z7K1":"Z801","Z801K1":"mock-408-orchestrator-time-limit"}',
			/* expectedSuccess= */ true,
			/* expectedHttpStatusCode= */ 408,
		];

		yield 'Orchestrator returns 409: resolved object without Z2K2 (Z513)' => [
			/* requestString= */ '{"Z1K1":"Z7","Z7K1":"Z801","Z801K1":"mock-409-conflict"}',
			/* expectedSuccess= */ true,
			/* expectedHttpStatusCode= */ 409,
		];

		yield 'Orchestrator returns 422: unknown error (Z500)' => [
			/* requestString= */ '{"Z1K1":"Z7","Z7K1":"Z801","Z801K1":"mock-422-unknown-error"}',
			/* expectedSuccess= */ true,
			/* expectedHttpStatusCode= */ 422,
		];

		yield 'Orchestrator returns 429: rate limit reached (Z570)' => [
			/* requestString= */ '{"Z1K1":"Z7","Z7K1":"Z801","Z801K1":"mock-429-rate-limit"}',
			/* expectedSuccess= */ true,
			/* expectedHttpStatusCode= */ 429,
		];

		yield 'Orchestrator returns 500: API failure (Z530)' => [
			/* requestString= */ '{"Z1K1":"Z7","Z7K1":"Z801","Z801K1":"mock-500-api-failure"}',
			/* expectedSuccess= */ false,
			/* expectedHttpStatusCode= */ 500,
		];

		yield 'Orchestrator returns 501: not implemented yet (Z503)' => [
			/* requestString= */ '{"Z1K1":"Z7","Z7K1":"Z801","Z801K1":"mock-501-not-implemented"}',
			/* expectedSuccess= */ false,
			/* expectedHttpStatusCode= */ 501,
		];

		yield 'Orchestrator returns 502: invalid orchestrator result (Z577)' => [
			/* requestString= */ '{"Z1K1":"Z7","Z7K1":"Z801","Z801K1":"mock-502-invalid-orchestrator-result"}',
			/* expectedSuccess= */ false,
			/* expectedHttpStatusCode= */ 502,
		];

		yield 'Orchestrator returns 504: evaluator WASM limit reached (Z576)' => [
			/* requestString= */ '{"Z1K1":"Z7","Z7K1":"Z801","Z801K1":"mock-504-evaluator-wasm-limit"}',
			/* expectedSuccess= */ false,
			/* expectedHttpStatusCode= */ 504,
		];
	}

	private function mockOrchestrator( $throwable ): void {
		$mock = $this->createMock( OrchestratorRequest::class );
		$mock
			->method( 'orchestrate' )
			->willThrowException( $throwable );

		$this->setService( 'WikiLambdaOrchestratorRequest', $mock );
	}

	public function testExecuteOrchestratorThrowsGuzzleException() {
		$message = 'Connection refused';
		$guzzleException = new ConnectException( $message, new Request( 'POST', '' ) );
		$orchestratorException = new OrchestratorException( $message, [], 0, $guzzleException );

		$this->mockOrchestrator( $orchestratorException );

		$this->expectException( ApiUsageException::class );
		$this->expectExceptionMessage( 'Error of type Z529' );

		// Run the request
		$requestString = '{"Z1K1":"Z7","Z7K1":"Z801","Z801K1":"mock-guzzle-exception"}';
		$result = $this->doApiRequest( [
			'action' => 'wikilambda_function_call',
			'wikilambda_function_call_zobject' => $requestString
		] );
		$orchestrationResult = $result[0]['wikilambda_function_call'];
	}

	public function testExecuteOrchestratorThrowsTimeoutException() {
		$timeoutException = new TimeoutException( 'timeout', 10 );
		$this->mockOrchestrator( $timeoutException );

		$this->expectException( ApiUsageException::class );
		$this->expectExceptionMessage( 'The maximum request time of 10 sec. was exceeded.' );

		// Run the request
		$requestString = '{"Z1K1":"Z7","Z7K1":"Z801","Z801K1":"mock-timeout-exception"}';
		$result = $this->doApiRequest( [
			'action' => 'wikilambda_function_call',
			'wikilambda_function_call_zobject' => $requestString
		] );
		$orchestrationResult = $result[0]['wikilambda_function_call'];
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
