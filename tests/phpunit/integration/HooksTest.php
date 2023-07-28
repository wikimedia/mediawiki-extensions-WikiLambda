<?php

/**
 * WikiLambda integration test suite for hooks
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use FauxRequest;
use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Title\Title;
use RequestContext;
use SpecialRecentChanges;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Hooks
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\PageRenderingHandler
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\PageEditingHandler
 * @group Database
 */
class HooksTest extends WikiLambdaIntegrationTestCase {

	public function testOnMultiContentSave_otherNameSpace() {
		$invalidTitleText = 'This is a title';

		$invalidZIDStatus = $this->editPage(
			$invalidTitleText, ZTestType::TEST_ENCODING, 'Test content', NS_PROJECT
		);

		$this->assertTrue( $invalidZIDStatus->isOK() );

		$invalidTitle = Title::newFromText( $invalidTitleText, NS_PROJECT );
		$this->assertTrue( $invalidTitle->exists() );
	}

	public function testOnMultiContentSave_badTitle() {
		$invalidTitleText = 'Bad page title';

		$invalidZIDStatus = $this->editPage(
			$invalidTitleText, ZTestType::TEST_ENCODING, 'Test bad title', NS_MAIN
		);

		$this->assertFalse( $invalidZIDStatus->isOK() );
		$this->assertTrue( $invalidZIDStatus->hasMessage( 'wikilambda-invalidzobjecttitle' ) );

		$invalidTitle = Title::newFromText( $invalidTitleText, NS_MAIN );
		$this->assertFalse( $invalidTitle->exists() );
	}

	public function testOnMultiContentSave_badContent() {
		$invalidContent = '{"Z1K1": "Z3"}';

		$invalidZIDStatus = $this->editPage(
			ZTestType::TEST_ZID, $invalidContent, 'Test bad content', NS_MAIN
		);

		$this->assertFalse( $invalidZIDStatus->isOK() );
		$this->assertTrue( $invalidZIDStatus->hasMessage( 'wikilambda-invalidzobject' ) );
	}

	public function testRegisterExtension() {
		$zObjectTitle = Title::newFromText( 'Z1' );
		$this->assertTrue( $zObjectTitle->isContentPage() );

		$this->assertSame( 'zobject', CONTENT_MODEL_ZOBJECT ?? '' );
		$this->assertSame( CONTENT_MODEL_ZOBJECT, $zObjectTitle->getContentModel() );

		$this->assertFalse( $zObjectTitle->isWikitextPage() );

		global $wgNonincludableNamespaces;
		$this->assertArrayHasKey( NS_MAIN, $wgNonincludableNamespaces );

		global $wgNamespaceProtection;
		$this->assertContains( 'wikilambda-edit', $wgNamespaceProtection[NS_MAIN] );
		$this->assertContains( 'wikilambda-create', $wgNamespaceProtection[NS_MAIN] );
	}

	public function testOnNamespaceIsMovable() {
		$zObjectTitle = Title::newFromText( 'Z1' );
		$this->assertFalse( $zObjectTitle->isMovable() );

		$zObjectTalkTitle = Title::newFromText( 'Z1', NS_TALK );
		$this->assertTrue( $zObjectTalkTitle->isMovable() );
	}

	protected function getRecentChangesPage(): SpecialRecentChanges {
		return new SpecialRecentChanges(
			$this->getServiceContainer()->getWatchedItemStore(),
			$this->getServiceContainer()->getMessageCache(),
			$this->getServiceContainer()->getUserOptionsLookup()
		);
	}

	public function testOnHtmlPageLinkRendererEnd_noDoubleEscape() {
		$createdStatus = $this->editPage(
			ZTestType::TEST_ZID, ZTestType::TEST_HTML_ESCAPE, 'Test html escape', NS_MAIN
		);

		$this->assertTrue( $createdStatus->isOK() );

		$context = RequestContext::getMain();

		$context->setTitle( Title::newFromText( __METHOD__ ) );
		$context->setRequest( new FauxRequest );

		// Confirm that the test page is in RC and the label was escaped exactly
		// once.
		$rc1 = $this->getRecentChangesPage();
		$rc1->setContext( $context );
		$rc1->execute( null );
		$this->assertStringContainsString( "&lt;&lt;&lt;&gt;&gt;&gt;", $rc1->getOutput()->getHTML() );
	}

	public function testOnHtmlPageLinkRendererEnd_changedTargetToViewUrl() {
		$this->insertZids( [ 'Z1' ] );

		$linkRenderer = $this->getServiceContainer()->getLinkRenderer();

		$z1Title = Title::newFromDBkey( 'Z1' );

		$this->setUserLang( 'en' );
		$z1RenderedLink = $linkRenderer->makeKnownLink( $z1Title );
		$this->assertEquals(
			'<a href="/view/en/Z1" title="Z1">Object (<span dir="ltr">Z1</span>)</a>',
			$z1RenderedLink,
			'English label, ZID, /view link'
		);

		// In general not using makeBrokenLink() as it's harder to test, but a demonstration
		$z1RenderedLink = $linkRenderer->makeBrokenLink( $z1Title );
		$this->assertEquals(
			'<a href="/view/en/Z1 (page does not exist)" class="new" ' .
				'title="Z1 (page does not exist)">Object (<span dir="ltr">Z1</span>)</a>',
			$z1RenderedLink,
			'English label, ZID, /view link'
		);

		$z1RenderedLink = $linkRenderer->makeKnownLink( $z1Title, 'hello' );
		$this->assertEquals(
			'<a href="/view/en/Z1" title="Z1">hello</a>',
			$z1RenderedLink,
			'Custom label, no ZID, /view link'
		);

		$this->setUserLang( 'fr' );
		$z1RenderedLink = $linkRenderer->makeKnownLink( $z1Title );
		$this->assertEquals( '<a href="/view/fr/Z1" title="Z1">Object (<span dir="ltr">Z1</span>)</a>',
			$z1RenderedLink,
			'French label, ZID, /view link'
		);

		$this->setMwGlobals( 'wgArticlePath', '/wiki/$1' );
		$z1TalkTitle = Title::newFromDBkey( 'Talk:Z1' );
		$z1TalkRenderedLink = $linkRenderer->makeKnownLink( $z1TalkTitle );
		$this->assertEquals(
			'<a href="/wiki/Talk:Z1" title="Talk:Z1">Talk:Z1</a>',
			$z1TalkRenderedLink,
			'Talk pages are not over-ridden'
		);
	}
}
