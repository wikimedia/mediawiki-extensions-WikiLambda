<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI;

use MediaWiki\Api\ApiBase;
use MediaWiki\Api\ApiMain;
use MediaWiki\Api\ApiUsageException;
use MediaWiki\Content\IContentHandlerFactory;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContentHandler;
use MediaWiki\Extension\WikiLambda\AWStorage\AWFragment;
use MediaWiki\Extension\WikiLambda\AWStorage\AWFragmentStore;
use MediaWiki\Extension\WikiLambda\Language\WikifunctionsLanguage;
use MediaWiki\Extension\WikiLambda\Language\WikifunctionsLanguageFactory;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Tests\Api\ApiTestCase;
use MediaWiki\Title\Title;
use MediaWiki\Title\TitleFactory;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\ApiAbstractWikiFetchSection
 * @group Database
 */
class ApiAbstractWikiFetchSectionTest extends ApiTestCase {

	public WikifunctionsLanguageFactory $langFactory;

	protected function setUp(): void {
		parent::setUp();

		$this->overrideConfigValue( 'WikiLambdaEnableAbstractMode', true );

		$this->langFactory = $this->createWikifunctionsLanguageFactoryMock();
		$this->setService( 'WikifunctionsLanguageFactory', $this->langFactory );
	}

	private function createWikifunctionsLanguageFactoryMock(): WikifunctionsLanguageFactory {
		$enLang = $this->getServiceContainer()->getLanguageFactory()->getLanguage( 'en' );
		$enWfLang = new WikifunctionsLanguage( $enLang, 'Z1002' );

		$langFactory = $this->createMock( WikifunctionsLanguageFactory::class );
		$langFactory
			->method( 'getLanguageFromZid' )
			->with( 'Z1002' )
			->willReturn( $enWfLang );

		return $langFactory;
	}

	private function createMockFragmentStore( array $fragmentsAndOutputs ): AWFragmentStore {
		$fragmentStore = $this->createMock( AWFragmentStore::class );

		$fragmentStore
			->expects( $this->exactly( count( $fragmentsAndOutputs ) ) )
			->method( 'getRenderedAWFragment' )
			->willReturnCallback( function ( $fragment ) use ( $fragmentsAndOutputs ) {
				foreach ( $fragmentsAndOutputs as [ $expectedFragment, $output ] ) {
					if ( $fragment === $expectedFragment ) {
						return $output;
					}
				}
				$this->fail( 'Unexpected fragment: ' . json_encode( $fragment ) );
			} );

		return $fragmentStore;
	}

	private function createMockContentHandlerFactory( string $awJson ): IContentHandlerFactory {
		$awContent = new AbstractWikiContent( $awJson );

		$contentHandler = $this->createMock( AbstractWikiContentHandler::class );
		$contentHandler
			->method( 'getAbstractContentForTitle' )
			->willReturn( $awContent );

		$factory = $this->createMock( IContentHandlerFactory::class );
		$factory
			->method( 'getContentHandler' )
			->with( CONTENT_MODEL_ABSTRACT )
			->willReturn( $contentHandler );

		return $factory;
	}

	private function createMockTitleFactory( string $qid ): TitleFactory {
		$title = $this->createMock( Title::class );
		$title->method( 'exists' )->willReturn( true );

		$titleFactory = $this->createMock( TitleFactory::class );
		$titleFactory->method( 'newFromText' )->willReturn( $title );

		return $titleFactory;
	}

	// Helper functions
	// ================

	private function makeFragment( $qid, $date, $lang, $value = null, $availability = null ): AWFragment {
		$fragment = new AWFragment( 'arbitrary-key', $qid, $lang, $date );
		if ( $value ) {
			$fragment->setValue( $value, $availability ?? AWFragment::AVAILABILITY_FRESH );
		}
		return $fragment;
	}

	/**
	 * Performs a request supplying a CSRF token under this module's prefixed
	 * token parameter. doApiRequestWithToken() only injects the unprefixed
	 * 'token', which the module's 'abstractwiki_fetch_section_' parameter
	 * prefix does not match, so we mint a token in a session and reuse that
	 * session for the request.
	 *
	 * @param array $params
	 * @return array
	 */
	private function doFetchSectionRequestWithToken( array $params ): array {
		[ $tokenData, , $session ] = $this->doApiRequest( [
			'action' => 'query',
			'meta' => 'tokens',
			'type' => 'csrf',
		] );
		$params['abstractwiki_fetch_section_token'] = $tokenData['query']['tokens']['csrftoken'];
		return $this->doApiRequest( $params, $session );
	}

	/**
	 * Builds the action module bound to a FauxRequest carrying the given params,
	 * so its HTTP-method declarations (mustBePosted/needsToken), which read the
	 * raw request, can be asserted directly. doApiRequest() runs FauxRequests in
	 * internal mode, which skips the mustBePosted gate, so we exercise the module
	 * contract rather than the full pipeline.
	 *
	 * @param array $params
	 * @return ApiBase
	 */
	private function getFetchSectionModuleForParams( array $params ): ApiBase {
		$context = new RequestContext();
		$context->setRequest( new FauxRequest( $params ) );
		$context->setUser( $this->getTestUser()->getUser() );
		$main = new ApiMain( $context );
		return $main->getModuleManager()->getModule( 'abstractwiki_fetch_section' );
	}

	// Request stored content
	// ======================

	public function testFetchSection_freshFragment(): void {
		$qid = 'Q42';
		$section = 'Q8776414';
		$date = '2026-01-01';
		$lang = 'en';

		$fragment = [ 'Z1K1' => 'Z89', 'Z89K1' => '<b>literal</b>' ];
		$value = [ 'success' => true, 'value' => '<b>fresh content</b>' ];

		$awJson = '{ "qid": "' . $qid . '", "sections": {'
			. ' "' . $section . '": { "index": 0,'
			. ' "fragments": [ "Z89",'
			. json_encode( $fragment ) . ' ] } } }';

		$mockContentHandlerFactory = $this->createMockContentHandlerFactory( $awJson );
		$this->setService( 'ContentHandlerFactory', $mockContentHandlerFactory );

		$mockTitleFactory = $this->createMockTitleFactory( $qid );
		$this->setService( 'TitleFactory', $mockTitleFactory );

		$storedFragment = $this->makeFragment( $qid, $date, $lang, $value, AWFragment::AVAILABILITY_FRESH );
		$fragmentStore = $this->createMockFragmentStore( [ [ $fragment, $storedFragment ] ] );
		$this->setService( 'AbstractWikiFragmentStore', $fragmentStore );

		$result = $this->doApiRequest( [
			'action' => 'abstractwiki_fetch_section',
			'abstractwiki_fetch_section_topic' => 'Q42',
			'abstractwiki_fetch_section_section' => 'Q8776414',
			'abstractwiki_fetch_section_language' => 'Z1002',
			'abstractwiki_fetch_section_date' => '2026-01-01',
		] )[0][ 'abstractwiki_fetch_section' ][ 'Q8776414' ];

		$this->assertCount( 1, $result );
		$this->assertTrue( $result[0][ 'success' ] );
		$this->assertSame( '<b>fresh content</b>', $result[0][ 'value' ] );
	}

	public function testFetchSection_multipleFragments(): void {
		$qid = 'Q42';
		$section = 'Q8776414';
		$date = '2026-01-01';
		$lang = 'en';

		$fragment1 = [ 'Z1K1' => 'Z89', 'Z89K1' => '<b>literal1</b>' ];
		$fragment2 = [ 'Z1K1' => 'Z89', 'Z89K1' => '<b>literal2</b>' ];
		$fragment3 = [ 'Z1K1' => 'Z89', 'Z89K1' => '<b>literal3</b>' ];
		$value1 = [ 'success' => true, 'value' => '<b>old content</b>' ];
		$value2 = [ 'success' => false, 'value' => [ 'msg' => 'error-msg' ] ];

		$awJson = '{ "qid": "' . $qid . '", "sections": {'
			. ' "' . $section . '": { "index": 0,'
			. ' "fragments": [ "Z89",'
			. json_encode( $fragment1 ) . ', '
			. json_encode( $fragment2 ) . ', '
			. json_encode( $fragment3 ) . ' ] } } }';

		$mockContentHandlerFactory = $this->createMockContentHandlerFactory( $awJson );
		$this->setService( 'ContentHandlerFactory', $mockContentHandlerFactory );

		$mockTitleFactory = $this->createMockTitleFactory( $qid );
		$this->setService( 'TitleFactory', $mockTitleFactory );

		$staleOk = $this->makeFragment( $qid, $date, $lang, $value1, AWFragment::AVAILABILITY_STALE );
		$freshBad = $this->makeFragment( $qid, $date, $lang, $value2, AWFragment::AVAILABILITY_FRESH );
		$missing = $this->makeFragment( $qid, $date, $lang );
		$fragmentStore = $this->createMockFragmentStore( [
			[ $fragment1, $staleOk ],
			[ $fragment2, $freshBad ],
			[ $fragment3, $missing ],
		] );
		$this->setService( 'AbstractWikiFragmentStore', $fragmentStore );

		$result = $this->doApiRequest( [
			'action' => 'abstractwiki_fetch_section',
			'abstractwiki_fetch_section_topic' => 'Q42',
			'abstractwiki_fetch_section_section' => 'Q8776414',
			'abstractwiki_fetch_section_language' => 'Z1002',
			'abstractwiki_fetch_section_date' => '2026-01-01',
		] )[0][ 'abstractwiki_fetch_section' ][ 'Q8776414' ];

		$this->assertCount( 3, $result );
		$this->assertTrue( $result[0][ 'success' ] );
		$this->assertSame( '<b>old content</b>', $result[0][ 'value' ] );

		$this->assertFalse( $result[1][ 'success' ] );
		$this->assertSame( 'error-msg', $result[1][ 'value' ][ 'msg' ] );

		$this->assertTrue( $result[2][ 'success' ] );
		$this->assertTrue( $result[2][ 'pending' ] );
	}

	// Request with fragments
	// ======================

	public function testFetchFragments_freshFragment(): void {
		$qid = 'Q42';
		$date = '2026-01-01';
		$lang = 'en';

		$fragment = [ 'Z1K1' => 'Z89', 'Z89K1' => '<b>literal</b>' ];
		$fragmentsJson = json_encode( [ $fragment ] );
		$value = [ 'success' => true, 'value' => '<b>fresh content</b>' ];

		$storedFragment = $this->makeFragment( $qid, $date, $lang, $value, AWFragment::AVAILABILITY_FRESH );
		$fragmentStore = $this->createMockFragmentStore( [ [ $fragment, $storedFragment ] ] );
		$this->setService( 'AbstractWikiFragmentStore', $fragmentStore );

		$result = $this->doFetchSectionRequestWithToken( [
			'action' => 'abstractwiki_fetch_section',
			'abstractwiki_fetch_section_topic' => 'Q42',
			'abstractwiki_fetch_section_section' => 'Q8776414',
			'abstractwiki_fetch_section_language' => 'Z1002',
			'abstractwiki_fetch_section_date' => '2026-01-01',
			'abstractwiki_fetch_section_fragments' => $fragmentsJson
		] )[0][ 'abstractwiki_fetch_section' ][ 'Q8776414' ];

		$this->assertCount( 1, $result );
		$this->assertTrue( $result[0][ 'success' ] );
		$this->assertSame( '<b>fresh content</b>', $result[0][ 'value' ] );
	}

	public function testFetchFragments_staleFragment(): void {
		$qid = 'Q42';
		$date = '2026-01-01';
		$lang = 'en';

		$fragment = [ 'Z1K1' => 'Z89', 'Z89K1' => '<b>literal</b>' ];
		$fragmentsJson = json_encode( [ $fragment ] );
		$value = [ 'success' => true, 'value' => '<b>stale content</b>' ];

		$storedFragment = $this->makeFragment( $qid, $date, $lang, $value, AWFragment::AVAILABILITY_FRESH );
		$fragmentStore = $this->createMockFragmentStore( [ [ $fragment, $storedFragment ] ] );
		$this->setService( 'AbstractWikiFragmentStore', $fragmentStore );

		$result = $this->doFetchSectionRequestWithToken( [
			'action' => 'abstractwiki_fetch_section',
			'abstractwiki_fetch_section_topic' => 'Q42',
			'abstractwiki_fetch_section_section' => 'Q8776414',
			'abstractwiki_fetch_section_language' => 'Z1002',
			'abstractwiki_fetch_section_date' => '2026-01-01',
			'abstractwiki_fetch_section_fragments' => $fragmentsJson
		] )[0][ 'abstractwiki_fetch_section' ][ 'Q8776414' ];

		$this->assertCount( 1, $result );
		$this->assertTrue( $result[0][ 'success' ] );
		$this->assertSame( '<b>stale content</b>', $result[0][ 'value' ] );
	}

	public function testFetchFragments_pendingFragment(): void {
		$qid = 'Q42';
		$date = '2026-01-01';
		$lang = 'en';

		$fragment = [ 'Z1K1' => 'Z89', 'Z89K1' => '<b>literal</b>' ];
		$fragmentsJson = json_encode( [ $fragment ] );

		$missingFragment = $this->makeFragment( $qid, $date, $lang );

		$fragmentStore = $this->createMockFragmentStore( [ [ $fragment, $missingFragment ] ] );
		$this->setService( 'AbstractWikiFragmentStore', $fragmentStore );

		$result = $this->doFetchSectionRequestWithToken( [
			'action' => 'abstractwiki_fetch_section',
			'abstractwiki_fetch_section_topic' => 'Q42',
			'abstractwiki_fetch_section_section' => 'Q8776414',
			'abstractwiki_fetch_section_language' => 'Z1002',
			'abstractwiki_fetch_section_date' => '2026-01-01',
			'abstractwiki_fetch_section_fragments' => $fragmentsJson
		] )[0][ 'abstractwiki_fetch_section' ][ 'Q8776414' ];

		$this->assertCount( 1, $result );
		$this->assertTrue( $result[0][ 'success' ] );
		$this->assertTrue( $result[0][ 'pending' ] );
		$this->assertArrayHasKey( 'value', $result[0] );
	}

	public function testFetchFragments_multipleStates(): void {
		$qid = 'Q42';
		$date = '2026-01-01';
		$lang = 'en';

		$fragment1 = [ 'Z1K1' => 'Z89', 'Z89K1' => '<b>first</b>' ];
		$fragment2 = [ 'Z1K1' => 'Z89', 'Z89K1' => '<b>second</b>' ];
		$fragmentsJson = json_encode( [ $fragment1, $fragment2 ] );
		$value = [ 'success' => true, 'value' => '<b>first</b>' ];

		$storedFragment = $this->makeFragment( $qid, $date, $lang, $value, AWFragment::AVAILABILITY_FRESH );
		$missingFragment = $this->makeFragment( $qid, $date, $lang );

		$fragmentStore = $this->createMockFragmentStore( [
			[ $fragment1, $storedFragment ],
			[ $fragment2, $missingFragment ],
		] );
		$this->setService( 'AbstractWikiFragmentStore', $fragmentStore );

		$result = $this->doFetchSectionRequestWithToken( [
			'action' => 'abstractwiki_fetch_section',
			'abstractwiki_fetch_section_topic' => 'Q42',
			'abstractwiki_fetch_section_section' => 'Q8776414',
			'abstractwiki_fetch_section_language' => 'Z1002',
			'abstractwiki_fetch_section_date' => '2026-01-01',
			'abstractwiki_fetch_section_fragments' => $fragmentsJson
		] )[0][ 'abstractwiki_fetch_section' ][ 'Q8776414' ];

		$this->assertCount( 2, $result );
		$this->assertTrue( $result[0][ 'success' ] );
		$this->assertSame( '<b>first</b>', $result[0][ 'value' ] );
		$this->assertTrue( $result[1][ 'success' ] );
		$this->assertTrue( $result[1][ 'pending' ] );
	}

	public function testFetchFragments_forwardsDateAndLanguage(): void {
		$qid = 'Q42';
		$date = '2024-12-25';
		$lang = 'en';

		$fragment = [ 'Z1K1' => 'Z89', 'Z89K1' => '<b>literal</b>' ];
		$fragmentsJson = json_encode( [ $fragment ] );
		$value = [ 'success' => true, 'value' => '<b>content</b>' ];

		// Capture what the API forwards to the store, so a regression in date or
		// language plumbing (e.g. the makeFragment argument order) is caught.
		$capturedTopic = null;
		$capturedLanguage = null;
		$capturedDate = null;

		$fragmentStore = $this->createMock( AWFragmentStore::class );
		$fragmentStore
			->method( 'getRenderedAWFragment' )
			->willReturnCallback(
				function ( $f, $topicQid, $language, $d )
				use ( &$capturedTopic, &$capturedLanguage, &$capturedDate, $qid, $date, $lang, $value ) {
					$capturedTopic = $topicQid;
					$capturedLanguage = $language;
					$capturedDate = $d;
					return $this->makeFragment( $qid, $date, $lang, $value, AWFragment::AVAILABILITY_FRESH );
				}
			);
		$this->setService( 'AbstractWikiFragmentStore', $fragmentStore );

		$result = $this->doFetchSectionRequestWithToken( [
			'action' => 'abstractwiki_fetch_section',
			'abstractwiki_fetch_section_topic' => $qid,
			'abstractwiki_fetch_section_section' => 'Q8776414',
			'abstractwiki_fetch_section_language' => 'Z1002',
			'abstractwiki_fetch_section_date' => $date,
			'abstractwiki_fetch_section_fragments' => $fragmentsJson
		] )[0][ 'abstractwiki_fetch_section' ][ 'Q8776414' ];

		// The request's topic, date and language reach the store verbatim.
		$this->assertSame( $qid, $capturedTopic );
		$this->assertSame( $date, $capturedDate );
		$this->assertInstanceOf( WikifunctionsLanguage::class, $capturedLanguage );
		$this->assertSame( $lang, $capturedLanguage->getCode() );
		$this->assertSame( 'Z1002', $capturedLanguage->getZid() );

		// And the stored value is surfaced unchanged.
		$this->assertCount( 1, $result );
		$this->assertSame( '<b>content</b>', $result[0][ 'value' ] );
	}

	// HTTP method
	// ===========

	public function testReadPathIsGetEligible(): void {
		// The persisted-fragment read (no "fragments") is idempotent and must be
		// reachable via GET, i.e. it must not require POST or a token. Supplying
		// "fragments" flips it to POST plus a CSRF token (large payload + the
		// elevated unsaved-render right).
		$baseParams = [
			'action' => 'abstractwiki_fetch_section',
			'abstractwiki_fetch_section_topic' => 'Q42',
			'abstractwiki_fetch_section_section' => 'Q8776414',
			'abstractwiki_fetch_section_language' => 'Z1002',
			'abstractwiki_fetch_section_date' => '2026-01-01',
		];

		$readModule = $this->getFetchSectionModuleForParams( $baseParams );
		$this->assertFalse( $readModule->mustBePosted(), 'Persisted read must be GET-eligible' );
		$this->assertFalse( (bool)$readModule->needsToken(), 'Persisted read must not require a token' );

		$writeModule = $this->getFetchSectionModuleForParams(
			$baseParams + [ 'abstractwiki_fetch_section_fragments' => '[]' ]
		);
		$this->assertTrue( $writeModule->mustBePosted(), 'Unsaved-fragments path must require POST' );
		$this->assertSame( 'csrf', $writeModule->needsToken(), 'Unsaved-fragments path must require a CSRF token' );
	}

	// API returned exceptions
	// =======================

	public function testExecute_diesWhenAbstractModeDisabled(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractMode', false );
		$this->expectException( ApiUsageException::class );

		$this->doApiRequest( [
			'action' => 'abstractwiki_fetch_section',
			'abstractwiki_fetch_section_topic' => 'Q42',
			'abstractwiki_fetch_section_section' => 'Q8776414',
			'abstractwiki_fetch_section_language' => 'Z1002',
			'abstractwiki_fetch_section_date' => '2026-01-01',
		] );
	}

	public function testExecute_diesForInvalidFragmentsJson(): void {
		$this->expectException( ApiUsageException::class );

		$result = $this->doFetchSectionRequestWithToken( [
			'action' => 'abstractwiki_fetch_section',
			'abstractwiki_fetch_section_topic' => 'Q42',
			'abstractwiki_fetch_section_section' => 'Q8776414',
			'abstractwiki_fetch_section_language' => 'Z1002',
			'abstractwiki_fetch_section_date' => '2026-01-01',
			'abstractwiki_fetch_section_fragments' => 'not-valid-json{{{',
		] );
	}

	public function testExecute_diesForNonListFragments(): void {
		$this->expectException( ApiUsageException::class );

		$result = $this->doFetchSectionRequestWithToken( [
			'action' => 'abstractwiki_fetch_section',
			'abstractwiki_fetch_section_topic' => 'Q42',
			'abstractwiki_fetch_section_section' => 'Q8776414',
			'abstractwiki_fetch_section_language' => 'Z1002',
			'abstractwiki_fetch_section_date' => '2026-01-01',
			'abstractwiki_fetch_section_fragments' => '{"not": "a list"}',
		] );
	}

	public function testExecute_diesForScalarFragments(): void {
		// A valid JSON scalar (not an array) must be rejected as bad fragments,
		// not crash array_is_list() with a TypeError.
		$this->expectException( ApiUsageException::class );

		$this->doFetchSectionRequestWithToken( [
			'action' => 'abstractwiki_fetch_section',
			'abstractwiki_fetch_section_topic' => 'Q42',
			'abstractwiki_fetch_section_section' => 'Q8776414',
			'abstractwiki_fetch_section_language' => 'Z1002',
			'abstractwiki_fetch_section_date' => '2026-01-01',
			'abstractwiki_fetch_section_fragments' => '5',
		] );
	}

	public function testFetchFragments_nonArrayItem(): void {
		// A list whose items are not arrays passes the list check but fails the
		// per-fragment validation, yielding a failed result item (not a crash).
		$fragmentStore = $this->createMockFragmentStore( [] );
		$this->setService( 'AbstractWikiFragmentStore', $fragmentStore );

		$result = $this->doFetchSectionRequestWithToken( [
			'action' => 'abstractwiki_fetch_section',
			'abstractwiki_fetch_section_topic' => 'Q42',
			'abstractwiki_fetch_section_section' => 'Q8776414',
			'abstractwiki_fetch_section_language' => 'Z1002',
			'abstractwiki_fetch_section_date' => '2026-01-01',
			'abstractwiki_fetch_section_fragments' => '[ "not-an-array" ]',
		] )[0][ 'abstractwiki_fetch_section' ][ 'Q8776414' ];

		$this->assertCount( 1, $result );
		$this->assertFalse( $result[0][ 'success' ] );
		$this->assertArrayHasKey( 'value', $result[0] );
	}
}
