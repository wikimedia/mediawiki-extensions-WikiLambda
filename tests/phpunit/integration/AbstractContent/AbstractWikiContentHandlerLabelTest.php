<?php

/**
 * WikiLambda integration test suite for AbstractWikiContentHandler label fetching
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Content\Renderer\ContentParseParams;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContentHandler;
use MediaWiki\Parser\ParserOutput;
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

		$mockEntityLookup = $this->mockWikidataEntityLookup( [
			// With label
			'Q34086' => [ 'en' => 'Justin Bieber' ],
			// Without label
			'Q42' => [],
		] );
	}

	private function buildHandler(): AbstractWikiContentHandler {
		return new AbstractWikiContentHandler(
			CONTENT_MODEL_ABSTRACT,
			$this->getServiceContainer()->getMainConfig(),
			$this->getServiceContainer()->get( 'WikiLambdaWikidataEntityLookup' )
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

		$title = Title::newFromText( 'Q34086', self::TEST_ABSTRACT_NS );
		$output = $this->runFillParserOutput( $this->buildHandler(), $content, $title );

		$displayTitle = $output->getDisplayTitle();
		$this->assertNotNull( $displayTitle );
		$this->assertStringContainsString( 'Justin Bieber', $displayTitle );
		$this->assertStringContainsString( 'Q34086', $displayTitle );
		$this->assertStringContainsString( 'ext-wikilambda-viewpage-header', $displayTitle );

		// Regression guard for the argument order passed to
		// createAbstractViewPageTitle( $titleText, $lang, $dir, $qid ): the QID must
		// render as the copyable qid chip text and the language attribute must be the
		// user language. The previous, stale call order put the QID into lang="…" and
		// the text direction into the qid chip.
		$this->assertStringContainsString( 'ext-wikilambda-viewpage-header__qid', $displayTitle );
		$this->assertStringContainsString( '>Q34086</span>', $displayTitle );
		$this->assertStringContainsString( 'lang="en"', $displayTitle );
		$this->assertStringNotContainsString( 'lang="Q34086"', $displayTitle );

		// (T426833) The browser <title> is set directly on the OutputPage as
		// "Justin Bieber (Q34086) - <sitename>".
		$htmlTitle = RequestContext::getMain()->getOutput()->getHTMLTitle();
		$this->assertStringContainsString( 'Justin Bieber (Q34086)', $htmlTitle );
	}

	public function testFillParserOutputNoDisplayTitleWhenLabelMissing(): void {
		// Q8776414 is the lede section QID; required by AbstractWikiContent.php validation
		$content = new AbstractWikiContent(
			'{"qid":"Q42","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}'
		);

		$title = Title::newFromText( 'Q42', self::TEST_ABSTRACT_NS );
		$output = $this->runFillParserOutput( $this->buildHandler(), $content, $title );

		$this->assertFalse( $output->getDisplayTitle() );

		// (T426833) Even without a label the browser <title> is set to "Q34086 - <sitename>"
		// — no namespace prefix, no empty parens.
		$htmlTitle = RequestContext::getMain()->getOutput()->getHTMLTitle();
		$this->assertStringContainsString( 'Q42', $htmlTitle );
		$this->assertStringNotContainsString( '(Q42)', $htmlTitle );
	}
}
