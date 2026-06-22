<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\HookHandler;

use MediaWiki\Config\HashConfig;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiConfigProvider;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleMetadata;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore;
use MediaWiki\Extension\WikiLambda\HookHandler\AbstractPageRenderingHandler;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaAbstractClientIntegrationTestCase;
use MediaWiki\Interwiki\Interwiki;
use MediaWiki\Interwiki\InterwikiLookup;
use MediaWiki\Output\OutputPage;
use MediaWiki\Page\Article;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Skin\Skin;
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

		// Mock Q42 with primary title and redirect by default; overwrite if needed
		$this->mockOptedInArticles( [
			'Douglas Adams' => [ 'qid' => 'Q42', 'redirect' => false ],
			'Douglas Noël Adams' => [ 'qid' => 'Q42', 'redirect' => 'Douglas Adams' ]
		] );
		$this->setUpAsAbstractClientMode();
	}

	private function buildHandler(): AbstractPageRenderingHandler {
		return new AbstractPageRenderingHandler(
			$this->getServiceContainer()->getMainConfig(),
			$this->getServiceContainer()->getSpecialPageFactory(),
			$this->getServiceContainer()->getTitleFactory(),
			$this->getServiceContainer()->get( 'AbstractWikiArticleStore' ),
			$this->getServiceContainer()->get( 'AbstractWikiConfigProvider' ),
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
		$mockProvider = $this->createMock( AbstractWikiConfigProvider::class );
		$mockProvider
			->method( 'provideOptedIn' )
			->willReturn( $items );

		$this->setService( 'AbstractWikiConfigProvider', $mockProvider );
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

	public function testOnShowMissingArticle_integrationDisabled_doesNothing(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractClientModeIntegration', false );

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
		$title = Title::makeTitle( NS_MAIN, 'Douglas Noël Adams' );
		$article = $this->makeArticle( $title );

		$handler = $this->buildHandler();
		$handler->onShowMissingArticle( $article );

		$output = $article->getContext()->getOutput();
		$this->assertStringContainsString( 'Douglas_Adams', $output->getRedirect() );
	}

	public function testOnShowMissingArticle_redirectTitle_setsSessionRedirectSource(): void {
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
		$handler = $this->buildHandler();

		$title = Title::makeTitle( NS_MAIN, 'Douglas Adams' );
		$article = $this->makeArticle( $title );
		$request = $article->getContext()->getRequest();
		$ignoreRedirect = false;
		$target = false;

		$handler->onInitializeArticleMaybeRedirect( $title, $request, $ignoreRedirect, $target, $article );
		$this->assertNull( $article->getRedirectedFrom() );
	}

	public function testOnInitializeArticleMaybeRedirect_integrationDisabled_doesNothing(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractClientModeIntegration', false );
		$handler = $this->buildHandler();

		$title = Title::makeTitle( NS_MAIN, 'Douglas Adams' );
		$article = $this->makeArticle( $title );
		$request = $article->getContext()->getRequest();
		// Set a redirect source so only the gate (not a missing source) can prevent action.
		$request->getSession()->set( 'awRedirectedFrom', 'Douglas_Noël_Adams' );
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
		$handler = $this->buildHandler();

		RequestContext::getMain()->setTitle( Title::makeTitle( NS_MAIN, 'Douglas Adams' ) );

		$conds = [];
		$handler->onArticle__MissingArticleConditions( $conds, [ 'delete' ] );
		$this->assertSame( [], $conds );
	}

	public function testOnArticleMissingArticleConditions_integrationDisabled_doesNothing(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractClientModeIntegration', false );
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
		$handler = $this->buildHandler();

		RequestContext::getMain()->setTitle( Title::makeTitle( NS_MAIN, 'Douglas Adams' ) );

		$conds = [];
		$handler->onArticle__MissingArticleConditions( $conds, [ 'move' ] );
		$this->assertSame( [], $conds );
	}

	public function testOnArticleMissingArticleConditions_excludesDeleteLogs(): void {
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
		$handler = $this->buildHandler();

		$title = Title::makeTitle( NS_MAIN, 'Douglas Adams' );
		$article = $this->makeArticle( $title );

		$result = $handler->onBeforeDisplayNoArticleText( $article );
		$this->assertTrue( $result );
	}

	public function testOnBeforeDisplayNoArticleText_integrationDisabled_returnsTrue(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractClientModeIntegration', false );
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
		$handler = $this->buildHandler();

		$title = Title::makeTitle( NS_MAIN, 'Douglas Adams' );
		$article = $this->makeArticle( $title );

		$result = $handler->onBeforeDisplayNoArticleText( $article );
		$this->assertFalse( $result );
	}

	public function testOnBeforeDisplayNoArticleText_redirectOptedIn_returnsFalse(): void {
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

	// onSkinTemplateNavigation__Universal
	// ===================================
	// On Abstract Content surfaces, synthesise article-like tabs: a local Read tab, off-wiki
	// Edit/History/Talk pointing at Abstract Wikipedia via the 'abstract' interwiki prefix, and
	// none of the actions (delete/protect/move/watch) that are meaningless for a read-only render.

	/**
	 * Define an 'abstract' interwiki prefix so cross-wiki getFullURL() calls resolve, via a fake
	 * InterwikiLookup service (the InterwikiLoadPrefix hook was deprecated in MediaWiki 1.36).
	 */
	private function defineAbstractInterwiki(): void {
		$interwiki = new Interwiki( 'abstract', 'https://abstract.wikipedia.org/wiki/$1' );
		$lookup = $this->createMock( InterwikiLookup::class );
		$lookup->method( 'isValidInterwiki' )->willReturnCallback(
			static fn ( $prefix ) => $prefix === 'abstract'
		);
		$lookup->method( 'fetch' )->willReturnCallback(
			static fn ( $prefix ) => $prefix === 'abstract' ? $interwiki : null
		);
		$this->setService( 'InterwikiLookup', $lookup );
	}

	private function makeSkinForTitle( Title $title ): Skin {
		$context = new RequestContext();
		$context->setLanguage( 'en' );
		$context->setTitle( $title );
		$context->setRequest( new FauxRequest( [ 'uselang' => 'en' ] ) );
		$skin = $this->getServiceContainer()->getSkinFactory()->makeSkin( 'fallback' );
		$skin->setContext( $context );
		return $skin;
	}

	public function testOnSkinTemplateNavigation_notAbstractSurface_doesNothing(): void {
		$this->mockOptedInArticles();
		$skin = $this->makeSkinForTitle( Title::makeTitle( NS_MAIN, 'Pangolin' ) );

		$links = [ 'views' => [], 'actions' => [ 'delete' => [ 'text' => 'Delete' ] ], 'associated-pages' => [] ];

		$handler = $this->buildHandler();
		$handler->onSkinTemplateNavigation__Universal( $skin, $links );

		$this->assertArrayNotHasKey( 'edit-abstract', $links['views'] );
		// Untouched: actions left as they were.
		$this->assertArrayHasKey( 'delete', $links['actions'] );
	}

	public function testOnSkinTemplateNavigation_specialPage_addsAbstractTabs(): void {
		$this->defineAbstractInterwiki();
		$skin = $this->makeSkinForTitle( Title::makeTitle( NS_SPECIAL, 'PreviewAbstract/en/Q42' ) );

		$links = [ 'views' => [], 'actions' => [], 'associated-pages' => [] ];

		$handler = $this->buildHandler();
		$handler->onSkinTemplateNavigation__Universal( $skin, $links );

		$this->assertSame( 'Edit abstract', $links['views']['edit-abstract']['text'] );
		$this->assertStringContainsString(
			'abstract.wikipedia.org/wiki/Q42', $links['views']['edit-abstract']['href'] );
		$this->assertStringContainsString( 'action=edit', $links['views']['edit-abstract']['href'] );

		$this->assertSame( 'Abstract history', $links['views']['history-abstract']['text'] );
		$this->assertStringContainsString( 'action=history', $links['views']['history-abstract']['href'] );

		// A local Read tab is synthesised (the special page has none of its own).
		$this->assertArrayHasKey( 'view', $links['views'] );

		// No talk pages for special pages
		$this->assertArrayNotHasKey( 'talk', $links['views'] );
	}

	public function testOnSkinTemplateNavigation_specialPage_removesMeaninglessActions(): void {
		$this->defineAbstractInterwiki();
		$skin = $this->makeSkinForTitle( Title::makeTitle( NS_SPECIAL, 'PreviewAbstract/en/Q42' ) );

		$links = [
			'views' => [ 'viewsource' => [ 'text' => 'View source' ] ],
			'actions' => [
				'delete' => [ 'text' => 'Delete' ],
				'protect' => [ 'text' => 'Protect' ],
				'move' => [ 'text' => 'Move' ],
				'watch' => [ 'text' => 'Watch' ],
			],
			'associated-pages' => [],
		];

		$handler = $this->buildHandler();
		$handler->onSkinTemplateNavigation__Universal( $skin, $links );

		$this->assertArrayNotHasKey( 'viewsource', $links['views'] );
		$this->assertArrayNotHasKey( 'delete', $links['actions'] );
		$this->assertArrayNotHasKey( 'protect', $links['actions'] );
		$this->assertArrayNotHasKey( 'move', $links['actions'] );
		$this->assertArrayNotHasKey( 'watch', $links['actions'] );
	}

	public function testOnSkinTemplateNavigation_integratedArticle_keepsLocalReadTab(): void {
		$this->defineAbstractInterwiki();
		$this->mockOptedInArticles( [
			'Douglas Adams' => [ 'qid' => 'Q42', 'redirect' => false ],
		] );
		$skin = $this->makeSkinForTitle( Title::makeTitle( NS_MAIN, 'Douglas Adams' ) );

		$localView = [ 'text' => 'Read', 'href' => '/wiki/Douglas_Adams' ];
		$links = [ 'views' => [ 'view' => $localView ], 'actions' => [], 'associated-pages' => [] ];

		$handler = $this->buildHandler();
		$handler->onSkinTemplateNavigation__Universal( $skin, $links );

		// The existing local Read tab is preserved, not overwritten.
		$this->assertSame( $localView, $links['views']['view'] );
		// And the off-wiki Edit tab is added alongside it.
		$this->assertStringContainsString(
			'abstract.wikipedia.org/wiki/Q42', $links['views']['edit-abstract']['href'] );

		// Talk tab exists and points at the local discussion page.
		$this->assertStringContainsString( 'Talk:Douglas_Adams', $links['associated-pages']['talk']['href'] );
	}

	public function testOnSkinTemplateNavigation_integrationDisabled_doesNothing(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractClientModeIntegration', false );
		$this->mockOptedInArticles( [
			'Douglas Adams' => [ 'qid' => 'Q42', 'redirect' => false ],
		] );
		$skin = $this->makeSkinForTitle( Title::makeTitle( NS_MAIN, 'Douglas Adams' ) );

		$links = [ 'views' => [], 'actions' => [], 'associated-pages' => [] ];

		$handler = $this->buildHandler();
		$handler->onSkinTemplateNavigation__Universal( $skin, $links );

		$this->assertArrayNotHasKey( 'edit-abstract', $links['views'] );
	}

	// onSidebarBeforeOutput
	// =====================
	// Point the "What links here" Tools-sidebar entry at the source article on Abstract Wikipedia.

	public function testOnSidebarBeforeOutput_specialPage_pointsWhatLinksHereOffWiki(): void {
		$this->defineAbstractInterwiki();
		$skin = $this->makeSkinForTitle( Title::makeTitle( NS_SPECIAL, 'PreviewAbstract/en/Q42' ) );

		$sidebar = [ 'TOOLBOX' => [ 'whatlinkshere' => [ 'href' => '/wiki/Special:WhatLinksHere' ] ] ];

		$handler = $this->buildHandler();
		$handler->onSidebarBeforeOutput( $skin, $sidebar );

		$this->assertStringContainsString(
			'Special:WhatLinksHere/Q42', $sidebar['TOOLBOX']['whatlinkshere']['href'] );
		$this->assertStringContainsString(
			'abstract.wikipedia.org', $sidebar['TOOLBOX']['whatlinkshere']['href'] );
	}

	public function testOnSidebarBeforeOutput_notAbstractSurface_doesNothing(): void {
		$this->mockOptedInArticles();
		$skin = $this->makeSkinForTitle( Title::makeTitle( NS_MAIN, 'Pangolin' ) );

		$original = [ 'href' => '/wiki/Special:WhatLinksHere/Pangolin' ];
		$sidebar = [ 'TOOLBOX' => [ 'whatlinkshere' => $original ] ];

		$handler = $this->buildHandler();
		$handler->onSidebarBeforeOutput( $skin, $sidebar );

		$this->assertSame( $original, $sidebar['TOOLBOX']['whatlinkshere'] );
	}
}
