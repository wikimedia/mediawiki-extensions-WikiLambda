<?php

/**
 * WikiLambda integration test suite for the ViewAbstract special page
 *
 * @copyright 2020– WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Special;

use MediaWiki\Context\DerivativeContext;
use MediaWiki\Context\RequestContext;
use MediaWiki\Exception\ErrorPageError;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent;
use MediaWiki\Extension\WikiLambda\Special\SpecialViewAbstract;
use MediaWiki\Extension\WikiLambda\Tests\Integration\AbstractModeTestConfigTrait;
use MediaWiki\Extension\WikiLambda\Tests\Integration\MockWikidataEntityLookupTrait;
use MediaWiki\Permissions\Authority;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\RevisionDelete\RevisionDeleter;
use MediaWiki\Storage\PageUpdateStatus;
use MediaWiki\Tests\Specials\SpecialPageTestBase;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Special\SpecialViewAbstract
 * @group Database
 */
class SpecialViewAbstractTest extends SpecialPageTestBase {
	use AbstractModeTestConfigTrait;
	use MockWikidataEntityLookupTrait;

	private const TEST_ABSTRACT_NS = 2300;

	private Authority $performer;

	protected function setUp(): void {
		parent::setUp();

		$this->performer = $this->getTestUser()->getAuthority();

		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', false );
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );
		$this->setUpAsAbstractMode();

		$this->mockWikidataEntityLookup( [ 'Q42' => [] ] );
	}

	/**
	 * @inheritDoc
	 */
	protected function newSpecialPage(): SpecialViewAbstract {
		return $this->getServiceContainer()->getSpecialPageFactory()->getPage( 'ViewAbstract' );
	}

	/**
	 * @param string $qid
	 * @return PageUpdateStatus
	 */
	protected function createAbstractPageForQid( $qid ): PageUpdateStatus {
		$title = Title::newFromText( $qid, self::TEST_ABSTRACT_NS );
		$content = new AbstractWikiContent( json_encode( [
			'qid' => $qid,
			'sections' => [
				'Q8776414' => [
					'index' => 0,
					'fragments' => [ 'Z89' ]
				]
			]
		] ) );
		return $this->editPage( $title, $content, 'create test aw content', self::TEST_ABSTRACT_NS );
	}

	public function testExecuteThrowsIfAbstractModeDisabled(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractMode', false );

		$this->expectException( ErrorPageError::class );

		$this->executeSpecialPage(
			/* subpage */ 'Q42',
			/* request */ null,
			/* language */ null,
			/* performer */ $this->performer
		);
	}

	public function testNoSubpageRedirectToMain(): void {
		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ '',
			/* request */ null,
			/* language */ null,
			/* performer */ $this->performer
		);

		$location = $response->getHeader( 'Location' );

		$this->assertStringContainsString( 'Main_Page', $location );
	}

	public function testMissingPageRedirectToMain(): void {
		// Ensure page does not exist
		$title = Title::newFromText( 'Q999999', self::TEST_ABSTRACT_NS );
		$this->assertFalse( $title->exists() );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Abstract Wikipedia:Q999999',
			/* request */ null,
			/* language */ null,
			/* performer */ $this->performer
		);

		$location = $response->getHeader( 'Location' );

		$this->assertStringContainsString( 'Main_Page', $location );
	}

	public function testUnknownLangRedirectToMain(): void {
		$this->createAbstractPageForQid( 'Q42' );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'foo-bar/Abstract Wikipedia:Q42',
			/* request */ null,
			/* language */ null,
			/* performer */ $this->performer
		);

		$location = $response->getHeader( 'Location' );

		$this->assertStringContainsString( 'Main_Page', $location );
	}

	public function testBadRevisionRedirectToMain(): void {
		$this->createAbstractPageForQid( 'Q42' );

		// Request for not existing revision
		$request = new FauxRequest( [ 'oldid' => 999999 ] );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Abstract Wikipedia:Q42',
			/* request */ $request,
			/* language */ 'en',
			/* performer */ $this->performer,
		);

		$location = $response->getHeader( 'Location' );

		$this->assertStringContainsString( 'Main_Page', $location );
	}

	public function testOverwriteWithUselangProp(): void {
		$this->createAbstractPageForQid( 'Q42' );

		// uselang=es in the request should overwrite the context language
		$request = new FauxRequest( [ 'uselang' => 'es' ] );

		$context = RequestContext::getMain();
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );
		$context->setRequest( $request );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Abstract Wikipedia:Q42',
			/* request */ $request,
			/* language */ null,
			/* performer */ null,
			/* fullHtml */ false,
			/* context */ $context
		);

		// No redirect expected
		$this->assertNull( $response->getHeader( 'Location' ) );

		// Ensure output has the appropriate config vars
		$output = $context->getOutput();
		$jsVars = $output->getJsConfigVars();

		$this->assertArrayHasKey( 'wgWikiLambda', $jsVars );

		$wikiLambdaVars = $jsVars['wgWikiLambda'];

		$this->assertSame( 'Q42', $wikiLambdaVars['title'] );
		$this->assertSame( 'es', $wikiLambdaVars['zlang'] );
	}

	public function testRedirectNotice(): void {
		$this->createAbstractPageForQid( 'Q42' );

		// created=1 is passed on redirect from CreateAbstract special page
		$request = new FauxRequest( [ 'created' => 1 ] );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Abstract Wikipedia:Q42',
			/* request */ $request,
			/* language */ 'en',
			/* performer */ $this->performer,
			/* fullHtml */ true
		);

		// Check that the notice text appears in the page HTML
		$this->assertStringContainsString(
			'You were redirected as there is already an Abstract Article',
			$html
		);
	}

	public function testShowOldRevisionWarning(): void {
		$qid = 'Q42';
		$title = Title::newFromText( $qid, self::TEST_ABSTRACT_NS );

		// Create the content page and get first revision Id
		$initialContent = new AbstractWikiContent( json_encode( [
			'qid' => $qid,
			'sections' => [ 'Q8776414' => [ 'index' => 0, 'fragments' => [ 'Z89' ] ] ]
		] ) );
		$status = $this->editPage( $title, $initialContent, 'created', self::TEST_ABSTRACT_NS );
		$firstRevisionId = $status->getNewRevision()->getId();

		// Make an edit and get second revision Id
		$editedContent = new AbstractWikiContent( json_encode( [
			'qid' => $qid,
			'sections' => [ 'Q8776414' => [ 'index' => 0, 'fragments' => [ 'Z89', 'foo', 'bar' ] ] ]
		] ) );
		$status = $this->editPage( $title, $editedContent, 'create test aw content', self::TEST_ABSTRACT_NS );
		$lastRevisionId = $status->getNewRevision()->getId();

		// Ensure that the revision Ids are not the same
		$this->assertNotSame( $firstRevisionId, $lastRevisionId );

		// Request for old revision oldid=1
		$request = new FauxRequest( [ 'oldid' => $firstRevisionId ] );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Abstract Wikipedia:Q42',
			/* request */ $request,
			/* language */ 'en',
			/* performer */ $this->performer,
			/* fullHtml */ true
		);

		// Ensure that the old revision warning message is set
		$this->assertStringContainsString( 'id="mw-revision-info"', $html );
		$this->assertStringContainsString( 'cdx-message--warning mw-revision', $html );
	}

	public function testViewAbstractContent(): void {
		$this->createAbstractPageForQid( 'Q42' );

		$context = RequestContext::getMain();
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Abstract Wikipedia:Q42',
			/* request */ $context->getRequest(),
			/* language */ null,
			/* performer */ null,
			/* fullHtml */ false,
			/* context */ $context
		);

		// No redirect expected
		$this->assertNull( $response->getHeader( 'Location' ) );

		// Ensure output has the appropriate config vars
		$output = $context->getOutput();
		$jsVars = $output->getJsConfigVars();

		$this->assertArrayHasKey( 'wgWikiLambda', $jsVars );

		$wikiLambdaVars = $jsVars['wgWikiLambda'];

		$this->assertTrue( $wikiLambdaVars['abstractContent'] );
		$this->assertFalse( $wikiLambdaVars['createNewPage'] );
		$this->assertSame( 'Q42', $wikiLambdaVars['title'] );
		$this->assertSame( 'en', $wikiLambdaVars['zlang'] );
		$this->assertTrue( $wikiLambdaVars['viewmode'] );
		$this->assertArrayHasKey( 'content', $wikiLambdaVars );
	}

	public function testViewPageTitleShowsLabel(): void {
		$this->mockWikidataEntityLookup( [
			'Q34086' => [ 'en' => 'Justin Bieber' ]
		] );

		$this->createAbstractPageForQid( 'Q34086' );

		$context = RequestContext::getMain();
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Abstract Wikipedia:Q34086',
			/* request */ $context->getRequest(),
			/* language */ null,
			/* performer */ null,
			/* fullHtml */ false,
			/* context */ $context
		);

		// Ensure output has the appropriate config vars
		$output = $context->getOutput();
		$this->assertStringContainsString( 'Justin Bieber', $output->getPageTitle() );
		$this->assertStringContainsString( 'Q34086', $output->getPageTitle() );
	}

	public function testViewPageTitleShowsFallbackWhenNoLabel(): void {
		$this->mockWikidataEntityLookup( [
			'Q34086' => [ 'es' => 'Justino Castor' ]
		] );

		$this->createAbstractPageForQid( 'Q34086' );

		$context = RequestContext::getMain();
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Abstract Wikipedia:Q34086',
			/* request */ $context->getRequest(),
			/* language */ null,
			/* performer */ null,
			/* fullHtml */ false,
			/* context */ $context
		);

		// Ensure output has the appropriate config vars
		$output = $context->getOutput();
		$this->assertStringContainsString( 'Q34086', $output->getPageTitle() );
		$this->assertStringNotContainsString( 'Justin', $output->getPageTitle() );
		$this->assertStringNotContainsString( 'Justin', $output->getPageTitle() );
	}

	// ------------------------------------------------------------------
	// (T430601) RevisionDelete / suppression
	// ------------------------------------------------------------------

	/**
	 * Create an Abstract page with two revisions and hide the FIRST (non-current) one's text.
	 *
	 * RevisionDeleter::createList()->setVisibility() is used rather than a bare `revision`
	 * table UPDATE because it both writes rev_deleted and purges the RevisionStore/page
	 * caches, so the subsequent page view sees the new visibility rather than a stale,
	 * still-viewable cached RevisionRecord.
	 *
	 * @param int[] $visibility Bitfield constants to set, e.g. [ RevisionRecord::DELETED_TEXT ]
	 * @return int The hidden revision's ID
	 */
	private function createAbstractPageWithHiddenFirstRevision( array $visibility ): int {
		$title = Title::newFromText( 'Q42', self::TEST_ABSTRACT_NS );

		$makeContent = static fn ( array $fragments ) => new AbstractWikiContent( json_encode( [
			'qid' => 'Q42',
			'sections' => [ 'Q8776414' => [ 'index' => 0, 'fragments' => $fragments ] ]
		] ) );

		$status = $this->editPage(
			$title, $makeContent( [ 'Z89', 'hiddenfragment' ] ), 'first', self::TEST_ABSTRACT_NS
		);
		$this->assertStatusOK( $status );
		$hiddenRevisionId = $status->getNewRevision()->getId();

		// A second revision, so the hidden one is not the current revision.
		$this->assertStatusOK( $this->editPage(
			$title, $makeContent( [ 'Z89', 'visiblefragment' ] ), 'second', self::TEST_ABSTRACT_NS
		) );

		// A DerivativeContext, not RequestContext::getMain(): setting the sysop on the shared
		// context would leak into the page view under test, which would then run as a sysop
		// and legitimately see the hidden text no matter which performer the test passes.
		$deleteContext = new DerivativeContext( RequestContext::getMain() );
		$deleteContext->setUser( $this->getTestSysop()->getUser() );
		$deleter = RevisionDeleter::createList(
			'revision', $deleteContext, $title, [ $hiddenRevisionId ]
		);
		$this->assertStatusOK( $deleter->setVisibility( [
			'value' => array_fill_keys( $visibility, 1 ),
			'comment' => 'Testing revision visibility',
		] ) );
		$this->runDeferredUpdates();

		return $hiddenRevisionId;
	}

	/**
	 * Regression cover for what the T430601 security patch fixed here but did not test.
	 */
	public function testRevisionDeletedContentIsHiddenFromUnprivilegedViewer(): void {
		$hiddenRevisionId = $this->createAbstractPageWithHiddenFirstRevision(
			[ RevisionRecord::DELETED_TEXT ]
		);

		[ $html ] = $this->executeSpecialPage(
			/* subpage */ 'en/Abstract Wikipedia:Q42',
			/* request */ new FauxRequest( [ 'oldid' => $hiddenRevisionId ] ),
			/* language */ 'en',
			/* performer */ $this->performer,
			/* fullHtml */ true
		);

		$this->assertStringNotContainsString( 'hiddenfragment', $html );
		// Core's rev-deleted-text-permission box, emitted by UIUtils::checkRevisionViewable().
		$this->assertStringContainsString( 'cdx-message--error', $html );
		// The editor must not be rendered at all.
		$this->assertStringNotContainsString( 'ext-wikilambda-app', $html );
	}

	public function testSuppressedRevisionIsHiddenFromUnprivilegedViewer(): void {
		$hiddenRevisionId = $this->createAbstractPageWithHiddenFirstRevision(
			[ RevisionRecord::DELETED_TEXT, RevisionRecord::DELETED_RESTRICTED ]
		);

		[ $html ] = $this->executeSpecialPage(
			/* subpage */ 'en/Abstract Wikipedia:Q42',
			/* request */ new FauxRequest( [ 'oldid' => $hiddenRevisionId ] ),
			/* language */ 'en',
			/* performer */ $this->performer,
			/* fullHtml */ true
		);

		$this->assertStringNotContainsString( 'hiddenfragment', $html );
		$this->assertStringContainsString( 'cdx-message--error', $html );
	}

	/**
	 * A viewer who may see hidden text still gets core's confirmation step, so the content
	 * does not appear until they ask for it explicitly. Split from the unhide=1 case below
	 * because executeSpecialPage() may only be called once per test: the second call trips
	 * core's "Unexpected clearActionName after getActionName already called" guard.
	 */
	public function testRevisionDeletedContentNeedsUnhideEvenForPrivilegedViewer(): void {
		$hiddenRevisionId = $this->createAbstractPageWithHiddenFirstRevision(
			[ RevisionRecord::DELETED_TEXT ]
		);

		[ $html ] = $this->executeSpecialPage(
			/* subpage */ 'en/Abstract Wikipedia:Q42',
			/* request */ new FauxRequest( [ 'oldid' => $hiddenRevisionId ] ),
			/* language */ 'en',
			/* performer */ $this->getTestSysop()->getAuthority(),
			/* fullHtml */ true
		);

		$this->assertStringNotContainsString( 'hiddenfragment', $html );
	}

	public function testRevisionDeletedContentServedWithUnhideForPrivilegedViewer(): void {
		$hiddenRevisionId = $this->createAbstractPageWithHiddenFirstRevision(
			[ RevisionRecord::DELETED_TEXT ]
		);

		[ $html ] = $this->executeSpecialPage(
			/* subpage */ 'en/Abstract Wikipedia:Q42',
			/* request */ new FauxRequest( [ 'oldid' => $hiddenRevisionId, 'unhide' => 1 ] ),
			/* language */ 'en',
			/* performer */ $this->getTestSysop()->getAuthority(),
			/* fullHtml */ true
		);

		$this->assertStringContainsString( 'hiddenfragment', $html );
	}

	/**
	 * (T343594) The permanent link needs the revision ID on the OutputPage; nothing else
	 * asserts this, which is how it went missing once already.
	 */
	public function testSetsRevisionIdForPermanentLink(): void {
		$status = $this->createAbstractPageForQid( 'Q42' );
		$revisionId = $status->getNewRevision()->getId();

		$context = RequestContext::getMain();
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );

		$this->executeSpecialPage(
			/* subpage */ 'en/Abstract Wikipedia:Q42',
			/* request */ $context->getRequest(),
			/* language */ null,
			/* performer */ null,
			/* fullHtml */ false,
			/* context */ $context
		);

		$this->assertSame( $revisionId, $context->getOutput()->getRevisionId() );
	}

	/**
	 * An oldid belonging to a different page must not be rendered under this page's title.
	 */
	public function testOldidFromAnotherTitleRedirectsToMain(): void {
		$this->mockWikidataEntityLookup( [ 'Q42' => [], 'Q43' => [] ] );
		$this->createAbstractPageForQid( 'Q42' );
		$otherStatus = $this->createAbstractPageForQid( 'Q43' );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Abstract Wikipedia:Q42',
			/* request */ new FauxRequest(
				[ 'oldid' => $otherStatus->getNewRevision()->getId() ]
			),
			/* language */ 'en',
			/* performer */ $this->performer
		);

		$this->assertStringContainsString( 'Main_Page', $response->getHeader( 'Location' ) );
	}
}
