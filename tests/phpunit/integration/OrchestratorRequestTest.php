<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\TooManyRedirectsException;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\OrchestratorException;
use MediaWiki\Extension\WikiLambda\OrchestratorRequest;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use Wikimedia\TestingAccessWrapper;

/**
 * @covers \MediaWiki\Extension\WikiLambda\OrchestratorRequest
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\ApiFunctionCall
 * @group Database
 */
class OrchestratorRequestTest extends \MediaWikiIntegrationTestCase {

	// OrchestratorRequest::getHost
	// ============================

	public function testGetHost() {
		$client = new Client( [ 'base_uri' => 'http://some.test.host:1234' ] );
		$orchestrator = new OrchestratorRequest( $client );
		$this->assertEquals( 'http://some.test.host:1234', $orchestrator->getHost() );
	}

	// OrchestratorRequest::orchestrate
	// ================================

	private function getOrchestratorWithMockResponse( Response $response ): OrchestratorRequest {
		$mock = new MockHandler( [ $response ] );
		$client = new Client( [ 'handler' => HandlerStack::create( $mock ) ] );
		return new OrchestratorRequest( $client );
	}

	private function mockMemcachedWrapper( $cachedResponse = false, ?array $setProps = null ) {
		$mockCache = $this->createMock( MemcachedWrapper::class );

		$mockCache
			->expects( $this->once() )
			->method( 'makeKey' )
			->willReturn( 'some-mock-key' );

		$mockCache
			->expects( $this->once() )
			->method( 'get' )
			->with( 'some-mock-key' )
			->willReturn( $cachedResponse );

		if ( $setProps !== null ) {
			$mockCache
				->expects( $this->once() )
				->method( 'set' )
				->with( 'some-mock-key', ...$setProps );
		} else {
			$mockCache
				->expects( $this->never() )
				->method( 'set' );
		}

		$this->setService( 'WikiLambdaMemcachedWrapper', $mockCache );
	}

	public function testExecute() {
		// A real orchestrator response wraps the function-call value (here a Z40) inside a Z22
		// envelope, with Z22K2 holding the meta-data map (Z24/void as nothing reads it on success).
		$value = '{"Z1K1":{"Z1K1":"Z9","Z9K1":"Z40"},"Z40K1":{"Z1K1":"Z6","Z6K1":"Z42"}}';
		$envelopeString = '{"Z1K1":"Z22","Z22K1":' . $value . ',"Z22K2":"Z24"}';

		// Assert that successful execution sets response in the cache
		$expectCachedValue = [
			'result' => $envelopeString,
			'httpStatusCode' => HttpStatus::OK
		];
		$this->mockMemcachedWrapper( false, [ $expectCachedValue, MemcachedWrapper::TTL_MONTH ] );

		$guzzleResponse = new Response( HttpStatus::OK, [], $envelopeString );
		$orchestrator = $this->getOrchestratorWithMockResponse( $guzzleResponse );

		$inputFile = __DIR__ .
			DIRECTORY_SEPARATOR .
			'..' .
			DIRECTORY_SEPARATOR .
			'test_data' .
			DIRECTORY_SEPARATOR .
			'Z902_false.json';
		$Z902 = file_get_contents( $inputFile );
		$Z902 = preg_replace( '/[\s\n]/', '', $Z902 );

		$response = $orchestrator->orchestrate( json_decode( $Z902, true ) );

		$this->assertEquals( HttpStatus::OK, $response['httpStatusCode'] );
		$this->assertEquals( json_decode( $envelopeString ), json_decode( $response['result'] ) );
	}

	public function testExecuteWithLoneSurrogateInResponse() {
		// The orchestrator runs on Node.js, which can serialise mangled user input as lone UTF-16
		// surrogate escapes (here a lone low surrogate \udff3 and a lone high surrogate \ud83c).
		// PHP's json_decode rejects these with JSON_ERROR_UTF16, but rather than wrapping the whole
		// response as a Z577 error we substitute the lone surrogates with U+FFFD and carry on; only
		// genuinely malformed JSON should fall through to the error-wrapping path.
		// substituteLoneSurrogates() rewrites each lone-surrogate escape into a \ufffd *escape*, so
		// the sanitised body stays pure ASCII: it decodes to U+FFFD (asserted below) but the raw
		// string we return and cache still holds the six-character escape, not the decoded byte. So
		// $cleanEnvelope here is the escape, not the glyph; the decode assertion proves the meaning.
		$dirtyEnvelope = '{"Z1K1":"Z22","Z22K1":"\udff3text\ud83c","Z22K2":"Z24"}';
		$cleanEnvelope = '{"Z1K1":"Z22","Z22K1":"\ufffdtext\ufffd","Z22K2":"Z24"}';

		// On success we cache (and return) the sanitised body, not the orchestrator's raw one.
		$expectCachedValue = [
			'result' => $cleanEnvelope,
			'httpStatusCode' => HttpStatus::OK
		];
		$this->mockMemcachedWrapper( false, [ $expectCachedValue, MemcachedWrapper::TTL_MONTH ] );

		$guzzleResponse = new Response( HttpStatus::OK, [], $dirtyEnvelope );
		$orchestrator = $this->getOrchestratorWithMockResponse( $guzzleResponse );

		$inputFile = __DIR__ .
			DIRECTORY_SEPARATOR .
			'..' .
			DIRECTORY_SEPARATOR .
			'test_data' .
			DIRECTORY_SEPARATOR .
			'Z902_false.json';
		$Z902 = file_get_contents( $inputFile );
		$Z902 = preg_replace( '/[\s\n]/', '', $Z902 );

		$response = $orchestrator->orchestrate( json_decode( $Z902, true ) );

		$this->assertEquals( HttpStatus::OK, $response['httpStatusCode'] );
		$this->assertEquals( $cleanEnvelope, $response['result'] );
		$this->assertEquals( "\u{FFFD}text\u{FFFD}", json_decode( $response['result'], true )['Z22K1'] );
	}

	public function testUnsuccessfulExecute() {
		// Mock cache: miss on get, set failing response for a minute
		$expectCachedValue = $this->callback( static function ( $actual ) {
			return $actual[ 'httpStatusCode' ] === HttpStatus::INTERNAL_SERVER_ERROR;
		} );
		$this->mockMemcachedWrapper( false, [ $expectCachedValue, MemcachedWrapper::TTL_MINUTE ] );

		$guzzleResponse = new Response( HttpStatus::INTERNAL_SERVER_ERROR, [], 'Internal Server Error' );
		$orchestrator = $this->getOrchestratorWithMockResponse( $guzzleResponse );

		$inputFile = __DIR__ .
			DIRECTORY_SEPARATOR .
			'..' .
			DIRECTORY_SEPARATOR .
			'test_data' .
			DIRECTORY_SEPARATOR .
			'example-orchestrator-timeout.json';
		$timeout = file_get_contents( $inputFile );
		$timeout = preg_replace( '/[\s\n]/', '', $timeout );
		$queryObject = json_decode( $timeout, true );

		$response = $orchestrator->orchestrate( $queryObject );

		$this->assertEquals( HttpStatus::INTERNAL_SERVER_ERROR, $response['httpStatusCode'] );
		// (T414062) Non-JSON / non-Z22 orchestrator bodies are wrapped in a Z22 with a Z577 error
		// quoting the bad body.
		$decoded = json_decode( $response['result'], true );
		$this->assertEquals( 'Z22', $decoded['Z1K1'] );
		$this->assertEquals( 'Z24', $decoded['Z22K1'] );

		$error = $decoded['Z22K2']['K1'][1]['K2'];
		$this->assertEquals( 'Z577', $error['Z5K1'] );
		$this->assertEquals( $queryObject, $error['Z5K2']['K1']['Z99K1'] );
		$this->assertEquals( 'Internal Server Error', $error['Z5K2']['K2']['Z99K1'] );
	}

	public function testExecuteWithBadInput() {
		// Mock cache: miss on get, set failing response for a minute
		$expectCachedValue = $this->callback( static function ( $actual ) {
			return $actual[ 'httpStatusCode' ] === HttpStatus::NOT_FOUND;
		} );
		$this->mockMemcachedWrapper( false, [ $expectCachedValue, MemcachedWrapper::TTL_WEEK ] );

		// The orchestrator can answer with a well-formed Z22 envelope but a non-200 status when
		// the user-supplied call references something it cannot resolve — e.g. a ZID that does
		// not exist (Z504, mapped to HTTP 404). OrchestratorRequest must pass both body and
		// status through unchanged; the wrap-as-Z577 path is only for malformed responses.
		$envelopeString = '{"Z1K1":"Z22","Z22K1":"Z24","Z22K2":{"Z1K1":{"Z1K1":"Z7","Z7K1":"Z883",' .
			'"Z883K1":"Z6","Z883K2":"Z1"},"K1":[{"Z1K1":"Z7","Z7K1":"Z882","Z882K1":"Z6","Z882K2":"Z1"},' .
			'{"Z1K1":{"Z1K1":"Z7","Z7K1":"Z882","Z882K1":"Z6","Z882K2":"Z1"},"K1":"errors",' .
			'"K2":{"Z1K1":"Z5","Z5K1":"Z504","Z5K2":{"Z1K1":{"Z1K1":"Z7","Z7K1":"Z885","Z885K1":"Z504"},' .
			'"K1":"Z40404"}}}]}}';

		$guzzleResponse = new Response( HttpStatus::NOT_FOUND, [], $envelopeString );
		$orchestrator = $this->getOrchestratorWithMockResponse( $guzzleResponse );

		$inputFile = __DIR__ .
			DIRECTORY_SEPARATOR .
			'..' .
			DIRECTORY_SEPARATOR .
			'test_data' .
			DIRECTORY_SEPARATOR .
			'Z902_false.json';
		$Z902 = file_get_contents( $inputFile );
		$Z902 = preg_replace( '/[\s\n]/', '', $Z902 );

		$response = $orchestrator->orchestrate( json_decode( $Z902, true ) );

		$this->assertEquals( HttpStatus::NOT_FOUND, $response['httpStatusCode'] );
		$this->assertEquals( json_decode( $envelopeString ), json_decode( $response['result'] ) );
	}

	public function testExecuteCached() {
		// This is cached and should be retrieved
		$cachedValue = '{"Z1K1":"Z22","Z22K1":"this will be the one","Z22K2":"Z24"}';
		$cachedResponse = [
			'result' => $cachedValue,
			'httpStatusCode' => 200
		];
		$this->mockMemcachedWrapper( $cachedResponse );

		// Set guzzle response that will not be retrieved
		$evaluatedValue = '{"Z1K1":"Z22","Z22K1":"not this one","Z22K2":"Z24"}';
		$guzzleResponse = new Response( HttpStatus::OK, [], $evaluatedValue );
		$orchestrator = $this->getOrchestratorWithMockResponse( $guzzleResponse );

		$call = '{"Z1K1": "Z7", "Z7K1": "Z10000", "Z10000K1": "input"}';

		$response = $orchestrator->orchestrate( json_decode( $call, true ) );

		$this->assertEquals( HttpStatus::OK, $response['httpStatusCode'] );
		$this->assertEquals( json_decode( $cachedValue ), json_decode( $response['result'] ) );
	}

	public function testExecute_dontEvaluateOnMiss() {
		// Mock as not cached
		$this->mockMemcachedWrapper( false );

		// Set guzzle response that will not be retrieved
		$evaluatedValue = '{"Z1K1":"Z22","Z22K1":"not this one","Z22K2":"Z24"}';
		$guzzleResponse = new Response( HttpStatus::OK, [], $evaluatedValue );
		$orchestrator = $this->getOrchestratorWithMockResponse( $guzzleResponse );

		$call = json_decode( '{"Z1K1": "Z7", "Z7K1": "Z10000", "Z10000K1": "input"}', true );

		$response = $orchestrator->orchestrate(
			$call,
			/* bypassCache= */ false,
			/* evaluateOnMiss= */ false
		);

		// Once getting a cache miss, if evaluateOnMiss flag is false, exit with false
		$this->assertFalse( $response );
	}

	private function mockNoMemcachedWrapper() {
		$mockCache = $this->createMock( MemcachedWrapper::class );
		$mockCache
			->expects( $this->never() )
			->method( 'makeKey' );
		$mockCache
			->expects( $this->never() )
			->method( 'get' );
		$mockCache
			->expects( $this->never() )
			->method( 'set' );

		$this->setService( 'WikiLambdaMemcachedWrapper', $mockCache );
	}

	public function testExecuteUncached_bypassCache() {
		// Mock memcached wrapper so that no methods are every called
		$this->mockNoMemcachedWrapper();

		// Set guzzle response that will not be retrieved
		$evaluatedValue = '{"Z1K1":"Z22","Z22K1":"some good response","Z22K2":"Z24"}';
		$guzzleResponse = new Response( HttpStatus::OK, [], $evaluatedValue );
		$orchestrator = $this->getOrchestratorWithMockResponse( $guzzleResponse );

		$call = json_decode( '{"Z1K1": "Z7", "Z7K1": "Z10000", "Z10000K1": "input"}', true );

		$response = $orchestrator->orchestrate(
			$call,
			/* bypassCache= */ true,
			/* evaluateOnMiss= */ true
		);

		// Once getting a cache miss, if evaluateOnMiss flag is false, exit with false
		$this->assertEquals( HttpStatus::OK, $response['httpStatusCode'] );
		$this->assertEquals( json_decode( $evaluatedValue ), json_decode( $response['result'] ) );
	}

	public function testOrchestrate_throwsOrchestratorExceptionOnConnectException(): void {
		$mock = new MockHandler( [
			new ConnectException( 'Connection refused', new Request( 'POST', '/1/v2/evaluate/' ) )
		] );
		$client = new Client( [ 'handler' => HandlerStack::create( $mock ) ] );
		$orchestrator = new OrchestratorRequest( $client );

		$this->mockNoMemcachedWrapper();

		$this->expectException( OrchestratorException::class );
		$orchestrator->orchestrate( [ 'Z1K1' => 'Z7' ] );
	}

	public function testOrchestrate_throwsOrchestratorExceptionOnTooManyRedirectsException(): void {
		$mock = new MockHandler( [
			new TooManyRedirectsException( 'Too many redirects', new Request( 'POST', '/1/v2/evaluate/' ) )
		] );
		$client = new Client( [ 'handler' => HandlerStack::create( $mock ) ] );
		$orchestrator = new OrchestratorRequest( $client );

		$this->mockNoMemcachedWrapper();

		$this->expectException( OrchestratorException::class );
		$orchestrator->orchestrate( [ 'Z1K1' => 'Z7' ] );
	}

	// OrchestratorRequest::orchestrateTestExecution
	// =============================================

	public function testOrchestrateTestExecution_firstMissSecondHit() {
		$testCall = json_decode( '{"Z1K1":"Z7","Z7K1":"Z10000"}' );
		$validationCall = json_decode( '{"Z1K1":"Z7","Z7K1":"Z10001"}' );

		$testValue = '{"Z1K1":"Z6","Z6K1":"some result"}';
		$testEnvelope = '{"Z1K1":"Z22","Z22K1":' . $testValue . ',"Z22K2":"Z24"}';

		$validationEnvelope = '{"Z1K1":"Z22","Z22K1":{"Z1K1":"Z9","Z9K1":"Z41"},"Z22K2":"Z24"}';
		$cachedValidationResponse = [ 'result' => $validationEnvelope, 'httpStatusCode' => HttpStatus::OK ];

		$mockCache = $this->createMock( MemcachedWrapper::class );
		$mockCache
			->method( 'makeKey' )
			->willReturn( 'some-mock-key' );
		$mockCache
			->method( 'get' )
			->willReturnOnConsecutiveCalls( false, $cachedValidationResponse );

		$mockCache
			->expects( $this->once() )
			->method( 'set' );

		$this->setService( 'WikiLambdaMemcachedWrapper', $mockCache );

		$guzzleResponse = new Response( HttpStatus::OK, [], $testEnvelope );
		$orchestrator = $this->getOrchestratorWithMockResponse( $guzzleResponse );

		$result = $orchestrator->orchestrateTestExecution( $testCall, $validationCall, true );

		$this->assertTrue( $result[ 'passed' ] );
		$this->assertFalse( $result[ 'hasErrors' ] );
	}

	// OrchestratorRequest::getSupportedProgrammingLanguages
	// =====================================================

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

	// OrchestratorRequest::persistToCache
	// ===================================

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

	// Test private functions
	// ======================

	/**
	 * Get OrchestratorRequest TestingAccessWrapper to test
	 * private methods
	 *
	 * @return TestingAccessWrapper
	 */
	private function getOrchestratorWrapper(): TestingAccessWrapper {
		$mock = new MockHandler();
		$handler = HandlerStack::create( $mock );
		$client = new Client( [ 'handler' => $handler ] );
		$orchestrator = new OrchestratorRequest( $client );
		$wrapper = TestingAccessWrapper::newFromObject( $orchestrator );
		return $wrapper;
	}

	public function testGetResponseEnvelope_parsesValidZ22() {
		$wrapper = $this->getOrchestratorWrapper();

		$response = json_encode( [
			'Z1K1' => 'Z22',
			'Z22K1' => 'hello',
			'Z22K2' => [ 'Z1K1' => 'Z6', 'Z6K1' => 'no errors' ],
		] );

		$envelope = $wrapper->getResponseEnvelope( $response, '{}' );
		$this->assertInstanceOf( ZResponseEnvelope::class, $envelope );
	}

	public function testGetResponseEnvelope_returnsFailureForInvalidJson() {
		$wrapper = $this->getOrchestratorWrapper();

		$envelope = $wrapper->getResponseEnvelope( '{not json!!!', '{}' );
		$this->assertInstanceOf( ZResponseEnvelope::class, $envelope );
		$this->assertFailureEnvelopeContainsErrorType( $envelope, ZErrorTypeRegistry::Z_ERROR_EVALUATION );
	}

	public function testGetResponseEnvelope_returnsFailureWhenZ1K1Missing() {
		$wrapper = $this->getOrchestratorWrapper();

		$response = json_encode( [ 'error' => 'Payload too large' ] );
		$envelope = $wrapper->getResponseEnvelope( $response, '{}' );
		$this->assertInstanceOf( ZResponseEnvelope::class, $envelope );
		$this->assertFailureEnvelopeContainsErrorType( $envelope, ZErrorTypeRegistry::Z_ERROR_EVALUATION );
	}

	public function testGetResponseEnvelope_returnsFailureWhenNotZ22() {
		$wrapper = $this->getOrchestratorWrapper();

		$response = json_encode( [
			'Z1K1' => 'Z6',
			'Z6K1' => 'I am a string, not a response envelope',
		] );
		$envelope = $wrapper->getResponseEnvelope( $response, '{}' );
		$this->assertInstanceOf( ZResponseEnvelope::class, $envelope );
		$this->assertFailureEnvelopeContainsErrorType( $envelope, ZErrorTypeRegistry::Z_ERROR_EVALUATION );
	}

	public function testGetResponseEnvelope_returnsFailureWhenZObjectFactoryFails() {
		$wrapper = $this->getOrchestratorWrapper();

		// Valid JSON with Z1K1 present on the top-level object, but the inner Z22K1
		// value has Z1K1 set to an integer (not a valid type reference), which makes
		// ZObjectFactory::create throw a ZErrorException.
		$response = json_encode( [
			'Z1K1' => 'Z22',
			'Z22K1' => (object)[ 'Z1K1' => 42 ],
			'Z22K2' => (object)[ 'Z1K1' => 'Z6', 'Z6K1' => 'meta' ],
		] );
		$envelope = $wrapper->getResponseEnvelope( $response, '{}' );
		$this->assertInstanceOf( ZResponseEnvelope::class, $envelope );
		$this->assertFailureEnvelopeContainsErrorType( $envelope, ZErrorTypeRegistry::Z_ERROR_EVALUATION );
	}

	/**
	 * Assert that a failure ZResponseEnvelope's metadata contains the given
	 * error type somewhere in its serialized output.
	 */
	private function assertFailureEnvelopeContainsErrorType(
		ZResponseEnvelope $envelope,
		string $expectedErrorType
	): void {
		$serialized = json_encode( $envelope->getSerialized() );
		$this->assertStringContainsString(
			$expectedErrorType,
			$serialized,
			"Expected failure envelope to reference error type $expectedErrorType"
		);
	}

	public function testGetFailedResponseEnvelope() {
		$wrapper = $this->getOrchestratorWrapper();

		$zerror = ZErrorFactory::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
			[ 'message' => 'test error' ]
		);

		$envelope = $wrapper->getFailedResponseEnvelope( $zerror );
		$this->assertInstanceOf( ZResponseEnvelope::class, $envelope );
		$this->assertSame( 'Z24', $envelope->getZValue()->getSerialized() );
		$this->assertFailureEnvelopeContainsErrorType( $envelope, ZErrorTypeRegistry::Z_ERROR_UNKNOWN );
	}
}
