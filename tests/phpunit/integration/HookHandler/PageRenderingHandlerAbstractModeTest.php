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
			'Q715040' => [ 'en' => 'japchae' ]
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
