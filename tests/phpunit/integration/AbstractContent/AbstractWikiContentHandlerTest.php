<?php

/**
 * WikiLambda integration test suite for the Abstract Wiki Content Handler class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use InvalidArgumentException;
use MediaWiki\Content\Renderer\ContentParseParams;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContentHandler;
use MediaWiki\Json\FormatJson;
use MediaWiki\Parser\ParserOutput;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent
 * @group Database
 */
class AbstractWikiContentHandlerTest extends WikiLambdaIntegrationTestCase {

	private const TEST_ABSTRACT_NS = 2300;

	/**
	 * @param string|null $modelId
	 */
	private function buildAbstractWikiContentHandler( ?string $modelId = null ): AbstractWikiContentHandler {
		return new AbstractWikiContentHandler(
			$modelId ?? CONTENT_MODEL_ABSTRACT,
			$this->getServiceContainer()->getMainConfig(),
			$this->getServiceContainer()->getContentHandlerFactory()
		);
	}

	public function testWrongContentModel() {
		$this->expectException( InvalidArgumentException::class );
		$this->buildAbstractWikiContentHandler( CONTENT_MODEL_WIKITEXT );
	}

	/**
	 * @dataProvider provideCanBeUsedOn
	 */
	public function testCanBeUsedOn( $expected, $input, $overwriteNS = null, $overwriteEnabled = null ) {
		if ( $overwriteNS !== null ) {
			$this->overrideConfigValue( 'WikiLambdaAbstractNamespaces', $overwriteNS );
		}

		if ( $overwriteEnabled !== null ) {
			$this->overrideConfigValue( 'WikiLambdaEnableAbstractMode', $overwriteEnabled );
		}

		$handler = $this->buildAbstractWikiContentHandler();

		$this->assertSame( $expected, $handler->canBeUsedOn( Title::newFromText( $input ) ) );
	}

	public static function provideCanBeUsedOn() {
		return [
			'Main NS ZObject page' => [ false, 'Z1' ],
			'Main talk page' => [ false, 'Talk:Z1' ],
			'User NS page' => [ false, 'User:Foo' ],
			'User talk NS page' => [ false, 'User talk:Foo' ],
			'Abstract Wiki page with no NS' => [ false, 'Q319' ],
			'Abstract Wiki page with NS' => [ true, 'Abstract Wikipedia:Q319' ],
			'Abstract Wiki page in main NS' => [ true, 'Q319', [ 0 => [ 'Abstract_Wikipedia' ] ] ],
			'Abstract Wiki is disabled' => [ false, 'Abstract Wikipedia:Q319', null, false ]
		];
	}

	public function testMakeEmptyContent() {
		$handler = $this->buildAbstractWikiContentHandler();

		$testObject = $handler->makeEmptyContent();

		$this->assertInstanceOf( AbstractWikiContent::class, $testObject );
	}

	public function testSerializeContent() {
		$handler = $this->buildAbstractWikiContentHandler();

		$content = $handler->makeEmptyContent();

		$serialized = $handler->serializeContent( $content );

		$expected = '{"qid":"Q0","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}';

		$this->assertTrue( is_string( $serialized ) );
		$this->assertSame( $expected, FormatJson::encode( FormatJson::parse( $serialized )->value )
		);
	}

	public function testUnserializeContent() {
		$handler = $this->buildAbstractWikiContentHandler();

		$serialized = '{"qid":"Q0","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}';

		$testObject = $handler->unserializeContent( $serialized );

		$this->assertInstanceOf( AbstractWikiContent::class, $testObject );
	}

	public function testFillParserOutput() {
		$handler = $this->buildAbstractWikiContentHandler();

		$jsonContent = '{"qid":"Q42","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}';
		$content = $handler->makeContent( $jsonContent, null, CONTENT_MODEL_ABSTRACT );

		$title = Title::newFromText( 'Q42', self::TEST_ABSTRACT_NS );

		$params = $this->createMock( ContentParseParams::class );
		$params->method( 'getGenerateHtml' )->willReturn( true );
		$params->method( 'getPage' )->willReturn( $title->toPageReference() );

		$output = new ParserOutput();

		$this->runPrivateMethod( $handler, 'fillParserOutput', [ $content, $params, &$output ] );

		// Output contains div id="ext-wikilambda-app"
		$this->assertStringContainsString( 'id="ext-wikilambda-app"', $output->getRawText() );

		// Output has the appropriate config vars
		$jsVars = $output->getJsConfigVars();

		$this->assertArrayHasKey( 'wgWikiLambda', $jsVars );

		$wikiLambdaVars = $jsVars['wgWikiLambda'];

		$this->assertTrue( $wikiLambdaVars['abstractContent'] );
		$this->assertFalse( $wikiLambdaVars['createNewPage'] );
		$this->assertSame( 'Q42', $wikiLambdaVars['title'] );
		$this->assertSame( 'en', $wikiLambdaVars['zlang'] );
		$this->assertTrue( $wikiLambdaVars['viewmode'] );
		$this->assertArrayHasKey( 'content', $wikiLambdaVars );
	}
}
