<?php

/**
 * WikiLambda integration test suite for the Abstract Wiki Content Handler class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use InvalidArgumentException;
use MediaWiki\Content\ContentSerializationException;
use MediaWiki\Content\Renderer\ContentParseParams;
use MediaWiki\Content\ValidationParams;
use MediaWiki\Content\WikitextContent;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentEditAction;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentHistoryAction;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContentHandler;
use MediaWiki\Json\FormatJson;
use MediaWiki\Parser\ParserOutput;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContentHandler
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

	public function testUnserializeContent_invalidJson() {
		$handler = $this->buildAbstractWikiContentHandler();

		$this->expectException( ContentSerializationException::class );
		$handler->unserializeContent( "{'invalid': JSON]" );
	}

	public function testSerializeContent_wrongContentType() {
		$handler = $this->buildAbstractWikiContentHandler();

		$wikitextContent = new WikitextContent( 'Hello world' );

		$this->assertSame( '', $handler->serializeContent( $wikitextContent ) );
	}

	public function testValidateSave_valid() {
		$handler = $this->buildAbstractWikiContentHandler();
		$title = Title::newFromText( 'Q42', self::TEST_ABSTRACT_NS );

		$content = new AbstractWikiContent(
			'{"qid":"Q42","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}'
		);

		$validationParams = new ValidationParams( $title->toPageIdentity(), 0 );
		$status = $handler->validateSave( $content, $validationParams );

		$this->assertTrue( $status->isGood() );
	}

	public function testValidateSave_wrongQid() {
		$handler = $this->buildAbstractWikiContentHandler();
		// Title says Q29 but content says Q42
		$title = Title::newFromText( 'Q29', self::TEST_ABSTRACT_NS );

		$content = new AbstractWikiContent(
			'{"qid":"Q42","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}'
		);

		$validationParams = new ValidationParams( $title->toPageIdentity(), 0 );
		$status = $handler->validateSave( $content, $validationParams );

		$this->assertFalse( $status->isGood() );
	}

	public function testSupportsDirectEditing() {
		$handler = $this->buildAbstractWikiContentHandler();

		$this->assertTrue( $handler->supportsDirectEditing() );
	}

	public function testGenerateHTMLOnEdit() {
		$handler = $this->buildAbstractWikiContentHandler();

		$this->assertFalse( $handler->generateHTMLOnEdit() );
	}

	public function testGetActionOverrides() {
		$handler = $this->buildAbstractWikiContentHandler();

		$overrides = $handler->getActionOverrides();

		$this->assertSame( AbstractContentEditAction::class, $overrides[ 'edit' ] );
		$this->assertSame( AbstractContentHistoryAction::class, $overrides[ 'history' ] );
	}

	public function testFillParserOutput_invalidContent() {
		$handler = $this->buildAbstractWikiContentHandler();

		// Content with no sections is invalid
		$content = new AbstractWikiContent( '{"qid":"Q42"}' );

		$title = Title::newFromText( 'Q42', self::TEST_ABSTRACT_NS );

		$params = $this->createMock( ContentParseParams::class );
		$params->method( 'getGenerateHtml' )->willReturn( true );
		$params->method( 'getPage' )->willReturn( $title->toPageReference() );

		$output = new ParserOutput();

		$this->runPrivateMethod( $handler, 'fillParserOutput', [ $content, $params, &$output ] );

		// Should show error message, not the Vue app
		$this->assertStringContainsString( 'ext-wikilambda-view-invalidcontent', $output->getRawText() );
		$this->assertStringNotContainsString( 'ext-wikilambda-app', $output->getRawText() );
	}

	public function testFillParserOutput_noHtmlGeneration() {
		$handler = $this->buildAbstractWikiContentHandler();

		$jsonContent = '{"qid":"Q42","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}';
		$content = $handler->makeContent( $jsonContent, null, CONTENT_MODEL_ABSTRACT );

		$title = Title::newFromText( 'Q42', self::TEST_ABSTRACT_NS );

		$params = $this->createMock( ContentParseParams::class );
		$params->method( 'getGenerateHtml' )->willReturn( false );
		$params->method( 'getPage' )->willReturn( $title->toPageReference() );

		$output = new ParserOutput();

		$this->runPrivateMethod( $handler, 'fillParserOutput', [ $content, $params, &$output ] );

		// Should produce empty output (no Vue app will load)
		$this->assertSame( '', $output->getRawText() );
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

		// Output contains div id="ext-wikilambda-app" (where the Vue app will load)
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

	/**
	 * Invoke a private or protected instance method on an object and return its result.
	 *
	 * Uses raw ReflectionMethod rather than TestingAccessWrapper because some callers
	 * (e.g. ContentHandler::fillParserOutput) declare their parameters with `&` and PHP's
	 * spread-through-__call path does not preserve reference semantics — invokeArgs would
	 * then fail with "must be passed by reference, value given". For property access and
	 * by-value method calls, prefer TestingAccessWrapper at the call site instead.
	 *
	 * TODO: Obviate the need for this and use TestingAccessWrapper like all other code.
	 *
	 * @phpcs:ignore MediaWiki.Commenting.FunctionComment.ObjectTypeHintParam
	 * @param object $object
	 * @param string $methodName
	 * @param array $args
	 * @return mixed The return value of the private method invoked
	 */
	protected function runPrivateMethod( $object, $methodName, $args ) {
		$reflector = new \ReflectionClass( get_class( $object ) );
		$method = $reflector->getMethod( $methodName );
		return $method->invokeArgs( $object, $args );
	}
}
