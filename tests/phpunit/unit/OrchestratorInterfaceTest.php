<?php

use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use MediaWiki\Extension\WikiLambda\OrchestratorInterface;

/**
 * @coversDefaultClass MediaWiki\Extension\WikiLambda\OrchestratorInterface;
 * @group WikiLambda
 * @group medium
 */
class OrchestratorInterfaceTest extends \MediaWikiUnitTestCase {

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

		$orchestrator = new OrchestratorInterface( $client );
		$result = $orchestrator->orchestrate( $Z902 )->getBody();
		$this->assertEquals( json_decode( $expectedString ), json_decode( $result ) );
	}

}
