<?php

/**
 * WikiLambda integration test suite for the AbstractContentEditAction class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Context\DerivativeContext;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentEditAction;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent;
use MediaWiki\Extension\WikiLambda\PageTitle\PageTitleBuilder;
use MediaWiki\Page\Article;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\RevisionDelete\RevisionDeleter;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentEditAction
 * @covers \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentEditPageTrait
 * @covers \MediaWiki\Extension\WikiLambda\PageTitle\PageTitleBuilder::createAbstractEditPageHTMLTitleText
 * @covers \MediaWiki\Extension\WikiLambda\PageTitle\PageTitleBuilder::createAbstractEditPageHtmlTitle
 * @group Database
 */
class AbstractContentEditActionTest extends WikiLambdaAbstractModeIntegrationTestCase {

	private const TEST_ABSTRACT_NS = 2300;

	protected function setUp(): void {
		parent::setUp();

		// Mock Wikidata lookup entities so:
		// * Q42 exists, has label in 'en'
		// * Q34086 exists, has label in 'en'
		// * Q43 exists, has no label in 'en'
		// * Q999999 does not exist
		// For any other behavior, individual tests can override this mock
		$this->mockWikidataEntityLookup( [
			'Q42' => [ 'en' => 'Douglas Adams' ],
			'Q34086' => [ 'en' => 'Justin Bieber' ],
			'Q43' => []
		] );
	}

	/**
	 * @param Title $title
	 * @param FauxRequest|null $request
	 * @return AbstractContentEditAction
	 */
	private function buildAction( Title $title, ?FauxRequest $request = null ): AbstractContentEditAction {
		$context = $this->getTestContext( $title, $request );
		$article = Article::newFromTitle( $title, $context );
		return new AbstractContentEditAction(
			$article,
			$context,
			$this->getServiceContainer()->getRevisionStore(),
			$this->getServiceContainer()->getContentHandlerFactory()
		);
	}

	/**
	 * @param Title $title
	 * @param FauxRequest|null $request
	 * @return DerivativeContext
	 */
	private function getTestContext( Title $title, ?FauxRequest $request = null ): DerivativeContext {
		$context = new DerivativeContext( RequestContext::getMain() );
		$context->setTitle( $title );
		$context->setLanguage( 'en' );
		if ( $request !== null ) {
			$context->setRequest( $request );
		}
		return $context;
	}

	public function testGetName() {
		$title = Title::newFromText( 'Q42', self::TEST_ABSTRACT_NS );
		$action = $this->buildAction( $title );

		$this->assertSame( 'edit', $action->getName() );
	}

	public function testGetRestriction() {
		$title = Title::newFromText( 'Q42', self::TEST_ABSTRACT_NS );
		$action = $this->buildAction( $title );

		$this->assertSame( 'wikilambda-abstract-create', $action->getRestriction() );
	}

	public function testDoesWrites() {
		$title = Title::newFromText( 'Q42', self::TEST_ABSTRACT_NS );
		$action = $this->buildAction( $title );

		$this->assertTrue( $action->doesWrites() );
	}

	public function testShow_newPage() {
		$title = Title::newFromText( 'Q99999', self::TEST_ABSTRACT_NS );
		$action = $this->buildAction( $title );

		$action->show();

		$output = $action->getOutput();

		// Vue app container should be present
		$this->assertStringContainsString( 'ext-wikilambda-app', $output->getHTML() );

		// Config vars should indicate a new page
		$jsVars = $output->getJsConfigVars();
		$this->assertTrue( $jsVars[ 'wgWikiLambda' ][ 'createNewPage' ] );
		$this->assertFalse( $jsVars[ 'wgWikiLambda' ][ 'viewmode' ] );

		// Page title should use the "create" message
		$this->assertStringContainsString( 'Q99999', $output->getPageTitle() );
	}

	public function testShow_existingPage() {
		// First, create a page with abstract content
		$title = Title::newFromText( 'Q43', self::TEST_ABSTRACT_NS );
		$jsonContent = '{"qid":"Q43","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}';
		$content = new AbstractWikiContent( $jsonContent );

		$this->editPage( $title, $content, 'test abstract page', self::TEST_ABSTRACT_NS );

		$action = $this->buildAction( $title );

		$action->show();

		$output = $action->getOutput();

		// Config vars should indicate an existing page
		$jsVars = $output->getJsConfigVars();
		$this->assertFalse( $jsVars[ 'wgWikiLambda' ][ 'createNewPage' ] );
		$this->assertSame( $jsonContent, $jsVars[ 'wgWikiLambda' ][ 'content' ] );

		// (T426833) Browser <title> uses the edit message and must not duplicate the QID
		// (the bug appended " (Q42)" to a title that, when labelled, already ends in "(Q42)").
		$htmlTitle = $output->getHTMLTitle();
		$this->assertStringContainsString( 'Edit Abstract Article for Q43', $htmlTitle );
		$this->assertStringNotContainsString( '(Q43)', $htmlTitle );
	}

	public function testShow_existingPageHtmlTitleWithLabel() {
		// Q8776414 is the lede section QID; required by AbstractWikiContent.php validation
		$content = new AbstractWikiContent(
			'{"qid":"Q34086","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}'
		);
		$status = $this->editPage( 'Q34086', $content, 'test abstract page', self::TEST_ABSTRACT_NS );

		$title = Title::newFromText( 'Q34086', self::TEST_ABSTRACT_NS );
		$action = $this->buildAction( $title );
		$action->show();

		// (T426833) "Edit Abstract Article for "Justin Bieber" (Q34086) - <sitename>",
		// with the QID appearing exactly once (the bug produced "(Q34086) (Q34086)").
		$htmlTitle = $action->getOutput()->getHTMLTitle();
		$this->assertStringContainsString( 'Edit Abstract Article for "Justin Bieber" (Q34086)', $htmlTitle );
		$this->assertStringNotContainsString( '(Q34086) (Q34086)', $htmlTitle );
	}

	public function testGetPageTitleMsgExistingPageWithLabel() {
		// Q8776414 is the lede section QID; required by AbstractWikiContent.php validation
		$content = new \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent(
			'{"qid":"Q34086","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}'
		);
		$this->editPage( 'Q34086', $content, 'test abstract page', self::TEST_ABSTRACT_NS );

		$title = Title::newFromText( 'Q34086', self::TEST_ABSTRACT_NS );
		$action = $this->buildAction( $title );

		$result = $this->invokeGetPageTitle( $action, $title );

		$this->assertStringContainsString( 'Justin Bieber', $result );
		$this->assertStringContainsString( 'Q34086', $result );
		$this->assertStringContainsString( 'Edit Abstract Article for', $result );
	}

	public function testGetPageTitleMsgExistingPageWithoutLabel() {
		$mockEntityLookup = $this->mockWikidataEntityLookup( [ 'Q34086' => [] ] );
		// Q8776414 is the lede section QID; required by AbstractWikiContent.php validation
		$content = new AbstractWikiContent(
			'{"qid":"Q34086","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}'
		);
		$this->editPage( 'Q34086', $content, 'test abstract page', self::TEST_ABSTRACT_NS );

		$title = Title::newFromText( 'Q34086', self::TEST_ABSTRACT_NS );
		$action = $this->buildAction( $title );

		$result = $this->invokeGetPageTitle( $action, $title );

		$this->assertStringContainsString( 'Q34086', $result );
		$this->assertStringContainsString( 'Edit Abstract Article for Q34086', $result );
	}

	private function invokeGetPageTitle( AbstractContentEditAction $action, Title $title ) {
		// (T426833) The edit/create page-title text is now built by PageTitleBuilder,
		// localised in the action's language.
		return PageTitleBuilder::createAbstractEditPageHTMLTitleText(
			$title,
			$action->getContext()->getLanguage()->getCode()
		);
	}

	public function testShow_existingPageWithOldid() {
		// Create initial revision, then make a second revision
		$title = Title::newFromText( 'Q42', self::TEST_ABSTRACT_NS );

		$firstJson = '{"qid":"Q42","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}';
		$firstContent = new AbstractWikiContent( $firstJson );
		$firstStatus = $this->editPage( $title, $firstContent, 'test abstract page', self::TEST_ABSTRACT_NS );
		$firstRevId = $firstStatus->getNewRevision()->getId();

		$secondJson = '{"qid":"Q42","sections":{"Q8776414":{"index":0,"fragments":["Z89","Z90"]}}}';
		$secondContent = new AbstractWikiContent( $secondJson );
		$this->editPage( $title, $secondContent, 'test abstract page', self::TEST_ABSTRACT_NS );

		// Build an action whose request points at the older revision
		$action = $this->buildAction( $title, new FauxRequest( [ 'oldid' => $firstRevId ] ) );

		$action->show();

		$output = $action->getOutput();
		$jsVars = $output->getJsConfigVars();

		// Content should be the first revision's content, not the latest
		$this->assertFalse( $jsVars[ 'wgWikiLambda' ][ 'createNewPage' ] );
		$this->assertSame( $firstJson, $jsVars[ 'wgWikiLambda' ][ 'content' ] );

		// Revision id should be set on the output page (T364318)
		$this->assertSame( $firstRevId, $output->getRevisionId() );
	}

	public function testShow_existingPageWithDiffPrefersNewerRevision() {
		// Regression: on a diff URL like ?diff=Y&oldid=X the right-hand (newer)
		// revision is what's displayed below the diff. The trait used to read
		// 'oldid' unconditionally, which would have silently loaded the older
		// (left-side) revision if a diff URL ever reached this code path.
		$title = Title::newFromText( 'Q42', self::TEST_ABSTRACT_NS );

		$firstJson = '{"qid":"Q42","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}';
		$firstContent = new AbstractWikiContent( $firstJson );
		$firstStatus = $this->editPage( $title, $firstContent, 'test abstract page', self::TEST_ABSTRACT_NS );
		$firstRevId = $firstStatus->getNewRevision()->getId();

		$secondJson = '{"qid":"Q42","sections":{"Q8776414":{"index":0,"fragments":["Z89","Z90"]}}}';
		$secondContent = new AbstractWikiContent( $secondJson );
		$secondStatus = $this->editPage( $title, $secondContent, 'test abstract page', self::TEST_ABSTRACT_NS );
		$secondRevId = $secondStatus->getNewRevision()->getId();

		// ?diff=<newer>&oldid=<older>: should load the newer (right-side) revision
		$action = $this->buildAction(
			$title,
			new FauxRequest( [ 'diff' => (string)$secondRevId, 'oldid' => $firstRevId ] )
		);

		$action->show();

		$jsVars = $action->getOutput()->getJsConfigVars();
		$this->assertSame( $secondJson, $jsVars[ 'wgWikiLambda' ][ 'content' ] );
		$this->assertSame( $secondRevId, $action->getOutput()->getRevisionId() );
	}

	public function testShow_existingPageWithSymbolicDiffFallsBackToLatest() {
		// 'diff=0' resolves to the current revision in core; we represent that
		// as "no explicit revision" so getKnownLatestRevision serves the load.
		$title = Title::newFromText( 'Q42', self::TEST_ABSTRACT_NS );

		$firstJson = '{"qid":"Q42","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}';
		$firstContent = new AbstractWikiContent( $firstJson );
		$status = $this->editPage( $title, $firstContent, 'test abstract page', self::TEST_ABSTRACT_NS );

		$secondJson = '{"qid":"Q42","sections":{"Q8776414":{"index":0,"fragments":["Z89","Z90"]}}}';
		$secondContent = new AbstractWikiContent( $secondJson );
		$status = $this->editPage( $title, $secondContent, 'test abstract page', self::TEST_ABSTRACT_NS );

		$action = $this->buildAction(
			$title,
			new FauxRequest( [ 'diff' => '0', 'oldid' => '12345' ] )
		);

		$action->show();

		$jsVars = $action->getOutput()->getJsConfigVars();
		// Latest revision content, not the bogus oldid
		$this->assertSame( $secondJson, $jsVars[ 'wgWikiLambda' ][ 'content' ] );
		// No oldid subtitle set, since we're effectively on the current revision
		$this->assertNull( $action->getOutput()->getRevisionId() );
	}

	public function testShow_existingPageWithOldidFromAnotherTitle() {
		$targetTitle = Title::newFromText( 'Q42', self::TEST_ABSTRACT_NS );
		$targetJson = '{"qid":"Q42","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}';
		$targetContent = new AbstractWikiContent( $targetJson );
		$this->editPage( $targetTitle, $targetContent, 'test abstract page', self::TEST_ABSTRACT_NS );

		$otherTitle = Title::newFromText( 'Q43', self::TEST_ABSTRACT_NS );
		$otherJson = '{"qid":"Q43","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}';
		$otherContent = new AbstractWikiContent( $otherJson );
		$otherStatus = $this->editPage( $otherTitle, $otherContent, 'other', self::TEST_ABSTRACT_NS );
		$otherRevId = $otherStatus->getNewRevision()->getId();

		// Visit edit for Q44 with oldid pointing at Q45's revision
		$action = $this->buildAction( $targetTitle, new FauxRequest( [ 'oldid' => $otherRevId ] ) );

		$action->show();

		$output = $action->getOutput();
		$jsVars = $output->getJsConfigVars();

		// getRevisionByTitle returns null for a mismatched title/revision, so content is false
		$this->assertFalse( $jsVars[ 'wgWikiLambda' ][ 'createNewPage' ] );
		$this->assertFalse( $jsVars[ 'wgWikiLambda' ][ 'content' ] );

		// (T430601) The revision id is no longer set for an oldid that belongs to another
		// page: pointing OutputPage at it would make this page's permanent link resolve to
		// a revision of a different page.
		$this->assertNull( $output->getRevisionId() );
	}

	// ------------------------------------------------------------------
	// (T430601) RevisionDelete / suppression
	// ------------------------------------------------------------------

	/**
	 * Create an Abstract page with two revisions and hide the FIRST (non-current) one's text.
	 *
	 * RevisionDeleter::createList()->setVisibility() is used rather than a bare `revision`
	 * table UPDATE because it both writes rev_deleted and purges the RevisionStore/page
	 * caches, so the subsequent read sees the new visibility rather than a stale, still-
	 * viewable cached RevisionRecord.
	 *
	 * @param Title $title
	 * @param int[] $visibility Bitfield constants to set, e.g. [ RevisionRecord::DELETED_TEXT ]
	 * @return array{0:int,1:string} [ $hiddenRevisionId, $hiddenJson ]
	 */
	private function createPageWithHiddenFirstRevision( Title $title, array $visibility ): array {
		$hiddenJson = '{"qid":"Q42","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}';
		$status = $this->editPage(
			$title, new AbstractWikiContent( $hiddenJson ), 'first', self::TEST_ABSTRACT_NS
		);
		$this->assertStatusOK( $status );
		$hiddenRevisionId = $status->getNewRevision()->getId();

		// A second revision, so the hidden one is not the current revision.
		$visibleJson = '{"qid":"Q42","sections":{"Q8776414":{"index":0,"fragments":["Z89","Z90"]}}}';
		$this->assertStatusOK( $this->editPage(
			$title, new AbstractWikiContent( $visibleJson ), 'second', self::TEST_ABSTRACT_NS
		) );

		// Derivative, so the sysop does not leak into the action under test via the
		// shared context that getTestContext() derives from.
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

		return [ $hiddenRevisionId, $hiddenJson ];
	}

	public function testShow_revisionDeletedOldidRendersNoEditorForUnprivilegedViewer() {
		$title = Title::newFromText( 'Q42', self::TEST_ABSTRACT_NS );
		[ $hiddenRevisionId, $hiddenJson ] = $this->createPageWithHiddenFirstRevision(
			$title, [ RevisionRecord::DELETED_TEXT ]
		);

		$context = $this->getTestContext( $title, new FauxRequest( [ 'oldid' => $hiddenRevisionId ] ) );
		$context->setUser( $this->getTestUser()->getUser() );
		$action = new AbstractContentEditAction(
			Article::newFromTitle( $title, $context ),
			$context,
			$this->getServiceContainer()->getRevisionStore(),
			$this->getServiceContainer()->getContentHandlerFactory()
		);

		$action->show();

		$output = $action->getOutput();
		$html = $output->getHTML();

		// No editor, and no content of any kind handed to the SPA.
		$this->assertArrayNotHasKey( 'wgWikiLambda', $output->getJsConfigVars() );
		$this->assertStringNotContainsString( 'ext-wikilambda-app', $html );
		$this->assertStringNotContainsString( $hiddenJson, $html );
		// Core's rev-deleted-text-permission box, emitted by UIUtils::checkRevisionViewable().
		$this->assertStringContainsString( 'cdx-message--error', $html );
	}

	/**
	 * A viewer who may see hidden text still gets core's confirmation step. Before T430601
	 * this path handed the deleted content straight to the SPA with no 'unhide' gate.
	 */
	public function testShow_revisionDeletedOldidNeedsUnhideForPrivilegedViewer() {
		$title = Title::newFromText( 'Q42', self::TEST_ABSTRACT_NS );
		[ $hiddenRevisionId, $hiddenJson ] = $this->createPageWithHiddenFirstRevision(
			$title, [ RevisionRecord::DELETED_TEXT ]
		);

		$context = $this->getTestContext( $title, new FauxRequest( [ 'oldid' => $hiddenRevisionId ] ) );
		$context->setUser( $this->getTestSysop()->getUser() );
		$action = new AbstractContentEditAction(
			Article::newFromTitle( $title, $context ),
			$context,
			$this->getServiceContainer()->getRevisionStore(),
			$this->getServiceContainer()->getContentHandlerFactory()
		);

		$action->show();

		$output = $action->getOutput();
		$this->assertArrayNotHasKey( 'wgWikiLambda', $output->getJsConfigVars() );
		$this->assertStringNotContainsString( $hiddenJson, $output->getHTML() );
	}

	public function testShow_revisionDeletedOldidServedWithUnhideForPrivilegedViewer() {
		$title = Title::newFromText( 'Q42', self::TEST_ABSTRACT_NS );
		[ $hiddenRevisionId, $hiddenJson ] = $this->createPageWithHiddenFirstRevision(
			$title, [ RevisionRecord::DELETED_TEXT ]
		);

		$context = $this->getTestContext(
			$title, new FauxRequest( [ 'oldid' => $hiddenRevisionId, 'unhide' => 1 ] )
		);
		$context->setUser( $this->getTestSysop()->getUser() );
		$action = new AbstractContentEditAction(
			Article::newFromTitle( $title, $context ),
			$context,
			$this->getServiceContainer()->getRevisionStore(),
			$this->getServiceContainer()->getContentHandlerFactory()
		);

		$action->show();

		$jsVars = $action->getOutput()->getJsConfigVars();
		$this->assertSame( $hiddenJson, $jsVars[ 'wgWikiLambda' ][ 'content' ] );
	}

	/**
	 * The trait used to rewrite 'oldid' on the shared WebRequest, so on a ?diff= URL every
	 * later consumer in the request (skin nav, other extensions' hooks) saw the diff's
	 * right-hand revision instead of the one the user asked for.
	 */
	public function testShow_doesNotMutateSharedRequestOldid() {
		$title = Title::newFromText( 'Q42', self::TEST_ABSTRACT_NS );

		$firstJson = '{"qid":"Q42","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}';
		$firstStatus = $this->editPage(
			$title, new AbstractWikiContent( $firstJson ), 'first', self::TEST_ABSTRACT_NS
		);
		$firstRevId = $firstStatus->getNewRevision()->getId();

		$secondJson = '{"qid":"Q42","sections":{"Q8776414":{"index":0,"fragments":["Z89","Z90"]}}}';
		$secondStatus = $this->editPage(
			$title, new AbstractWikiContent( $secondJson ), 'second', self::TEST_ABSTRACT_NS
		);
		$secondRevId = $secondStatus->getNewRevision()->getId();

		$request = new FauxRequest( [ 'diff' => (string)$secondRevId, 'oldid' => $firstRevId ] );
		$action = $this->buildAction( $title, $request );

		$action->show();

		// The trait resolved the diff's right-hand side for its own use…
		$this->assertSame( $secondRevId, $action->getOutput()->getRevisionId() );
		// …without rewriting what the rest of the request sees.
		$this->assertSame( $firstRevId, $request->getInt( 'oldid' ) );
	}
}
