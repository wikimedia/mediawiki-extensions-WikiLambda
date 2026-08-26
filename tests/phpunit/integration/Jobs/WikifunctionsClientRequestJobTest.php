<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Jobs;

use MediaWiki\Extension\WikiLambda\ClientStorage\WikifunctionsFragmentStore;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\Jobs\WikifunctionsClientRequestJob;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaClientIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\WikifunctionCallException;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\Http\MWHttpRequest;
use MockHttpTrait;
use Wikimedia\TestingAccessWrapper;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Jobs\WikifunctionsClientRequestJob
 * @covers \MediaWiki\Extension\WikiLambda\ClientStorage\WikifunctionsFragmentStore
 * @group API
 * @group Database
 */
class WikifunctionsClientRequestJobTest extends WikiLambdaClientIntegrationTestCase {

	use MockHttpTrait;

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsClientMode();
	}

	/**
	 * Build the params object to initialize the job
	 *
	 * @param string $functionZid
	 * @param array $arguments
	 * @param array $temporalArgs
	 * @param ?string $parseLang
	 * @param ?string $renderLang
	 * @return WikifunctionClientRequestJob
	 */
	private function buildJob(
		string $functionZid,
		array $arguments,
		array $temporalArgs = [],
		string $parseLang = 'en',
		string $renderLang = 'en'
	): WikifunctionsClientRequestJob {
		$request = [
			'target' => $functionZid,
			'arguments' => $arguments,
			'parseLang' => $parseLang,
			'renderLang' => $renderLang,
			'temporalArgs' => []
		];
		return new WikifunctionsClientRequestJob( [
			'request' => $request
		] );
	}

	public function testRun() {
		$functionZid = 'Z10000';
		$arguments = [
			'Z10000K1' => 'foo',
			'Z10000K2' => 'bar',
		];

		$job = $this->buildJob( $functionZid, $arguments );

		$status = $job->run();

		$this->assertTrue( $status );
	}

	public function testBuildRequest() {
		$functionZid = 'Z10000';
		$arguments = [
			'Z10000K1' => 'foo/',
			'Z10000K2' => 'bar',
		];
		$base64args = implode( '|', [
			ZObjectUtils::encodeStringParamForNetwork( 'foo/' ),
			ZObjectUtils::encodeStringParamForNetwork( 'bar' ),
		] );

		$expectedUri = 'test.wikifunctions.org/rest.php/wikifunctions/v0/call/Z10000/' . $base64args . '/en/en';

		// Set mock with call expectations:
		$mockMWHttpRequest = $this->createMock( MWHttpRequest::class );
		$mockMWHttpRequest
			->expects( $this->once() )
			->method( 'setHeader' )
			->with( 'X-WikiLambda-Request-Origin', 'wf-client' );

		$mockHttpRequestFactory = $this->createMock( HttpRequestFactory::class );
		$mockHttpRequestFactory->expects( $this->once() )
			->method( 'create' )
			->with( $expectedUri )
			->willReturn( $mockMWHttpRequest );

		// Build job:
		$job = $this->buildJob( $functionZid, $arguments );

		// Inject mock HttpRequestFactory and invoke private buildRequest:
		$jobWrapper = TestingAccessWrapper::newFromObject( $job );
		$jobWrapper->httpRequestFactory = $mockHttpRequestFactory;
		$jobWrapper->buildRequest( $functionZid, $arguments, 'en', 'en' );
	}

	/**
	 * When Function call REST Api returns successful function call,
	 * WikifunctionsClientRequestJob->remoteCall returns the output value
	 */
	public function testRemoteCall_success() {
		$functionZid = 'Z10000';
		$arguments = [
			'Z10000K1' => 'foo/',
			'Z10000K2' => 'bar',
		];
		$body = [ 'value' => 'foo/bar', 'type' => 'Z6' ];

		// Mock successful/200 response
		$this->installMockHttp( $this->makeFakeHttpRequest( json_encode( $body ) ) );

		// Build job:
		$job = $this->buildJob( $functionZid, $arguments );

		// Run private remoteCall method:
		$output = TestingAccessWrapper::newFromObject( $job )->remoteCall( $functionZid, $arguments, 'en', 'en' );

		$this->assertSame(
			[ 'value' => 'foo/bar', 'type' => 'Z6' ],
			$output
		);
	}

	/**
	 * When Function call REST Api returns failed function call,
	 * WikifunctionsClientRequestJob->remoteCall throws the correct
	 * error message.
	 * Tests correct mapping between server Api failures and client exceptions.
	 *
	 * @dataProvider provideRemoteCall_errors
	 */
	public function testRemoteCall_error(
		$request,
		$responseStatus,
		$responseBody,
		$expectedErrorMsg,
		$expectedHttpStatus
	) {
		// Mock failed response
		$this->installMockHttp( $this->makeFakeHttpRequest( json_encode( $responseBody ), $responseStatus ) );

		// Build job:
		$job = $this->buildJob(
			$request['target'],
			$request['arguments'],
			[],
			$request['parseLang'],
			$request['renderLang']
		);

		try {
			// Run private remoteCall method:
			TestingAccessWrapper::newFromObject( $job )->remoteCall(
				$request['target'],
				$request['arguments'],
				$request['parseLang'],
				$request['renderLang']
			);
			// Capture failure to raise the exception:
			$this->fail( 'Expected WikifunctionCallException was not thrown.' );
		} catch ( WikifunctionCallException $e ) {
			$this->assertSame( $expectedErrorMsg, $e->getMessageKey() );
			$this->assertSame( $expectedHttpStatus, $e->getHttpStatusCode() );
		}
	}

	public static function provideRemoteCall_errors() {
		$filePath = dirname( __DIR__, 2 ) . '/test_data/wikifunctions-call-errors.json';
		$fileData = json_decode( file_get_contents( $filePath ), true );

		foreach ( $fileData as $call ) {
			yield $call['description'] => [
				$call['request'],
				$call['status'],
				$call['body'],
				$call['error'],
				$call['finalStatus'] ?? $call['status']
			];
		}
	}

	public function testRun_successCallsStoreSetter() {
		// Call:
		$functionZid = 'Z10000';
		$arguments = [
			'Z10000K1' => 'foo/',
			'Z10000K2' => 'bar',
		];
		$functionCall = [
			'target' => $functionZid,
			'arguments' => $arguments,
			'parseLang' => 'en',
			'renderLang' => 'en',
			'temporalArgs' => [],
		];

		// Successful response...
		$body = [ 'value' => 'foo/bar', 'type' => 'Z6' ];

		// ... plus additional fields to be stored:
		$expectedStoredValue = $body + [ 'success' => true ];

		// Mock Fragment Store to assert that the setter is called correctly
		$mockStore = $this->createMock( WikifunctionsFragmentStore::class );
		$mockStore
			->expects( $this->once() )
			->method( 'setRenderedFragment' )
			->with(
				$functionCall,
				$expectedStoredValue,
				HttpStatus::OK
			);
		$this->setService( 'WikifunctionsFragmentStore', $mockStore );

		// Mock successful/200 response
		$this->installMockHttp( $this->makeFakeHttpRequest( json_encode( $body ) ) );

		// Build and run job:
		$job = $this->buildJob( $functionZid, $arguments );
		$status = $job->run();

		$this->assertTrue( $status );
	}

	/**
	 * @dataProvider provideRemoteCall_errors
	 */
	public function testRun_failureCallsStoreSetter(
		$request,
		$responseStatus,
		$responseBody,
		$expectedErrorMsg,
		$expectedHttpStatus
	) {
		// Expected failure stored value:
		$expectedStoredValue = [
			'success' => false,
			'errorMessageKey' => $expectedErrorMsg,

		];

		// Mock Fragment Store to assert that the setter is called correctly
		$mockStore = $this->createMock( WikifunctionsFragmentStore::class );
		$mockStore
			->expects( $this->once() )
			->method( 'setRenderedFragment' )
			->with(
				$request + [ 'temporalArgs' => [] ],
				$expectedStoredValue,
				$expectedHttpStatus
			);
		$this->setService( 'WikifunctionsFragmentStore', $mockStore );

		// Mock failed response
		$this->installMockHttp( $this->makeFakeHttpRequest( json_encode( $responseBody ), $responseStatus ) );

		// Build and run job:
		$job = $this->buildJob(
			$request['target'],
			$request['arguments'],
			[],
			$request['parseLang'],
			$request['renderLang']
		);
		$status = $job->run();

		// Job returns true even when fragment fails
		$this->assertTrue( $status );
	}
}
