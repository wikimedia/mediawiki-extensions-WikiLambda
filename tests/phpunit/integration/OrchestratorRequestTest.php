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

		$mock->append( new Response( 200, [], $expectedString ) );

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
		$result = $orchestrator->orchestrate( json_decode( $Z902 ) );
		$this->assertEquals( json_decode( $expectedString ), json_decode( $result ) );
	}

	public function testSupportedProgrammingLanguages() {
		$mock = new MockHandler();
		$handler = HandlerStack::create( $mock );
		$client = new Client( [ 'handler' => $handler ] );

		$expectedString = '[ "python3000" ]';

		$mock->append( new Response( 200, [], $expectedString ) );

		$orchestrator = new OrchestratorRequest( $client );
		$result = $orchestrator->getSupportedProgrammingLanguages()->getBody();
		$this->assertEquals( json_decode( $expectedString ), json_decode( $result ) );
	}

	public function testPersistToCache() {
		$mock = new MockHandler();
		$handler = HandlerStack::create( $mock );
		$client = new Client( [ 'handler' => $handler ] );

		$mock->append( new Response( 200, [] ) );

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
		$this->assertEquals( 200, $result->getStatusCode() );
	}

}
