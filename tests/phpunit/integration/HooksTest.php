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
}
