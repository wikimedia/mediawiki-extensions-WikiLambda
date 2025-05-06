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
		$this->insertZids( [
			// Base types
			'Z1', 'Z2', 'Z6', 'Z8', 'Z17', 'Z40', 'Z41', 'Z42', 'Z60',
			// Functions we use
			'Z801', 'Z802',
			// Languages we use
			'Z1002', 'Z1004'
		] );
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

	/**
	 * The simplest call, a request to echo 'foo' (parse/render languages will be ignored as they're strings)
	 */
	public function testExecute_basicEcho() {
		// Force-enable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );

		$request = new RequestData( $this->standardCall );
		$handler = new FunctionCallHandler();

		$response = $this->executeHandler( $handler, $request );

		$this->assertEquals( 200, $response->getStatusCode() );
		$this->assertEquals( '{"value":"foo"}', $response->getBody()->getContents() );
	}

	/**
	 * Confirm that a 501 is returned when the repo mode is disabled
	 */
	public function testExecute_clientModeDisabled() {
		// Force-disable our code
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', false );

		$request = new RequestData( $this->standardCall );
		$handler = new FunctionCallHandler();

		$this->expectExceptionObject(
			new LocalizedHttpException(
				new MessageValue( 'wikilambda-restapi-disabled-repo-mode-only' ),
				400,
				[ 'target' => 'madeuplanguage' ]
			)
		);
		$this->executeHandler( $handler, $request );
	}

	/**
	 * The second-simplest call, a request to echo 'true' or 'false' based on the first argument
	 */
	public function testExecute_simpleIf() {
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

	/**
	 * Confirm that a 400 is returned when a referenced input is not found
	 */
	public function testExecute_referencedInputNotFound() {
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

	/**
	 * Confirm that a 400 is returned when the call has the wrong number of inputs (2 instead of 3)
	 */
	public function testExecute_tooFewInputs() {
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

	/**
	 * Confirm that a 400 is returned when the call has the wrong number of inputs (4 instead of 3)
	 */
	public function testExecute_tooManyInputs() {
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

	/**
	 * Confirm that a 400 is returned when the target function is not a ZID, but maybe an attempt at an inline call
	 */
	public function testExecute_targetFunctionNotAZid() {
		// Force-enable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );

		$ourCall = $this->standardCall;
		$ourCall['pathParams']['zid'] = '{Z1K1:Z8,…}';
		$request = new RequestData( $ourCall );
		$handler = new FunctionCallHandler();

		$this->expectExceptionObject(
			new LocalizedHttpException( new MessageValue( 'wikilambda-zerror' ), 400, [ 'target' => 'Z0' ] )
		);
		$this->executeHandler( $handler, $request );
	}

	/**
	 * Confirm that a 400 is returned when the target function is not found
	 */
	public function testExecute_targetFunctionNotFound() {
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

	/**
	 * Confirm that a 400 is returned when the target Function is actually a Type
	 */
	public function testExecute_targetFunctionNotAFunction() {
		// Force-enable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );

		$ourCall = $this->standardCall;
		$ourCall['pathParams']['zid'] = 'Z1';
		$request = new RequestData( $ourCall );
		$handler = new FunctionCallHandler();

		$this->expectExceptionObject(
			new LocalizedHttpException( new MessageValue( 'wikilambda-zerror' ), 400, [ 'target' => 'Z1' ] )
		);
		$this->executeHandler( $handler, $request );
	}

	/**
	 * Confirm that a 400 is returned when the target Function is actually a Type
	 */
	public function testExecute_inputNotValid() {
		// Force-enable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );

		$ourCall = $this->standardCall;

		// This is not base64-encoded, so it should throw an error
		$ourCall['pathParams']['arguments'] = 'foo';
		$request = new RequestData( $ourCall );
		$handler = new FunctionCallHandler();

		$this->expectExceptionObject(
			new LocalizedHttpException( new MessageValue( 'wikilambda-zerror' ), 400, [ 'target' => 'Z1' ] )
		);
		$this->executeHandler( $handler, $request );
	}

	// TESTME: (!)Use of a non-ZObject in the main NS

	// TESTME: (!)Input Type isn't a Type
	// TESTME: Input is a string
	// TESTME: Input is an enum
	// TESTME: Input is parsed
	// TESTME: Input Type doesn't have a Parser
	// TESTME: Input isn't any of the above

	// TESTME: Output is rendered
	// TESTME: Output Type doesn't have a Renderer

	/**
	 * Confirm that a 400 is returned when the target parsing language is not found
	 */
	public function testExecute_targetParseLangNotFound() {
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

	/**
	 * Confirm that a 400 is returned when the target rendering language is not found
	 */
	public function testExecute_targetRenderLangNotFound() {
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

	// TESTME: (!)Server error when making call
	// TESTME: (!)Server malformed response when making call
	// TESTME: (!)Server non-ZResponseEnvelope response when making call
	// TESTME: Response has errors on running
	// TESTME: (!)Response is somehow not a string
}
