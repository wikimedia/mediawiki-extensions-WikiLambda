<?php

use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use MediaWiki\Extension\WikiLambda\MockOrchestrator;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\API\ApiFunctionCall
 * @group API
 * @group WikiLambda
 * @group medium
 */
class ApiFunctionCallTest extends ApiTestCase {

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiFunctionCall::execute
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiFunctionCall::executeGenerator
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiFunctionCall::run
	 * @group Broken
	 */
	public function testExecute() {
		$inputFile = __DIR__ .
			DIRECTORY_SEPARATOR .
			'..' .
			DIRECTORY_SEPARATOR .
			'..' .
			DIRECTORY_SEPARATOR .
			'test_data' .
			DIRECTORY_SEPARATOR .
			'Z902_false.json';
		$Z902 = file_get_contents( $inputFile );
		$Z902 = preg_replace( '/[\s\n]/', '', $Z902 );
		$result = $this->doApiRequest( [
			'action' => 'wikilambda_function_call',
			'wikilambda_function_call_zobject' => $Z902
		] );
		$expected = json_decode(
			'{"Z1K1":{"Z1K1":"Z9","Z9K1":"Z40"},"Z40K1":{"Z1K1":"Z6","Z6K1":"Z42"}}'
		);
		$orchestrationResult = $result[0]['query']['wikilambda_function_call']['Orchestrated'];
		$this->assertTrue( $orchestrationResult['success'] );
		$this->assertEquals( $expected, json_decode( $orchestrationResult['data'] ) );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiFunctionCall::execute
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiFunctionCall::executeGenerator
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiFunctionCall::run
	 */
	public function testExecuteSuccessfulWithMock() {
		$expectedString = '{"Z1K1":{"Z1K1":"Z9","Z9K1":"Z40"},' .
			'"Z40K1":{"Z1K1":"Z6","Z6K1":"Z42"}}';
		MockOrchestrator::mock()->append( new Response( 200, [], $expectedString ) );

		$inputFile = __DIR__ .
			DIRECTORY_SEPARATOR .
			'..' .
			DIRECTORY_SEPARATOR .
			'..' .
			DIRECTORY_SEPARATOR .
			'test_data' .
			DIRECTORY_SEPARATOR .
			'Z902_false.json';
		$Z902 = file_get_contents( $inputFile );
		$Z902 = preg_replace( '/[\s\n]/', '', $Z902 );

		$result = $this->doApiRequest( [
			'action' => 'wikilambda_function_call',
			'wikilambda_function_call_zobject' => $Z902
		] );

		$expected = json_decode( $expectedString );
		$orchestrationResult = $result[0]['query']['wikilambda_function_call']['Orchestrated'];
		$this->assertTrue( $orchestrationResult['success'] );
		$this->assertEquals( $expected, json_decode( $orchestrationResult['data'] ) );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiFunctionCall::execute
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiFunctionCall::executeGenerator
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiFunctionCall::run
	 */
	public function testExecuteRequestFailedWithMock() {
		$expectedError = 'Not found.';
		$response = new Response();
		$response = $response->withStatus( 404, $expectedError );
		MockOrchestrator::mock()->append( $response );

		$inputFile = __DIR__ .
			DIRECTORY_SEPARATOR .
			'..' .
			DIRECTORY_SEPARATOR .
			'..' .
			DIRECTORY_SEPARATOR .
			'test_data' .
			DIRECTORY_SEPARATOR .
			'Z902_false.json';
		$Z902 = file_get_contents( $inputFile );
		$Z902 = preg_replace( '/[\s\n]/', '', $Z902 );

		$this->expectException( ApiUsageException::class );

		$result = $this->doApiRequest( [
			'action' => 'wikilambda_function_call',
			'wikilambda_function_call_zobject' => $Z902
		] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiFunctionCall::execute
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiFunctionCall::executeGenerator
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiFunctionCall::run
	 */
	public function testExecuteConnectionFailedWithMock() {
		$inputFile = __DIR__ .
			DIRECTORY_SEPARATOR .
			'..' .
			DIRECTORY_SEPARATOR .
			'..' .
			DIRECTORY_SEPARATOR .
			'test_data' .
			DIRECTORY_SEPARATOR .
			'Z902_false.json';
		$Z902 = file_get_contents( $inputFile );
		$Z902 = preg_replace( '/[\s\n]/', '', $Z902 );

		$expectedError = 'Could not resolve host <mock>, ' .
			'probably because the orchestrator is not running. ' .
			'Please consult the README to add the orchestrator ' .
			'to your docker-compose configuration.';
		$request = new Request( 'orchestrate', 'orchestrator:port', [], $Z902 );
		$exception = new ConnectException( $expectedError, $request );
		MockOrchestrator::mock()->append( $exception );

		$this->expectException( ApiUsageException::class );
		$result = $this->doApiRequest( [
			'action' => 'wikilambda_function_call',
			'wikilambda_function_call_zobject' => $Z902
		] );
	}

}
