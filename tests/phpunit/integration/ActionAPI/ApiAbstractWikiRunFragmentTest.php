<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI;

use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiRequest;
use MediaWiki\Extension\WikiLambda\Jobs\CacheAbstractContentFragmentJob;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\Http\MWHttpRequest;
use MediaWiki\JobQueue\JobQueueGroup;
use MediaWiki\Tests\Api\ApiTestCase;
use StatusValue;
use Wikimedia\ObjectCache\BagOStuff;

/**
 * @coversNothing
 */
class ApiAbstractWikiRunFragmentTest extends ApiTestCase {

	protected function setUp(): void {
		parent::setUp();
		$this->overrideConfigValue( 'WikiLambdaClientTargetAPI', 'test.wikifunctions.org' );
	}

	/**
	 * Checks that when successfully querying the cache for the Abstract
	 * Content fragment rendered with today's date:
	 * * it returns the fresh cache value and returns immediately,
	 * * does not create a job to re-render the fragment,
	 * * does not make any remote call to wikilambda_function_call, and
	 * * does not overwrite the cache values.
	 */
	public function testSuccessfulFreshCacheHit() {
		// Parameters for abstractwiki_run_fragment
		$qid = 'Q42';
		$language = 'Z1002';
		$date = '26-7-2023';
		$fragment = '{"Z1K1":"Z89", "Z89K1":"<b>literal fragment</b>"}';

		// Mock fresh cache hit: fresh value is available
		$cache = $this->createMock( BagOStuff::class );

		// Mock cache key creation: when called with $date, return 'fresh-cache-key'
		$cache->method( 'makeKey' )
			->willReturnCallback( static function ( ...$args ) use ( $date ) {
				return ( count( $args ) === 5 ) && ( $args[3] === $date )
					? 'fresh-cache-key'
					: 'stale-cache-key';
			} );

		// Mock cache access: value is available for 'fresh-cache-key'
		$cache->expects( $this->once() )
			->method( 'get' )
			->with( 'fresh-cache-key' )
			->willReturn( '<b>fresh content</b>' );

		$this->setService( 'WikiLambdaZObjectStash', $cache );

		// Mock jobQueueGroup to assert that it never gets called
		$queue = $this->createMock( JobQueueGroup::class );
		$queue->expects( $this->never() )->method( 'lazyPush' );
		$this->setService( 'JobQueueGroup', $queue );

		// Mock AbstractWikiRequest to assert that it never gets called
		$awRequest = $this->createMock( AbstractWikiRequest::class );
		$awRequest->expects( $this->never() )->method( 'renderFragment' );
		$awRequest->expects( $this->never() )->method( 'cacheFreshAndStale' );
		$this->setService( 'AbstractWikiRequest', $awRequest );

		// Make request to abstractwiki_run_fragment
		$result = $this->doApiRequest( [
			'action' => 'abstractwiki_run_fragment',
			'abstractwiki_run_fragment_qid' => $qid,
			'abstractwiki_run_fragment_language' => $language,
			'abstractwiki_run_fragment_date' => $date,
			'abstractwiki_run_fragment_fragment' => $fragment,
		] )[0][ 'abstractwiki_run_fragment' ];

		$this->assertArrayHasKey( 'success', $result );
		$this->assertArrayHasKey( 'data', $result );
		$this->assertSame( '<b>fresh content</b>', $result[ 'data' ] );
	}

	/**
	 * Checks that when there is no value in the cache for the Abstract
	 * Content fragment rendered with today's date:
	 * * it gets stale content by removing the date from the cache key,
	 * * it creates a job to asynchronously re-render the fragment for today's date,
	 * * it returns the stale content and exits,
	 * * it does not run a synchronous call to wikilambda_function_call.
	 */
	public function testStaleWhileRevalidate() {
		// Parameters for abstractwiki_run_fragment
		$qid = 'Q42';
		$language = 'Z1002';
		$date = '26-7-2023';
		$fragment = '{"Z1K1":"Z89", "Z89K1":"<b>literal fragment</b>"}';
		$functionCall = $this->buildWrapperFunctionCall( $qid, $language, $date, $fragment );

		// Mock fresh cache hit: fresh value is available
		$cache = $this->createMock( BagOStuff::class );

		// Mock cache key creation: when called with $date, return 'fresh-cache-key'
		$cache->method( 'makeKey' )
			->willReturnCallback( static function ( ...$args ) use ( $date ) {
				return ( count( $args ) === 5 ) && ( $args[3] === $date )
					? 'fresh-cache-key'
					: 'stale-cache-key';
			} );

		// Mock cache access: miss for 'fresh-cache-key' but hit for 'stale-cache-key'
		$cache->method( 'get' )
			->willReturnCallback( static function ( $key ) {
				return ( $key === 'stale-cache-key' )
					? '<b>stale content</b>'
					: false;
			} );

		$this->setService( 'WikiLambdaZObjectStash', $cache );

		// Mock jobQueueGroup to assert that revalidate job is pushed to the queue
		$queue = $this->createMock( JobQueueGroup::class );
		$queue->expects( $this->once() )
			->method( 'lazyPush' )
			->with( $this->callback( function ( $job ) use ( $functionCall ) {
				// Assert that called job is the right type
				$this->assertInstanceOf( CacheAbstractContentFragmentJob::class, $job );
				// Assert that job was called with correct function call and cache keys
				$this->assertEquals( json_decode( $functionCall, true ), $job->getParams()[ 'functionCall' ] );
				$this->assertSame( 'fresh-cache-key', $job->getParams()[ 'cacheKeyFresh' ] );
				$this->assertSame( 'stale-cache-key', $job->getParams()[ 'cacheKeyStale' ] );
				return true;
			} ) );

		$this->setService( 'JobQueueGroup', $queue );

		// Mock AbstractWikiRequest to assert that it never gets called
		$awRequest = $this->createMock( AbstractWikiRequest::class );
		$awRequest->expects( $this->never() )->method( 'renderFragment' );
		$awRequest->expects( $this->never() )->method( 'cacheFreshAndStale' );
		$this->setService( 'AbstractWikiRequest', $awRequest );

		// Make request to abstractwiki_run_fragment
		$result = $this->doApiRequest( [
			'action' => 'abstractwiki_run_fragment',
			'abstractwiki_run_fragment_qid' => $qid,
			'abstractwiki_run_fragment_language' => $language,
			'abstractwiki_run_fragment_date' => $date,
			'abstractwiki_run_fragment_fragment' => $fragment,
		] )[0][ 'abstractwiki_run_fragment' ];

		$this->assertArrayHasKey( 'success', $result );
		$this->assertArrayHasKey( 'data', $result );
		$this->assertSame( '<b>stale content</b>', $result[ 'data' ] );
	}

	/**
	 * Checks that when there is no value in the cache for the Abstract
	 * Content fragment rendered with today's date and there is no cached
	 * stale value:
	 * * it makes a synchronous call to wikilambda_function_call to render
	 *   the fragment for today's date.
	 * * it caches the result under a key with today's date and,
	 * * it caches the result under a key without any date.
	 */
	public function testRequestRemoteCallAndCache() {
		// Parameters for abstractwiki_run_fragment
		$qid = 'Q42';
		$language = 'Z1002';
		$date = '26-7-2023';
		$fragment = '{"Z1K1":"Z89", "Z89K1":"<b>literal fragment</b>"}';

		// Mock fresh cache hit: fresh and stale values are miss
		$cache = $this->createMock( BagOStuff::class );
		$cache->method( 'makeKey' )
			->willReturnCallback( static function ( ...$args ) use ( $date ) {
				return ( count( $args ) === 5 ) && ( $args[3] === $date )
					? 'fresh-cache-key'
					: 'stale-cache-key';
			} );
		$cache->method( 'get' )->willReturn( false );
		$this->setService( 'WikiLambdaZObjectStash', $cache );

		// Mock jobQueueGroup to assert that it never gets called
		$queue = $this->createMock( JobQueueGroup::class );
		$queue->expects( $this->never() )->method( 'lazyPush' );
		$this->setService( 'JobQueueGroup', $queue );

		// Mock request to AbstractWikiRequest
		$functionCall = $this->buildWrapperFunctionCall( $qid, $language, $date, $fragment );
		$awRequest = $this->createMock( AbstractWikiRequest::class );
		$awRequest->expects( $this->once() )
			->method( 'renderFragment' )
			->with( json_decode( $functionCall, true ) )
			->willReturn( json_decode( $fragment, true ) );

		$sanitized = '<b>literal fragment</b>';
		$awRequest->expects( $this->once() )
			->method( 'cacheFreshAndStale' )
			->with( $sanitized, 'fresh-cache-key', 'stale-cache-key' );

		$this->setService( 'AbstractWikiRequest', $awRequest );

		// Make request to abstractwiki_run_fragment
		$result = $this->doApiRequest( [
			'action' => 'abstractwiki_run_fragment',
			'abstractwiki_run_fragment_qid' => $qid,
			'abstractwiki_run_fragment_language' => $language,
			'abstractwiki_run_fragment_date' => $date,
			'abstractwiki_run_fragment_fragment' => $fragment,
		] )[0][ 'abstractwiki_run_fragment' ];

		$this->assertArrayHasKey( 'success', $result );
		$this->assertArrayHasKey( 'data', $result );
		$this->assertSame( '<b>literal fragment</b>', $result[ 'data' ] );
	}

	/**
	 * Checks that when there is no value in the cache for the Abstract
	 * Content fragment rendered with today's date and there is no cached
	 * stale value:
	 * * it makes a call remote call to wikilambda_function_call
	 *   to run a function call to the Z825 function, with the right
	 *   Z825K1, Z825K2 and Z825K3 arguments.
	 */
	public function testRequestRemoteCall() {
		// Parameters for abstractwiki_run_fragment
		$qid = 'Q42';
		$language = 'Z1002';
		$date = '26-7-2023';
		$fragment = '{"Z1K1":"Z89", "Z89K1":"<b>literal fragment</b>"}';

		// Mock fresh cache hit: fresh and stale values are miss
		$cache = $this->createMock( BagOStuff::class );
		$cache->method( 'makeKey' )->willReturn( 'some-pointless-key' );
		$cache->method( 'get' )->willReturn( false );
		$this->setService( 'WikiLambdaZObjectStash', $cache );

		// Mock jobQueueGroup to assert that it never gets called
		$queue = $this->createMock( JobQueueGroup::class );
		$queue->expects( $this->never() )->method( 'lazyPush' );
		$this->setService( 'JobQueueGroup', $queue );

		// Mock request to wikilambda_function_call
		$functionCall = $this->buildWrapperFunctionCall( $qid, $language, $date, $fragment );
		$factory = $this->getMockHttpRequestFactory( $functionCall, $fragment );
		$this->setService( 'HttpRequestFactory', $factory );

		// Make request to abstractwiki_run_fragment
		$result = $this->doApiRequest( [
			'action' => 'abstractwiki_run_fragment',
			'abstractwiki_run_fragment_qid' => $qid,
			'abstractwiki_run_fragment_language' => $language,
			'abstractwiki_run_fragment_date' => $date,
			'abstractwiki_run_fragment_fragment' => $fragment,
		] )[0][ 'abstractwiki_run_fragment' ];

		$this->assertArrayHasKey( 'success', $result );
		$this->assertArrayHasKey( 'data', $result );
		$this->assertSame( '<b>literal fragment</b>', $result[ 'data' ] );
	}

	/**
	 * Helper function to mock HttpRequestFactory:
	 * * expects wikilambda_function_call to be called with the given function call
	 * * mocks the response to be the given function call response
	 *
	 * @param string $functionCall
	 * @param string $functionCallResponse
	 * @return HttpRequestFactory
	 */
	private function getMockHttpRequestFactory( $functionCall, $functionCallResponse ) {
		$apiResponse = json_encode( [
			'wikilambda_function_call' => [
				'data' => json_encode( [
					'Z22K1' => json_decode( $functionCallResponse ),
					'Z22K2' => [ 'returned metadata is ignored' ]
				] ) ]
		] );

		// Mock MWHttpRequest that returns a successful response
		$request = $this->createMock( MWHttpRequest::class );
		$request->method( 'execute' )->willReturn( StatusValue::newGood() );
		$request->method( 'getContent' )->willReturn( $apiResponse );

		// Mock HttpRequestFactory and assert the expected request
		$expectedUri = 'test.wikifunctions.org/w/api.php';
		$expectedPaylod = [
			'method' => 'POST',
			'postData' => [
				'format' => 'json',
				'action' => 'wikilambda_function_call',
				'wikilambda_function_call_zobject' => json_encode( json_decode( $functionCall ) )
			]
		];

		$factory = $this->createMock( HttpRequestFactory::class );
		$factory
			->expects( $this->once() )
			->method( 'create' )
			->with( $expectedUri, $expectedPaylod )
			->willReturn( $request );

		return $factory;
	}

	/**
	 * Helper function to wrap a fragment in a function call to the Z825 function
	 *
	 * @param string $qid
	 * @param string $language
	 * @param string $date
	 * @param string $fragment
	 * @return string
	 */
	private function buildWrapperFunctionCall( $qid, $language, $date, $fragment ) {
		return '{"Z1K1":"Z7",'
			. '"Z7K1":{"Z1K1":"Z8",'
			. '"Z8K1":["Z17",'
			. '{"Z1K1":"Z17","Z17K1":"Z6091","Z17K2":"Z825K1","Z17K3":{"Z1K1":"Z12","Z12K1":["Z11",'
			. '{"Z1K1":"Z11","Z11K1":"Z1002","Z11K2":"wikidata item reference"}]}},'
			. '{"Z1K1":"Z17","Z17K1":"Z60","Z17K2":"Z825K2","Z17K3":{"Z1K1":"Z12","Z12K1":["Z11",'
			. '{"Z1K1":"Z11","Z11K1":"Z1002","Z11K2":"language"}]}},'
			. '{"Z1K1":"Z17","Z17K1":"Z20420","Z17K2":"Z825K3","Z17K3":{"Z1K1":"Z12","Z12K1":["Z11",'
			. '{"Z1K1":"Z11","Z11K1":"Z1002","Z11K2":"date"}]}}],'
			. '"Z8K2":"Z89",'
			. '"Z8K3":["Z20"],'
			. '"Z8K4":["Z14",{"Z1K1":"Z14","Z14K1":"Z825","Z14K2":' . $fragment . '}],'
			. '"Z8K5":"Z825"},'
			. '"Z825K1":{"Z1K1":"Z6091","Z6091K1":"' . $qid . '"},'
			. '"Z825K2":"' . $language . '",'
			. '"Z825K3":{"Z1K1":"Z7","Z7K1":"Z20808","Z20808K1":"' . $date . '","Z20808K2":"' . $language . '"}}';
	}
}
