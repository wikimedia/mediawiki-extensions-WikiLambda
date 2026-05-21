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
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentEditAction
 * @covers \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentEditPageTrait
 * @covers \MediaWiki\Extension\WikiLambda\PageTitle\PageTitleBuilder::createAbstractEditPageHTMLTitleText
 * @covers \MediaWiki\Extension\WikiLambda\PageTitle\PageTitleBuilder::createAbstractEditPageHtmlTitle
 * @group Database
 */
class AbstractContentEditActionTest extends WikiLambdaClientIntegrationTestCase {

	private const TEST_ABSTRACT_NS = 2300;

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsClientMode();

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
		// as "no explicit revision" so getKnownCurrentRevision serves the load.
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

		// Revision id is still set on the output
		$this->assertSame( $otherRevId, $output->getRevisionId() );
	}
}
