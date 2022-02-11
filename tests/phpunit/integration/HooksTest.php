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
use RequestContext;
use SpecialRecentChanges;
use Title;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\Hooks
 * @group Database
 */
class HooksTest extends WikiLambdaIntegrationTestCase {
	/**
	 * @covers ::onMultiContentSave
	 */
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

	/**
	 * @covers ::onMultiContentSave
	 */
	public function testOnMultiContentSave_badContent() {
		$invalidContent = '{"Z1K1": "Z3"}';

		$invalidZIDStatus = $this->editPage(
			ZTestType::TEST_ZID, $invalidContent, 'Test bad content', NS_MAIN
		);

		$this->assertFalse( $invalidZIDStatus->isOK() );
		$this->assertTrue( $invalidZIDStatus->hasMessage( 'wikilambda-invalidzobject' ) );
	}

	protected function getRecentChangesPage(): SpecialRecentChanges {
		return new SpecialRecentChanges(
			$this->getServiceContainer()->getWatchedItemStore(),
			$this->getServiceContainer()->getMessageCache(),
			$this->getServiceContainer()->getDBLoadBalancer(),
			$this->getServiceContainer()->getUserOptionsLookup()
		);
	}

	/**
	 * @covers ::onHtmlPageLinkRendererEnd
	 */
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
