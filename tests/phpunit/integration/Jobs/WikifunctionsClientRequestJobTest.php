<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Jobs;

use MediaWiki\Extension\WikiLambda\Jobs\WikifunctionsClientRequestJob;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaClientIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\WikifunctionCallException;
use MediaWiki\Extension\WikiLambda\WikifunctionsClientStore;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Http\HttpRequestFactory;
use MockHttpTrait;
use MWHttpRequest;
use Wikimedia\ObjectCache\BagOStuff;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Jobs\WikifunctionsClientRequestJob
 * @covers \MediaWiki\Extension\WikiLambda\WikifunctionsClientStore
 * @group API
 * @group Database
 */
class WikifunctionsClientRequestJobTest extends WikiLambdaClientIntegrationTestCase {

	use MockHttpTrait;

	private BagOStuff $cache;

	protected function setUp(): void {
		parent::setUp();
		$this->cache = WikiLambdaServices::getZObjectStash();
		$this->setUpAsClientMode();
	}

	/**
	 * Build the params object to initialize the job
	 *
	 * @param string $functionZid
	 * @param array $arguments
	 * @param ?string $parseLang
	 * @param ?string $renderLang
	 * @return WikifunctionClientRequestJob
	 */
	private function buildJob(
		string $functionZid,
		array $arguments,
		string $parseLang = 'en',
		string $renderLang = 'en'
	): WikifunctionsClientRequestJob {
		$request = [
			'target' => $functionZid,
			'arguments' => $arguments,
			'parseLang' => $parseLang,
			'renderLang' => $renderLang,
		];
		$cacheKey = $this->cache->makeKey(
			WikifunctionsClientStore::CLIENT_FUNCTIONCALL_CACHE_KEY_PREFIX,
			json_encode( $request )
		);
		return new WikifunctionsClientRequestJob( [
			'request' => $request,
			'clientCacheKey' => $cacheKey
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
		$mockHttpRequestFactory = $this->createMock( HttpRequestFactory::class );
		$mockMWHttpRequest = $this->createMock( MWHttpRequest::class );
		$mockHttpRequestFactory->expects( $this->once() )
			->method( 'create' )
			->with( $expectedUri )
			->willReturn( $mockMWHttpRequest );

		// Build job:
		$job = $this->buildJob( $functionZid, $arguments );

		// Inject mock HttpRequestFactory:
		$ref = new \ReflectionProperty( $job, 'httpRequestFactory' );
		$ref->setAccessible( true );
		$ref->setValue( $job, $mockHttpRequestFactory );

		// Run private remoteCall method:
		$this->runPrivateMethod( $job, 'buildRequest', [ $functionZid, $arguments, 'en', 'en' ] );
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
		$body = [ 'value' => 'foo/bar' ];

		// Mock successful/200 response
		$this->installMockHttp( $this->makeFakeHttpRequest( json_encode( $body ) ) );

		// Build job:
		$job = $this->buildJob( $functionZid, $arguments );

		// Run private remoteCall method:
		$output = $this->runPrivateMethod( $job, 'remoteCall', [ $functionZid, $arguments, 'en', 'en' ] );

		$this->assertSame( "foo/bar", $output[0] );
	}

	/**
	 * When Function call REST Api returns failed function call,
	 * WikifunctionsClientRequestJob->remoteCall throws the correct
	 * error message.
	 * Tests correct mapping between server Api failures and client exceptions.
	 *
	 * @dataProvider provideRemoteCall_errors
	 */
	public function testRemoteCall_error( $request, $responseStatus, $responseBody, $errorMessageKey ) {
		// Mock successful/200 response
		$this->installMockHttp( $this->makeFakeHttpRequest( json_encode( $responseBody ), $responseStatus ) );

		// Build job:
		$job = $this->buildJob(
			$request['target'],
			$request['arguments'],
			$request['parseLang'],
			$request['renderLang']
		);

		try {
			// Run private remoteCall method:
			$this->runPrivateMethod( $job, 'remoteCall', [
				$request['target'],
				$request['arguments'],
				$request['parseLang'],
				$request['renderLang']
			] );
			// Capture failure to raise the exception:
			$this->fail( 'Expected WikifunctionCallException was not thrown.' );
		} catch ( WikifunctionCallException $e ) {
			$this->assertSame( $e->getErrorMessageKey(), $errorMessageKey );
		}
	}

	public static function provideRemoteCall_errors() {
		$filePath = dirname( __DIR__, 2 ) . '/test_data/wikifunctions-call-errors.json';
		$fileData = json_decode( file_get_contents( $filePath ), true );

		foreach ( $fileData as $call ) {
			yield $call['description'] => [
				$call['request'], $call['status'], $call['body'], $call['error']
			];
		}
	}
}
