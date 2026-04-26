<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\OrchestratorRequest;

/**
 * @covers \MediaWiki\Extension\WikiLambda\OrchestratorRequest
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\ApiFunctionCall
 * @covers \MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper
 * @group Database
 */
class OrchestratorRequestTest extends \MediaWikiIntegrationTestCase {

	public function testExecute() {
		$mock = new MockHandler();
		$handler = HandlerStack::create( $mock );
		$client = new Client( [ 'handler' => $handler ] );

		// A real orchestrator response wraps the function-call value (here a Z40) inside a Z22
		// envelope, with Z22K2 holding the meta-data map (Z24/void as nothing reads it on success).
		$value = '{"Z1K1":{"Z1K1":"Z9","Z9K1":"Z40"},"Z40K1":{"Z1K1":"Z6","Z6K1":"Z42"}}';
		$envelopeString = '{"Z1K1":"Z22","Z22K1":' . $value . ',"Z22K2":"Z24"}';

		$mock->append( new Response( HttpStatus::OK, [], $envelopeString ) );

		$inputFile = __DIR__ .
			DIRECTORY_SEPARATOR .
			'..' .
			DIRECTORY_SEPARATOR .
			'test_data' .
			DIRECTORY_SEPARATOR .
			'Z902_false.json';
		$Z902 = file_get_contents( $inputFile );
		$Z902 = preg_replace( '/[\s\n]/', '', $Z902 );

		$orchestrator = new OrchestratorRequest( $client );
		$response = $orchestrator->orchestrate( json_decode( $Z902 ) );
		$this->assertEquals( HttpStatus::OK, $response['httpStatusCode'] );
		$this->assertEquals( json_decode( $envelopeString ), json_decode( $response['result'] ) );
	}

	public function testUnsuccessfulExecute() {
		$mock = new MockHandler();

		$expectedString = 'Internal Server Error';
		$mock->append( new Response( HttpStatus::INTERNAL_SERVER_ERROR, [], $expectedString ) );

		$handler = HandlerStack::create( $mock );
		$client = new Client( [ 'handler' => $handler ] );

		$orchestrator = new OrchestratorRequest( $client );

		$inputFile = __DIR__ .
			DIRECTORY_SEPARATOR .
			'..' .
			DIRECTORY_SEPARATOR .
			'test_data' .
			DIRECTORY_SEPARATOR .
			'example-orchestrator-timeout.json';
		$timeout = file_get_contents( $inputFile );
		$timeout = preg_replace( '/[\s\n]/', '', $timeout );
		$queryObject = json_decode( $timeout );

		$response = $orchestrator->orchestrate( $queryObject );
		$this->assertEquals( HttpStatus::INTERNAL_SERVER_ERROR, $response['httpStatusCode'] );
		// (T414062) Non-JSON / non-Z22 orchestrator bodies are wrapped in a Z22 with a Z577 error
		// quoting the bad body.
		$decoded = json_decode( $response['result'] );
		$this->assertEquals( 'Z22', $decoded->Z1K1 );
		$this->assertEquals( 'Z24', $decoded->Z22K1 );
		$error = $decoded->Z22K2->K1[1]->K2;
		$this->assertEquals( 'Z577', $error->Z5K1 );

		$this->assertEquals( $queryObject, $error->Z5K2->K1->Z99K1 );
		$this->assertEquals( 'Internal Server Error', $error->Z5K2->K2->Z99K1 );
	}

	public function testExecuteWithBadInput() {
		$mock = new MockHandler();
		$handler = HandlerStack::create( $mock );
		$client = new Client( [ 'handler' => $handler ] );

		// The orchestrator can answer with a well-formed Z22 envelope but a non-200 status when
		// the user-supplied call references something it cannot resolve — e.g. a ZID that does
		// not exist (Z504, mapped to HTTP 404). OrchestratorRequest must pass both body and
		// status through unchanged; the wrap-as-Z577 path is only for malformed responses.
		$envelopeString = '{"Z1K1":"Z22","Z22K1":"Z24","Z22K2":{"Z1K1":{"Z1K1":"Z7","Z7K1":"Z883",' .
			'"Z883K1":"Z6","Z883K2":"Z1"},"K1":[{"Z1K1":"Z7","Z7K1":"Z882","Z882K1":"Z6","Z882K2":"Z1"},' .
			'{"Z1K1":{"Z1K1":"Z7","Z7K1":"Z882","Z882K1":"Z6","Z882K2":"Z1"},"K1":"errors",' .
			'"K2":{"Z1K1":"Z5","Z5K1":"Z504","Z5K2":{"Z1K1":{"Z1K1":"Z7","Z7K1":"Z885","Z885K1":"Z504"},' .
			'"K1":"Z40404"}}}]}}';

		$mock->append( new Response( HttpStatus::NOT_FOUND, [], $envelopeString ) );

		$inputFile = __DIR__ .
			DIRECTORY_SEPARATOR .
			'..' .
			DIRECTORY_SEPARATOR .
			'test_data' .
			DIRECTORY_SEPARATOR .
			'Z902_false.json';
		$Z902 = file_get_contents( $inputFile );
		$Z902 = preg_replace( '/[\s\n]/', '', $Z902 );

		$orchestrator = new OrchestratorRequest( $client );
		$response = $orchestrator->orchestrate( json_decode( $Z902 ) );

		$this->assertEquals( HttpStatus::NOT_FOUND, $response['httpStatusCode'] );
		$this->assertEquals( json_decode( $envelopeString ), json_decode( $response['result'] ) );
	}

	public function testSupportedProgrammingLanguages() {
		$mock = new MockHandler();
		$handler = HandlerStack::create( $mock );
		$client = new Client( [ 'handler' => $handler ] );

		$expectedString = '[ "python3000" ]';

		$mock->append( new Response( HttpStatus::OK, [], $expectedString ) );

		$orchestrator = new OrchestratorRequest( $client );
		$result = $orchestrator->getSupportedProgrammingLanguages()->getBody();
		$this->assertEquals( json_decode( $expectedString ), json_decode( $result ) );
	}

	public function testPersistToCache() {
		$mock = new MockHandler();
		$handler = HandlerStack::create( $mock );
		$client = new Client( [ 'handler' => $handler ] );

		$mock->append( new Response( HttpStatus::OK, [] ) );

		$inputFile = __DIR__ .
			DIRECTORY_SEPARATOR .
			'..' .
			DIRECTORY_SEPARATOR .
			'..' .
			DIRECTORY_SEPARATOR .
			'..' .
			DIRECTORY_SEPARATOR .
			'function-schemata' .
			DIRECTORY_SEPARATOR .
			'data' .
			DIRECTORY_SEPARATOR .
			'definitions' .
			DIRECTORY_SEPARATOR .
			'Z6.json';
		$Z2String = file_get_contents( $inputFile );
		$Z2ForZ6 = json_decode( $Z2String );

		$orchestrator = new OrchestratorRequest( $client );
		$result = $orchestrator->persistToCache( $Z2ForZ6 );
		$this->assertEquals( HttpStatus::OK, $result->getStatusCode() );
	}

}
