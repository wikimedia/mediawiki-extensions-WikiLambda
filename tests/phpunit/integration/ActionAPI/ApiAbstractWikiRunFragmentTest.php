<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI;

use MediaWiki\Api\ApiUsageException;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiRequest;
use MediaWiki\Extension\WikiLambda\AWStorage\AWFragment;
use MediaWiki\Extension\WikiLambda\AWStorage\AWFragmentStore;
use MediaWiki\Extension\WikiLambda\Language\WikifunctionsLanguage;
use MediaWiki\Extension\WikiLambda\Language\WikifunctionsLanguageFactory;
use MediaWiki\Tests\Api\ApiTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\ApiAbstractWikiRunFragment
 */
class ApiAbstractWikiRunFragmentTest extends ApiTestCase {

	public WikifunctionsLanguageFactory $langFactory;

	protected function setUp(): void {
		parent::setUp();

		$this->overrideConfigValue( 'WikiLambdaClientTargetAPI', 'test.wikifunctions.org' );

		// Mock language service and wire up
		$this->langFactory = $this->createWikifunctionsLanguageFactoryMock();
		$this->setService( 'WikifunctionsLanguageFactory', $this->langFactory );
	}

	private function createWikifunctionsLanguageFactoryMock(): WikifunctionsLanguageFactory {
		$enLang = $this->getServiceContainer()->getLanguageFactory()->getLanguage( 'en' );
		$enWfLang = new WikifunctionsLanguage( $enLang, 'Z1002' );

		$langFactory = $this->createMock( WikifunctionsLanguageFactory::class );

		$langFactory->method( 'getLanguageFromZid' )
		->with( 'Z1002' )
		->willReturn( $enWfLang );

		return $langFactory;
	}

	/**
	 * Build a mock AWFragmentStore that captures one call
	 * to the store getter with the given arguments.
	 *
	 * @param array $args
	 * @param AWFragment $output
	 * @return AWFragmentStore
	 */
	private function createMockFragmentStoreForGetter( $args, $output ): AWFragmentStore {
		$fragmentStore = $this->createMock( AWFragmentStore::class );

		$fragmentStore->expects( $this->once() )
			->method( 'getRenderedAWFragment' )
			->with(
				$args['fragment'],
				$args['topicQid'],
				$args[ 'language'],
				$args['date'],
			)
			->willReturn( $output );

		return $fragmentStore;
	}

	/**
	 * When requested a fragment that is available in the AWFragment store:
	 * * returns the stored value
	 * * does not make any remote call to wikilambda_function_call
	 */
	public function testStoredFreshAWFragment() {
		// Parameters for abstractwiki_run_fragment
		$qid = 'Q42';
		$date = '26-7-2023';
		$languageZid = 'Z1002';
		$language = $this->langFactory->getLanguageFromZid( $languageZid );
		// Fragment
		$fragmentStr = '{"Z1K1":"Z89", "Z89K1":"<b>literal fragment</b>"}';
		$fragmentKey = 'some-fragment-key';
		$fragment = json_decode( $fragmentStr, true );
		// Response
		$storedValue = [
			'success' => true,
			'value' => '<b>fresh content</b>'
		];

		// Mock fragment store: returns fresh value
		$storedFragment = new AWFragment( $fragmentKey, $qid, $language->getCode(), $date );
		$storedFragment->setValue( $storedValue, AWFragment::AVAILABILITY_FRESH );
		$fragmentStore = $this->createMockFragmentStoreForGetter( [
			'topicQid' => $qid,
			'language' => $language,
			'date' => $date,
			'fragment' => $fragment,
		], $storedFragment );
		$this->setService( 'AbstractWikiFragmentStore', $fragmentStore );

		// Mock AbstractWikiRequest to assert that it never gets called
		$awRequest = $this->createMock( AbstractWikiRequest::class );
		$awRequest->expects( $this->never() )->method( 'fetchRenderedAWFragment' );
		$this->setService( 'AbstractWikiRequest', $awRequest );

		// Make request to abstractwiki_run_fragment
		$result = $this->doApiRequest( [
			'action' => 'abstractwiki_run_fragment',
			'abstractwiki_run_fragment_qid' => $qid,
			'abstractwiki_run_fragment_language' => $languageZid,
			'abstractwiki_run_fragment_date' => $date,
			'abstractwiki_run_fragment_fragment' => $fragmentStr,
		] )[0][ 'abstractwiki_run_fragment' ];

		$this->assertArrayHasKey( 'success', $result );
		$this->assertArrayHasKey( 'value', $result );
		$this->assertTrue( $result[ 'success' ] );
		$this->assertSame( '<b>fresh content</b>', $result[ 'value' ] );
	}

	/**
	 * When requested a fragment that is available in the AWFragment store
	 * but the value is stale:
	 * * returns the stored value (stale)
	 * * does not make any remote call to wikilambda_function_call
	 */
	public function testStoredStaleAWFragment() {
		$qid = 'Q42';
		$date = '26-7-2023';
		$languageZid = 'Z1002';
		$language = $this->langFactory->getLanguageFromZid( $languageZid );
		// Fragment
		$fragmentStr = '{"Z1K1":"Z89", "Z89K1":"<b>literal fragment</b>"}';
		$fragmentKey = 'some-fragment-key';
		$fragment = json_decode( $fragmentStr, true );
		// Response
		$storedValue = [
			'success' => true,
			'value' => '<b>stale content</b>'
		];

		// Mock fragment store: returns stale value
		$storedFragment = new AWFragment( $fragmentKey, $qid, $language->getCode(), $date );
		$storedFragment->setValue( $storedValue, AWFragment::AVAILABILITY_STALE );
		$fragmentStore = $this->createMockFragmentStoreForGetter( [
			'topicQid' => $qid,
			'language' => $language,
			'date' => $date,
			'fragment' => $fragment,
		], $storedFragment );
		$this->setService( 'AbstractWikiFragmentStore', $fragmentStore );

		// Mock AbstractWikiRequest to assert that it never gets called
		$awRequest = $this->createMock( AbstractWikiRequest::class );
		$awRequest->expects( $this->never() )->method( 'fetchRenderedAWFragment' );
		$this->setService( 'AbstractWikiRequest', $awRequest );

		// Make request to abstractwiki_run_fragment
		$result = $this->doApiRequest( [
			'action' => 'abstractwiki_run_fragment',
			'abstractwiki_run_fragment_qid' => $qid,
			'abstractwiki_run_fragment_language' => $languageZid,
			'abstractwiki_run_fragment_date' => $date,
			'abstractwiki_run_fragment_fragment' => $fragmentStr,
		] )[0][ 'abstractwiki_run_fragment' ];

		$this->assertArrayHasKey( 'success', $result );
		$this->assertArrayHasKey( 'value', $result );
		$this->assertTrue( $result[ 'success' ] );
		$this->assertSame( '<b>stale content</b>', $result[ 'value' ] );
	}

	/**
	 * When requested a fragment that is missing from the AWFragment store, and
	 * async=false (default value)
	 * * it makes a synchronous call to AbstractWikiRequest::fetchRenderedAWFragment
	 *   to run in Wikifunctions the given fragment for today's date.
	 */
	public function testMissingAWFragmentSync() {
		$qid = 'Q42';
		$date = '26-7-2023';
		$languageZid = 'Z1002';
		$language = $this->langFactory->getLanguageFromZid( $languageZid );
		// Fragment
		$fragmentStr = '{"Z1K1":"Z89", "Z89K1":"<b>literal fragment</b>"}';
		$fragmentKey = 'some-fragment-key';
		$fragment = json_decode( $fragmentStr, true );
		// Response
		$renderedFragment = [
			'success' => true,
			'value' => '<b>rendered fragment</b>'
		];

		// Mock fragment store: returns missing fragment value
		$missingFragment = new AWFragment( $fragmentKey, $qid, $language->getCode(), $date );
		$fragmentStore = $this->createMockFragmentStoreForGetter( [
			'topicQid' => $qid,
			'language' => $language,
			'date' => $date,
			'fragment' => $fragment,
		], $missingFragment );
		$this->setService( 'AbstractWikiFragmentStore', $fragmentStore );

		// Mock request to AbstractWikiRequest::fetchRenderedAWFragment
		$awRequest = $this->createMock( AbstractWikiRequest::class );
		$awRequest->expects( $this->once() )
			->method( 'fetchRenderedAWFragment' )
			->with( $fragment, $qid, $languageZid, $date, $fragmentKey )
			->willReturn( $renderedFragment );
		$this->setService( 'AbstractWikiRequest', $awRequest );

		// Make request to abstractwiki_run_fragment
		$result = $this->doApiRequest( [
			'action' => 'abstractwiki_run_fragment',
			'abstractwiki_run_fragment_qid' => $qid,
			'abstractwiki_run_fragment_language' => $languageZid,
			'abstractwiki_run_fragment_date' => $date,
			'abstractwiki_run_fragment_fragment' => $fragmentStr,
		] )[0][ 'abstractwiki_run_fragment' ];

		$this->assertArrayHasKey( 'success', $result );
		$this->assertArrayHasKey( 'value', $result );
		$this->assertTrue( $result[ 'success' ] );
		$this->assertSame( '<b>rendered fragment</b>', $result[ 'value' ] );
	}

	/**
	 * When requested a fragment that is missing from the AWFragment store, and
	 * async=true
	 * * it makes not call to AbstractWikiRequest::fetchRenderedAWFragment
	 * * it returns a "pending" html fragment
	 */
	public function testMissingAWFragmentAsync() {
		$qid = 'Q42';
		$date = '26-7-2023';
		$languageZid = 'Z1002';
		$language = $this->langFactory->getLanguageFromZid( $languageZid );
		// Fragment
		$fragmentStr = '{"Z1K1":"Z89", "Z89K1":"<b>literal fragment</b>"}';
		$fragmentKey = 'some-fragment-key';
		$fragment = json_decode( $fragmentStr, true );
		// Response
		$renderedFragment = [
			'success' => true,
			'value' => '<b>rendered fragment</b>'
		];

		// Mock fragment store: returns missing fragment value
		$missingFragment = new AWFragment( $fragmentKey, $qid, $language->getCode(), $date );
		$fragmentStore = $this->createMockFragmentStoreForGetter( [
			'topicQid' => $qid,
			'language' => $language,
			'date' => $date,
			'fragment' => $fragment,
		], $missingFragment );
		$this->setService( 'AbstractWikiFragmentStore', $fragmentStore );

		// Mock AbstractWikiRequest to assert that it never gets called
		$awRequest = $this->createMock( AbstractWikiRequest::class );
		$awRequest->expects( $this->never() )->method( 'fetchRenderedAWFragment' );
		$this->setService( 'AbstractWikiRequest', $awRequest );

		// Make request to abstractwiki_run_fragment
		$result = $this->doApiRequest( [
			'action' => 'abstractwiki_run_fragment',
			'abstractwiki_run_fragment_qid' => $qid,
			'abstractwiki_run_fragment_language' => $languageZid,
			'abstractwiki_run_fragment_date' => $date,
			'abstractwiki_run_fragment_fragment' => $fragmentStr,
			'abstractwiki_run_fragment_async' => true,
		] )[0][ 'abstractwiki_run_fragment' ];

		$this->assertArrayHasKey( 'success', $result );
		$this->assertArrayHasKey( 'pending', $result );
		$this->assertTrue( $result[ 'success' ] );
		$this->assertTrue( $result[ 'pending' ] );
	}

	// ------------------------------------------------------------------
	// Error branches in execute()
	// ------------------------------------------------------------------

	/**
	 * When abstract mode is disabled, the API should die with HTTP 501.
	 */
	public function testExecute_diesWhenAbstractModeDisabled() {
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractMode', false );

		$this->expectException( ApiUsageException::class );

		$this->doApiRequest( [
			'action' => 'abstractwiki_run_fragment',
			'abstractwiki_run_fragment_qid' => 'Q42',
			'abstractwiki_run_fragment_language' => 'Z1002',
			'abstractwiki_run_fragment_date' => '26-7-2023',
			'abstractwiki_run_fragment_fragment' => '{"Z1K1":"Z89","Z89K1":"test"}',
		] );
	}

	/**
	 * When the fragment parameter is not valid JSON, the API should die with HTTP 400.
	 */
	public function testExecute_diesForInvalidFragmentJson() {
		$this->expectException( ApiUsageException::class );

		$this->doApiRequest( [
			'action' => 'abstractwiki_run_fragment',
			'abstractwiki_run_fragment_qid' => 'Q42',
			'abstractwiki_run_fragment_language' => 'Z1002',
			'abstractwiki_run_fragment_date' => '26-7-2023',
			'abstractwiki_run_fragment_fragment' => 'not-valid-json{{{',
		] );
	}

	/**
	 * When the cached result is a failure, the API should die with the
	 * WikifunctionCallException's error data.
	 */
	public function testExecute_diesWhenCachedResultIsFailure() {
		$qid = 'Q42';
		$date = '26-7-2023';
		$languageZid = 'Z1002';
		$language = $this->langFactory->getLanguageFromZid( $languageZid );
		// Fragment
		$fragmentStr = '{"Z1K1":"Z89", "Z89K1":"<b>bad fragment</b>"}';
		$fragmentKey = 'some-fragment-key';
		$fragment = json_decode( $fragmentStr, true );
		// Response
		$failureValue = [
			'success' => false,
			'value' => [
				'msg' => 'wikilambda-functioncall-error-message',
				'httpStatusCode' => 400,
				'zerror' => null,
				'params' => [],
			]
		];

		// Mock fragment store: returns fresh value with error
		$storedFragment = new AWFragment( $fragmentKey, $qid, $language->getCode(), $date );
		$storedFragment->setValue( $failureValue, AWFragment::AVAILABILITY_FRESH );
		$fragmentStore = $this->createMockFragmentStoreForGetter( [
			'topicQid' => $qid,
			'language' => $language,
			'date' => $date,
			'fragment' => $fragment,
		], $storedFragment );
		$this->setService( 'AbstractWikiFragmentStore', $fragmentStore );

		$this->expectException( ApiUsageException::class );

		$this->doApiRequest( [
			'action' => 'abstractwiki_run_fragment',
			'abstractwiki_run_fragment_qid' => $qid,
			'abstractwiki_run_fragment_language' => $languageZid,
			'abstractwiki_run_fragment_date' => $date,
			'abstractwiki_run_fragment_fragment' => $fragmentStr
		] );
	}
}
