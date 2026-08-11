<?php

/**
 * WikiLambda integration test suite for the AbstractWikiRequest class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiRequest;
use MediaWiki\Extension\WikiLambda\AWStorage\AWFragmentStore;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\WikifunctionCallException;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\Http\MWHttpRequest;
use StatusValue;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiRequest
 * @covers \MediaWiki\Extension\WikiLambda\WikifunctionCallException
 * @group Database
 */
class AbstractWikiRequestTest extends WikiLambdaAbstractModeIntegrationTestCase {

	private const TEST_TARGET_API = 'test.wikifunctions.org';

	protected function setUp(): void {
		parent::setUp();
		$this->overrideConfigValue( 'WikiLambdaClientTargetAPI', self::TEST_TARGET_API );
	}

	// callRenderFunctionCall
	// ======================

	public function testCallRenderFunctionCall_noTargetUrl() {
		$this->overrideConfigValue( 'WikiLambdaClientTargetAPI', '' );

		$request = $this->buildAbstractWikiRequest();

		$this->expectException( WikifunctionCallException::class );
		$this->expectExceptionMessage( 'not enabled' );

		try {
			$request->callRenderFunctionCall( [ 'Z1K1' => 'Z7' ] );
		} catch ( WikifunctionCallException $e ) {
			$this->assertSame( HttpStatus::NOT_IMPLEMENTED, $e->getHttpStatusCode() );
			// Re-throwing so we can use expectException/etc. above.
			throw $e;
		}
	}

	public function testCallRenderFunctionCall_transportFailure() {
		$factory = $this->getMockHttpFactory(
			StatusValue::newFatal( 'http-request-error' ),
			'',
			0
		);

		$request = $this->buildAbstractWikiRequest( $factory );

		try {
			$request->callRenderFunctionCall( [ 'Z1K1' => 'Z7' ] );
		} catch ( WikifunctionCallException $e ) {
			$this->assertSame( HttpStatus::SERVICE_UNAVAILABLE, $e->getHttpStatusCode() );
		}
	}

	public function testCallRenderFunctionCall_nonJsonResponse() {
		$factory = $this->getMockHttpFactory(
			StatusValue::newGood(),
			'this is not JSON',
			200
		);

		$request = $this->buildAbstractWikiRequest( $factory );

		try {
			$request->callRenderFunctionCall( [ 'Z1K1' => 'Z7' ] );
		} catch ( WikifunctionCallException $e ) {
			$this->assertSame( HttpStatus::INTERNAL_SERVER_ERROR, $e->getHttpStatusCode() );
		}
	}

	/**
	 * @dataProvider provideApiErrorResponses
	 */
	public function testCallRenderFunctionCall_apiError(
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

		$request = $this->buildAbstractWikiRequest( $factory );

		try {
			$request->callRenderFunctionCall( [ 'Z1K1' => 'Z7' ] );
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

	public function testCallRenderFunctionCall_missingFunctionCallKey() {
		$responseBody = json_encode( [
			'some_other_key' => 'value'
		] );

		$factory = $this->getMockHttpFactory(
			StatusValue::newGood(),
			$responseBody,
			200
		);

		$request = $this->buildAbstractWikiRequest( $factory );

		try {
			$request->callRenderFunctionCall( [ 'Z1K1' => 'Z7' ] );
		} catch ( WikifunctionCallException $e ) {
			$this->assertSame( HttpStatus::INTERNAL_SERVER_ERROR, $e->getHttpStatusCode() );
		}
	}

	public function testCallRenderFunctionCall_invalidEnvelopeJson() {
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

		$request = $this->buildAbstractWikiRequest( $factory );

		try {
			$request->callRenderFunctionCall( [ 'Z1K1' => 'Z7' ] );
		} catch ( WikifunctionCallException $e ) {
			$this->assertSame( HttpStatus::INTERNAL_SERVER_ERROR, $e->getHttpStatusCode() );
		}
	}

	/**
	 * @dataProvider provideOrchestratorVoidResponses
	 */
	public function testCallRenderFunctionCall_voidResponseWithZError( $responseZError, $responseHttpStatus ) {
		$factory = $this->getMockHttpFactoryForVoidZError( $responseZError, $responseHttpStatus );
		$request = $this->buildAbstractWikiRequest( $factory );

		try {
			$request->callRenderFunctionCall( [ 'Z1K1' => 'Z7' ] );
			$this->fail( 'Expected WikifunctionCallException was not thrown' );
		} catch ( WikifunctionCallException $e ) {
			$this->assertSame( $responseHttpStatus, $e->getHttpStatusCode() );
			$this->assertTrue( $e->hasZError() );
		}
	}

	public static function provideOrchestratorVoidResponses(): array {
		return [
			// 4xx
			'error_in_evaluation (Z507) -> http 400' => [ 'Z507', 400 ],
			'user_not_permitted_to_evaluate_function (Z559) -> http 401' => [ 'Z559', 401 ],
			'disallowed_root_object (Z553) -> http 403' => [ 'Z553', 403 ],
			'zid_not_found (Z504) -> http 404' => [ 'Z504', 404 ],
			'orchestrator_time_limit (Z574) -> http 408' => [ 'Z574', 408 ],
			'resolved_object_without_z2k2 (Z513) -> http 409' => [ 'Z513', 409 ],
			'unknown_error (Z500) -> http 422' => [ 'Z500', 422 ],
			'orchestrator_rate_limit (Z570) -> http 429' => [ 'Z570', 429 ],
			// 5xx
			'api_failure (Z530) -> http 500' => [ 'Z530', 500 ],
			'not_implemented_yet (Z503) -> http 501' => [ 'Z503', 501 ],
			'invalid_orchestrator_result (Z577) -> http 502' => [ 'Z577', 502 ],
			'evaluator_wasm_limit (Z576) -> http 504' => [ 'Z576', 504 ],
		];
	}

	public function testCallRenderFunctionCall_responseNotHtmlFragment() {
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

		$request = $this->buildAbstractWikiRequest( $factory );

		try {
			$request->callRenderFunctionCall( [ 'Z1K1' => 'Z7' ] );
		} catch ( WikifunctionCallException $e ) {
			$this->assertSame( HttpStatus::BAD_REQUEST, $e->getHttpStatusCode() );
		}
	}

	public function testCallRenderFunctionCall_success() {
		$htmlContent = '<b>Hello World</b>';
		$factory = $this->getMockHttpFactoryForSuccess( $htmlContent );
		$request = $this->buildAbstractWikiRequest( $factory );

		$result = $request->callRenderFunctionCall( [ 'Z1K1' => 'Z7' ] );

		$this->assertArrayHasKey( 'Z89K1', $result );
		$this->assertSame( $htmlContent, $result[ 'Z89K1' ] );
	}

	public function testCallRenderFunctionCall_successWithNormalFormZ6() {
		// T426297 regression: the orchestrator may emit Z89K1 in Z6 normal form
		// ({ Z1K1: "Z6", Z6K1: "<html>" }) rather than as a plain string. Both
		// shapes must canonicalise down to the plain string downstream.
		$htmlContent = '<b>Hello World</b>';
		$responseBody = json_encode( [
			'wikilambda_function_call' => [
				'data' => json_encode( [
					'Z22K1' => (object)[
						'Z1K1' => 'Z89',
						'Z89K1' => (object)[
							'Z1K1' => 'Z6',
							'Z6K1' => $htmlContent,
						],
					],
					'Z22K2' => (object)[],
				] ),
			],
		] );
		$factory = $this->getMockHttpFactory(
			StatusValue::newGood(),
			$responseBody,
			200
		);
		$request = $this->buildAbstractWikiRequest( $factory );

		$result = $request->callRenderFunctionCall( [ 'Z1K1' => 'Z7' ] );

		$this->assertArrayHasKey( 'Z89K1', $result );
		$this->assertSame( $htmlContent, $result[ 'Z89K1' ] );
	}

	public function testCallRenderFunctionCall_z89k1NotStringLike() {
		// T426297: if Z89K1 doesn't canonicalise to a string (e.g. it's a list),
		// we surface a 400 rather than letting a non-string reach the sanitiser.
		$responseBody = json_encode( [
			'wikilambda_function_call' => [
				'data' => json_encode( [
					'Z22K1' => (object)[
						'Z1K1' => 'Z89',
						'Z89K1' => [ 'Z6', 'not', 'a', 'string' ],
					],
					'Z22K2' => (object)[],
				] ),
			],
		] );
		$factory = $this->getMockHttpFactory(
			StatusValue::newGood(),
			$responseBody,
			200
		);
		$request = $this->buildAbstractWikiRequest( $factory );

		try {
			$request->callRenderFunctionCall( [ 'Z1K1' => 'Z7' ] );
			$this->fail( 'Expected WikifunctionCallException for non-string Z89K1' );
		} catch ( WikifunctionCallException $e ) {
			$this->assertSame( HttpStatus::BAD_REQUEST, $e->getHttpStatusCode() );
		}
	}

	// fetchRenderedAWFragment
	// =======================

	public function testFetchRenderedAWFragment_success() {
		$htmlContent = '<b>Hello World</b>';

		// Mock the httpRequestFactory for a successful response
		$factory = $this->getMockHttpFactoryForSuccess( $htmlContent );

		// Mock the fragmentStore for the expected setter call
		$fragmentStore = $this->getMockFragmentStoreForSetter( [
			'topicQid' => 'Q42',
			'languageZid' => 'Z1002',
			'datetime' => '20260514040500',
			'fragmentKey' => 'hashed-fragment',
			'value' => [ 'success' => true, 'value' => $htmlContent ]
		] );

		$request = $this->buildAbstractWikiRequest( $factory, $fragmentStore );

		$result = $request->fetchRenderedAWFragment(
			/* fragment= */ [ 'Z1K1' => 'Z7' ],
			/* topicQid= */ 'Q42',
			/* languageZid= */ 'Z1002',
			/* datetime= */ '20260514040500',
			/* fragmentKey= */ 'hashed-fragment',
		);

		// Assert returned structure
		$this->assertTrue( $result[ 'success' ] );
		$this->assertArrayHasKey( 'value', $result );
	}

	public function testFetchRenderedAWFragment_userErrorWithoutZError() {
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

		// Mock the fragmentStore to be called with the failed fragment
		$fragmentStore = $this->getMockFragmentStoreForSetter( [
			'topicQid' => 'Q42',
			'languageZid' => 'Z1002',
			'datetime' => '20260514040500',
			'fragmentKey' => 'hashed-fragment',
			'value' => [
				'success' => false,
				'value' => [
					'msg' => 'apierror-abstractwiki_run_fragment-bad-fragment',
					'httpStatusCode' => 400,
					'zerror' => null,
					'params' => []
				]
			]
		] );

		$request = $this->buildAbstractWikiRequest( $factory, $fragmentStore );

		$result = $request->fetchRenderedAWFragment(
			/* fragment= */ [ 'Z1K1' => 'Z7' ],
			/* topicQid= */ 'Q42',
			/* languageZid= */ 'Z1002',
			/* datetime= */ '20260514040500',
			/* fragmentKey= */ 'hashed-fragment',
		);

		// Assert failure result without a ZError
		$this->assertFalse( $result[ 'success' ] );
		$this->assertNull( $result[ 'value' ][ 'zerror' ] );
	}

	public function testFetchRenderedAWFragment_userErrorWithZError() {
		// Z579: Reached concurrent evaluator call limit in orchestrator
		// http 429: Too many requests
		$zerrorType = 'Z579';
		$httpStatusCode = 429;
		$factory = $this->getMockHttpFactoryForVoidZError( $zerrorType, $httpStatusCode );

		// Mock the fragmentStore to be called with the failed fragment
		$zerror = $this->mockZErrorFromZErrorType( $zerrorType );
		$fragmentStore = $this->getMockFragmentStoreForSetter( [
			'topicQid' => 'Q42',
			'languageZid' => 'Z1002',
			'datetime' => '20260514040500',
			'fragmentKey' => 'hashed-fragment',
			'value' => [
				'success' => false,
				'value' => [
					'msg' => 'apierror-abstractwiki_run_fragment-returned-zerror',
					'httpStatusCode' => $httpStatusCode,
					'zerror' => $zerror,
					'params' => [ $zerrorType ]
				]
			]
		] );

		$request = $this->buildAbstractWikiRequest( $factory, $fragmentStore );

		$result = $request->fetchRenderedAWFragment(
			/* fragment= */ [ 'Z1K1' => 'Z7' ],
			/* topicQid= */ 'Q42',
			/* languageZid= */ 'Z1002',
			/* datetime= */ '20260514040500',
			/* fragmentKey= */ 'hashed-fragment',
		);

		// Assert failure result with a ZError present
		$this->assertFalse( $result[ 'success' ] );
		$this->assertNotNull( $result[ 'value' ][ 'zerror' ] );
		$this->assertSame( $zerrorType, $result[ 'value' ][ 'zerror' ]->Z5K1 );
	}

	/**
	 * @dataProvider provideServerErrors
	 */
	public function testFetchRenderedAWFragment_serverError(
		string $responseBody,
		int $responseHttpStatus,
		int $expectedHttpStatus,
		string $expectedErrorMsg
	) {
		// Mock http factory to return the server error
		$factory = $this->getMockHttpFactory(
			StatusValue::newGood(),
			$responseBody,
			$responseHttpStatus
		);

		$fragmentStore = $this->getMockFragmentStoreForSetter( [
			'topicQid' => 'Q42',
			'languageZid' => 'Z1002',
			'datetime' => '20260514040500',
			'fragmentKey' => 'hashed-fragment',
			'value' => [
				'success' => false,
				'value' => [
					'msg' => $expectedErrorMsg,
					'httpStatusCode' => $expectedHttpStatus,
					'zerror' => null,
					'params' => []
				]
			]
		] );

		$request = $this->buildAbstractWikiRequest( $factory, $fragmentStore );

		$result = $request->fetchRenderedAWFragment(
			/* fragment= */ [ 'Z1K1' => 'Z7' ],
			/* topicQid= */ 'Q42',
			/* languageZid= */ 'Z1002',
			/* datetime= */ '20260514040500',
			/* fragmentKey= */ 'hashed-fragment',
		);

		// Assert failure result
		$this->assertFalse( $result[ 'success' ] );
	}

	public static function provideServerErrors(): array {
		return [
			'500 internal server error' => [
				json_encode( [ 'error' => [ 'code' => 'internal', 'info' => 'Error' ] ] ),
				HttpStatus::INTERNAL_SERVER_ERROR,
				HttpStatus::INTERNAL_SERVER_ERROR,
				'apierror-abstractwiki_run_fragment-unknown-error'
			],
			'503 service unavailable' => [
				json_encode( [ 'error' => [ 'code' => 'timeout', 'info' => 'Timeout' ] ] ),
				HttpStatus::SERVICE_UNAVAILABLE,
				HttpStatus::SERVICE_UNAVAILABLE,
				'apierror-abstractwiki_run_fragment-service-unavailable'
			],
			'non-JSON response causes unknown error' => [
				'this is not JSON at all',
				HttpStatus::OK,
				HttpStatus::INTERNAL_SERVER_ERROR,
				'apierror-abstractwiki_run_fragment-unknown-error'
			],
		];
	}

	// Helpers
	// =======

	/**
	 * Create an AbstractWikiRequest instance with an optional mock HttpRequestFactory.
	 *
	 * @param HttpRequestFactory|null $factory
	 * @param AWFragmentStore|null $fragmentStore
	 * @return AbstractWikiRequest
	 */
	private function buildAbstractWikiRequest(
		?HttpRequestFactory $factory = null,
		?AWFragmentStore $fragmentStore = null
	): AbstractWikiRequest {
		// If no input, Create a basic mock for HttpRequestFactory
		if ( $factory === null ) {
			$factory = $this->createMock( HttpRequestFactory::class );
		}
		// If no input, create a basic mock for AWFragmentStore
		if ( $fragmentStore === null ) {
			$fragmentStore = $this->createMock( AWFragmentStore::class );
		}

		$config = $this->getServiceContainer()->getMainConfig();
		$fragmentRenderer = WikiLambdaServices::getPFragmentRenderer();

		return new AbstractWikiRequest(
			$config,
			$factory,
			$fragmentStore,
			$fragmentRenderer
		);
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
		$httpRequest
			->expects( $this->once() )
			->method( 'setHeader' )
			->with( 'X-WikiLambda-Request-Origin', 'aw-fragment' );

		$factory = $this->createMock( HttpRequestFactory::class );
		$factory->method( 'create' )
			->willReturnCallback( function ( $url ) use ( $httpRequest ) {
				// The action must be present in the URL query string (not just the POST body)
				// so it shows up in HTTP-layer logs on the remote wiki.
				$this->assertStringContainsString(
					'action=wikilambda_function_call',
					$url,
					'API URL must include the action=wikilambda_function_call query parameter'
				);
				return $httpRequest;
			} );

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
	 * Mock the returned zerror; even if the keys might not be accurate, this is not
	 * important for this mock, we hardcode one K1 for the given error type.
	 *
	 * @param string $zerrorType
	 * @return \stdClass
	 */
	private function mockZErrorFromZErrorType( $zerrorType ): \stdClass {
		$zerrorKey = $zerrorType . 'K1';
		$zerror = (object)[
			'Z1K1' => 'Z5',
			'Z5K1' => $zerrorType,
			'Z5K2' => (object)[
				'Z1K1' => (object)[
					'Z1K1' => 'Z7',
					'Z7K1' => 'Z825',
					'Z825K1' => $zerrorType
				],
				$zerrorKey => 'err msg'
			]
		];
		return $zerror;
	}

	/**
	 * Build a mock HttpRequestFactory that returns a Void (Z24) response with a
	 * ZError in the response metadata. The Http request returns OK/200, and the
	 * response body contains:
	 * * success: true for orchestrator responses < 500, false for orchestrator responses >= 500
	 * * body: with void value (Z22K1) and the zerror inside the metadata (Z22K2)
	 * * orchestratorHttpStatusCode: with the http status code returned by the orchestrator endpoint
	 *
	 * @param string $zerrorType
	 * @param int $httpStatus
	 * @return HttpRequestFactory
	 */
	private function getMockHttpFactoryForVoidZError( $zerrorType, $httpStatus ): HttpRequestFactory {
		$zerror = $this->mockZErrorFromZErrorType( $zerrorType );
		$metadata = (object)[
			'K1' => [
				'Z882',
				(object)[ 'K1' => 'errors', 'K2' => $zerror ]
			]
		];

		$responseBody = json_encode( [
			'wikilambda_function_call' => [
				// success comes false for all errors > 500
				'success' => ( $httpStatus < 500 ),
				// data contains void and the error metadata
				'data' => json_encode( [
					'Z22K1' => 'Z24',
					'Z22K2' => $metadata
				] ),
				'orchestratorHttpStatusCode' => $httpStatus
			]
		] );

		// In this case, the API returns http 200, and the error
		// details, are inside the response body.
		return $this->getMockHttpFactory(
			StatusValue::newGood(),
			$responseBody,
			200
		);
	}

	/**
	 * Build a mock AWFragmentStore that captures the setter arguments and
	 * asserts they are the expected values.
	 *
	 * @param array $expected
	 * @return AWFragmentStore
	 */
	private function getMockFragmentStoreForSetter( $expected ): AWFragmentStore {
		$fragmentStore = $this->createMock( AWFragmentStore::class );

		$fragmentStore->expects( $this->once() )
			->method( 'setRenderedAWFragment' )
			->with(
				$expected[ 'topicQid' ],
				$expected[ 'languageZid' ],
				$expected[ 'datetime' ],
				$expected[ 'fragmentKey' ],
				$expected[ 'value' ]
			)
			->willReturn( true );

		return $fragmentStore;
	}
}
