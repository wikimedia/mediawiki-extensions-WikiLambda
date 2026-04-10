<?php

/**
 * WikiLambda integration test suite for the AbstractWikiRequest class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiRequest;
use MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\WikifunctionCallException;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\Http\MWHttpRequest;
use StatusValue;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiRequest
 * @covers \MediaWiki\Extension\WikiLambda\WikifunctionCallException
 * @group Database
 */
class AbstractWikiRequestTest extends WikiLambdaIntegrationTestCase {

	private const TEST_TARGET_API = 'test.wikifunctions.org';

	protected function setUp(): void {
		parent::setUp();
		$this->overrideConfigValue( 'WikiLambdaClientTargetAPI', self::TEST_TARGET_API );
	}

	// ─── fetchRenderedFragment ───────────────────────────────────────────

	public function testFetchRenderedFragment_noTargetUrl() {
		$this->overrideConfigValue( 'WikiLambdaClientTargetAPI', '' );

		$request = $this->makeAbstractWikiRequest();

		$this->expectException( WikifunctionCallException::class );
		$this->expectExceptionMessage( 'not enabled' );

		try {
			$request->fetchRenderedFragment( [ 'Z1K1' => 'Z7' ] );
		} catch ( WikifunctionCallException $e ) {
			$this->assertSame( HttpStatus::NOT_IMPLEMENTED, $e->getHttpStatusCode() );
			// Re-throwing so we can use expectException/etc. above.
			throw $e;
		}
	}

	public function testFetchRenderedFragment_transportFailure() {
		$factory = $this->getMockHttpFactory(
			StatusValue::newFatal( 'http-request-error' ),
			'',
			0
		);

		$request = $this->makeAbstractWikiRequest( $factory );

		try {
			$request->fetchRenderedFragment( [ 'Z1K1' => 'Z7' ] );
		} catch ( WikifunctionCallException $e ) {
			$this->assertSame( HttpStatus::SERVICE_UNAVAILABLE, $e->getHttpStatusCode() );
		}
	}

	public function testFetchRenderedFragment_nonJsonResponse() {
		$factory = $this->getMockHttpFactory(
			StatusValue::newGood(),
			'this is not JSON',
			200
		);

		$request = $this->makeAbstractWikiRequest( $factory );

		try {
			$request->fetchRenderedFragment( [ 'Z1K1' => 'Z7' ] );
		} catch ( WikifunctionCallException $e ) {
			$this->assertSame( HttpStatus::INTERNAL_SERVER_ERROR, $e->getHttpStatusCode() );
		}
	}

	/**
	 * @dataProvider provideApiErrorResponses
	 */
	public function testFetchRenderedFragment_apiError(
		int $httpStatusCode,
		int $expectedExceptionCode
	) {
		$responseBody = json_encode( [
			'error' => [
				'code' => 'some-error',
				'info' => 'Something went wrong'
			]
		] );

		$factory = $this->getMockHttpFactory(
			StatusValue::newGood(),
			$responseBody,
			$httpStatusCode
		);

		$request = $this->makeAbstractWikiRequest( $factory );

		try {
			$request->fetchRenderedFragment( [ 'Z1K1' => 'Z7' ] );
		} catch ( WikifunctionCallException $e ) {
			$this->assertSame( $expectedExceptionCode, $e->getHttpStatusCode() );
		}
	}

	public static function provideApiErrorResponses(): array {
		return [
			'503 service unavailable' => [
				HttpStatus::SERVICE_UNAVAILABLE,
				HttpStatus::SERVICE_UNAVAILABLE
			],
			'429 too many requests' => [
				HttpStatus::TOO_MANY_REQUESTS,
				HttpStatus::SERVICE_UNAVAILABLE
			],
			'403 forbidden' => [
				HttpStatus::FORBIDDEN,
				HttpStatus::FORBIDDEN
			],
			'400 bad request' => [
				HttpStatus::BAD_REQUEST,
				HttpStatus::BAD_REQUEST
			],
			'200 with error key (unknown)' => [
				HttpStatus::OK,
				HttpStatus::INTERNAL_SERVER_ERROR
			],
		];
	}

	public function testFetchRenderedFragment_missingFunctionCallKey() {
		$responseBody = json_encode( [
			'some_other_key' => 'value'
		] );

		$factory = $this->getMockHttpFactory(
			StatusValue::newGood(),
			$responseBody,
			200
		);

		$request = $this->makeAbstractWikiRequest( $factory );

		try {
			$request->fetchRenderedFragment( [ 'Z1K1' => 'Z7' ] );
		} catch ( WikifunctionCallException $e ) {
			$this->assertSame( HttpStatus::INTERNAL_SERVER_ERROR, $e->getHttpStatusCode() );
		}
	}

	public function testFetchRenderedFragment_invalidEnvelopeJson() {
		$responseBody = json_encode( [
			'wikilambda_function_call' => [
				'data' => 'not valid json {'
			]
		] );

		$factory = $this->getMockHttpFactory(
			StatusValue::newGood(),
			$responseBody,
			200
		);

		$request = $this->makeAbstractWikiRequest( $factory );

		try {
			$request->fetchRenderedFragment( [ 'Z1K1' => 'Z7' ] );
		} catch ( WikifunctionCallException $e ) {
			$this->assertSame( HttpStatus::INTERNAL_SERVER_ERROR, $e->getHttpStatusCode() );
		}
	}

	public function testFetchRenderedFragment_voidResponseWithZError() {
		$factory = $this->getMockHttpFactoryForVoidZError();
		$request = $this->makeAbstractWikiRequest( $factory );

		try {
			$request->fetchRenderedFragment( [ 'Z1K1' => 'Z7' ] );
		} catch ( WikifunctionCallException $e ) {
			$this->assertSame( HttpStatus::BAD_REQUEST, $e->getHttpStatusCode() );
			$this->assertTrue( $e->hasZError() );
		}
	}

	public function testFetchRenderedFragment_responseNotHtmlFragment() {
		$responseBody = json_encode( [
			'wikilambda_function_call' => [
				'data' => json_encode( [
					'Z22K1' => (object)[ 'Z1K1' => 'Z6', 'Z6K1' => 'just a string' ],
					'Z22K2' => (object)[]
				] )
			]
		] );

		$factory = $this->getMockHttpFactory(
			StatusValue::newGood(),
			$responseBody,
			200
		);

		$request = $this->makeAbstractWikiRequest( $factory );

		try {
			$request->fetchRenderedFragment( [ 'Z1K1' => 'Z7' ] );
		} catch ( WikifunctionCallException $e ) {
			$this->assertSame( HttpStatus::BAD_REQUEST, $e->getHttpStatusCode() );
		}
	}

	public function testFetchRenderedFragment_success() {
		$htmlContent = '<b>Hello World</b>';
		$factory = $this->getMockHttpFactoryForSuccess( $htmlContent );
		$request = $this->makeAbstractWikiRequest( $factory );

		$result = $request->fetchRenderedFragment( [ 'Z1K1' => 'Z7' ] );

		$this->assertArrayHasKey( 'Z89K1', $result );
		$this->assertSame( $htmlContent, $result[ 'Z89K1' ] );
	}

	// ─── generateSafeFragment ────────────────────────────────────────────

	public function testGenerateSafeFragment_success() {
		$htmlContent = '<b>Hello World</b>';
		$factory = $this->getMockHttpFactoryForSuccess( $htmlContent );

		// Mock the cache to capture set() calls
		$cache = $this->createMock( MemcachedWrapper::class );
		$setCalls = [];
		$cache->method( 'set' )
			->willReturnCallback( static function ( $key, $value, $ttl ) use ( &$setCalls ) {
				$setCalls[] = [ 'key' => $key, 'value' => $value, 'ttl' => $ttl ];
				return true;
			} );
		$this->setService( 'WikiLambdaMemcachedWrapper', $cache );

		$request = $this->makeAbstractWikiRequest( $factory );

		$result = $request->generateSafeFragment(
			[ 'Z1K1' => 'Z7' ],
			'fresh-key',
			'stale-key'
		);

		// Assert returned structure
		$this->assertTrue( $result[ 'success' ] );
		$this->assertArrayHasKey( 'value', $result );

		// Assert both cache keys were set
		$this->assertCount( 2, $setCalls );
		$this->assertSame( 'fresh-key', $setCalls[0][ 'key' ] );
		$this->assertSame( 'stale-key', $setCalls[1][ 'key' ] );

		// Assert fresh TTL is TTL_WEEK (604800)
		$this->assertSame( 604800, $setCalls[0][ 'ttl' ] );
		// Assert stale TTL is TTL_MONTH (2592000)
		$this->assertSame( 2592000, $setCalls[1][ 'ttl' ] );

		// Assert both keys hold the same JSON value
		$this->assertSame( $setCalls[0][ 'value' ], $setCalls[1][ 'value' ] );
	}

	public function testGenerateSafeFragment_userErrorWithoutZError() {
		// API-level 400: the remote API rejected the request before execution.
		// No ZError is present — just an HTTP error code.
		$responseBody = json_encode( [
			'error' => [ 'code' => 'bad-input', 'info' => 'Bad input' ]
		] );
		$factory = $this->getMockHttpFactory(
			StatusValue::newGood(),
			$responseBody,
			HttpStatus::BAD_REQUEST
		);

		$cache = $this->createMock( MemcachedWrapper::class );
		$setCalls = [];
		$cache->method( 'set' )
			->willReturnCallback( static function ( $key, $value, $ttl ) use ( &$setCalls ) {
				$setCalls[] = [ 'key' => $key, 'value' => $value, 'ttl' => $ttl ];
				return true;
			} );
		$this->setService( 'WikiLambdaMemcachedWrapper', $cache );

		$request = $this->makeAbstractWikiRequest( $factory );

		$result = $request->generateSafeFragment(
			[ 'Z1K1' => 'Z7' ],
			'fresh-key',
			'stale-key'
		);

		// Assert failure result without a ZError
		$this->assertFalse( $result[ 'success' ] );
		$this->assertNull( $result[ 'value' ][ 'zerror' ] );

		// Assert fresh TTL is still TTL_WEEK (user errors don't reduce TTL)
		$this->assertSame( 604800, $setCalls[0][ 'ttl' ] );
		// Assert stale TTL is TTL_MONTH
		$this->assertSame( 2592000, $setCalls[1][ 'ttl' ] );
	}

	public function testGenerateSafeFragment_userErrorWithZError() {
		// Void response with ZError: the orchestrator ran the function but it
		// returned Z24 (Void) with error details in the metadata.
		$factory = $this->getMockHttpFactoryForVoidZError();

		$cache = $this->createMock( MemcachedWrapper::class );
		$setCalls = [];
		$cache->method( 'set' )
			->willReturnCallback( static function ( $key, $value, $ttl ) use ( &$setCalls ) {
				$setCalls[] = [ 'key' => $key, 'value' => $value, 'ttl' => $ttl ];
				return true;
			} );
		$this->setService( 'WikiLambdaMemcachedWrapper', $cache );

		$request = $this->makeAbstractWikiRequest( $factory );

		$result = $request->generateSafeFragment(
			[ 'Z1K1' => 'Z7' ],
			'fresh-key',
			'stale-key'
		);

		// Assert failure result with a ZError present
		$this->assertFalse( $result[ 'success' ] );
		$this->assertNotNull( $result[ 'value' ][ 'zerror' ] );
		$this->assertSame( 'Z504', $result[ 'value' ][ 'zerror' ]->Z5K1 );

		// Assert fresh TTL is still TTL_WEEK (user errors don't reduce TTL)
		$this->assertSame( 604800, $setCalls[0][ 'ttl' ] );
		// Assert stale TTL is TTL_MONTH
		$this->assertSame( 2592000, $setCalls[1][ 'ttl' ] );
	}

	/**
	 * @dataProvider provideServerErrors
	 */
	public function testGenerateSafeFragment_serverError(
		string $responseBody,
		int $httpStatusCode
	) {
		$factory = $this->getMockHttpFactory(
			StatusValue::newGood(),
			$responseBody,
			$httpStatusCode
		);

		$cache = $this->createMock( MemcachedWrapper::class );
		$setCalls = [];
		$cache->method( 'set' )
			->willReturnCallback( static function ( $key, $value, $ttl ) use ( &$setCalls ) {
				$setCalls[] = [ 'key' => $key, 'value' => $value, 'ttl' => $ttl ];
				return true;
			} );
		$this->setService( 'WikiLambdaMemcachedWrapper', $cache );

		$request = $this->makeAbstractWikiRequest( $factory );

		$result = $request->generateSafeFragment(
			[ 'Z1K1' => 'Z7' ],
			'fresh-key',
			'stale-key'
		);

		// Assert failure result
		$this->assertFalse( $result[ 'success' ] );

		// Assert fresh TTL is reduced to TTL_MINUTE (60) for server errors
		$this->assertSame( 60, $setCalls[0][ 'ttl' ] );
		// Assert stale TTL is still TTL_MONTH
		$this->assertSame( 2592000, $setCalls[1][ 'ttl' ] );
	}

	public static function provideServerErrors(): array {
		return [
			'500 internal server error' => [
				json_encode( [ 'error' => [ 'code' => 'internal', 'info' => 'Error' ] ] ),
				HttpStatus::INTERNAL_SERVER_ERROR,
			],
			'503 service unavailable' => [
				json_encode( [ 'error' => [ 'code' => 'timeout', 'info' => 'Timeout' ] ] ),
				HttpStatus::SERVICE_UNAVAILABLE,
			],
			'non-JSON response (unknown error)' => [
				'this is not JSON at all',
				200,
			],
		];
	}

	// ─── Helpers ─────────────────────────────────────────────────────────

	/**
	 * Create an AbstractWikiRequest instance with an optional mock HttpRequestFactory.
	 *
	 * @param HttpRequestFactory|null $factory
	 * @return AbstractWikiRequest
	 */
	private function makeAbstractWikiRequest( ?HttpRequestFactory $factory = null ): AbstractWikiRequest {
		if ( $factory === null ) {
			$factory = $this->createMock( HttpRequestFactory::class );
		}
		$config = $this->getServiceContainer()->getMainConfig();
		return new AbstractWikiRequest( $config, $factory );
	}

	/**
	 * Build a mock HttpRequestFactory that returns a preconfigured MWHttpRequest.
	 *
	 * @param StatusValue $status Return value for execute()
	 * @param string $content Return value for getContent()
	 * @param int $httpStatusCode Return value for getStatus()
	 * @return HttpRequestFactory
	 */
	private function getMockHttpFactory(
		StatusValue $status,
		string $content,
		int $httpStatusCode
	): HttpRequestFactory {
		$httpRequest = $this->createMock( MWHttpRequest::class );
		$httpRequest->method( 'execute' )->willReturn( $status );
		$httpRequest->method( 'getContent' )->willReturn( $content );
		$httpRequest->method( 'getStatus' )->willReturn( $httpStatusCode );

		$factory = $this->createMock( HttpRequestFactory::class );
		$factory->method( 'create' )->willReturn( $httpRequest );

		return $factory;
	}

	/**
	 * Build a mock HttpRequestFactory that returns a successful Z89 HTML fragment response.
	 *
	 * @param string $htmlContent The HTML string to place in Z89K1
	 * @return HttpRequestFactory
	 */
	private function getMockHttpFactoryForSuccess( string $htmlContent ): HttpRequestFactory {
		$responseBody = json_encode( [
			'wikilambda_function_call' => [
				'data' => json_encode( [
					'Z22K1' => (object)[
						'Z1K1' => 'Z89',
						'Z89K1' => $htmlContent
					],
					'Z22K2' => (object)[]
				] )
			]
		] );

		return $this->getMockHttpFactory(
			StatusValue::newGood(),
			$responseBody,
			200
		);
	}

	/**
	 * Build a mock HttpRequestFactory that returns a Void (Z24) response with a
	 * Z504 (ZID not found) ZError in the metadata.
	 *
	 * @return HttpRequestFactory
	 */
	private function getMockHttpFactoryForVoidZError(): HttpRequestFactory {
		$zerror = (object)[
			'Z1K1' => 'Z5',
			'Z5K1' => 'Z504',
			'Z5K2' => (object)[
				'Z1K1' => 'Z504',
				'Z504K1' => 'Z400'
			]
		];

		$metadata = (object)[
			'K1' => [
				'Z882',
				(object)[ 'K1' => 'errors', 'K2' => $zerror ]
			]
		];

		$responseBody = json_encode( [
			'wikilambda_function_call' => [
				'data' => json_encode( [
					'Z22K1' => 'Z24',
					'Z22K2' => $metadata
				] )
			]
		] );

		return $this->getMockHttpFactory(
			StatusValue::newGood(),
			$responseBody,
			200
		);
	}
}
