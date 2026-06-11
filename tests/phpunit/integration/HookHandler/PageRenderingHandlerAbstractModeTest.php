<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\HookHandler;

use MediaWiki\Config\HashConfig;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent;
use MediaWiki\Extension\WikiLambda\HookHandler\PageRenderingHandler;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaClientIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Language\LanguageFactory;
use MediaWiki\Language\LanguageNameUtils;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Title\Title;
use MediaWiki\User\Options\UserOptionsLookup;
use Wikimedia\HtmlArmor\HtmlArmor;

/**
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\PageRenderingHandler
 * @group Database
 */
class PageRenderingHandlerAbstractModeTest extends WikiLambdaClientIntegrationTestCase {

	private PageRenderingHandler $pageRenderingHandlerAbstractMode;

	protected function setUp(): void {
		parent::setUp();
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractMode', true );
		$this->setMwGlobals( 'wgWikiLambdaEnableAbstractMode', true );
		$this->setUpAsClientMode();

		$mockHashConfigAbstractMode = $this->createMock( HashConfig::class );
		$mockHashConfigAbstractMode->method( 'get' )->willReturnMap( [
			[ 'WikiLambdaEnableRepoMode', false ],
			[ 'WikiLambdaEnableAbstractMode', true ],
			[ 'WikiLambdaAbstractNamespaces', [ 2300 => 'Abstract_Wikipedia' ] ],
		] );

		$mockUserOptionsLookup = $this->createMock( UserOptionsLookup::class );
		$mockUserOptionsLookup->method( 'getOption' )->willReturn( 'de' );

		$mockLanguageNameUtils = $this->createMock( LanguageNameUtils::class );
		$mockLanguageNameUtils->method( 'getLanguageName' )->willReturn( '' );

		$mockLanguageFactory = $this->createMock( LanguageFactory::class );

		// Mock item Japchae/Q715040, with only label in English
		$mockWikidataEntityLookup = $this->mockWikidataEntityLookup( [
			'Q715040' => [ 'en' => 'japchae' ],
			'Q99999' => [],
			'Q99998' => [],
		] );

		$this->pageRenderingHandlerAbstractMode = new PageRenderingHandler(
			$mockHashConfigAbstractMode,
			$mockUserOptionsLookup,
			$mockLanguageNameUtils,
			$mockLanguageFactory,
			$this->createNoOpMock( ZObjectStore::class ),
			$mockWikidataEntityLookup
		);
	}

	public function testOnHtmlPageLinkRendererEnd_abstractMode() {
		// Create the abstract page in the test DB so hasContentModel() works
		$content = new AbstractWikiContent(
			'{ "qid": "Q715040", "sections": {} }'
		);
		$this->editPage( 'Q715040', $content, 'test abstract page', 2300 );

		// Set up a RequestContext to simulate being on a special page
		$context = RequestContext::getMain();

		// Set language 'en' to simulate label existing use case
		$context->setLanguage( 'en' );
		$context->setTitle( Title::newFromText( 'Special:RecentChanges', NS_SPECIAL ) );
		$context->setRequest( new FauxRequest( [ 'title' => 'Special:RecentChanges', 'uselang' => 'en' ] ) );

		$linkRenderer = $this->getServiceContainer()->getLinkRenderer();
		$linkTarget = Title::makeTitle( 2300, 'Q715040' );
		$isKnown = true;
		$text = null;
		$attribs = [ 'href' => '/wiki/Abstract_Wikipedia:Q715040' ];
		$ret = '';

		$this->pageRenderingHandlerAbstractMode->onHtmlPageLinkRendererEnd(
			$linkRenderer, $linkTarget, $isKnown, $text, $attribs, $ret
		);

		$this->assertStringContainsString(
			'japchae (<span dir="ltr">Q715040</span>)',
			HtmlArmor::getHtml( $text ),
			'Abstract mode link should show the Wikidata label with QID in parentheses and BiDi isolation'
		);

		$this->assertSame(
			'/view/en/Abstract_Wikipedia:Q715040',
			$attribs['href'],
			'Abstract mode link should have the correct href with namespace prefix'
		);
	}

	public function testOnHtmlPageLinkRendererEnd_emptyAbstractPageIsRedLink() {
		// Create an abstract page with only the Z89 type sentinel (no real content)
		$emptyContent = new AbstractWikiContent(
			'{ "qid": "Q99999", "sections": { "Q8776414": { "index": 0, "fragments": [ "Z89" ] } } }'
		);
		$this->editPage( 'Q99999', $emptyContent, 'empty abstract page', 2300 );

		$context = RequestContext::getMain();
		$context->setLanguage( 'en' );
		$context->setTitle( Title::newFromText( 'Special:RecentChanges', NS_SPECIAL ) );
		$context->setRequest( new FauxRequest( [ 'title' => 'Special:RecentChanges', 'uselang' => 'en' ] ) );

		$linkRenderer = $this->getServiceContainer()->getLinkRenderer();
		$linkTarget = Title::makeTitle( 2300, 'Q99999' );
		$isKnown = true;
		$text = $linkTarget->getPrefixedText();
		$attribs = [ 'href' => '/wiki/Abstract_Wikipedia:Q99999' ];
		$ret = '';

		$this->pageRenderingHandlerAbstractMode->onHtmlPageLinkRendererEnd(
			$linkRenderer, $linkTarget, $isKnown, $text, $attribs, $ret
		);

		$this->assertStringContainsString(
			'new',
			$attribs['class'] ?? '',
			'An Abstract article with only the Z89 sentinel should have class="new" (red link)'
		);
		$this->assertStringContainsString(
			'<span dir="ltr">Q99999</span>',
			HtmlArmor::getHtml( $text ),
			'The QID should be bidi-wrapped'
		);
	}

	public function testOnHtmlPageLinkRendererEnd_abstractPageWithContentIsBlueLink() {
		// Create an abstract page with real content (more than just the Z89 sentinel)
		$contentWithFragments = new AbstractWikiContent(
			'{ "qid": "Q99998", "sections": { "Q8776414": { "index": 0, "fragments": [ "Z89", "some fragment" ] } } }'
		);
		$this->editPage( 'Q99998', $contentWithFragments, 'abstract page with content', 2300 );

		$context = RequestContext::getMain();
		$context->setLanguage( 'en' );
		$context->setTitle( Title::newFromText( 'Special:RecentChanges', NS_SPECIAL ) );
		$context->setRequest( new FauxRequest( [ 'title' => 'Special:RecentChanges', 'uselang' => 'en' ] ) );

		$linkRenderer = $this->getServiceContainer()->getLinkRenderer();
		$linkTarget = Title::makeTitle( 2300, 'Q99998' );
		$isKnown = true;
		$text = $linkTarget->getPrefixedText();
		$attribs = [ 'href' => '/wiki/Abstract_Wikipedia:Q99998' ];
		$ret = '';

		$this->pageRenderingHandlerAbstractMode->onHtmlPageLinkRendererEnd(
			$linkRenderer, $linkTarget, $isKnown, $text, $attribs, $ret
		);

		$this->assertStringNotContainsString(
			'new',
			$attribs['class'] ?? '',
			'An Abstract article with real content should not have class="new"'
		);
	}

	public function testOnHtmlPageLinkRendererEnd_abstractMode_missingLabel() {
		// Set up a RequestContext to simulate being on a special page
		$context = RequestContext::getMain();

		// Set language 'es' to simulate label missing use case
		$context->setLanguage( 'es' );
		$context->setTitle( Title::newFromText( 'Special:RecentChanges', NS_SPECIAL ) );
		$context->setRequest( new FauxRequest( [ 'title' => 'Special:RecentChanges', 'uselang' => 'es' ] ) );

		// Create the abstract page in the test DB
		$content = new AbstractWikiContent( '{ "qid": "Q715040", "sections": {} }' );
		$this->editPage( 'Q715040', $content, 'test abstract page', 2300 );

		$linkRenderer = $this->getServiceContainer()->getLinkRenderer();
		$linkTarget = Title::makeTitle( 2300, 'Q715040' );
		$isKnown = true;
		$text = null;
		$attribs = [ 'href' => '/wiki/Abstract_Wikipedia:Q715040' ];
		$ret = '';

		$this->pageRenderingHandlerAbstractMode->onHtmlPageLinkRendererEnd(
			$linkRenderer, $linkTarget, $isKnown, $text, $attribs, $ret
		);

		// When label is missing, $text should remain null (hook returns early)
		$this->assertNull(
			$text,
			'When no label is found, the link text should not be modified'
		);
	}
}
