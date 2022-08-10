<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use MediaWiki\Extension\WikiLambda\OrchestratorRequest;

/**
 * @coversDefaultClass MediaWiki\Extension\WikiLambda\OrchestratorRequest;
 */
class OrchestratorRequestTest extends \MediaWikiIntegrationTestCase {

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiFunctionCall::execute
	 */
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
		$result = $orchestrator->orchestrate( json_decode( $Z902 ) )->getBody();
		$this->assertEquals( json_decode( $expectedString ), json_decode( $result ) );
	}

}
