<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\HookHandler;

use MediaWiki\Config\HashConfig;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleMetadata;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore;
use MediaWiki\Extension\WikiLambda\HookHandler\AbstractPageRenderingHandler;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaAbstractClientIntegrationTestCase;
use MediaWiki\Output\OutputPage;
use MediaWiki\Page\Article;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\Request\FauxRequest;
use MediaWiki\SpecialPage\SpecialPage;
use MediaWiki\SpecialPage\SpecialPageFactory;
use MediaWiki\Tests\Unit\Libs\Rdbms\AddQuoterMock;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\AbstractPageRenderingHandler
 * @group Database
 */
class AbstractPageRenderingHandlerTest extends WikiLambdaAbstractClientIntegrationTestCase {

	private AbstractPageRenderingHandler $handler;
	private HashConfig $config;

	protected function setUp(): void {
		parent::setUp();

		// CommunityConfiguration is required
		if ( !ExtensionRegistry::getInstance()->isLoaded( 'CommunityConfiguration' ) ) {
			$this->markTestSkipped( 'CommunityConfiguration extension is not loaded' );
		}

		$this->setUpAsAbstractClientMode();
		$this->handler = $this->buildHandler();
	}

	private function buildHandler(): AbstractPageRenderingHandler {
		return new AbstractPageRenderingHandler(
			$this->getServiceContainer()->getMainConfig(),
			$this->getServiceContainer()->getSpecialPageFactory(),
			$this->getServiceContainer()->getTitleFactory(),
			$this->getServiceContainer()->get( 'AbstractWikiArticleStore' )
		);
	}

	private function makeArticle( Title $title ): Article {
		$context = new RequestContext();
		$context->setTitle( $title );
		$context->setRequest( new FauxRequest() );
		$output = new OutputPage( $context );
		$context->setOutput( $output );
		$article = Article::newFromTitle( $title, $context );
		return $article;
	}

	private function mockOptedInArticles( array $items = [] ): void {
		$value = (object)[ 'OptedInArticles' => $items ];
		$status = \StatusValue::newGood( $value );

		$mockProvider = $this->createMock(
			\MediaWiki\Extension\CommunityConfiguration\Provider\IConfigurationProvider::class );
		$mockProvider->method( 'loadValidConfiguration' )->willReturn( $status );

		$mockProviderFactory = $this->createMock(
			\MediaWiki\Extension\CommunityConfiguration\Provider\ConfigurationProviderFactory::class );
		$mockProviderFactory->method( 'newProvider' )->willReturn( $mockProvider );

		$this->setService( 'CommunityConfiguration.ProviderFactory', $mockProviderFactory );
	}

	private function mockSpecialPageFactory( string $expectedHtml ): void {
		$mockSpecialPage = $this->createMock( SpecialPage::class );
		$capturedContext = null;

		$mockSpecialPage
			->method( 'setContext' )
			->willReturnCallback( static function ( $context ) use ( &$capturedContext ) {
				$capturedContext = $context;
			} );

		$mockSpecialPage
			->method( 'execute' )
			->willReturnCallback( static function () use ( &$capturedContext, $expectedHtml ) {
				$capturedContext->getOutput()->addHTML( $expectedHtml );
			} );

		$mockSpecialPageFactory = $this->createMock( SpecialPageFactory::class );
		$mockSpecialPageFactory
			->method( 'getPage' )
			->willReturn( $mockSpecialPage );

		$this->setService( 'SpecialPageFactory', $mockSpecialPageFactory );
	}

	// onShowMissingArticle
	// ====================
	// When the article is opted-in from AW and NS_MAIN namespace, it renders the
	// output of the Special:PreviewAbstract page and passes its output as this output.
	// Additionally, handles redirects from secondary titles to their primary one.

	public function testOnShowMissingArticle_clientModeDisabled_doesNothing(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractClientMode', false );
		$this->mockOptedInArticles();

		$title = Title::makeTitle( NS_MAIN, 'Douglas Adams' );
		$article = $this->makeArticle( $title );

		$handler = $this->buildHandler();
		$handler->onShowMissingArticle( $article );

		$this->assertSame( '', $article->getContext()->getOutput()->getHTML() );
	}

	public function testOnShowMissingArticle_notInMainNamespace_doesNothing(): void {
		$this->mockOptedInArticles();

		$title = Title::makeTitle( NS_TALK, 'Douglas Adams' );
		$article = $this->makeArticle( $title );

		$handler = $this->buildHandler();
		$handler->onShowMissingArticle( $article );

		$this->assertSame( '', $article->getContext()->getOutput()->getHTML() );
	}

	public function testOnShowMissingArticle_titleNotOptedIn_doesNothing(): void {
		$this->mockOptedInArticles();

		$title = Title::makeTitle( NS_MAIN, 'Pangolin' );
		$article = $this->makeArticle( $title );

		$handler = $this->buildHandler();
		$handler->onShowMissingArticle( $article );

		$this->assertSame( '', $article->getContext()->getOutput()->getHTML() );
	}

	public function testOnShowMissingArticle_redirectTitle_redirectsToTarget(): void {
		$this->mockOptedInArticles( [
			(object)[ 'qid' => 'Q42', 'title' => [ 'Douglas Adams', 'Douglas Noël Adams' ] ],
		] );

		$title = Title::makeTitle( NS_MAIN, 'Douglas Noël Adams' );
		$article = $this->makeArticle( $title );

		$handler = $this->buildHandler();
		$handler->onShowMissingArticle( $article );

		$output = $article->getContext()->getOutput();
		$this->assertStringContainsString( 'Douglas_Adams', $output->getRedirect() );
	}

	public function testOnShowMissingArticle_redirectTitle_setsSessionRedirectSource(): void {
		$this->mockOptedInArticles( [
			(object)[ 'qid' => 'Q42', 'title' => [ 'Douglas Adams', 'Douglas Noël Adams' ] ],
		] );

		$title = Title::makeTitle( NS_MAIN, 'Douglas Noël Adams' );
		$article = $this->makeArticle( $title );

		$handler = $this->buildHandler();
		$handler->onShowMissingArticle( $article );

		$session = $article->getContext()->getRequest()->getSession();
		$this->assertSame( 'Douglas_Noël_Adams', $session->get( 'awRedirectedFrom' ) );
	}

	public function testOnShowMissingArticle_optedIn_rendersArticle(): void {
		$expectedHtml = '<p>Special page was rendered, yay!</p>';
		$this->mockSpecialPageFactory( $expectedHtml );
		$this->mockOptedInArticles( [
			(object)[ 'qid' => 'Q42', 'title' => [ 'Douglas Adams' ] ],
		] );

		$title = Title::makeTitle( NS_MAIN, 'Douglas Adams' );
		$article = $this->makeArticle( $title );

		$handler = $this->buildHandler();
		$handler->onShowMissingArticle( $article );

		$this->assertSame( $expectedHtml, $article->getContext()->getOutput()->getHTML() );
	}

	// onInitializeArticleMaybeRedirect
	// ================================
	// Detects when an Opted-in article is a redirect from a secondary title and in that
	// case sets the redirect status so that it renders the "redirected from" message on
	// top of the page.

	public function testOnInitializeArticleMaybeRedirect_clientModeDisabled_doesNothing(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractClientMode', false );
		$this->mockOptedInArticles( [
			(object)[ 'qid' => 'Q42', 'title' => [ 'Douglas Adams', 'Douglas Noël Adams' ] ],
		] );
		$handler = $this->buildHandler();

		$title = Title::makeTitle( NS_MAIN, 'Douglas Adams' );
		$article = $this->makeArticle( $title );
		$request = $article->getContext()->getRequest();
		$ignoreRedirect = false;
		$target = false;

		$handler->onInitializeArticleMaybeRedirect( $title, $request, $ignoreRedirect, $target, $article );
		$this->assertNull( $article->getRedirectedFrom() );
	}

	public function testOnInitializeArticleMaybeRedirect_titleNotOptedIn_doesNothing(): void {
		$this->mockOptedInArticles();
		$handler = $this->buildHandler();

		$title = Title::makeTitle( NS_MAIN, 'Pangolin' );
		$article = $this->makeArticle( $title );
		$request = $article->getContext()->getRequest();
		$ignoreRedirect = false;
		$target = false;

		$handler->onInitializeArticleMaybeRedirect( $title, $request, $ignoreRedirect, $target, $article );
		$this->assertNull( $article->getRedirectedFrom() );
	}

	public function testOnInitializeArticleMaybeRedirect_noSessionRedirectSource_doesNothing(): void {
		$this->mockOptedInArticles( [
			(object)[ 'qid' => 'Q42', 'title' => [ 'Douglas Adams', 'Douglas Noël Adams' ] ],
		] );
		$handler = $this->buildHandler();

		$title = Title::makeTitle( NS_MAIN, 'Douglas Adams' );
		$article = $this->makeArticle( $title );
		$request = $article->getContext()->getRequest();
		$ignoreRedirect = false;
		$target = false;

		$handler->onInitializeArticleMaybeRedirect( $title, $request, $ignoreRedirect, $target, $article );
		$this->assertNull( $article->getRedirectedFrom() );
	}

	public function testOnInitializeArticleMaybeRedirect_setsRedirectedFrom(): void {
		$this->mockOptedInArticles( [
			(object)[ 'qid' => 'Q42', 'title' => [ 'Douglas Adams', 'Douglas Noël Adams' ] ],
		] );
		$handler = $this->buildHandler();

		$title = Title::makeTitle( NS_MAIN, 'Douglas Adams' );
		$article = $this->makeArticle( $title );
		$request = $article->getContext()->getRequest();
		$request->getSession()->set( 'awRedirectedFrom', 'Douglas_Noël_Adams' );
		$ignoreRedirect = false;
		$target = false;

		$handler->onInitializeArticleMaybeRedirect( $title, $request, $ignoreRedirect, $target, $article );

		$this->assertNotNull( $article->getRedirectedFrom() );
		$this->assertSame( 'Douglas Noël Adams', $article->getRedirectedFrom()->getText() );
		$this->assertNull( $request->getSession()->get( 'awRedirectedFrom' ) );
	}

	// onArticle__MissingArticleConditions
	// ===================================
	// When a local article has been deleted, the deletion history is shown on top of the empty
	// article page, with a warning state and the information of its deletion. If a local article
	// is deleted and its place is taken by an Opted-in article, we don't display this box.

	public function testOnArticleMissingArticleConditions_clientModeDisabled_doesNothing(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractClientMode', false );
		$this->mockOptedInArticles( [
			(object)[ 'qid' => 'Q42', 'title' => [ 'Douglas Adams', 'Douglas Noël Adams' ] ],
		] );
		$handler = $this->buildHandler();

		RequestContext::getMain()->setTitle( Title::makeTitle( NS_MAIN, 'Douglas Adams' ) );

		$conds = [];
		$handler->onArticle__MissingArticleConditions( $conds, [ 'delete' ] );
		$this->assertSame( [], $conds );
	}

	public function testOnArticleMissingArticleConditions_titleNotOptedIn_doesNothing(): void {
		$this->mockOptedInArticles();
		$handler = $this->buildHandler();

		RequestContext::getMain()->setTitle( Title::makeTitle( NS_MAIN, 'Pangolin' ) );

		$conds = [];
		$handler->onArticle__MissingArticleConditions( $conds, [ 'delete' ] );
		$this->assertSame( [], $conds );
	}

	public function testOnArticleMissingArticleConditions_nonDeleteLogType_doesNothing(): void {
		$this->mockOptedInArticles( [
			(object)[ 'qid' => 'Q42', 'title' => [ 'Douglas Adams', 'Douglas Noël Adams' ] ],
		] );
		$handler = $this->buildHandler();

		RequestContext::getMain()->setTitle( Title::makeTitle( NS_MAIN, 'Douglas Adams' ) );

		$conds = [];
		$handler->onArticle__MissingArticleConditions( $conds, [ 'move' ] );
		$this->assertSame( [], $conds );
	}

	public function testOnArticleMissingArticleConditions_excludesDeleteLogs(): void {
		$this->mockOptedInArticles( [
			(object)[ 'qid' => 'Q42', 'title' => [ 'Douglas Adams', 'Douglas Noël Adams' ] ],
		] );
		$handler = $this->buildHandler();

		RequestContext::getMain()->setTitle( Title::makeTitle( NS_MAIN, 'Douglas Adams' ) );

		$conds = [];
		$handler->onArticle__MissingArticleConditions( $conds, [ 'delete' ] );
		$this->assertNotEmpty( $conds );
		$this->assertSame( "log_action != 'delete'", $conds[0]->toSql( new AddQuoterMock ) );
	}

	// onBeforeDisplayNoArticleText
	// ============================
	// When a local article has no content, MW displays a "There is currently no text in this page"
	// message. When the page contains an Opted-In AW article, this hook returns false so that
	// the message is not rendered.

	public function testOnBeforeDisplayNoArticleText_clientModeDisabled_returnsTrue(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractClientMode', false );
		$this->mockOptedInArticles( [
			(object)[ 'qid' => 'Q42', 'title' => [ 'Douglas Adams', 'Douglas Noël Adams' ] ],
		] );
		$handler = $this->buildHandler();

		$title = Title::makeTitle( NS_MAIN, 'Douglas Adams' );
		$article = $this->makeArticle( $title );

		$result = $handler->onBeforeDisplayNoArticleText( $article );
		$this->assertTrue( $result );
	}

	public function testOnBeforeDisplayNoArticleText_titleNotOptedIn_returnsTrue(): void {
		$this->mockOptedInArticles();
		$handler = $this->buildHandler();

		$title = Title::makeTitle( NS_MAIN, 'Pangolin' );
		$article = $this->makeArticle( $title );

		$result = $handler->onBeforeDisplayNoArticleText( $article );
		$this->assertTrue( $result );
	}

	public function testOnBeforeDisplayNoArticleText_titleOptedIn_returnsFalse(): void {
		$this->mockOptedInArticles( [
			(object)[ 'qid' => 'Q42', 'title' => [ 'Douglas Adams', 'Douglas Noël Adams' ] ],
		] );
		$handler = $this->buildHandler();

		$title = Title::makeTitle( NS_MAIN, 'Douglas Adams' );
		$article = $this->makeArticle( $title );

		$result = $handler->onBeforeDisplayNoArticleText( $article );
		$this->assertFalse( $result );
	}

	public function testOnBeforeDisplayNoArticleText_redirectOptedIn_returnsFalse(): void {
		$this->mockOptedInArticles( [
			(object)[ 'qid' => 'Q42', 'title' => [ 'Douglas Adams', 'Douglas Noël Adams' ] ],
		] );
		$handler = $this->buildHandler();

		$title = Title::makeTitle( NS_MAIN, 'Douglas Noël Adams' );
		$article = $this->makeArticle( $title );

		$result = $handler->onBeforeDisplayNoArticleText( $article );
		$this->assertFalse( $result );
	}

	// onSkinAddFooterLinks
	// ====================
	// When rendering a Special:PreviewAbstract page or an opted-in Wikipedia page
	// it displays the last rendered and provenance messages in the footer.

	private function mockArticleStore() {
		$mockArticleStore = $this->createMock( AWArticleStore::class );
		$mockArticleStore
			->method( 'getArticleMetadata' )
			->willReturnCallback( static function ( $qid ) {
				$metadata = new AWArticleMetadata( $qid, [ 'lastRendered' => '20260531040500' ] );
				return $qid === 'Q42' ? $metadata : null;
			} );

		$this->setService( 'AbstractWikiArticleStore', $mockArticleStore );
	}

	public function testOnSkinAddFooterLinks_specialPage_fullMetadata() {
		$this->mockArticleStore();
		// Set up a RequestContext to simulate being on the PreviewAbstract special page
		$context = RequestContext::getMain();
		$context->setLanguage( 'en' );
		$context->setTitle( Title::makeTitle( NS_SPECIAL, 'PreviewAbstract/en/Q42' ) );
		$request = new FauxRequest( [ 'title' => 'Special:PreviewAbstract/en/Q42', 'uselang' => 'en' ] );
		$context->setRequest( $request );

		// Set up Skin
		$skin = $this->getServiceContainer()->getSkinFactory()->makeSkin( 'fallback' );
		$skin->setContext( $context );

		$footerItems = [];

		$handler = $this->buildHandler();
		$handler->onSkinAddFooterLinks( $skin, 'info', $footerItems );

		$this->assertArrayHasKey( 'lastmod', $footerItems );
		$this->assertArrayHasKey( 'renderedwith', $footerItems );

		$this->assertStringContainsString( 'last updated on 04:05, at 31 May 2026.', $footerItems['lastmod'] );
		$this->assertStringContainsString( 'Page was rendered from', $footerItems['renderedwith'] );
		$this->assertStringContainsString( 'Abstract Wikipedia', $footerItems['renderedwith'] );
	}

	public function testOnSkinAddFooterLinks_specialPage_noMetadata() {
		$this->mockArticleStore();
		// Set up a RequestContext to simulate being on the PreviewAbstract special page
		$context = RequestContext::getMain();
		$context->setLanguage( 'en' );
		$context->setTitle( Title::makeTitle( NS_SPECIAL, 'PreviewAbstract/en/Q999' ) );
		$request = new FauxRequest( [ 'title' => 'Special:PreviewAbstract/en/Q999', 'uselang' => 'en' ] );
		$context->setRequest( $request );

		// Set up Skin
		$skin = $this->getServiceContainer()->getSkinFactory()->makeSkin( 'fallback' );
		$skin->setContext( $context );

		$footerItems = [];

		$handler = $this->buildHandler();
		$handler->onSkinAddFooterLinks( $skin, 'info', $footerItems );

		$this->assertCount( 0, $footerItems );
	}

	public function testOnSkinAddFooterLinks_optedInArticle_fullMetadata(): void {
		$this->mockArticleStore();
		$this->mockOptedInArticles( [
			(object)[ 'qid' => 'Q42', 'title' => [ 'Douglas Adams' ] ],
		] );

		// Set up a RequestContext to simulate being on an opted-in article page
		$context = RequestContext::getMain();
		$context->setLanguage( 'en' );
		$context->setTitle( Title::makeTitle( NS_MAIN, 'Douglas Adams' ) );
		$context->setRequest( new FauxRequest( [ 'title' => 'Douglas Adams', 'uselang' => 'en' ] ) );

		// Set up Skin
		$skin = $this->getServiceContainer()->getSkinFactory()->makeSkin( 'fallback' );
		$skin->setContext( $context );

		$footerItems = [];

		$handler = $this->buildHandler();
		$handler->onSkinAddFooterLinks( $skin, 'info', $footerItems );

		$this->assertArrayHasKey( 'lastmod', $footerItems );
		$this->assertArrayHasKey( 'renderedwith', $footerItems );
		$this->assertStringContainsString( 'last updated on 04:05, at 31 May 2026.', $footerItems['lastmod'] );
		$this->assertStringContainsString( 'Page was rendered from', $footerItems['renderedwith'] );
		$this->assertStringContainsString( 'Abstract Wikipedia', $footerItems['renderedwith'] );
	}
}
