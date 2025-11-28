<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\RESTAPI\FunctionCallHandler;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunction;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Rest\LocalizedHttpException;
use MediaWiki\Rest\RequestData;
use MediaWiki\Tests\Rest\Handler\HandlerTestTrait;
use Wikimedia\Message\MessageValue;
use Wikimedia\Telemetry\SpanInterface;

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
	private ZObjectStore $zobjectStore;

	protected function setUp(): void {
		parent::setUp();

		$this->zobjectStore = WikiLambdaServices::getZObjectStore();

		$this->setTestDataPath( dirname( __DIR__, 3 ) . '/phpunit/test_data/embedded_calls' );
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

	private function assertHttpAndZError( $expectedError, $actualError ) {
		// Assert correct HTTP error code
		$errorKey = $actualError->getErrorKey();
		$this->assertEquals( $expectedError[0], $actualError->getCode() );

		// Assert zerror is Z504/Zid not found
		$messageValue = $actualError->getMessageValue();
		$this->assertEquals( 'wikilambda-zerror', $messageValue->getKey() );
		$this->assertEquals( $expectedError[1], $messageValue->getParams()[0]->getValue() );

		// Assert correct error data (except errorData key, which contains the whole zerror)
		$actualErrorData = $actualError->getErrorData();
		foreach ( $expectedError[2] as $key => $expectedValue ) {
			$this->assertEquals( $expectedValue, $actualErrorData[ $key ] );
		}
	}

	/**
	 * The simplest call, a request to echo 'foo' (parse/render languages will be ignored as they're strings)
	 */
	public function testExecute_basicEcho() {
		$this->insertZids( [ 'Z17', 'Z801' ] );

		// Force-enable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );

		$request = new RequestData( $this->standardCall );
		$handler = new FunctionCallHandler( $this->zobjectStore );

		$response = $this->executeHandler( $handler, $request );

		$this->assertEquals( 200, $response->getStatusCode() );
		$this->assertEquals( '{"value":"foo","type":"Z6"}', $response->getBody()->getContents() );
	}

	/**
	 * Confirm that a 501 is returned when the repo mode is disabled
	 */
	public function testExecute_clientModeDisabled() {
		// Force-disable our code
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', false );

		$request = new RequestData( $this->standardCall );
		$handler = new FunctionCallHandler( $this->zobjectStore );

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
		$this->insertZids( [ 'Z17', 'Z802', 'Z40', 'Z41', 'Z42' ] );

		// Force-enable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );

		$ourCall = $this->standardCall;

		$ourCall['pathParams']['zid'] = 'Z802';
		$ourCall['pathParams']['arguments'] = implode( '|', [
				base64_encode( 'Z41' ), base64_encode( 'true' ), base64_encode( 'false' )
			] );
		$request = new RequestData( $ourCall );
		$handler = new FunctionCallHandler( $this->zobjectStore );

		$response = $this->executeHandler( $handler, $request );

		$this->assertEquals( 200, $response->getStatusCode() );
		$this->assertEquals( '{"value":"true","type":"Z6"}', $response->getBody()->getContents() );

		// … and try the other branch
		$ourCall['pathParams']['arguments'] = implode( '|', [
				base64_encode( 'Z42' ), base64_encode( 'true' ), base64_encode( 'false' )
			] );
		$request = new RequestData( $ourCall );
		$handler = new FunctionCallHandler( $this->zobjectStore );

		$response = $this->executeHandler( $handler, $request );
		$this->assertEquals( '{"value":"false","type":"Z6"}', $response->getBody()->getContents() );
	}

	/**
	 * Confirm that a 400 is returned when a referenced input is not found
	 */
	public function testExecute_referencedInputNotFound() {
		$this->insertZids( [ 'Z17', 'Z802', 'Z40' ] );

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
		$handler = new FunctionCallHandler( $this->zobjectStore );

		try {
			$this->executeHandler( $handler, $request );
		} catch ( LocalizedHttpException $exception ) {
			// Assert Z504/Zid not found
			$this->assertHttpAndZError( [ 400, 'Z504', [ 'target' => 'Z802', 'mode' => 'input' ] ], $exception );
		}
	}

	/**
	 * Confirm that a 400 is returned when the call has the wrong number of inputs (2 instead of 3)
	 */
	public function testExecute_tooFewInputs() {
		$this->insertZids( [ 'Z17', 'Z802', 'Z40', 'Z41' ] );

		// Force-enable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );

		$ourCall = $this->standardCall;
		$ourCall['pathParams']['zid'] = 'Z802';
		$ourCall['pathParams']['arguments'] = implode( '|', [
			base64_encode( 'Z41' ),
			base64_encode( 'true' )
		] );
		$request = new RequestData( $ourCall );
		$handler = new FunctionCallHandler( $this->zobjectStore );

		try {
			$this->executeHandler( $handler, $request );
		} catch ( LocalizedHttpException $exception ) {
			// Assert Z505/Argument count mismatch
			$this->assertHttpAndZError( [ 400, 'Z505', [ 'target' => 'Z802' ] ], $exception );
		}
	}

	/**
	 * Confirm that a 400 is returned when the call has the wrong number of inputs (4 instead of 3)
	 */
	public function testExecute_tooManyInputs() {
		$this->insertZids( [ 'Z17', 'Z802', 'Z40', 'Z41' ] );

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
		$handler = new FunctionCallHandler( $this->zobjectStore );

		try {
			$this->executeHandler( $handler, $request );
		} catch ( LocalizedHttpException $exception ) {
			// Assert Z505/Argument count mismatch
			$this->assertHttpAndZError( [ 400, 'Z505', [ 'target' => 'Z802' ] ], $exception );
		}
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
		$handler = new FunctionCallHandler( $this->zobjectStore );

		try {
			$this->executeHandler( $handler, $request );
		} catch ( LocalizedHttpException $exception ) {
			// Assert Z504/Zid not found
			$this->assertHttpAndZError( [ 400, 'Z504', [ 'target' => '{Z1K1:Z8,…}' ] ], $exception );
		}
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
		$handler = new FunctionCallHandler( $this->zobjectStore );

		try {
			$this->executeHandler( $handler, $request );
		} catch ( LocalizedHttpException $exception ) {
			// Assert Z504/Zid not found
			$this->assertHttpAndZError( [ 400, 'Z504', [ 'target' => 'Z0' ] ], $exception );
		}
	}

	/**
	 * Confirm that a 400 is returned when the target Function is actually a Type
	 */
	public function testExecute_targetFunctionNotAFunction() {
		$this->insertZids( [ 'Z1' ] );

		// Force-enable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );

		$ourCall = $this->standardCall;
		$ourCall['pathParams']['zid'] = 'Z1';
		$request = new RequestData( $ourCall );
		$handler = new FunctionCallHandler( $this->zobjectStore );

		try {
			$this->executeHandler( $handler, $request );
		} catch ( LocalizedHttpException $exception ) {
			// Assert Z506/Argument type mismatch
			$this->assertHttpAndZError( [ 400, 'Z506', [ 'target' => 'Z1', 'mode' => 'function' ] ], $exception );
		}
	}

	/**
	 * Confirm that a 400/Z501 is returned when input is incorrectly encoded
	 */
	public function testExecute_inputWrongEncoding() {
		$this->insertZids( [ 'Z17', 'Z801' ] );

		// Force-enable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );

		$ourCall = $this->standardCall;

		// This is not base64-encoded, so it should throw an error
		$ourCall['pathParams']['arguments'] = 'foo';
		$request = new RequestData( $ourCall );
		$handler = new FunctionCallHandler( $this->zobjectStore );

		try {
			$this->executeHandler( $handler, $request );
		} catch ( LocalizedHttpException $exception ) {
			// Assert Z501/Invalid Syntax
			$errorMessage = 'Malformed UTF-8 characters, possibly incorrectly encoded';
			$this->assertHttpAndZError( [ 400, 'Z501', [ 'target' => 'Z801', 'error' => $errorMessage ] ], $exception );
		}
	}

	// TESTME: (!)Use of a non-ZObject in the main NS

	// TESTME: (!)Input Type isn't a Type
	// TESTME: Input is a string
	// TESTME: Input is an enum
	// TESTME: Input is parsed

	/**
	 * Confirm that a 400/Z503 is returned when the input Type (Z86) doesn't have a Parser
	 */
	public function testExecute_inputParserNotFound() {
		// Force-enable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );
		$this->insertZids( [ 'Z86', 'Z17', 'Z888' ] );

		$ourCall = $this->standardCall;
		$ourCall['pathParams']['zid'] = 'Z888';
		$ourCall['pathParams']['arguments'] = implode( '|', [ base64_encode( 'a' ), base64_encode( 'b' ) ] );

		$request = new RequestData( $ourCall );
		$handler = new FunctionCallHandler( $this->zobjectStore );

		try {
			$this->executeHandler( $handler, $request );
		} catch ( LocalizedHttpException $exception ) {
			// Assert Z503/Not implemented yet
			$this->assertHttpAndZError( [ 400, 'Z503', [ 'target' => 'Z888', 'mode' => 'input' ] ], $exception );
		}
	}

	// TESTME: Input isn't any of the above

	// TESTME: Output is rendered

	/**
	 * Confirm that a 400/Z503 is returned when the output Type (Z40) doesn't have a Renderer
	 */
	public function testExecute_outputRendererNotFound() {
		// Force-enable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );
		$this->insertZids( [ 'Z17', 'Z40', 'Z41', 'Z42', 'Z844' ] );

		$ourCall = $this->standardCall;
		$ourCall['pathParams']['zid'] = 'Z844';
		$ourCall['pathParams']['arguments'] = implode( '|', [ base64_encode( 'Z41' ), base64_encode( 'Z42' ) ] );

		$request = new RequestData( $ourCall );
		$handler = new FunctionCallHandler( $this->zobjectStore );

		try {
			$this->executeHandler( $handler, $request );
		} catch ( LocalizedHttpException $exception ) {
			// Assert Z503/Not implemented yet
			$this->assertHttpAndZError( [ 400, 'Z503', [ 'target' => 'Z844', 'mode' => 'output' ] ], $exception );
		}
	}

	/**
	 * Confirm that a 400 is returned when the target parsing language is not found
	 */
	public function testExecute_targetParseLangNotFound() {
		$this->insertZids( [ 'Z17', 'Z801' ] );

		// Force-enable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );

		$ourCall = $this->standardCall;
		$ourCall['pathParams']['parselang'] = 'madeuplanguage';
		$request = new RequestData( $ourCall );
		$handler = new FunctionCallHandler( $this->zobjectStore );

		try {
			$this->executeHandler( $handler, $request );
		} catch ( LocalizedHttpException $exception ) {
			// Assert Z541/Lang not found
			$this->assertHttpAndZError( [ 400, 'Z541', [ 'target' => 'madeuplanguage' ] ], $exception );
		}
	}

	/**
	 * Confirm that a 400 is returned when the target rendering language is not found
	 */
	public function testExecute_targetRenderLangNotFound() {
		$this->insertZids( [ 'Z17', 'Z801' ] );

		// Force-enable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );

		$ourCall = $this->standardCall;
		$ourCall['pathParams']['renderlang'] = 'madeuplang';
		$request = new RequestData( $ourCall );
		$handler = new FunctionCallHandler( $this->zobjectStore );

		try {
			$this->executeHandler( $handler, $request );
		} catch ( LocalizedHttpException $exception ) {
			// Assert Z541/Lang not found
			$this->assertHttpAndZError( [ 400, 'Z541', [ 'target' => 'madeuplang' ] ], $exception );
		}
	}

	/**
	 * Test Wikidata Lexeme entity input handling
	 */
	public function testExecute_wikidataLexemeEntityInput() {
		$this->insertZids( [ 'Z17', 'Z16005' ] );

		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );
		$this->overrideConfigValue( 'WikifunctionsEnableWikidataInputTypes', true );
		$lexemeId = 'L123';
		$ourCall = $this->standardCall;
		$ourCall['pathParams']['zid'] = 'Z16005';
		$ourCall['pathParams']['arguments'] = base64_encode( $lexemeId );
		$request = new RequestData( $ourCall );
		$handler = new FunctionCallHandler( $this->zobjectStore );

		$response = $this->executeHandler( $handler, $request );
		$this->assertEquals( '{"value":"mocked lexeme result","type":"Z6"}', $response->getBody()->getContents() );
	}

	/**
	 * Test Wikidata Item entity input handling
	 */
	public function testExecute_wikidataItemEntityInput() {
		$this->insertZids( [ 'Z17', 'Z16001' ] );

		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );
		$this->overrideConfigValue( 'WikifunctionsEnableWikidataInputTypes', true );
		$itemId = 'Q456';
		$ourCall = $this->standardCall;
		$ourCall['pathParams']['zid'] = 'Z16001';
		$ourCall['pathParams']['arguments'] = base64_encode( $itemId );
		$request = new RequestData( $ourCall );
		$handler = new FunctionCallHandler( $this->zobjectStore );

		$response = $this->executeHandler( $handler, $request );
		$this->assertEquals( '{"value":"mocked item result","type":"Z6"}', $response->getBody()->getContents() );
	}

	/**
	 * Test Wikidata Lexeme reference input handling
	 */
	public function testExecute_wikidataLexemeReferenceInput() {
		$this->insertZids( [ 'Z17', 'Z16095' ] );

		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );
		$this->overrideConfigValue( 'WikifunctionsEnableWikidataInputTypes', true );
		$lexemeId = 'L789';
		$ourCall = $this->standardCall;
		$ourCall['pathParams']['zid'] = 'Z16095';
		$ourCall['pathParams']['arguments'] = base64_encode( $lexemeId );
		$request = new RequestData( $ourCall );
		$handler = new FunctionCallHandler( $this->zobjectStore );

		$response = $this->executeHandler( $handler, $request );

		$this->assertEquals( 200, $response->getStatusCode() );
	}

	/**
	 * Test Wikidata Item reference input handling
	 */
	public function testExecute_wikidataItemReferenceInput() {
		$this->insertZids( [ 'Z17', 'Z16091' ] );

		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );
		$this->overrideConfigValue( 'WikifunctionsEnableWikidataInputTypes', true );
		$itemId = 'Q999';
		$ourCall = $this->standardCall;
		$ourCall['pathParams']['zid'] = 'Z16091';
		$ourCall['pathParams']['arguments'] = base64_encode( $itemId );
		$request = new RequestData( $ourCall );
		$handler = new FunctionCallHandler( $this->zobjectStore );

		$response = $this->executeHandler( $handler, $request );

		$this->assertEquals( 200, $response->getStatusCode() );
	}

	// TESTME: (!)Server error when making call
	// TESTME: (!)Server malformed response when making call
	// TESTME: (!)Server non-ZResponseEnvelope response when making call
	// TESTME: Response has errors on running
	// TESTME: (!)Response is somehow not a string

	// Test private methods

	private function getSpanMock() {
		$spanMock = $this->createMock( SpanInterface::class );

		// Configure setAttributes() mock to return $spanMock (for chaining)
		$spanMock->method( 'setAttributes' )->willReturn( $spanMock );
		// Configure end() mock
		$spanMock->method( 'end' );

		return $spanMock;
	}

	/**
	 * @dataProvider provideTestGetTargetFunction
	 */
	public function testGetTargetFunction(
		$functionZid,
		$success,
		$expectedError = [],
		$dependencies = []
	) {
		$this->insertZids( $dependencies );

		$handler = new FunctionCallHandler( $this->zobjectStore );
		$spanMock = $this->getSpanMock();

		if ( $success ) {
			$targetFunction = $this->runPrivateMethod( $handler, 'getTargetFunction', [ $functionZid, $spanMock ] );
			$this->assertTrue( $targetFunction instanceof ZFunction );
			$this->assertSame( $functionZid, $targetFunction->getIdentity() );
		} else {
			try {
				$this->runPrivateMethod( $handler, 'getTargetFunction', [ $functionZid, $spanMock ] );
			} catch ( LocalizedHttpException $exception ) {
				$this->assertHttpAndZError( $expectedError, $exception );
			}
		}
	}

	public function provideTestGetTargetFunction() {
		yield 'Request for non-valid zid raises exception' => [
			'BADFUNCTIONZID',
			false,
			[
				HttpStatus::BAD_REQUEST,
				ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND,
				[ 'target' => 'BADFUNCTIONZID' ]
			]
		];

		yield 'Request for non-existing zid raises exception' => [
			'Z333333',
			false,
			[
				HttpStatus::BAD_REQUEST,
				ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND,
				[ 'target' => 'Z333333' ]
			]
		];

		yield 'Request for non-function zid raises exception' => [
			'Z40',
			false,
			[
				HttpStatus::BAD_REQUEST,
				ZErrorTypeRegistry::Z_ERROR_ARGUMENT_TYPE_MISMATCH,
				[ 'target' => 'Z40', 'mode' => 'function' ],
			],
			[ 'Z40' ]
		];

		yield 'Request for a valid function zid returns inner object' => [
			'Z801',
			true,
			[],
			[ 'Z17', 'Z801' ]
		];
	}

	/**
	 * @dataProvider provideTestGetLanguageZid
	 */
	public function testGetLanguageZid(
		$langCode,
		$success,
		$expectedLangZid,
		$expectedError = []
	) {
		$handler = new FunctionCallHandler( $this->zobjectStore );
		$spanMock = $this->getSpanMock();

		if ( $success ) {
			$actualLangZid = $this->runPrivateMethod( $handler, 'getLanguageZid', [ $langCode, 'argKey', $spanMock ] );
			$this->assertSame( $expectedLangZid, $actualLangZid );
		} else {
			try {
				$this->runPrivateMethod( $handler, 'getLanguageZid', [ $langCode, 'argKey', $spanMock ] );
			} catch ( LocalizedHttpException $exception ) {
				$this->assertHttpAndZError( $expectedError, $exception );
			}
		}
	}

	public function provideTestGetLanguageZid() {
		yield 'Not valid language code raises exception' => [
			'badlang',
			false,
			null,
			[
				HttpStatus::BAD_REQUEST,
				ZErrorTypeRegistry::Z_ERROR_LANG_NOT_FOUND,
				[ 'target' => 'badlang' ]
			]
		];

		yield 'Valid language code returns valid zid' => [
			'fr',
			true,
			'Z1004'
		];
	}

	/**
	 * @dataProvider provideTestBuildArgumentsForCall
	 */
	public function testBuildArgumentsForCall(
		$args,
		$enableWikidata,
		$success,
		$expectedArgs,
		$expectedError = [],
		$dependencies = []
	) {
		$this->insertZids( $dependencies );

		$handler = new FunctionCallHandler( $this->zobjectStore );

		$this->overrideConfigValue( 'WikifunctionsEnableWikidataInputTypes', $enableWikidata );
		$spanMock = $this->getSpanMock();
		$configMock = $this->getServiceContainer()->getMainConfig();

		if ( $success ) {
			$actualArgs = $this->runPrivateMethod(
				$handler, 'buildArgumentsForCall', [ ...$args, $configMock, $spanMock ] );
			$this->assertEquals( $expectedArgs, $actualArgs );
		} else {
			try {
				$this->runPrivateMethod( $handler, 'buildArgumentsForCall', [ ...$args, $configMock, $spanMock ] );
			} catch ( LocalizedHttpException $exception ) {
				$this->assertHttpAndZError( $expectedError, $exception );
			}
		}
	}

	public function provideTestBuildArgumentsForCall() {
		// Configure test data directory, as data providers are run statically
		$this->setTestDataPath( dirname( __DIR__, 3 ) . '/phpunit/test_data/embedded_calls' );

		$encodeArgs = static function ( array $args ): string {
			$encodedArgs = array_map( 'base64_encode', $args );
			return implode( '|', $encodedArgs );
		};

		$getZFunctionObject = function ( string $zid ): ZFunction {
			return $this->getZPersistentObject( $zid )->getInnerZObject();
		};

		yield 'Raises an error when the count of inputs does not match the target function args' => [
			[
				'Z801',
				$encodeArgs( [ 'too', 'many', 'args' ] ),
				'Z1002',
				$getZFunctionObject( 'Z801' ),
			],
			false,
			false,
			null,
			[ HttpStatus::BAD_REQUEST, ZErrorTypeRegistry::Z_ERROR_ARGUMENT_COUNT_MISMATCH, [] ]
		];

		yield 'Builds reference for enum and string arguments for a target function with Z1/Object args' => [
			[
				'Z802',
				$encodeArgs( [ 'Z41', 'then', 'Z777' ] ),
				'Z1002',
				$getZFunctionObject( 'Z802' ),
			],
			false,
			true,
			[
				'Z802K1' => new ZReference( 'Z41' ),
				'Z802K2' => new ZString( 'then' ),
				'Z802K3' => new ZString( 'Z777' )
			],
			[],
			[ 'Z40', 'Z41' ]
		];

		yield 'Build string arguments for a target function with Z6/String args' => [
			[
				'Z10000',
				$encodeArgs( [ 'Hello, ', 'world!' ] ),
				'Z1002',
				$getZFunctionObject( 'Z10000' )
			],
			false,
			true,
			[
				'Z10000K1' => new ZString( 'Hello, ' ),
				'Z10000K2' => new ZString( 'world!' )
			]
		];

		yield 'Build string arguments for a target function with Z6/String args when inputs are zids' => [
			[
				'Z10000',
				$encodeArgs( [ 'Z999', 'Z888' ] ),
				'Z1002',
				$getZFunctionObject( 'Z10000' )
			],
			false,
			true,
			[
				'Z10000K1' => new ZString( 'Z999' ),
				'Z10000K2' => new ZString( 'Z888' )
			]
		];

		yield 'Build wikidata item arguments with fetch function' => [
			[
				'Z16001',
				$encodeArgs( [ 'Q42' ] ),
				'Z1002',
				$getZFunctionObject( 'Z16001' )
			],
			true,
			true,
			[
				'Z16001K1' => ZObjectFactory::create( json_decode(
					'{"Z1K1":"Z7", "Z7K1":"Z6821", "Z6821K1":'
					. '{"Z1K1":"Z6091", "Z6091K1":"Q42"}}'
				) )
			]
		];

		yield 'Raise an error when using wikidata items but they are not enabled' => [
			[
				'Z16001',
				$encodeArgs( [ 'Q42' ] ),
				'Z1002',
				$getZFunctionObject( 'Z16001' )
			],
			false,
			false,
			null,
			[ HttpStatus::BAD_REQUEST, ZErrorTypeRegistry::Z_ERROR_NOT_IMPLEMENTED_YET, [] ],
			[ 'Z6001' ]
		];

		yield 'Build simple parser function calls for input types with parser' => [
			[
				'Z20040',
				$encodeArgs( [ 'first', 'second' ] ),
				'Z1004',
				$getZFunctionObject( 'Z20040' )
			],
			true,
			true,
			[
				'Z20040K1' => ZObjectFactory::create( json_decode(
					'{ "Z1K1": "Z7", "Z7K1": "Z20030", "Z20030K1": "first", "Z20030K2": "Z1004" }'
				) ),
				'Z20040K2' => ZObjectFactory::create( json_decode(
					'{ "Z1K1": "Z7", "Z7K1": "Z20030", "Z20030K1": "second", "Z20030K2": "Z1004" }'
				) )
			],
			[],
			[ 'Z20010' ]
		];
	}

	/**
	 * @dataProvider provideTestBuildParsedArgument
	 */
	public function testBuildParsedArgument(
		$args,
		$success,
		$expectedArg,
		$expectedError = [],
		$dependencies = []
	) {
		$this->insertZids( $dependencies );

		$handler = new FunctionCallHandler( $this->zobjectStore );
		$spanMock = $this->getSpanMock();

		if ( $success ) {
			$actualArg = $this->runPrivateMethod( $handler, 'buildParsedArgument', [ ...$args, $spanMock ] );
			$this->assertEquals( $expectedArg, $actualArg );
		} else {
			try {
				$this->runPrivateMethod( $handler, 'buildParsedArgument', [ ...$args, $spanMock ] );
			} catch ( LocalizedHttpException $exception ) {
				$this->assertHttpAndZError( $expectedError, $exception );
			}
		}
	}

	public function provideTestBuildParsedArgument() {
		$targetFunctionZid = 'Z20040';
		$targetArgKey = 'Z20040K1';
		$parseLangZid = 'Z1004';

		yield 'Raise not found error when type zid cannot be fetched' => [
			[ $targetFunctionZid, 'Z44444', $targetArgKey, $parseLangZid, 'input text' ],
			false,
			null,
			[
				HttpStatus::BAD_REQUEST,
				ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND,
				[ 'target' => 'Z20040', 'mode' => 'input' ]
			]
		];

		yield 'Raise not implemented yet error when type zid does not belong to a type' => [
			[ $targetFunctionZid, 'Z801', $targetArgKey, $parseLangZid, 'input text' ],
			false,
			null,
			[
				HttpStatus::BAD_REQUEST,
				ZErrorTypeRegistry::Z_ERROR_NOT_IMPLEMENTED_YET,
				[ 'target' => 'Z20040', 'mode' => 'input' ]
			],
			[ 'Z17', 'Z801' ]
		];

		yield 'Build a reference when provided argument is a valid instance of the given type' => [
			[ $targetFunctionZid, 'Z40', $targetArgKey, $parseLangZid, 'Z42' ],
			true,
			new ZReference( 'Z42' ),
			[],
			[ 'Z40', 'Z42' ]
		];

		yield 'Raise not implemented yet error when type zid does not have a parser' => [
			[ $targetFunctionZid, 'Z61', $targetArgKey, $parseLangZid, 'javascript' ],
			false,
			null,
			[
				HttpStatus::BAD_REQUEST,
				ZErrorTypeRegistry::Z_ERROR_NOT_IMPLEMENTED_YET,
				[ 'target' => 'Z20040', 'mode' => 'input' ]
			],
			[ 'Z61' ]
		];

		yield 'Build a function call to the parser function with input and parser lang' => [
			[ $targetFunctionZid, 'Z20010', $targetArgKey, $parseLangZid, 'input string' ],
			true,
			ZObjectFactory::create( json_decode(
				'{ "Z1K1": "Z7", "Z7K1": "Z20030", "Z20030K1": "input string", "Z20030K2": "Z1004" }'
			) ),
			[],
			[ 'Z20010' ]
		];

		yield 'Raise language not found error when unknown language code is passed to lang argument' => [
			[ $targetFunctionZid, 'Z60', $targetArgKey, $parseLangZid, 'badlang' ],
			false,
			null,
			[
				HttpStatus::BAD_REQUEST,
				ZErrorTypeRegistry::Z_ERROR_LANG_NOT_FOUND,
				[ 'target' => 'badlang' ]
			],
			[ 'Z60' ]
		];

		yield 'Build reference to language zid when valid language code is passed to lang argument' => [
			[ $targetFunctionZid, 'Z60', $targetArgKey, $parseLangZid, 'fr' ],
			true,
			new ZReference( 'Z1004' ),
			[],
			[ 'Z60' ]
		];
	}

	/**
	 * @dataProvider provideTestIsArgumentValidReference
	 */
	public function testIsArgumentValidReference(
		$args,
		$success,
		$expectedResult,
		$expectedError = [],
		$dependencies = []
	) {
		$this->insertZids( $dependencies );

		$handler = new FunctionCallHandler( $this->zobjectStore );
		$spanMock = $this->getSpanMock();

		if ( $success ) {
			$actualResult = $this->runPrivateMethod( $handler, 'isArgumentValidReference', [ ...$args, $spanMock ] );
			$this->assertSame( $expectedResult, $actualResult );
		} else {
			try {
				$this->runPrivateMethod( $handler, 'isArgumentValidReference', [ ...$args, $spanMock ] );
			} catch ( LocalizedHttpException $exception ) {
				$this->assertHttpAndZError( $expectedError, $exception );
			}
		}
	}

	public function provideTestIsArgumentValidReference() {
		// Configure test data directory, as data providers are run statically
		$this->setTestDataPath( dirname( __DIR__, 3 ) . '/phpunit/test_data/embedded_calls' );

		$typeZid = 'Z20010';
		$typeObject = $this->getZPersistentObject( $typeZid )->getInnerZObject();
		$targetFunctionZid = 'Z20040';

		yield 'Returns false if provided arg is not a zid' => [
			[ 'not a zid', $typeObject, $targetFunctionZid ],
			true,
			false
		];

		yield 'Raises exception if provided zid does not exist' => [
			[ 'Z9999', $typeObject, $targetFunctionZid ],
			false,
			null,
			[
				HttpStatus::BAD_REQUEST,
				ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND,
				[ 'target' => 'Z20040' ]
			]
		];

		yield 'Raises exception if provided zid exists but is not an instance of given type' => [
			[ 'Z42', $typeObject, $targetFunctionZid ],
			false,
			null,
			[
				HttpStatus::BAD_REQUEST,
				ZErrorTypeRegistry::Z_ERROR_ARGUMENT_TYPE_MISMATCH,
				[ 'target' => 'Z20040', 'mode' => 'input' ]
			],
			[ 'Z40', 'Z42' ]
		];

		yield 'Returns true if provided zid is an instance of given type' => [
			[ 'Z20050', $typeObject, $targetFunctionZid ],
			true,
			true,
			[],
			[ 'Z20010', 'Z20050' ]
		];
	}

	/**
	 * @dataProvider provideTestBuildRenderedOutput
	 */
	public function testBuildRenderedOutput(
		$args,
		$success,
		$expectedOutput,
		$expectedError = [],
		$dependencies = []
	) {
		$this->insertZids( $dependencies );

		$handler = new FunctionCallHandler( $this->zobjectStore );
		$spanMock = $this->getSpanMock();

		if ( $success ) {
			$output = $this->runPrivateMethod( $handler, 'buildRenderedOutput', [ ...$args, $spanMock ] );
			$this->assertEquals( $expectedOutput, $output );
		} else {
			try {
				$this->runPrivateMethod( $handler, 'buildRenderedOutput', [ ...$args, $spanMock ] );
			} catch ( LocalizedHttpException $exception ) {
				$this->assertHttpAndZError( $expectedError, $exception );
			}
		}
	}

	public function provideTestBuildRenderedOutput() {
		$functionZid = 'Z20040';
		$functionCallStr = '{ "Z1K1": "Z7", "Z7K1": "Z20040", "Z20040K1": "fake call" }';
		$functionCall = ZObjectFactory::create( json_decode( $functionCallStr ) );
		$renderLangZid = 'Z1002';

		yield 'Raise exception if target return type does not exist' => [
			[ $functionZid, 'Z9999', $renderLangZid, $functionCall ],
			false,
			null,
			[
				HttpStatus::BAD_REQUEST,
				ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND,
				[ 'target' => $functionZid, 'mode' => 'output' ]
			]
		];

		yield 'Raise exception if target return type does not belong to a type' => [
			[ $functionZid, 'Z801', $renderLangZid, $functionCall ],
			false,
			null,
			[
				HttpStatus::BAD_REQUEST,
				ZErrorTypeRegistry::Z_ERROR_NOT_IMPLEMENTED_YET,
				[ 'target' => $functionZid, 'mode' => 'output' ]
			],
			[ 'Z17', 'Z801' ]
		];

		yield 'Raise exception if target return type does not have a renderer' => [
			[ $functionZid, 'Z60', $renderLangZid, $functionCall ],
			false,
			null,
			[
				HttpStatus::BAD_REQUEST,
				ZErrorTypeRegistry::Z_ERROR_NOT_IMPLEMENTED_YET,
				[ 'target' => $functionZid, 'mode' => 'output' ]
			],
			[ 'Z60' ]
		];

		yield 'Build renderer call wrapping function call' => [
			[ $functionZid, 'Z20010', $renderLangZid, $functionCall ],
			true,
			ZObjectFactory::create( json_decode(
				'{ "Z1K1": "Z7", "Z7K1": "Z20020", "Z20020K1":' . $functionCallStr . ', "Z20020K2": "Z1002" }'
			) ),
			[],
			[ 'Z20010' ]
		];
	}
}
