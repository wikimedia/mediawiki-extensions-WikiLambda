<?php

/**
 * WikiLambda integration test suite for the AbstractContentEditAction class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentEditAction;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContentHandler;
use MediaWiki\Page\Article;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentEditAction
 * @group Database
 */
class AbstractContentEditActionTest extends WikiLambdaIntegrationTestCase {

	private const TEST_ABSTRACT_NS = 2300;

	/**
	 * @param Title $title
	 * @return AbstractContentEditAction
	 */
	private function buildAction( Title $title ): AbstractContentEditAction {
		$context = $this->getTestContext( $title );
		$article = Article::newFromTitle( $title, $context );
		return new AbstractContentEditAction( $article, $context );
	}

	/**
	 * @param Title $title
	 * @return \MediaWiki\Context\DerivativeContext
	 */
	private function getTestContext( Title $title ) {
		$context = new \MediaWiki\Context\DerivativeContext( \MediaWiki\Context\RequestContext::getMain() );
		$context->setTitle( $title );
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
		$title = Title::newFromText( 'Q42', self::TEST_ABSTRACT_NS );
		$jsonContent = '{"qid":"Q42","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}';

		$contentHandler = new AbstractWikiContentHandler(
			CONTENT_MODEL_ABSTRACT,
			$this->getServiceContainer()->getMainConfig(),
			$this->getServiceContainer()->getContentHandlerFactory()
		);
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
}
