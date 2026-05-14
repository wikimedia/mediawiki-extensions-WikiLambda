<?php

/**
 * WikiLambda integration test suite for SpecialViewAbstract label fetching
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\Request\FauxRequest;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Special\SpecialViewAbstract
 * @group Database
 */
class SpecialViewAbstractLabelTest extends WikiLambdaClientIntegrationTestCase {

	private const TEST_ABSTRACT_NS = 2300;

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsClientMode();

		if ( !ExtensionRegistry::getInstance()->isLoaded( 'WikibaseClient' ) ) {
			$this->markTestSkipped( 'WikibaseClient not available' );
		}

		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', false );
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractMode', true );
	}

	public function testViewPageTitleShowsLabel() {
		// Q8776414 is the lede section QID; required by AbstractWikiContent.php validation
		$content = new AbstractWikiContent(
			'{"qid":"Q34086","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}'
		);
		$this->editPage( 'Q34086', $content, 'test abstract page', self::TEST_ABSTRACT_NS );

		$this->mockWikibaseClientServicesForAbstractMode( 'Q34086', 'en', 'Justin Bieber' );

		$context = RequestContext::getMain();
		$context->setLanguage( 'en' );
		$context->setRequest( new FauxRequest() );

		$specialPage = $this->getServiceContainer()->getSpecialPageFactory()->getPage( 'ViewAbstract' );
		$specialPage->setContext( $context );
		$specialPage->execute( 'en/Abstract Wikipedia:Q34086' );

		$output = $context->getOutput();
		$this->assertStringContainsString( 'Justin Bieber', $output->getPageTitle() );
		$this->assertStringContainsString( 'Q34086', $output->getPageTitle() );
	}

	public function testViewPageTitleShowsFallbackWhenNoLabel() {
		// Q8776414 is the lede section QID; required by AbstractWikiContent.php validation
		$content = new AbstractWikiContent(
			'{"qid":"Q34086","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}'
		);
		$this->editPage( 'Q34086', $content, 'test abstract page', self::TEST_ABSTRACT_NS );

		$context = RequestContext::getMain();
		$context->setLanguage( 'en' );
		$context->setRequest( new FauxRequest() );

		$specialPage = $this->getServiceContainer()->getSpecialPageFactory()->getPage( 'ViewAbstract' );
		$specialPage->setContext( $context );
		$specialPage->execute( 'en/Abstract Wikipedia:Q34086' );

		$output = $context->getOutput();
		$this->assertStringContainsString( 'Q34086', $output->getPageTitle() );
		$this->assertStringNotContainsString( 'Justin Bieber', $output->getPageTitle() );
	}
}
