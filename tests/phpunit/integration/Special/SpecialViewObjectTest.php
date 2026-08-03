<?php

/**
 * WikiLambda integration test suite for the ViewObject special page
 *
 * @copyright 2020– WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Special;

use MediaWiki\Context\DerivativeContext;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\Special\SpecialViewObject;
use MediaWiki\Extension\WikiLambda\ZObjectContent\ZObjectContent;
use MediaWiki\Output\OutputPage;
use MediaWiki\Permissions\Authority;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\RevisionDelete\RevisionDeleter;
use MediaWiki\Tests\Specials\SpecialPageTestBase;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Special\SpecialViewObject
 * @group Database
 */
class SpecialViewObjectTest extends SpecialPageTestBase {

	private Authority $performer;

	protected function setUp(): void {
		parent::setUp();

		$this->performer = $this->getTestUser()->getAuthority();

		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', true );
	}

	/**
	 * @inheritDoc
	 */
	protected function newSpecialPage(): SpecialViewObject {
		return $this->getServiceContainer()->getSpecialPageFactory()->getPage( 'ViewObject' );
	}

	/**
	 * @param string $zid
	 */
	protected function createZObjectForZid( string $zid ): void {
		$title = Title::newFromText( $zid, NS_MAIN );
		$content = new ZObjectContent( json_encode( [
			'Z1K1' => 'Z2',
			'Z2K1' => [ 'Z1K1' => 'Z6', 'Z6K1' => $zid ],
			'Z2K2' => 'test',
			'Z2K3' => [ 'Z1K1' => 'Z12', 'Z12K1' => [ 'Z11' ] ],
		] ) );
		$this->editPage( $title, $content, 'create test zobject', NS_MAIN );
	}

	public function testNoSubpageRedirectsToMain(): void {
		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ '',
			/* request */ null,
			/* language */ null,
			/* performer */ $this->performer
		);

		$this->assertStringContainsString( 'Main_Page', $response->getHeader( 'Location' ) );
	}

	public function testMissingPageRedirectsToMain(): void {
		$title = Title::newFromText( 'Z999999', NS_MAIN );
		$this->assertFalse( $title->exists() );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Z999999',
			/* request */ null,
			/* language */ null,
			/* performer */ $this->performer
		);

		$this->assertStringContainsString( 'Main_Page', $response->getHeader( 'Location' ) );
	}

	public function testInvalidZidRedirectsToMain(): void {
		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/not-a-zid',
			/* request */ null,
			/* language */ null,
			/* performer */ $this->performer
		);

		$this->assertStringContainsString( 'Main_Page', $response->getHeader( 'Location' ) );
	}

	public function testBadRevisionRedirectsToMain(): void {
		$this->createZObjectForZid( 'Z10000' );

		$request = new FauxRequest( [ 'oldid' => 999999 ] );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Z10000',
			/* request */ $request,
			/* language */ null,
			/* performer */ $this->performer
		);

		$this->assertStringContainsString( 'Main_Page', $response->getHeader( 'Location' ) );
	}

	public function testUselangOverridesSubpageLanguage(): void {
		$this->createZObjectForZid( 'Z10000' );

		$request = new FauxRequest( [ 'uselang' => 'es' ] );

		$context = RequestContext::getMain();
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );
		$context->setRequest( $request );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Z10000',
			/* request */ $request,
			/* language */ null,
			/* performer */ null,
			/* fullHtml */ false,
			/* context */ $context
		);

		$this->assertNull( $response->getHeader( 'Location' ) );

		$output = $context->getOutput();
		$jsVars = $output->getJsConfigVars();
		$this->assertArrayHasKey( 'wgWikiLambda', $jsVars );
		$this->assertSame( 'Z10000', $jsVars['wgWikiLambda']['zId'] );
	}

	public function testShowOldRevisionWarning(): void {
		$zid = 'Z10000';
		$title = Title::newFromText( $zid, NS_MAIN );

		$initialContent = new ZObjectContent( json_encode( [
			'Z1K1' => 'Z2',
			'Z2K1' => [ 'Z1K1' => 'Z6', 'Z6K1' => $zid ],
			'Z2K2' => 'first content',
			'Z2K3' => [ 'Z1K1' => 'Z12', 'Z12K1' => [ 'Z11',
				[ 'Z1K1' => 'Z11', 'Z11K1' => 'Z1002', 'Z11K2' => 'first label' ]
			] ]
		] ) );
		$status = $this->editPage( $title, $initialContent, 'first revision', NS_MAIN );
		$firstRevisionId = $status->getNewRevision()->getId();

		$editedContent = new ZObjectContent( json_encode( [
			'Z1K1' => 'Z2',
			'Z2K1' => [ 'Z1K1' => 'Z6', 'Z6K1' => $zid ],
			'Z2K2' => 'second content',
			'Z2K3' => [ 'Z1K1' => 'Z12', 'Z12K1' => [ 'Z11',
				[ 'Z1K1' => 'Z11', 'Z11K1' => 'Z1002', 'Z11K2' => 'second label' ]
			] ]
		] ) );
		$status = $this->editPage( $title, $editedContent, 'second revision', NS_MAIN );
		$lastRevisionId = $status->getNewRevision()->getId();

		$this->assertNotSame( $firstRevisionId, $lastRevisionId );

		$request = new FauxRequest( [ 'oldid' => $firstRevisionId ] );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Z10000',
			/* request */ $request,
			/* language */ 'en',
			/* performer */ $this->performer,
			/* fullHtml */ true
		);

		$this->assertStringContainsString( 'id="mw-revision-info"', $html );
		$this->assertStringContainsString( 'cdx-message--warning mw-revision', $html );
	}

	// (T417203) Assert the title is the correct revision
	public function testShowOldRevisionTitle(): void {
		$zid = 'Z10000';
		$title = Title::newFromText( $zid, NS_MAIN );

		$initialContent = new ZObjectContent( json_encode( [
			'Z1K1' => 'Z2',
			'Z2K1' => [ 'Z1K1' => 'Z6', 'Z6K1' => $zid ],
			'Z2K2' => 'first content',
			'Z2K3' => [ 'Z1K1' => 'Z12', 'Z12K1' => [ 'Z11',
				[ 'Z1K1' => 'Z11', 'Z11K1' => 'Z1002', 'Z11K2' => 'first label' ]
			] ]
		] ) );
		$status = $this->editPage( $title, $initialContent, 'first revision', NS_MAIN );
		$firstRevisionId = $status->getNewRevision()->getId();

		$editedContent = new ZObjectContent( json_encode( [
			'Z1K1' => 'Z2',
			'Z2K1' => [ 'Z1K1' => 'Z6', 'Z6K1' => $zid ],
			'Z2K2' => 'second content',
			'Z2K3' => [ 'Z1K1' => 'Z12', 'Z12K1' => [ 'Z11',
				[ 'Z1K1' => 'Z11', 'Z11K1' => 'Z1002', 'Z11K2' => 'second label' ]
			] ]
		] ) );
		$status = $this->editPage( $title, $editedContent, 'second revision', NS_MAIN );
		$lastRevisionId = $status->getNewRevision()->getId();

		$this->assertNotSame( $firstRevisionId, $lastRevisionId );

		$request = new FauxRequest( [ 'oldid' => $firstRevisionId ] );

		$context = RequestContext::getMain();
		$context->setRequest( $request );
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Z10000',
			/* request */ $request,
			/* language */ null,
			/* performer */ null,
			/* fullHtml */ false,
			/* context */ $context
		);

		// (T417203) Assert the title is the correct revision
		$this->assertStringContainsString( 'first label', $context->getOutput()->getPageTitle() );
	}

	public function testViewObjectContent(): void {
		$this->createZObjectForZid( 'Z10000' );

		$context = RequestContext::getMain();
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Z10000',
			/* request */ $context->getRequest(),
			/* language */ null,
			/* performer */ null,
			/* fullHtml */ false,
			/* context */ $context
		);

		$this->assertNull( $response->getHeader( 'Location' ) );

		$output = $context->getOutput();
		$jsVars = $output->getJsConfigVars();

		$this->assertArrayHasKey( 'wgWikiLambda', $jsVars );
		$wikiLambdaVars = $jsVars['wgWikiLambda'];

		$this->assertFalse( $wikiLambdaVars['createNewPage'] );
		$this->assertSame( 'Z10000', $wikiLambdaVars['zId'] );
		$this->assertTrue( $wikiLambdaVars['viewmode'] );
	}

	// ------------------------------------------------------------------
	// (T430601) RevisionDelete / suppression
	// ------------------------------------------------------------------

	/**
	 * Create a ZObject with two revisions and hide the FIRST (non-current) revision's text.
	 *
	 * RevisionDeleter::createList()->setVisibility() is used rather than a bare `revision`
	 * table UPDATE because it both writes rev_deleted and purges the RevisionStore/page
	 * caches, so the subsequent page view sees the new visibility rather than a stale,
	 * still-viewable cached RevisionRecord.
	 *
	 * @param string $zid
	 * @param int[] $visibility Bitfield constants to set, e.g. [ RevisionRecord::DELETED_TEXT ]
	 * @return int The hidden revision's ID
	 */
	private function createZObjectWithHiddenFirstRevision( string $zid, array $visibility ): int {
		$title = Title::newFromText( $zid, NS_MAIN );

		// The label is what the callers assert on: it is revision-specific and does reach the
		// rendered page, unlike the Z2K2 body, which the Vue app fetches client-side.
		$makeContent = static fn ( string $label ) => new ZObjectContent( json_encode( [
			'Z1K1' => 'Z2',
			'Z2K1' => [ 'Z1K1' => 'Z6', 'Z6K1' => $zid ],
			'Z2K2' => 'test',
			'Z2K3' => [ 'Z1K1' => 'Z12', 'Z12K1' => [ 'Z11',
				[ 'Z1K1' => 'Z11', 'Z11K1' => 'Z1002', 'Z11K2' => $label ]
			] ]
		] ) );

		$status = $this->editPage(
			$title, $makeContent( 'hidden label' ), 'first revision', NS_MAIN
		);
		$this->assertStatusOK( $status );
		$hiddenRevisionId = $status->getNewRevision()->getId();

		// A second revision, so the hidden one is not the current revision.
		$this->assertStatusOK( $this->editPage(
			$title, $makeContent( 'visible label' ), 'second revision', NS_MAIN
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
	 * Run Special:ViewObject for Z10000 as $viewer and return the resulting OutputPage.
	 *
	 * The shared RequestContext is handed in deliberately, mirroring the pre-existing
	 * testShowOldRevisionTitle(). ZObjectContentHandler::fillParserOutput() writes the
	 * label-derived page title to RequestContext::getMain()->getOutput() rather than to
	 * the special page's own OutputPage, so with a derivative context that write lands on
	 * an object the test never sees and the label appears nowhere — which would make the
	 * "is it hidden?" assertions below pass no matter what the code does.
	 *
	 * @param Authority $viewer
	 * @param FauxRequest $request
	 * @return OutputPage
	 */
	private function executeViewObjectAs( Authority $viewer, FauxRequest $request ): OutputPage {
		$context = RequestContext::getMain();
		$context->setRequest( $request );
		$context->setUser( $viewer );
		$context->setLanguage( 'en' );

		$this->executeSpecialPage(
			/* subpage */ 'en/Z10000',
			/* request */ $request,
			/* language */ null,
			/* performer */ null,
			/* fullHtml */ false,
			/* context */ $context
		);

		return $context->getOutput();
	}

	/**
	 * The bug: /view/<lang>/<Zid>?oldid=<revdel'd> read the revision at the RAW audience
	 * and served it to anyone who asked.
	 *
	 * These tests assert on the requested revision's *label*, not its Z2K2 body, because
	 * fillParserOutput() emits only a placeholder div for the Vue app — the object body
	 * never reaches the server-rendered page at all, so asserting its absence would pass
	 * even against unpatched code. The label does reach the page, via
	 * PageTitleBuilder::createZObjectViewPageTitle(), and it is revision-specific;
	 * testRevisionDeletedLabelIsShownToPrivilegedViewer() is the positive control.
	 */
	public function testRevisionDeletedLabelIsHiddenFromUnprivilegedViewer(): void {
		$hiddenRevisionId = $this->createZObjectWithHiddenFirstRevision(
			'Z10000', [ RevisionRecord::DELETED_TEXT ]
		);

		$output = $this->executeViewObjectAs(
			$this->performer, new FauxRequest( [ 'oldid' => $hiddenRevisionId ] )
		);

		$this->assertStringNotContainsString( 'hidden label', $output->getPageTitle() );
		// Core's rev-deleted-text-permission box, emitted by UIUtils::checkRevisionViewable().
		$this->assertStringContainsString( 'cdx-message--error', $output->getHTML() );
	}

	public function testRevisionDeletedLabelIsShownToPrivilegedViewer(): void {
		$hiddenRevisionId = $this->createZObjectWithHiddenFirstRevision(
			'Z10000', [ RevisionRecord::DELETED_TEXT ]
		);

		$output = $this->executeViewObjectAs(
			$this->getTestSysop()->getAuthority(),
			new FauxRequest( [ 'oldid' => $hiddenRevisionId ] )
		);

		$this->assertStringContainsString( 'hidden label', $output->getPageTitle() );
	}

	public function testSuppressedRevisionLabelIsHiddenFromUnprivilegedViewer(): void {
		$hiddenRevisionId = $this->createZObjectWithHiddenFirstRevision(
			'Z10000', [ RevisionRecord::DELETED_TEXT, RevisionRecord::DELETED_RESTRICTED ]
		);

		$output = $this->executeViewObjectAs(
			$this->performer, new FauxRequest( [ 'oldid' => $hiddenRevisionId ] )
		);

		$this->assertStringNotContainsString( 'hidden label', $output->getPageTitle() );
		$this->assertStringContainsString( 'cdx-message--error', $output->getHTML() );
	}

	// There is deliberately no test for a RevisionDelete'd *current* revision: core refuses
	// to hide the text of a page's latest revision (the revdelete-hide-current error), so
	// that state is unreachable through RevisionDelete. Note that RevDelList::setVisibility()
	// still returns an OK Status in that case, recording the refusal per-item, so a test
	// asserting only assertStatusOK() looks like it hid something when it did not.
}
