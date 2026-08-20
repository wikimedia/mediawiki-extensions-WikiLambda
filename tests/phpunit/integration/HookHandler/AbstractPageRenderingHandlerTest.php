<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\HookHandler;

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
use MediaWiki\Title\TitleValue;

/**
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\AbstractPageRenderingHandler
 * @group Database
 */
class AbstractPageRenderingHandlerTest extends WikiLambdaAbstractClientIntegrationTestCase {

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
			$this->getServiceContainer()->getService( 'WikiLambdaMode' ),
			$this->getServiceContainer()->getSpecialPageFactory(),
			$this->getServiceContainer()->getTitleFactory(),
			$this->getServiceContainer()->get( 'AbstractWikiArticleStore' ),
			$this->getServiceContainer()->get( 'AbstractWikiConfigProvider' ),
			$this->getServiceContainer()->getConnectionProvider(),
		);
	}

	private function makeArticle( Title $title, array $queryParams = [] ): Article {
		$context = new RequestContext();
		$context->setTitle( $title );
		$context->setRequest( new FauxRequest( $queryParams ) );
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

	private function mockSpecialPageFactory(
		string $expectedHtml,
		array $moduleStyles = [],
		array $modules = [],
		array $jsConfigVars = []
	): void {
		$mockSpecialPage = $this->createMock( SpecialPage::class );
		$capturedContext = null;

		$mockSpecialPage
			->method( 'setContext' )
			->willReturnCallback( static function ( $context ) use ( &$capturedContext ) {
				$capturedContext = $context;
			} );

		$mockSpecialPage
			->method( 'execute' )
			->willReturnCallback(
				static function () use ( &$capturedContext, $expectedHtml, $moduleStyles, $modules, $jsConfigVars ) {
					$specialOutput = $capturedContext->getOutput();
					$specialOutput->addModuleStyles( $moduleStyles );
					$specialOutput->addModules( $modules );
					$specialOutput->addJsConfigVars( 'wgWikiLambda', $jsConfigVars );
					$specialOutput->addHTML( $expectedHtml );
				}
			);

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

	public function testOnShowMissingArticle_redirectTitle_setsRedirectSourceInUrl(): void {
		$title = Title::makeTitle( NS_MAIN, 'Douglas Noël Adams' );
		$article = $this->makeArticle( $title );

		$handler = $this->buildHandler();
		$handler->onShowMissingArticle( $article );

		// The source is carried in the redirect URL, not the session — otherwise the response
		// would set a session cookie and become uncacheable at the CDN.
		$output = $article->getContext()->getOutput();
		$this->assertStringContainsString( 'awredirectedfrom=Douglas', $output->getRedirect() );
		$this->assertNull( $article->getContext()->getRequest()->getSession()->get( 'awRedirectedFrom' ) );
	}

	public function testOnShowMissingArticle_redirectTitle_noRedirect(): void {
		$title = Title::makeTitle( NS_MAIN, 'Douglas Noël Adams' );
		$article = $this->makeArticle( $title, [ 'redirect' => 'no' ] );

		$handler = $this->buildHandler();
		$handler->onShowMissingArticle( $article );

		$output = $article->getContext()->getOutput();
		$this->assertSame( '', $output->getRedirect() );
	}

	public function testOnShowMissingArticle_optedIn_rendersArticle(): void {
		$expectedHtml = '<p>Special page was rendered, yay!</p>';
		$this->mockSpecialPageFactory( $expectedHtml );

		$title = Title::makeTitle( NS_MAIN, 'Douglas Adams' );
		$article = $this->makeArticle( $title );

		$handler = $this->buildHandler();
		$handler->onShowMissingArticle( $article );

		// The special page's HTML is rendered into the real output (now inside the RDFa provenance
		// wrapper, hence a containment rather than exact-equality assertion).
		$this->assertStringContainsString( $expectedHtml, $article->getContext()->getOutput()->getHTML() );
	}

	public function testOnShowMissingArticle_optedIn_setsIsBasedOnProvenance(): void {
		$this->defineAbstractInterwiki();
		$this->mockSpecialPageFactory( '<p>body</p>' );

		$title = Title::makeTitle( NS_MAIN, 'Douglas Adams' );
		$article = $this->makeArticle( $title );

		$handler = $this->buildHandler();
		$handler->onShowMissingArticle( $article );

		// The rendered body is wrapped in a schema.org CreativeWork (RDFa Lite) bound to the page's
		// own canonical URL, with isBasedOn pointing at the Abstract Wikipedia source topic. RDFa
		// rather than a JSON-LD <script>, so no inline-script CSP allowance or output-taint.
		$html = $article->getContext()->getOutput()->getHTML();
		$this->assertStringContainsString( 'vocab="https://schema.org/"', $html );
		$this->assertStringContainsString( 'typeof="CreativeWork"', $html );
		$this->assertStringContainsString( 'resource="' . $title->getCanonicalURL() . '"', $html );
		$this->assertStringContainsString( 'property="isBasedOn"', $html );
		$this->assertStringContainsString( 'abstract.wikipedia.org/wiki/Q42', $html );
		// The provenance must not be emitted as an executable/script element.
		$this->assertStringNotContainsString( 'ld+json', $html );
	}

	public function testOnShowMissingArticle_optedIn_replaysSpecialPageModules(): void {
		$this->mockSpecialPageFactory(
			'<p>body</p>',
			[ 'ext.wikilambda.content.styles' ],
			[ 'ext.wikilambda.content' ]
		);

		$title = Title::makeTitle( NS_MAIN, 'Douglas Adams' );
		$article = $this->makeArticle( $title );

		$handler = $this->buildHandler();
		$handler->onShowMissingArticle( $article );

		// Only the HTML goes from the temporary OutputPage into the real one. Copy the modules that
		// the special page registered for that HTML too. If you do not, the reference and Commons
		// image markup in the sections gets no styles and no behaviour.
		$output = $article->getContext()->getOutput();
		$this->assertContains(
			'ext.wikilambda.content.styles', $output->getModuleStyles(),
			'We replay the special page\'s module styles onto the article output'
		);
		$this->assertContains(
			'ext.wikilambda.content', $output->getModules(),
			'We replay the special page\'s modules onto the article output'
		);
	}

	public function testOnShowMissingArticle_optedIn_replaysSpecialPageJsConfigVars(): void {
		$this->mockSpecialPageFactory(
			'<p>body</p>',
			[],
			[],
			[ 'abstractPreviewTopicQid' => 'Q42' ]
		);

		$title = Title::makeTitle( NS_MAIN, 'Douglas Adams' );
		$article = $this->makeArticle( $title );

		$handler = $this->buildHandler();
		$handler->onShowMissingArticle( $article );

		$output = $article->getContext()->getOutput();
		$this->assertSame(
			'Q42',
			$output->getJsConfigVars()['wgWikiLambda']['abstractPreviewTopicQid'] ?? null,
			'We replay the special page\'s wgWikiLambda config vars onto the article output'
		);
	}

	public function testOnShowMissingArticle_optedIn_mergesJsConfigVarsWithExisting(): void {
		$this->mockSpecialPageFactory(
			'<p>body</p>',
			[],
			[],
			[ 'abstractPreviewTopicQid' => 'Q42' ]
		);

		$title = Title::makeTitle( NS_MAIN, 'Douglas Adams' );
		$article = $this->makeArticle( $title );

		// Simulate another feature having already set a wgWikiLambda config var to guard overwrite
		$article->getContext()->getOutput()->addJsConfigVars( 'wgWikiLambda', [ 'someOtherFlag' => true ] );

		$handler = $this->buildHandler();
		$handler->onShowMissingArticle( $article );

		$wikiLambdaConfig = $article->getContext()->getOutput()->getJsConfigVars()['wgWikiLambda'] ?? [];
		$this->assertSame( true, $wikiLambdaConfig['someOtherFlag'] ?? null,
			'A pre-existing wgWikiLambda config var must survive the merge' );
		$this->assertSame( 'Q42', $wikiLambdaConfig['abstractPreviewTopicQid'] ?? null,
			'The special page\'s wgWikiLambda config var must still be replayed' );
	}

	// onBeforeDisplayNoArticleText: external-indexability metadata (T422707)
	// ======================================================================
	// The integrated article is the crawler-facing surface, so its real OutputPage must carry the
	// indexability signals: a 200 status, a <link rel="canonical"> at the local mainspace URL, an
	// indexable robots policy, and hreflang alternates. These are emitted in this hook rather than
	// onShowMissingArticle() because Article::showMissingArticle() applies the nonexistent-page
	// noindex,nofollow policy and 404 status between the two hooks; only signals set here, in the
	// later hook, survive.

	public function testOnBeforeDisplayNoArticleText_optedIn_setsCanonicalUrl(): void {
		$title = Title::makeTitle( NS_MAIN, 'Douglas Adams' );
		$article = $this->makeArticle( $title );

		$handler = $this->buildHandler();
		$handler->onBeforeDisplayNoArticleText( $article );

		$output = $article->getContext()->getOutput();
		// Canonical points at the article's own local mainspace URL, resolved via the Title API
		// so it honours $wgArticlePath/$wgCanonicalServer and is properly percent-encoded —
		// never a hand-built "/wiki/" . $title string with a raw space in it.
		$this->assertSame( $title->getCanonicalURL(), $output->getCanonicalUrl() );
		$this->assertStringNotContainsString( 'Douglas Adams', $output->getCanonicalUrl() );
	}

	public function testOnBeforeDisplayNoArticleText_optedIn_setsIndexableRobotPolicy(): void {
		$title = Title::makeTitle( NS_MAIN, 'Douglas Adams' );
		$article = $this->makeArticle( $title );

		// Simulate core: Article::showMissingArticle() applies a noindex policy via the metadata
		// before this hook runs, so the assertion proves the handler actively flips the
		// deliberately-"sticky" (T16899) noindex back to index.
		$output = $article->getContext()->getOutput();
		$output->getMetadata()->setIndexPolicy( 'noindex' );

		$handler = $this->buildHandler();
		$handler->onBeforeDisplayNoArticleText( $article );

		$this->assertSame( 'index', $output->getMetadata()->getIndexPolicy() );
	}

	public function testOnBeforeDisplayNoArticleText_optedIn_sends200Status(): void {
		$title = Title::makeTitle( NS_MAIN, 'Douglas Adams' );
		$article = $this->makeArticle( $title );

		// Simulate core's 404 on a missing page; the integrated article is a real 200 surface, so
		// the handler must override it — crawlers won't index a 404 whatever its robots meta says.
		$response = $article->getContext()->getRequest()->response();
		$response->statusHeader( 404 );

		$handler = $this->buildHandler();
		$handler->onBeforeDisplayNoArticleText( $article );

		$this->assertSame( 200, $response->getStatusCode() );
	}

	public function testOnBeforeDisplayNoArticleText_optedIn_setsHreflangSelfDeclaration(): void {
		$title = Title::makeTitle( NS_MAIN, 'Douglas Adams' );
		$context = new RequestContext();
		$context->setTitle( $title );
		$context->setLanguage( 'en' );
		$context->setRequest( new FauxRequest() );
		$context->setOutput( $output = new OutputPage( $context ) );
		$article = Article::newFromTitle( $title, $context );

		$handler = $this->buildHandler();
		$handler->onBeforeDisplayNoArticleText( $article );

		// A single hreflang alternate self-declaring the page's own language, pointing at the
		// canonical local URL. Keyed so it is emitted once and is assertable in isolation.
		$headItems = $output->getHeadItemsArray();
		$this->assertArrayHasKey( 'aw-hreflang-self', $headItems );
		$this->assertStringContainsString( 'hreflang="en"', $headItems['aw-hreflang-self'] );
		$this->assertStringContainsString( $title->getCanonicalURL(), $headItems['aw-hreflang-self'] );
	}

	public function testOnBeforeDisplayNoArticleText_optedIn_setsMulHreflangAlternate(): void {
		$this->defineAbstractInterwiki();

		$title = Title::makeTitle( NS_MAIN, 'Douglas Adams' );
		$article = $this->makeArticle( $title );

		$handler = $this->buildHandler();
		$handler->onBeforeDisplayNoArticleText( $article );

		// An hreflang="mul" alternate at the source topic on Abstract Wikipedia, addressed by its
		// bare QID via the 'abstract' interwiki prefix.
		$headItems = $article->getContext()->getOutput()->getHeadItemsArray();
		$this->assertArrayHasKey( 'aw-hreflang-mul', $headItems );
		$this->assertStringContainsString( 'hreflang="mul"', $headItems['aw-hreflang-mul'] );
		$this->assertStringContainsString(
			'abstract.wikipedia.org/wiki/Q42', $headItems['aw-hreflang-mul'] );
	}

	public function testOnBeforeDisplayNoArticleText_optedIn_setsViaProvenance(): void {
		$this->defineAbstractInterwiki();

		$title = Title::makeTitle( NS_MAIN, 'Douglas Adams' );
		$article = $this->makeArticle( $title );

		$handler = $this->buildHandler();
		$handler->onBeforeDisplayNoArticleText( $article );

		// A rel="via" link relation pointing at the Abstract Wikipedia source topic, the lightweight
		// head-level counterpart to the RDFa isBasedOn statement on the body wrapper.
		$headItems = $article->getContext()->getOutput()->getHeadItemsArray();
		$this->assertArrayHasKey( 'aw-provenance-via', $headItems );
		$this->assertStringContainsString( 'rel="via"', $headItems['aw-provenance-via'] );
		$this->assertStringContainsString(
			'abstract.wikipedia.org/wiki/Q42', $headItems['aw-provenance-via'] );
	}

	public function testOnBeforeDisplayNoArticleText_notOptedIn_setsNoMetadata(): void {
		$this->mockOptedInArticles();

		$title = Title::makeTitle( NS_MAIN, 'Pangolin' );
		$article = $this->makeArticle( $title );

		$handler = $this->buildHandler();
		$handler->onBeforeDisplayNoArticleText( $article );

		// A page with no integrated content must not claim a cross-wiki canonical or hreflang.
		$output = $article->getContext()->getOutput();
		// Cast so the assertion holds whether unset canonical defaults to false or ''.
		$this->assertSame( '', (string)$output->getCanonicalUrl() );
		$this->assertArrayNotHasKey( 'aw-hreflang-self', $output->getHeadItemsArray() );
		$this->assertArrayNotHasKey( 'aw-hreflang-mul', $output->getHeadItemsArray() );
	}

	public function testOnBeforeDisplayNoArticleText_integrationDisabled_setsNoMetadata(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractClientModeIntegration', false );

		$title = Title::makeTitle( NS_MAIN, 'Douglas Adams' );
		$article = $this->makeArticle( $title );

		$handler = $this->buildHandler();
		$handler->onBeforeDisplayNoArticleText( $article );

		// The integration kill-switch suppresses the whole surface, metadata included.
		$output = $article->getContext()->getOutput();
		// Cast so the assertion holds whether unset canonical defaults to false or ''.
		$this->assertSame( '', (string)$output->getCanonicalUrl() );
		$this->assertArrayNotHasKey( 'aw-hreflang-self', $output->getHeadItemsArray() );
		$this->assertArrayNotHasKey( 'aw-hreflang-mul', $output->getHeadItemsArray() );
	}

	public function testOnBeforeDisplayNoArticleText_redirectSource_setsNoMetadata(): void {
		$title = Title::makeTitle( NS_MAIN, 'Douglas Noël Adams' );
		$article = $this->makeArticle( $title );

		$handler = $this->buildHandler();
		$handler->onBeforeDisplayNoArticleText( $article );

		// A secondary title is HTTP-redirected to its primary (by onShowMissingArticle) before
		// rendering a body of its own, so it carries no canonical/hreflang — those belong on the
		// primary's own response, not the 3xx redirect source.
		$output = $article->getContext()->getOutput();
		// Cast so the assertion holds whether unset canonical defaults to false or ''.
		$this->assertSame( '', (string)$output->getCanonicalUrl() );
		$this->assertArrayNotHasKey( 'aw-hreflang-self', $output->getHeadItemsArray() );
		$this->assertArrayNotHasKey( 'aw-hreflang-mul', $output->getHeadItemsArray() );
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
		// Set a redirect source so only the gate (not a missing source) can prevent action.
		$article = $this->makeArticle( $title, [ 'awredirectedfrom' => 'Douglas_Noël_Adams' ] );
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

	public function testOnInitializeArticleMaybeRedirect_noRedirectSource_doesNothing(): void {
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
		$article = $this->makeArticle( $title, [ 'awredirectedfrom' => 'Douglas_Noël_Adams' ] );
		$request = $article->getContext()->getRequest();
		$ignoreRedirect = false;
		$target = false;

		$handler->onInitializeArticleMaybeRedirect( $title, $request, $ignoreRedirect, $target, $article );

		$this->assertNotNull( $article->getRedirectedFrom() );
		$this->assertSame( 'Douglas Noël Adams', $article->getRedirectedFrom()->getText() );
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

	public function testOnSkinTemplateNavigation_integratedArticle_relabelsCreateTab(): void {
		$this->defineAbstractInterwiki();
		$this->mockOptedInArticles( [
			'Douglas Adams' => [ 'qid' => 'Q42', 'redirect' => false ],
		] );
		$skin = $this->makeSkinForTitle( Title::makeTitle( NS_MAIN, 'Douglas Adams' ) );

		$links = [
			'views' => [ 'edit' => [ 'text' => 'Create', 'href' => '/wiki/Douglas_Adams?action=edit' ] ],
			'actions' => [],
			'associated-pages' => [],
		];

		$handler = $this->buildHandler();
		$handler->onSkinTemplateNavigation__Universal( $skin, $links );

		$this->assertSame( 'Create local article', $links['views']['edit']['text'] );
		// The local create target is preserved.
		$this->assertSame( '/wiki/Douglas_Adams?action=edit', $links['views']['edit']['href'] );
	}

	public function testOnSkinTemplateNavigation_specialPage_doesNotRelabelCreateTab(): void {
		$this->defineAbstractInterwiki();
		$skin = $this->makeSkinForTitle( Title::makeTitle( NS_SPECIAL, 'PreviewAbstract/en/Q42' ) );

		$links = [
			'views' => [ 'edit' => [ 'text' => 'Create', 'href' => '/wiki/Special:X?action=edit' ] ],
			'actions' => [],
			'associated-pages' => [],
		];

		$handler = $this->buildHandler();
		$handler->onSkinTemplateNavigation__Universal( $skin, $links );

		// No "Create local article" relabel on the preview special page.
		$this->assertSame( 'Create', $links['views']['edit']['text'] );
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

	// onLinkTargetIsAlwaysKnownBatch
	// ==============================
	// An opted-in integrated article has no local revision, but should be treated as known so its
	// wiki links and the subject tab on its talk page render blue rather than as redlinks. This
	// applies to both the primary title and any secondary (redirect) titles configured for the topic.

	public function testOnLinkTargetIsAlwaysKnownBatch_clientModeDisabled_leavesKnownUnset(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractClientMode', false );
		$this->mockOptedInArticles( [
			'Douglas Adams' => [ 'qid' => 'Q42', 'redirect' => false ],
		] );
		$handler = $this->buildHandler();

		$isAlwaysKnown = [ null ];
		$handler->onLinkTargetIsAlwaysKnownBatch( [ new TitleValue( NS_MAIN, 'Douglas_Adams' ) ], $isAlwaysKnown );
		$this->assertNull( $isAlwaysKnown[0] );
	}

	public function testOnLinkTargetIsAlwaysKnownBatch_integrationDisabled_leavesKnownUnset(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractClientModeIntegration', false );
		$this->mockOptedInArticles( [
			'Douglas Adams' => [ 'qid' => 'Q42', 'redirect' => false ],
		] );
		$handler = $this->buildHandler();

		$isAlwaysKnown = [ null ];
		$handler->onLinkTargetIsAlwaysKnownBatch( [ new TitleValue( NS_MAIN, 'Douglas_Adams' ) ], $isAlwaysKnown );
		$this->assertNull( $isAlwaysKnown[0] );
	}

	public function testOnLinkTargetIsAlwaysKnownBatch_notInMainNamespace_leavesKnownUnset(): void {
		$this->mockOptedInArticles( [
			'Douglas Adams' => [ 'qid' => 'Q42', 'redirect' => false ],
		] );
		$handler = $this->buildHandler();

		// The talk page of an opted-in article is not itself integrated content.
		$isAlwaysKnown = [ null ];
		$handler->onLinkTargetIsAlwaysKnownBatch( [ new TitleValue( NS_TALK, 'Douglas_Adams' ) ], $isAlwaysKnown );
		$this->assertNull( $isAlwaysKnown[0] );
	}

	public function testOnLinkTargetIsAlwaysKnownBatch_externalTitle_leavesKnownUnset(): void {
		$this->mockOptedInArticles( [
			'Douglas Adams' => [ 'qid' => 'Q42', 'redirect' => false ],
		] );
		$handler = $this->buildHandler();

		// An interwiki link to the source topic wiki is not this wiki's integrated article, even
		// though it shares its DB key.
		$isAlwaysKnown = [ null ];
		$handler->onLinkTargetIsAlwaysKnownBatch(
			[ new TitleValue( NS_MAIN, 'Douglas_Adams', '', 'abstract' ) ],
			$isAlwaysKnown
		);
		$this->assertNull( $isAlwaysKnown[0] );
	}

	public function testOnLinkTargetIsAlwaysKnownBatch_titleNotOptedIn_leavesKnownUnset(): void {
		$this->mockOptedInArticles( [
			'Douglas Adams' => [ 'qid' => 'Q42', 'redirect' => false ],
		] );
		$handler = $this->buildHandler();

		$isAlwaysKnown = [ null ];
		$handler->onLinkTargetIsAlwaysKnownBatch( [ new TitleValue( NS_MAIN, 'Pangolin' ) ], $isAlwaysKnown );
		$this->assertNull( $isAlwaysKnown[0] );
	}

	public function testOnLinkTargetIsAlwaysKnownBatch_primaryTitleOptedIn_setsKnown(): void {
		$this->mockOptedInArticles( [
			'Douglas Adams' => [ 'qid' => 'Q42', 'redirect' => false ],
			'Douglas Noël Adams' => [ 'qid' => 'Q42', 'redirect' => 'Douglas Adams' ],
		] );
		$handler = $this->buildHandler();

		$isAlwaysKnown = [ null ];
		$handler->onLinkTargetIsAlwaysKnownBatch( [ new TitleValue( NS_MAIN, 'Douglas_Adams' ) ], $isAlwaysKnown );
		$this->assertTrue( $isAlwaysKnown[0] );
	}

	public function testOnLinkTargetIsAlwaysKnownBatch_secondaryTitleOptedIn_setsKnown(): void {
		$this->mockOptedInArticles( [
			'Douglas Adams' => [ 'qid' => 'Q42', 'redirect' => false ],
			'Douglas Noël Adams' => [ 'qid' => 'Q42', 'redirect' => 'Douglas Adams' ],
		] );
		$handler = $this->buildHandler();

		// A configured redirect alias is just as much a known link target as the primary title.
		$isAlwaysKnown = [ null ];
		$handler->onLinkTargetIsAlwaysKnownBatch(
			[ new TitleValue( NS_MAIN, 'Douglas_Noël_Adams' ) ],
			$isAlwaysKnown
		);
		$this->assertTrue( $isAlwaysKnown[0] );
	}

	public function testOnLinkTargetIsAlwaysKnownBatch_respectsPriorDecision(): void {
		$this->mockOptedInArticles( [
			'Douglas Adams' => [ 'qid' => 'Q42', 'redirect' => false ],
		] );
		$handler = $this->buildHandler();

		// A decision already made by another handler is left untouched.
		$isAlwaysKnown = [ false ];
		$handler->onLinkTargetIsAlwaysKnownBatch( [ new TitleValue( NS_MAIN, 'Douglas_Adams' ) ], $isAlwaysKnown );
		$this->assertFalse( $isAlwaysKnown[0] );
	}

	public function testOnLinkTargetIsAlwaysKnownBatch_mixedBatch_decidesPerLink(): void {
		$this->mockOptedInArticles( [
			'Douglas Adams' => [ 'qid' => 'Q42', 'redirect' => false ],
		] );
		$handler = $this->buildHandler();

		// Each decision must land on its own link's key, and only opted-in main-namespace links
		// are decided at all.
		$isAlwaysKnown = [ null, null, null ];
		$handler->onLinkTargetIsAlwaysKnownBatch( [
			new TitleValue( NS_MAIN, 'Douglas_Adams' ),
			new TitleValue( NS_MAIN, 'Pangolin' ),
			new TitleValue( NS_TALK, 'Douglas_Adams' ),
		], $isAlwaysKnown );
		$this->assertSame( [ true, null, null ], $isAlwaysKnown );
	}

	public function testOnLinkTargetIsAlwaysKnownBatch_arbitraryKeys_areHonoured(): void {
		$this->mockOptedInArticles( [
			'Douglas Adams' => [ 'qid' => 'Q42', 'redirect' => false ],
		] );
		$handler = $this->buildHandler();

		// Callers need not pass a list; the decision keys mirror those of the links.
		$isAlwaysKnown = [ 7 => null ];
		$handler->onLinkTargetIsAlwaysKnownBatch( [ 7 => new TitleValue( NS_MAIN, 'Douglas_Adams' ) ], $isAlwaysKnown );
		$this->assertSame( [ 7 => true ], $isAlwaysKnown );
	}
}
