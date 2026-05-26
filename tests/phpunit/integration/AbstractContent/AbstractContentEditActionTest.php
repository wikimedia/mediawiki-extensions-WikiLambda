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
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContentHandler;
use MediaWiki\Page\Article;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentEditAction
 * @covers \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentEditPageTrait
 * @group Database
 */
class AbstractContentEditActionTest extends WikiLambdaClientIntegrationTestCase {

	private const TEST_ABSTRACT_NS = 2300;

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsClientMode();

		if ( !ExtensionRegistry::getInstance()->isLoaded( 'WikibaseClient' ) ) {
			$this->markTestSkipped( 'WikibaseClient not available' );
		}
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

	/**
	 * @return AbstractWikiContentHandler
	 */
	private function getAbstractContentHandler(): AbstractWikiContentHandler {
		return new AbstractWikiContentHandler(
			CONTENT_MODEL_ABSTRACT,
			$this->getServiceContainer()->getMainConfig()
		);
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
		$title = Title::newFromText( 'Q42', self::TEST_ABSTRACT_NS );
		$jsonContent = '{"qid":"Q42","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}';

		$contentHandler = $this->getAbstractContentHandler();
		$content = $contentHandler->makeContent( $jsonContent, $title, CONTENT_MODEL_ABSTRACT );
		$this->editPage( $title, $content );

		$action = $this->buildAction( $title );

		$action->show();

		$output = $action->getOutput();

		// Config vars should indicate an existing page
		$jsVars = $output->getJsConfigVars();
		$this->assertFalse( $jsVars[ 'wgWikiLambda' ][ 'createNewPage' ] );
		$this->assertSame( $jsonContent, $jsVars[ 'wgWikiLambda' ][ 'content' ] );
	}

	public function testGetPageTitleMsgExistingPageWithLabel() {
		// Q8776414 is the lede section QID; required by AbstractWikiContent.php validation
		$content = new \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent(
			'{"qid":"Q34086","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}'
		);
		$status = $this->editPage( 'Q34086', $content, 'test abstract page', self::TEST_ABSTRACT_NS );

		$this->mockWikibaseClientServicesForAbstractMode( 'Q34086', 'en', 'Justin Bieber' );

		$title = Title::newFromText( 'Q34086', self::TEST_ABSTRACT_NS );
		$action = $this->buildAction( $title );

		$result = $this->invokeGetPageTitle( $action, $title );

		$this->assertStringContainsString( 'Justin Bieber', $result );
		$this->assertStringContainsString( 'Q34086', $result );
		$this->assertStringContainsString( 'Edit Abstract Article for', $result );
	}

	public function testGetPageTitleMsgExistingPageWithoutLabel() {
		// Q8776414 is the lede section QID; required by AbstractWikiContent.php validation
		$content = new AbstractWikiContent(
			'{"qid":"Q34086","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}'
		);
		$this->editPage( 'Q34086', $content, 'test abstract page', self::TEST_ABSTRACT_NS );

		$mockTermList = $this->createMock( \Wikibase\DataModel\Term\TermList::class );
		$mockTermList->method( 'getByLanguage' )
			->willThrowException( new \OutOfBoundsException( 'Term with languageCode "en" not found' ) );

		$mockItem = $this->createMock( \Wikibase\DataModel\Entity\Item::class );
		$mockItem->method( 'getLabels' )->willReturn( $mockTermList );

		$mockEntityLookup = $this->createMock( \Wikibase\DataModel\Services\Lookup\EntityLookup::class );
		$mockEntityLookup->method( 'getEntity' )->willReturn( $mockItem );

		$mockClientStore = $this->createMock( \Wikibase\Client\Store\ClientStore::class );
		$mockClientStore->method( 'getEntityLookup' )->willReturn( $mockEntityLookup );

		$mockItemId = $this->createMock( \Wikibase\DataModel\Entity\ItemId::class );
		$mockEntityIdParser = $this->createMock( \Wikibase\DataModel\Entity\EntityIdParser::class );
		$mockEntityIdParser->method( 'parse' )->willReturnMap( [ [ 'Q34086', $mockItemId ] ] );

		$this->setService( 'WikibaseClient.Store', $mockClientStore );
		$this->setService( 'WikibaseClient.EntityIdParser', $mockEntityIdParser );

		$title = Title::newFromText( 'Q34086', self::TEST_ABSTRACT_NS );
		$action = $this->buildAction( $title );

		$result = $this->invokeGetPageTitle( $action, $title );

		$this->assertStringContainsString( 'Q34086', $result );
		$this->assertStringContainsString( 'Edit Abstract Article for Q34086', $result );
	}

	private function invokeGetPageTitle( AbstractContentEditAction $action, Title $title ) {
		$reflection = new \ReflectionClass( AbstractContentEditAction::class );
		$method = $reflection->getMethod( 'getPageTitleMsg' );
		$method->setAccessible( true );

		return $method->invoke( $action, $title );
	}

	public function testShow_existingPageWithOldid() {
		// Create initial revision, then make a second revision
		$title = Title::newFromText( 'Q43', self::TEST_ABSTRACT_NS );
		$contentHandler = $this->getAbstractContentHandler();

		$firstContent = '{"qid":"Q43","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}';
		$firstStatus = $this->editPage(
			$title,
			$contentHandler->makeContent( $firstContent, $title, CONTENT_MODEL_ABSTRACT )
		);
		$firstRevId = $firstStatus->getNewRevision()->getId();

		$secondContent = '{"qid":"Q43","sections":{"Q8776414":{"index":0,"fragments":["Z89","Z90"]}}}';
		$this->editPage(
			$title,
			$contentHandler->makeContent( $secondContent, $title, CONTENT_MODEL_ABSTRACT )
		);

		// Build an action whose request points at the older revision
		$action = $this->buildAction( $title, new FauxRequest( [ 'oldid' => $firstRevId ] ) );

		$action->show();

		$output = $action->getOutput();
		$jsVars = $output->getJsConfigVars();

		// Content should be the first revision's content, not the latest
		$this->assertFalse( $jsVars[ 'wgWikiLambda' ][ 'createNewPage' ] );
		$this->assertSame( $firstContent, $jsVars[ 'wgWikiLambda' ][ 'content' ] );

		// Revision id should be set on the output page (T364318)
		$this->assertSame( $firstRevId, $output->getRevisionId() );
	}

	public function testShow_existingPageWithDiffPrefersNewerRevision() {
		// Regression: on a diff URL like ?diff=Y&oldid=X the right-hand (newer)
		// revision is what's displayed below the diff. The trait used to read
		// 'oldid' unconditionally, which would have silently loaded the older
		// (left-side) revision if a diff URL ever reached this code path.
		$title = Title::newFromText( 'Q46', self::TEST_ABSTRACT_NS );
		$contentHandler = $this->getAbstractContentHandler();

		$firstContent = '{"qid":"Q46","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}';
		$firstStatus = $this->editPage(
			$title,
			$contentHandler->makeContent( $firstContent, $title, CONTENT_MODEL_ABSTRACT )
		);
		$firstRevId = $firstStatus->getNewRevision()->getId();

		$secondContent = '{"qid":"Q46","sections":{"Q8776414":{"index":0,"fragments":["Z89","Z90"]}}}';
		$secondStatus = $this->editPage(
			$title,
			$contentHandler->makeContent( $secondContent, $title, CONTENT_MODEL_ABSTRACT )
		);
		$secondRevId = $secondStatus->getNewRevision()->getId();

		// ?diff=<newer>&oldid=<older>: should load the newer (right-side) revision
		$action = $this->buildAction(
			$title,
			new FauxRequest( [ 'diff' => (string)$secondRevId, 'oldid' => $firstRevId ] )
		);

		$action->show();

		$jsVars = $action->getOutput()->getJsConfigVars();
		$this->assertSame( $secondContent, $jsVars[ 'wgWikiLambda' ][ 'content' ] );
		$this->assertSame( $secondRevId, $action->getOutput()->getRevisionId() );
	}

	public function testShow_existingPageWithSymbolicDiffFallsBackToLatest() {
		// 'diff=0' resolves to the current revision in core; we represent that
		// as "no explicit revision" so getKnownCurrentRevision serves the load.
		$title = Title::newFromText( 'Q47', self::TEST_ABSTRACT_NS );
		$contentHandler = $this->getAbstractContentHandler();

		$firstContent = '{"qid":"Q47","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}';
		$this->editPage(
			$title,
			$contentHandler->makeContent( $firstContent, $title, CONTENT_MODEL_ABSTRACT )
		);

		$secondContent = '{"qid":"Q47","sections":{"Q8776414":{"index":0,"fragments":["Z89","Z90"]}}}';
		$this->editPage(
			$title,
			$contentHandler->makeContent( $secondContent, $title, CONTENT_MODEL_ABSTRACT )
		);

		$action = $this->buildAction(
			$title,
			new FauxRequest( [ 'diff' => '0', 'oldid' => '12345' ] )
		);

		$action->show();

		$jsVars = $action->getOutput()->getJsConfigVars();
		// Latest revision content, not the bogus oldid
		$this->assertSame( $secondContent, $jsVars[ 'wgWikiLambda' ][ 'content' ] );
		// No oldid subtitle set, since we're effectively on the current revision
		$this->assertSame( 0, $action->getOutput()->getRevisionId() );
	}

	public function testShow_existingPageWithOldidFromAnotherTitle() {
		// Create the target page (Q44) and a second page (Q45) with its own revision
		$contentHandler = $this->getAbstractContentHandler();

		$targetTitle = Title::newFromText( 'Q44', self::TEST_ABSTRACT_NS );
		$targetContent = '{"qid":"Q44","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}';
		$this->editPage(
			$targetTitle,
			$contentHandler->makeContent( $targetContent, $targetTitle, CONTENT_MODEL_ABSTRACT )
		);

		$otherTitle = Title::newFromText( 'Q45', self::TEST_ABSTRACT_NS );
		$otherContent = '{"qid":"Q45","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}';
		$otherStatus = $this->editPage(
			$otherTitle,
			$contentHandler->makeContent( $otherContent, $otherTitle, CONTENT_MODEL_ABSTRACT )
		);
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
