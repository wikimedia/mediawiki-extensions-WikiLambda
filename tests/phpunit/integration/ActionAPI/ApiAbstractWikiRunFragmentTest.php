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
use MediaWiki\Permissions\SimpleAuthority;
use MediaWiki\Tests\Api\ApiTestCase;
use MediaWiki\User\UserIdentityValue;
use Wikimedia\Timestamp\ConvertibleTimestamp;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\ApiAbstractWikiRunFragment
 */
class ApiAbstractWikiRunFragmentTest extends ApiTestCase {

	public WikifunctionsLanguageFactory $langFactory;

	protected function setUp(): void {
		parent::setUp();

		$this->overrideConfigValue( 'WikiLambdaClientTargetAPI', 'test.wikifunctions.org' );
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractMode', true );

		$this->setMwGlobals( 'wgWikiLambdaEnableAbstractMode', true );
		\MediaWiki\Extension\WikiLambda\HookHandler\RepoHooks::registerExtension();

		// Mock language service and wire up
		$this->langFactory = $this->createWikifunctionsLanguageFactoryMock();
		$this->setService( 'WikifunctionsLanguageFactory', $this->langFactory );

		// Set fake timestamp
		ConvertibleTimestamp::setFakeTime( '2023-07-26T04:05:00Z' );
	}

	protected function tearDown(): void {
		parent::tearDown();

		// Reset timestamp
		ConvertibleTimestamp::setFakeTime( false );
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
				$args['language'],
				$args['datetime'],
				$args['revalidate'] ?? false
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
		$datetime = '20230726040500';
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
		$storedFragment = new AWFragment( $fragmentKey, $qid, $language->getCode() );
		$storedFragment->setValue( $storedValue, AWFragment::AVAILABILITY_FRESH );
		$fragmentStore = $this->createMockFragmentStoreForGetter( [
			'topicQid' => $qid,
			'language' => $language,
			'datetime' => $datetime,
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
		$datetime = '20230726040500';
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
		$storedFragment = new AWFragment( $fragmentKey, $qid, $language->getCode() );
		$storedFragment->setValue( $storedValue, AWFragment::AVAILABILITY_STALE );
		$fragmentStore = $this->createMockFragmentStoreForGetter( [
			'topicQid' => $qid,
			'language' => $language,
			'datetime' => $datetime,
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
		$datetime = '20230726040500';
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
		$missingFragment = new AWFragment( $fragmentKey, $qid, $language->getCode() );
		$fragmentStore = $this->createMockFragmentStoreForGetter( [
			'topicQid' => $qid,
			'language' => $language,
			'datetime' => $datetime,
			'fragment' => $fragment,
		], $missingFragment );
		$this->setService( 'AbstractWikiFragmentStore', $fragmentStore );

		// Mock request to AbstractWikiRequest::fetchRenderedAWFragment
		$awRequest = $this->createMock( AbstractWikiRequest::class );
		$awRequest->expects( $this->once() )
			->method( 'fetchRenderedAWFragment' )
			->with( $fragment, $qid, $languageZid, $datetime, $fragmentKey )
			->willReturn( $renderedFragment );
		$this->setService( 'AbstractWikiRequest', $awRequest );

		// Make request to abstractwiki_run_fragment
		$result = $this->doApiRequest( [
			'action' => 'abstractwiki_run_fragment',
			'abstractwiki_run_fragment_qid' => $qid,
			'abstractwiki_run_fragment_language' => $languageZid,
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
		$datetime = '20230726040500';
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
		$missingFragment = new AWFragment( $fragmentKey, $qid, $language->getCode() );
		$fragmentStore = $this->createMockFragmentStoreForGetter( [
			'topicQid' => $qid,
			'language' => $language,
			'datetime' => $datetime,
			'fragment' => $fragment,
			'revalidate' => true
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
			'abstractwiki_run_fragment_fragment' => '{"Z1K1":"Z89","Z89K1":"test"}',
		] );
	}

	// ------------------------------------------------------------------
	// Authorization of the synchronous render
	// ------------------------------------------------------------------

	/**
	 * An anonymous authority, as in the report.
	 *
	 * @return SimpleAuthority
	 */
	private function anonymousAuthority(): SimpleAuthority {
		return new SimpleAuthority( new UserIdentityValue( 0, '127.0.0.1' ), [] );
	}

	/**
	 * Running a missing fragment here and now needs the
	 * wikilambda-abstract-run-unsaved-fragment right, so an authority without it is
	 * refused and nothing is sent to render.
	 */
	public function testExecute_diesWithoutRightWhenRenderingSynchronously() {
		$qid = 'Q42';
		$languageZid = 'Z1002';
		$language = $this->langFactory->getLanguageFromZid( $languageZid );
		$fragmentStr = '{"Z1K1":"Z89", "Z89K1":"<b>literal fragment</b>"}';
		$fragment = json_decode( $fragmentStr, true );

		// Mock fragment store: returns a missing fragment, so the API would render it
		$missingFragment = new AWFragment( 'some-fragment-key', $qid, $language->getCode() );
		$fragmentStore = $this->createMockFragmentStoreForGetter( [
			'topicQid' => $qid,
			'language' => $language,
			'datetime' => '20230726040500',
			'fragment' => $fragment,
		], $missingFragment );
		$this->setService( 'AbstractWikiFragmentStore', $fragmentStore );

		// Mock AbstractWikiRequest to assert that we send nothing to render
		$awRequest = $this->createMock( AbstractWikiRequest::class );
		$awRequest->expects( $this->never() )->method( 'fetchRenderedAWFragment' );
		$this->setService( 'AbstractWikiRequest', $awRequest );

		$this->expectApiErrorCode( 'permissiondenied' );

		$this->doApiRequest( [
			'action' => 'abstractwiki_run_fragment',
			'abstractwiki_run_fragment_qid' => $qid,
			'abstractwiki_run_fragment_language' => $languageZid,
			'abstractwiki_run_fragment_fragment' => $fragmentStr,
		], null, false, $this->anonymousAuthority() );
	}

	/**
	 * Reading a stored fragment sends nothing, so it stays available to an authority
	 * with no rights. An article view renders through this path.
	 */
	public function testExecute_storedFragmentIsAllowedWithoutRight() {
		$qid = 'Q42';
		$languageZid = 'Z1002';
		$language = $this->langFactory->getLanguageFromZid( $languageZid );
		$fragmentStr = '{"Z1K1":"Z89", "Z89K1":"<b>literal fragment</b>"}';
		$fragment = json_decode( $fragmentStr, true );

		$storedFragment = new AWFragment( 'some-fragment-key', $qid, $language->getCode() );
		$storedFragment->setValue(
			[ 'success' => true, 'value' => '<b>fresh content</b>' ],
			AWFragment::AVAILABILITY_FRESH
		);
		$fragmentStore = $this->createMockFragmentStoreForGetter( [
			'topicQid' => $qid,
			'language' => $language,
			'datetime' => '20230726040500',
			'fragment' => $fragment,
		], $storedFragment );
		$this->setService( 'AbstractWikiFragmentStore', $fragmentStore );

		$awRequest = $this->createMock( AbstractWikiRequest::class );
		$awRequest->expects( $this->never() )->method( 'fetchRenderedAWFragment' );
		$this->setService( 'AbstractWikiRequest', $awRequest );

		$result = $this->doApiRequest( [
			'action' => 'abstractwiki_run_fragment',
			'abstractwiki_run_fragment_qid' => $qid,
			'abstractwiki_run_fragment_language' => $languageZid,
			'abstractwiki_run_fragment_fragment' => $fragmentStr,
		], null, false, $this->anonymousAuthority() )[0][ 'abstractwiki_run_fragment' ];

		$this->assertTrue( $result[ 'success' ] );
		$this->assertSame( '<b>fresh content</b>', $result[ 'value' ] );
	}

	/**
	 * The asynchronous path only queues a job, which an article view does as well, so
	 * it stays available to an authority with no rights.
	 */
	public function testExecute_asyncRequestIsAllowedWithoutRight() {
		$qid = 'Q42';
		$languageZid = 'Z1002';
		$language = $this->langFactory->getLanguageFromZid( $languageZid );
		$fragmentStr = '{"Z1K1":"Z89", "Z89K1":"<b>literal fragment</b>"}';
		$fragment = json_decode( $fragmentStr, true );

		$missingFragment = new AWFragment( 'some-fragment-key', $qid, $language->getCode() );
		$fragmentStore = $this->createMockFragmentStoreForGetter( [
			'topicQid' => $qid,
			'language' => $language,
			'datetime' => '20230726040500',
			'fragment' => $fragment,
			'revalidate' => true,
		], $missingFragment );
		$this->setService( 'AbstractWikiFragmentStore', $fragmentStore );

		$awRequest = $this->createMock( AbstractWikiRequest::class );
		$awRequest->expects( $this->never() )->method( 'fetchRenderedAWFragment' );
		$this->setService( 'AbstractWikiRequest', $awRequest );

		$result = $this->doApiRequest( [
			'action' => 'abstractwiki_run_fragment',
			'abstractwiki_run_fragment_qid' => $qid,
			'abstractwiki_run_fragment_language' => $languageZid,
			'abstractwiki_run_fragment_fragment' => $fragmentStr,
			'abstractwiki_run_fragment_async' => true,
		], null, false, $this->anonymousAuthority() )[0][ 'abstractwiki_run_fragment' ];

		$this->assertTrue( $result[ 'success' ] );
		$this->assertTrue( $result[ 'pending' ] );
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
			'abstractwiki_run_fragment_fragment' => 'not-valid-json{{{',
		] );
	}

	/**
	 * When the cached result is a failure, the API should not die with
	 * ApiUsageException, but instead return a succesful response with
	 * a failing fragment
	 */
	public function testExecute_diesWhenCachedResultIsFailure() {
		$qid = 'Q42';
		$datetime = '20230726040500';
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
		$storedFragment = new AWFragment( $fragmentKey, $qid, $language->getCode() );
		$storedFragment->setValue( $failureValue, AWFragment::AVAILABILITY_FRESH );
		$fragmentStore = $this->createMockFragmentStoreForGetter( [
			'topicQid' => $qid,
			'language' => $language,
			'datetime' => $datetime,
			'fragment' => $fragment,
		], $storedFragment );
		$this->setService( 'AbstractWikiFragmentStore', $fragmentStore );

		$result = $this->doApiRequest( [
			'action' => 'abstractwiki_run_fragment',
			'abstractwiki_run_fragment_qid' => $qid,
			'abstractwiki_run_fragment_language' => $languageZid,
			'abstractwiki_run_fragment_fragment' => $fragmentStr,
		] )[0][ 'abstractwiki_run_fragment' ];

		$this->assertArrayHasKey( 'success', $result );
		$this->assertArrayHasKey( 'value', $result );
		$this->assertFalse( $result[ 'success' ] );
		$this->assertEquals( $failureValue[ 'value' ], $result[ 'value' ] );
	}
}
