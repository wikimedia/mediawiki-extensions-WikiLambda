<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\RESTAPI\FunctionCallHandler;
use MediaWiki\Rest\LocalizedHttpException;
use MediaWiki\Rest\RequestData;
use MediaWiki\Tests\Rest\Handler\HandlerTestTrait;
use Wikimedia\Message\MessageValue;

/**
 * @covers \MediaWiki\Extension\WikiLambda\RESTAPI\FunctionCallHandler
 *
 * - {zid}/{arguments}
 * - {zid}/{arguments}/{parselang}/{renderlang}
 *
 * @group Standalone
 * @group Database
 */
class FunctionCallHandlerTest extends WikiLambdaIntegrationTestCase {
	use HandlerTestTrait;

	/** @var array */
	private $standardCall;

	protected function setUp(): void {
		parent::setUp();

		// First, we need to insert the ZObjects we're going to try to call
		$this->insertZids( [ 'Z1', 'Z2', 'Z6', 'Z8', 'Z17', 'Z40', 'Z41', 'Z42', 'Z801', 'Z802', 'Z1002', 'Z1004' ] );
		$this->registerLangs( [ 'en', 'fr' ] );

		$this->registerErrors( [ 'Z504' ] );

		$this->standardCall = [
			'pathParams' => [
				'zid' => 'Z801',
				'arguments' => base64_encode( 'foo' ),
				'parselang' => 'en',
				'renderlang' => 'fr'
			]
		];
	}

	public function testExecute_basicEcho() {
		// The simplest call, a request to echo 'foo' (parse/render languages will be ignored as they're strings)

		// Force-enable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );

		$request = new RequestData( $this->standardCall );
		$handler = new FunctionCallHandler();

		$response = $this->executeHandler( $handler, $request );

		$this->assertEquals( 200, $response->getStatusCode() );
		$this->assertEquals( '{"value":"foo"}', $response->getBody()->getContents() );
	}

	public function testExecute_clientModeDisabled() {
		// Confirm that a 501 is returned when the client mode is disabled

		// Force-disable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', false );

		$request = new RequestData( $this->standardCall );
		$handler = new FunctionCallHandler();

		$this->expectExceptionObject(
			new LocalizedHttpException( new MessageValue( 'wikilambda-zerror' ), 501, [ 'target' => 'madeuplanguage' ] )
		);
		$this->executeHandler( $handler, $request );
	}

	public function testExecute_simpleIf() {
		// The second-simplest call, a request to echo 'true' or 'false' based on the first argument

		// Force-enable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );

		$ourCall = $this->standardCall;

		$ourCall['pathParams']['zid'] = 'Z802';
		$ourCall['pathParams']['arguments'] = implode( '|', [
				base64_encode( 'Z41' ), base64_encode( 'true' ), base64_encode( 'false' )
			] );
		$request = new RequestData( $ourCall );
		$handler = new FunctionCallHandler();

		$response = $this->executeHandler( $handler, $request );

		$this->assertEquals( 200, $response->getStatusCode() );
		$this->assertEquals( '{"value":"true"}', $response->getBody()->getContents() );

		// … and try the other branch
		$ourCall['pathParams']['arguments'] = implode( '|', [
				base64_encode( 'Z42' ), base64_encode( 'true' ), base64_encode( 'false' )
			] );
		$request = new RequestData( $ourCall );
		$handler = new FunctionCallHandler();

		$response = $this->executeHandler( $handler, $request );
		$this->assertEquals( '{"value":"false"}', $response->getBody()->getContents() );
	}

	public function testExecute_referencedInputNotFound() {
		// Confirm that a 400 is returned when a referenced input is not found

		// Force-enable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );

		$ourCall = $this->standardCall;

		$ourCall['pathParams']['zid'] = 'Z802';
		$ourCall['pathParams']['arguments'] = implode( '|', [
			base64_encode( 'Z421' ),
			base64_encode( 'true' ),
			base64_encode( 'false' )
		] );

		$request = new RequestData( $ourCall );
		$handler = new FunctionCallHandler();

		$this->expectExceptionObject(
			new LocalizedHttpException( new MessageValue( 'wikilambda-zerror' ), 400, [ 'target' => 'Z421' ] )
		);
		$this->executeHandler( $handler, $request );
	}

	public function testExecute_tooFewInputs() {
		// Confirm that a 400 is returned when the call has the wrong number of inputs

		// Force-enable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );

		$ourCall = $this->standardCall;
		$ourCall['pathParams']['zid'] = 'Z802';
		$ourCall['pathParams']['arguments'] = implode( '|', [
			base64_encode( 'Z41' ),
			base64_encode( 'true' )
		] );
		$request = new RequestData( $ourCall );
		$handler = new FunctionCallHandler();

		$this->expectExceptionObject(
			new LocalizedHttpException( new MessageValue( 'wikilambda-zerror' ), 400, [ 'target' => 'Z0' ] )
		);
		$this->executeHandler( $handler, $request );
	}

	public function testExecute_tooManyInputs() {
		// Confirm that a 400 is returned when the call has the wrong number of inputs

		// Force-enable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );

		$ourCall = $this->standardCall;
		$ourCall['pathParams']['zid'] = 'Z802';
		$ourCall['pathParams']['arguments'] = implode( '|', [
			base64_encode( 'Z41' ),
			base64_encode( 'true' ),
			base64_encode( 'false' ),
			base64_encode( 'hello' )
		] );
		$request = new RequestData( $ourCall );
		$handler = new FunctionCallHandler();

		$this->expectExceptionObject(
			new LocalizedHttpException( new MessageValue( 'wikilambda-zerror' ), 400, [ 'target' => 'Z0' ] )
		);
		$this->executeHandler( $handler, $request );
	}

	public function testExecute_targetFunctionNotFound() {
		// Confirm that a 400 is returned when the target function is not found

		// Force-enable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );

		$ourCall = $this->standardCall;
		$ourCall['pathParams']['zid'] = 'Z0';
		$request = new RequestData( $ourCall );
		$handler = new FunctionCallHandler();

		$this->expectExceptionObject(
			new LocalizedHttpException( new MessageValue( 'wikilambda-zerror' ), 400, [ 'target' => 'Z0' ] )
		);
		$this->executeHandler( $handler, $request );
	}

	public function testExecute_targetFunctionNotAFunction() {
		// Confirm that a 400 is returned when the target Function is actually a Type

		// Force-enable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );

		$ourCall = $this->standardCall;
		$ourCall['pathParams']['zid'] = 'Z4';
		$request = new RequestData( $ourCall );
		$handler = new FunctionCallHandler();

		$this->expectExceptionObject(
			new LocalizedHttpException( new MessageValue( 'wikilambda-zerror' ), 400, [ 'target' => 'Z0' ] )
		);
		$this->executeHandler( $handler, $request );
	}

	public function testExecute_targetParseLangNotFound() {
		// Confirm that a 400 is returned when the target language is not found

		// Force-enable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );

		$ourCall = $this->standardCall;
		$ourCall['pathParams']['parselang'] = 'madeuplanguage';
		$request = new RequestData( $ourCall );
		$handler = new FunctionCallHandler();

		$this->expectExceptionObject(
			new LocalizedHttpException( new MessageValue( 'wikilambda-zerror' ), 400, [ 'target' => 'madeuplanguage' ] )
		);
		$this->executeHandler( $handler, $request );
	}

	public function testExecute_targetRenderLangNotFound() {
		// Confirm that a 400 is returned when the target language is not found

		// Force-enable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );

		$ourCall = $this->standardCall;
		$ourCall['pathParams']['renderlang'] = 'madeuplanguage';
		$request = new RequestData( $ourCall );
		$handler = new FunctionCallHandler();

		$this->expectExceptionObject(
			new LocalizedHttpException( new MessageValue( 'wikilambda-zerror' ), 400, [ 'target' => 'madeuplanguage' ] )
		);
		$this->executeHandler( $handler, $request );
	}
}
