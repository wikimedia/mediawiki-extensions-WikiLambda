<?php

/**
 * WikiLambda integration test suite for AbstractWikiContentHandler label fetching
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Content\Renderer\ContentParseParams;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContentHandler;
use MediaWiki\Parser\ParserOutput;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContentHandler
 * @group Database
 */
class AbstractWikiContentHandlerLabelTest extends WikiLambdaClientIntegrationTestCase {

	private const TEST_ABSTRACT_NS = 2300;

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsClientMode();

		if ( !ExtensionRegistry::getInstance()->isLoaded( 'WikibaseClient' ) ) {
			$this->markTestSkipped( 'WikibaseClient not available' );
		}
	}

	private function buildHandler(): AbstractWikiContentHandler {
		return new AbstractWikiContentHandler(
			CONTENT_MODEL_ABSTRACT,
			$this->getServiceContainer()->getMainConfig(),
			$this->getServiceContainer()->getContentHandlerFactory()
		);
	}

	private function runFillParserOutput(
		AbstractWikiContentHandler $handler,
		AbstractWikiContent $content,
		Title $title
	): ParserOutput {
		$params = $this->createMock( ContentParseParams::class );
		$params->method( 'getGenerateHtml' )->willReturn( true );
		$params->method( 'getPage' )->willReturn( $title->toPageReference() );

		$output = new ParserOutput();

		$reflector = new \ReflectionClass( get_class( $handler ) );
		$method = $reflector->getMethod( 'fillParserOutput' );
		$method->invokeArgs( $handler, [ $content, $params, &$output ] );

		return $output;
	}

	public function testFillParserOutputSetsDisplayTitleWithLabel(): void {
		// Q8776414 is the lede section QID; required by AbstractWikiContent.php validation
		$content = new AbstractWikiContent(
			'{"qid":"Q34086","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}'
		);

		$this->mockWikibaseClientServicesForAbstractMode( 'Q34086', 'en', 'Justin Bieber' );

		$title = Title::newFromText( 'Q34086', self::TEST_ABSTRACT_NS );
		$output = $this->runFillParserOutput( $this->buildHandler(), $content, $title );

		$displayTitle = $output->getDisplayTitle();
		$this->assertNotNull( $displayTitle );
		$this->assertStringContainsString( 'Justin Bieber', $displayTitle );
		$this->assertStringContainsString( 'Q34086', $displayTitle );
		$this->assertStringContainsString( 'ext-wikilambda-viewpage-header', $displayTitle );
	}

	public function testFillParserOutputNoDisplayTitleWhenLabelMissing(): void {
		// Q8776414 is the lede section QID; required by AbstractWikiContent.php validation
		$content = new AbstractWikiContent(
			'{"qid":"Q34086","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}'
		);

		$title = Title::newFromText( 'Q34086', self::TEST_ABSTRACT_NS );
		$output = $this->runFillParserOutput( $this->buildHandler(), $content, $title );

		$this->assertFalse( $output->getDisplayTitle() );
	}
}
