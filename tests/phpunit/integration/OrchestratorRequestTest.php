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
 * @covers MediaWiki\Extension\WikiLambda\OrchestratorRequest
 * @covers MediaWiki\Extension\WikiLambda\ActionAPI\ApiFunctionCall
 * @group Database
 */
class OrchestratorRequestTest extends \MediaWikiIntegrationTestCase {

	public function testExecute() {
		$mock = new MockHandler();
		$handler = HandlerStack::create( $mock );
		$client = new Client( [ 'handler' => $handler ] );

		$expectedString = '{"Z1K1":{"Z1K1":"Z9","Z9K1":"Z40"},' .
			'"Z40K1":{"Z1K1":"Z6","Z6K1":"Z42"}}';

		$mock->append( new Response( HttpStatus::OK, [], $expectedString ) );

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
		$result = $orchestrator->orchestrate( json_decode( $Z902 ) )['result'];
		$this->assertEquals( json_decode( $expectedString ), json_decode( $result ) );
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

		$result = $orchestrator->orchestrate( json_decode( $timeout ) )['result'];
		$this->assertEquals( 'Internal Server Error', $result );
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
