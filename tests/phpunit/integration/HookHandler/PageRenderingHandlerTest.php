<?php

/**
 * WikiLambda integration test suite for hook handlers that affect page rendering
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\HookHandler;

use MediaWiki\Config\HashConfig;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\HookHandler\PageRenderingHandler;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Language\LanguageFactory;
use MediaWiki\Language\LanguageNameUtils;
use MediaWiki\MainConfigNames;
use MediaWiki\Output\OutputPage;
use MediaWiki\Page\Article;
use MediaWiki\Parser\ParserOptions;
use MediaWiki\Parser\ParserOutput;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Request\WebRequest;
use MediaWiki\Skin\Skin;
use MediaWiki\Skin\SkinTemplate;
use MediaWiki\Specials\SpecialRecentChanges;
use MediaWiki\Title\Title;
use MediaWiki\User\Options\UserOptionsLookup;
use MediaWiki\User\User;

/**
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\PageRenderingHandler
 * @group Database
 */
class PageRenderingHandlerTest extends WikiLambdaIntegrationTestCase {

	private PageRenderingHandler $pageRenderingHandler;
	private PageRenderingHandler $pageRenderingHandlerRepoModeOff;

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsRepoMode();
		$this->setTestDataPath( dirname( __DIR__, 3 ) . '/phpunit/test_data/test_definitions' );

		$mockHashConfigRepoMode = $this->createMock( HashConfig::class );
		$mockHashConfigRepoMode->method( 'get' )->willReturnMap( [
			[ 'WikiLambdaEnableRepoMode', true ],
			[ 'WikiLambdaEnableAbstractMode', false ],
		] );

		$mockUserOptionsLookup = $this->createMock( UserOptionsLookup::class );
		$mockUserOptionsLookup->method( 'getOption' )->willReturn( 'de' );

		$mockLanguageNameUtils = $this->createMock( LanguageNameUtils::class );
		$mockLanguageNameUtils->method( 'getLanguageName' )->willReturn( '' );

		$mockLanguageFactory = $this->createMock( LanguageFactory::class );

		$this->pageRenderingHandler = new PageRenderingHandler(
			$mockHashConfigRepoMode,
			// $mockHashConfigNotRepoMode,
			$mockUserOptionsLookup,
			$mockLanguageNameUtils,
			$mockLanguageFactory,
			$this->createNoOpMock( ZObjectStore::class )
		);

		$mockHashConfigNotRepoMode = $this->createMock( HashConfig::class );
		$mockHashConfigNotRepoMode->method( 'get' )->willReturnMap( [
			[ 'WikiLambdaEnableRepoMode', false ],
			[ 'WikiLambdaEnableAbstractMode', false ],
		] );

		$this->pageRenderingHandlerRepoModeOff = new PageRenderingHandler(
			$mockHashConfigNotRepoMode,
			$mockUserOptionsLookup,
			$mockLanguageNameUtils,
			$mockLanguageFactory,
			$this->createNoOpMock( ZObjectStore::class )
		);
	}

	public function testOnBeforeDisplayNoArticleText() {
		$title = Title::makeTitle( NS_MAIN, 'Z123456' );
		$context = new RequestContext();
		$context->setTitle( $title );
		$context->setLanguage( 'qqx' );

		$article = Article::newFromTitle( $title, $context );

		$this->pageRenderingHandler->onBeforeDisplayNoArticleText( $article );
		$this->assertStringContainsString(
			'(wikilambda-noobject)', $context->getOutput()->getHTML(),
			'Message for no article is changed when in repo mode'
		);

		$this->pageRenderingHandlerRepoModeOff->onBeforeDisplayNoArticleText( $article );
		$this->assertStringContainsString(
			'', $context->getOutput()->getHTML(),
			'Message for no article is not changed when in non-repo mode'
		);
	}

	public function testOnBeforeDisplayNoArticleText_skippedOutsideNS0() {
		$title = Title::makeTitle( NS_TALK, 'Z123456' );
		$context = new RequestContext();
		$context->setTitle( $title );
		$context->setLanguage( 'qqx' );

		$article = Article::newFromTitle( $title, $context );

		$this->pageRenderingHandler->onBeforeDisplayNoArticleText( $article );
		$this->assertStringContainsString(
			'', $context->getOutput()->getHTML(),
			'Message for no article is not changed when not a ZObject'
		);

		$this->pageRenderingHandlerRepoModeOff->onBeforeDisplayNoArticleText( $article );
		$this->assertStringContainsString(
			'', $context->getOutput()->getHTML(),
			'Message for no article is not changed when not a ZObject in non-repo mode'
		);
	}

	public function testOnBeforePageDisplay() {
		$title = Title::makeTitle( NS_MAIN, 'Z1' );

		$mockSkin = $this->createMock( Skin::class );

		$context = new RequestContext();
		$context->setTitle( $title );
		$context->setLanguage( 'qqx' );

		$outputPage = new OutputPage( $context );
		$this->pageRenderingHandler->onBeforePageDisplay( $outputPage, $mockSkin );

		$this->assertArrayHasKey(
			'wgUserLanguageName', $outputPage->getJSVars(),
			'We set wgUserLanguageName to the language label; make sure that\'s present'
		);
		$this->assertSame(
			'', $outputPage->getJSVars()['wgUserLanguageName'],
			'We set wgUserLanguageName to the language label; make sure that\'s set to the expected value'
		);
		$this->assertArrayContains(
			[ 'ext.wikilambda.languageselector' ], $outputPage->getModules(),
			'We register ext.wikilambda.languageselector; make sure that\'s set'
		);
		$this->assertArrayContains(
			[ 'ext.wikilambda.references' ], $outputPage->getModules(),
			'We register ext.wikilambda.references; make sure that\'s set'
		);
		$this->assertArrayContains(
			[ 'ext.wikilambda.references.styles' ], $outputPage->getModuleStyles(),
			'We register ext.wikilambda.references.styles; make sure that\'s set'
		);

		$outputPage = new OutputPage( $context );
		$this->pageRenderingHandlerRepoModeOff->onBeforePageDisplay( $outputPage, $mockSkin );

		$this->assertArrayNotHasKey(
			'wgUserLanguageName', $outputPage->getJSVars(),
			'We should not set wgUserLanguageName in non-repo mode'
		);
		$this->assertArrayEquals(
			[], $outputPage->getModules(),
			'We should not register ext.wikilambda.languageselector in non-repo mode'
		);
		$this->assertArrayEquals(
			[], $outputPage->getModuleStyles(),
			'We should not register ext.wikilambda.references.styles in non-repo mode'
		);
	}

	public static function provideTestOnSkinTemplateNavigation() {
		return [
			'Z1 wiki page, logged in user, English implicit view' => [
				/* titleText */ 'Z1',
				/* isZObject */ true,
				/* languageCode */ null,
				/* user */ 'WikiLambdaTestUser',
				/* params */ [],
				/* editPage */ '/wiki/Z1?action=edit',
				/* expectedView */ '/view/en/Z1',
				/* expectedEdit */ '/wiki/Z1?uselang=en&action=edit',
				/* expectedHistory */ '/wiki/Z1?uselang=en&action=history',
				/* expectedTalk */ '/wiki/Talk:Z1?uselang=en',
			],
			'Z1 view page, logged in user, English implicit view' => [
				/* titleText */ 'Z1',
				/* isZObject */ true,
				/* languageCode */ null,
				/* user */ 'WikiLambdaTestUser',
				/* params */ [],
				/* editPage */ '/wiki/Z1?action=edit',
				/* expectedView */ '/view/en/Z1',
				/* expectedEdit */ '/wiki/Z1?uselang=en&action=edit',
				/* expectedHistory */ '/wiki/Z1?uselang=en&action=history',
				/* expectedTalk */ '/wiki/Talk:Z1?uselang=en',
			],
			'Z1 view page, logged in user, English explicit view' => [
				/* titleText */ 'Z1',
				/* isZObject */ true,
				/* languageCode */ 'en',
				/* user */ 'WikiLambdaTestUser',
				/* params */ [],
				/* editPage */ '/wiki/Z1?action=edit',
				/* expectedView */ '/view/en/Z1',
				/* expectedEdit */ '/wiki/Z1?uselang=en&action=edit',
				/* expectedHistory */ '/wiki/Z1?uselang=en&action=history',
				/* expectedTalk */ '/wiki/Talk:Z1?uselang=en',
			],
			'Z1 view page, logged in user, English explicit view, extra params passed on to talk' => [
				/* titleText */ 'Z1',
				/* isZObject */ true,
				/* languageCode */ 'en',
				/* user */ 'WikiLambdaTestUser',
				/* params */ [ 'fish' => 'chips' ],
				/* editPage */ '/wiki/Z1?action=edit',
				/* expectedView */ '/view/en/Z1',
				/* expectedEdit */ '/wiki/Z1?uselang=en&action=edit',
				/* expectedHistory */ '/wiki/Z1?uselang=en&action=history',
				/* expectedTalk */ '/wiki/Talk:Z1?uselang=en',
			],
			'Z1 view page, logged in user, English explicit view, oldid set' => [
				/* titleText */ 'Z1',
				/* isZObject */ true,
				/* languageCode */ 'en',
				/* user */ 'WikiLambdaTestUser',
				/* params */ [ 'oldid' => '1234' ],
				/* editPage */ '/wiki/Z1?action=edit',
				/* expectedView */ '/view/en/Z1',
				/* expectedEdit */ '/wiki/Z1?uselang=en&action=edit&oldid=1234',
				/* expectedHistory */ '/wiki/Z1?uselang=en&action=history',
				/* expectedTalk */ '/wiki/Talk:Z1?uselang=en',
			],
			'Z1 view page, logged in user, French explicit view' => [
				/* titleText */ 'Z1',
				/* isZObject */ true,
				/* lang */ 'en',
				/* user */ 'WikiLambdaTestUser',
				/* params */ [ 'uselang' => 'fr' ],
				/* editPage */ '/wiki/Z1?action=edit',
				/* expectedView */ '/view/fr/Z1',
				/* expectedEdit */ '/wiki/Z1?uselang=fr&action=edit',
				/* expectedHistory */ '/wiki/Z1?uselang=fr&action=history',
				/* expectedTalk */ '/wiki/Talk:Z1?uselang=fr',
			],
			'Not a ZObject page; we shouldn\'t be modifying anything' => [
				/* titleText */ 'Z1',
				/* isZObject */ false,
				/* languageCode */ 'en',
				/* user */ 'WikiLambdaTestUser',
				// Note: This tests that passing in a uselang has no effect when we don't do our magic
				/* params */ [ 'uselang' => 'de' ],
				/* editPage */ '/wiki/Talk:Z1?action=edit',
				/* expectedView */ '/wiki/Talk:Z1?uselang=de',
				/* expectedEdit */ '/wiki/Talk:Z1?action=edit',
				/* expectedHistory */ '/wiki/Talk:Z1?action=history',
				/* expectedTalk */ '/wiki/Talk:Z1',
			],
			'Logged out user, no edit link, German explicit view' => [
				/* titleText */ 'Z1',
				/* isZObject */ true,
				/* languageCode */ 'en',
				/* user */ '127.0.0.1',
				/* params */ [ 'uselang' => 'de' ],
				/* editPage */ null,
				/* expectedView */ '/view/de/Z1',
				/* expectedEdit */ null,
				/* expectedHistory */ '/wiki/Z1?uselang=de&action=history',
				/* expectedTalk */ '/wiki/Talk:Z1?uselang=de',
			],
		];
	}

	/**
	 * @dataProvider provideTestOnSkinTemplateNavigation
	 */
	public function testOnSkinTemplateNavigation(
		$titleText, $isZObject, $languageCode, $userName, $params, $editPage,
		$expectedView, $expectedEdit, $expectedHistory, $expectedTalk
	) {
		if ( $isZObject ) {
			$this->insertZids( [ $titleText ] );
			$title = Title::makeTitle( NS_MAIN, $titleText );
		} else {
			$title = Title::makeTitle( NS_TALK, $titleText );
		}

		$user = $this->getServiceContainer()->getUserFactory()->newFromNameOrIp( $userName );

		$context = new RequestContext();
		if ( $languageCode !== null ) {
			$context->setLanguage( $this->makeLanguage( $languageCode ) );
		}
		$context->setConfig( new HashConfig( [] ) );
		$context->setTitle( $title );
		$context->setActionName( 'view' );
		$context->setUser( $user );

		$request = new WebRequest();
		$request->setIP( '127.0.0.1' );
		$context->setRequest( $request );

		// We mock SkinTemplate because it's a mess; we don't mock the others because they're worse,
		// but in different ways.
		$mockSkinTemplate = $this->createMock( SkinTemplate::class );
		$mockSkinTemplate->method( 'getContext' )->willReturn( $context );
		$mockSkinTemplate->method( 'getRequest' )->willReturn( $request );
		$mockSkinTemplate->method( 'getTitle' )->willReturn( $title );
		$mockSkinTemplate->method( 'getRelevantTitle' )->willReturn( $title );

		$mockSkinTemplate->method( 'getUser' )->willReturn( $user );

		foreach ( $params as $key => $value ) {
			$request->setVal( $key, $value );
		}

		$talkParams = array_filter( $params, static function ( $key ) {
			// Don't include uselang or oldid in the talk page link
			return ( $key !== 'uselang' && $key !== 'oldid' );
		}, ARRAY_FILTER_USE_KEY );
		$talkPath = '/wiki/Talk:' . $titleText . ( count( $talkParams ) ? '?' . wfArrayToCgi( $talkParams ) : '' );

		// This is a fake set of links similar to what we'd get if we instantiated a real SkinTemplate
		$links = [
			'user-interface-preferences' => [],
			'views' => [
				'view' => [ 'href' => '/wiki/' . ( $isZObject ? '' : 'Talk:' ) . $titleText
					 . ( count( $params ) ? '?' . wfArrayToCgi( $params ) : '' ) ],
				'history' => [ 'href' => '/wiki/' . ( $isZObject ? '' : 'Talk:' ) . $titleText . '?action=history' ]
			],
			'associated-pages' => [
				'talk' => [ 'href' => $talkPath ]
			],
		];
		$linksOriginal = $links;

		if ( $editPage !== null ) {
			$links['views']['edit'] = [ 'href' => $editPage ];
		}

		// Trigger the behaviour we're testing
		$this->pageRenderingHandler->onSkinTemplateNavigation__Universal( $mockSkinTemplate, $links );

		// Note: The $links array is modified in-place, so we check its new value for the changes we expect

		$this->assertArrayHasKey(
			'wikifunctions-language', $links['user-interface-preferences'],
			'Make sure our language button is registered on all pages'
		);

		$this->assertEquals(
			$expectedView, $links['views']['view']['href'],
			'Check that we\'ve re-written the link to the view page correctly'
		);

		if ( $expectedEdit !== null ) {
			$this->assertEquals(
				$expectedEdit, $links['views']['edit']['href'],
				'Check that we\'ve re-written the link to the edit page correctly'
			);
		} else {
			$this->assertArrayNotHasKey(
				'edit', $links['views'],
				'Check that we don\'t add an edit link if there\'s not one there, e.g. for logged-out users'
			);
			$this->assertArrayNotHasKey(
				'viewsource', $links['views'],
				'Check that we don\'t add a viewsource link, e.g. for logged-out users'
			);
		}

		$this->assertEquals(
			$expectedHistory, $links['views']['history']['href'],
			'Check that we\'ve re-written the link to the history page correctly'
		);

		$this->assertEquals(
			$expectedTalk, $links['associated-pages']['talk']['href'],
			'Check that we\'ve re-written the link to the talk page correctly'
		);

		// Re-set our fake 'links' to the original value, and test that we don't modify them in non-repo mode
		$links = $linksOriginal;
		$this->pageRenderingHandlerRepoModeOff->onSkinTemplateNavigation__Universal( $mockSkinTemplate, $links );
		$this->assertEquals(
			$linksOriginal, $links,
			'Check that we\'ve not changed re-written the links in non-repo mode'
		);
	}

	public function testOnHtmlPageLinkRendererEnd_notOnAWikitextPage() {
		$linkRenderer = $this->getServiceContainer()->getLinkRenderer();

		$linkResultString = $linkRenderer->makeKnownLink( Title::makeTitle( NS_MAIN, 'Z1' )	);

		$this->assertStringContainsString(
			'>Z1</a>',
			$linkResultString,
			'A regular LinkRenderer call to [[Z1]] shouldn\'t be modified'
		);

		$linkResultString = $linkRenderer->makeLink( Title::makeTitle( NS_MAIN, 'Z2' ) );

		$this->assertStringContainsString(
			'>Z2</a>',
			$linkResultString,
			'A regular LinkRenderer call to [[Z2]] shouldn\'t be modified, even if it doesn\'t exist'
		);
	}

	public function testOnHtmlPageLinkRendererEnd_usedOnRecentChanges() {
		// Make a RecentChange entry for us to test
		$createdStatus = $this->editPage(
			ZTestType::TEST_ZID, ZTestType::TEST_ENCODING, 'Example RecentChanges entry', NS_MAIN
		);
		$this->assertTrue( $createdStatus->isOK() );

		// Set up a RequestContext to simulate being on the RecentChanges page
		$context = RequestContext::getMain();
		$context->setLanguage( 'en' );
		$context->setTitle( Title::newFromText( 'TestRecentChangesPage', NS_SPECIAL ) );

		$request = new FauxRequest( [ 'title' => 'Special:RecentChanges', 'uselang' => 'en' ] );
		$context->setRequest( $request );

		$rc1 = $this->getRecentChangesPage();
		$rc1->setContext( $context );
		$rc1->execute( null );

		$this->assertStringContainsString(
			'title="Z111">Demonstration type (<span dir="ltr">Z111</span>)</a></bdi>',
			$rc1->getOutput()->getHTML(),
			'The test page edit is shown in RC, labelled in English (default language) with BiDi isolation of ZID'
		);

		// TESTME: Also test that the French label is displayed correctly when the language is set to French
		// … the below fails to get the language set consistently, with some bits in en and some in fr.

		// $rc2 = $this->getRecentChangesPage();
		// $request = new FauxRequest( [ 'title' => 'Special:RecentChanges', 'uselang' => 'fr' ] );
		// $context->setRequest( $request );
		// $rc2->setContext( $context );
		// $rc2->setContentLanguage( $this->makeLanguage( 'fr' ) );
		// $rc2->execute( null );

		// $this->assertStringContainsString(
		// 	'title="Z111">Type pour démonstration (<span dir="ltr">Z111</span>)</a></bdi>',
		// 	$rc2->getOutput()->getHTML(),
		// 	'The test page edit is shown in RC, labelled in French with BiDi isolation of ZID'
		// );
	}

	public function testOnHtmlPageLinkRendererEnd_noDoubleEscape() {
		$createdStatus = $this->editPage(
			ZTestType::TEST_ZID, ZTestType::TEST_HTML_ESCAPE, 'Test html escape', NS_MAIN
		);
		$this->assertTrue( $createdStatus->isOK() );
		$context = RequestContext::getMain();
		$context->setTitle( Title::newFromText( __METHOD__ ) );
		$context->setRequest( new FauxRequest );
		// Confirm that the test page is in RC and the label was escaped exactly
		// once.
		$rc1 = $this->getRecentChangesPage();
		$rc1->setContext( $context );
		$rc1->execute( null );
		$this->assertStringContainsString( "&lt;&lt;&lt;&gt;&gt;&gt;", $rc1->getOutput()->getHTML() );
	}

	protected function getRecentChangesPage(): SpecialRecentChanges {
		return new SpecialRecentChanges(
			$this->getServiceContainer()->getWatchedItemStore(),
			$this->getServiceContainer()->getMessageParser(),
			$this->getServiceContainer()->getUserOptionsLookup(),
			$this->getServiceContainer()->getUserIdentityUtils()
		);
	}

	/**
	 * @dataProvider provideChangedTargetToViewUrl
	 * @group Broken
	 */
	public function testChangedTargetToViewUrl(
		$target, $expected, $create = true, $existing = true, $label = null, $attribs = [], $query = [], $lang = 'en'
	) {
		$this->overrideConfigValue( MainConfigNames::ArticlePath, '/wiki/$1' );
		$this->registerLangs( [ 'en', 'fr' ] );
		$linkRenderer = $this->getServiceContainer()->getLinkRenderer();

		$targetTitle = Title::newFromDBkey( $target );
		$this->setUserLang( $lang );

		if ( $create ) {
			$this->insertZids( [ $target ] );
		}

		if ( $existing ) {
			$renderedLink = $linkRenderer->makeKnownLink( $targetTitle, $label, $attribs, $query );
		} else {
			$renderedLink = $linkRenderer->makeBrokenLink( $targetTitle, $label, $attribs, $query );
		}

		$this->assertEquals(
			$expected,
			$renderedLink
		);
	}

	public static function provideChangedTargetToViewUrl() {
		// Note that URLs with '&'s in them have them encoded to '&amp;' by the hook to be HTML-safe.

		yield 'English, default label, ZID, /view link' => [
			'Z1',
			'<a href="/view/en/Z1" title="Z1">Object (<span dir="ltr">Z1</span>)</a>'
		];

		yield 'English, fallback redlink label, ZID, /view link' => [
			'Z2',
			'<a href="/wiki/Z2?action=edit&amp;uselang=en&amp;redlink=1" class="new" '
				. 'title="Z2 (page does not exist)"><span dir="ltr">Z2</span></a>',
			false,
			false
		];

		yield 'English, custom label, no ZID, /view link' => [
			'Z1',
			'<a href="/view/en/Z1" title="Z1">hello</a>',
			true,
			true,
			'hello'
		];

		yield 'English, default label, ZID, action=edit link' => [
			'Z1',
			'<a href="/wiki/Z1?action=edit&amp;uselang=en" title="Z1">Object (<span dir="ltr">Z1</span>)</a>',
			true,
			true,
			null,
			[],
			[ 'action' => 'edit' ]
		];

		yield 'English, default label, ZID, action=edit link on oldid' => [
			'Z1',
			'<a href="/wiki/Z1?action=edit&amp;uselang=en&amp;oldid=1234" title="Z1">Object '
				. '(<span dir="ltr">Z1</span>)</a>',
			true,
			true,
			null,
			[],
			[ 'action' => 'edit', 'oldid' => '1234' ]
		];

		yield 'English, default label, ZID, action=history link' => [
			'Z1',
			'<a href="/wiki/Z1?action=history&amp;uselang=en" title="Z1">Object (<span dir="ltr">Z1</span>)</a>',
			true,
			true,
			null,
			[],
			[ 'action' => 'history' ]
		];

		yield 'English, default label, ZID, diff=prev link' => [
			'Z1',
			'<a href="/wiki/Z1?uselang=en&amp;diff=prev" title="Z1">Object (<span dir="ltr">Z1</span>)</a>',
			true,
			true,
			null,
			[],
			[ 'diff' => 'prev' ]
		];

		yield 'English, default label, ZID, oldid link' => [
			'Z1',
			'<a href="/wiki/Z1?uselang=en&amp;oldid=1234" title="Z1">Object (<span dir="ltr">Z1</span>)</a>',
			true,
			true,
			null,
			[],
			[ 'oldid' => '1234' ]
		];

		yield 'English, default label, ZID, unknown GET param preserved' => [
			'Z1',
			'<a href="/view/en/Z1?foo=bar" title="Z1">Object (<span dir="ltr">Z1</span>)</a>',
			true,
			true,
			null,
			[],
			[ 'foo' => 'bar' ]
		];

		yield 'French, fallback no label, ZID, /view link' => [
			'Z1',
			'<a href="/view/fr/Z1" title="Z1">Object (<span dir="ltr">Z1</span>)</a>',
			true,
			true,
			null,
			[],
			[],
			'fr'
		];

		yield 'Nonsense language, fallback no label, ZID, /view link' => [
			'Z1',
			'<a href="/view/en/Z1" title="Z1">Object (<span dir="ltr">Z1</span>)</a>',
			true,
			true,
			null,
			[],
			[],
			'hellothisisnotalanguage'
		];

		yield 'Talk pages are not over-ridden' => [
			'Talk:Z1',
			'<a href="/wiki/Talk:Z1" title="Talk:Z1">Talk:Z1</a>',
			false
		];

		// …
	}

	/**
	 * @dataProvider provideLabelParserFunctions
	 */
	public function testLabelParserFunctions(
		string $zobject, ?string $languageCode, string $expectedLabel, string $expectedLabelDescription
	) {
		$this->insertZids( [ 'Z1', 'Z61' ] );

		$labelWikitext = '{{#wikifunctionlabel:' . $zobject
			. ( $languageCode ? '|' . $languageCode : '' ) . '}}';
		$result = $this->parseWikitextToHtml( $labelWikitext, $languageCode );
		$this->assertSame( $expectedLabel, $result->getRawText() );

		$labelDescriptionWikitext = '{{#wikifunctionlabeldesc:' . $zobject
			. ( $languageCode ? '|' . $languageCode : '' ) . '}}';
		$result = $this->parseWikitextToHtml( $labelDescriptionWikitext, $languageCode );
		$this->assertSame( $expectedLabelDescription, $result->getRawText() );
	}

	public function provideLabelParserFunctions() {
		// Invalid / malformed calls
		yield 'Malformed request results in nothing' => [
			// {{#wikifunctionlabel:}}
			'',
			null,
			'',
			''
		];

		yield 'Empty request results in nothing' => [
			// {{#wikifunctionlabel:|en}}
			'',
			'en',
			'',
			''
		];

		yield 'Z0 is not a valid Object to reference' => [
			// {{#wikifunctionlabel:Z0|en}}
			'Z0',
			'en',
			"<p>Z0\n</p>",
			"<p>Z0\n</p>"
		];

		yield 'Z!0 is not a valid Object to reference' => [
			// {{#wikifunctionlabel:Z!0|en}}
			'Z!0',
			'en',
			"<p>Z!0\n</p>",
			"<p>Z!0\n</p>"
		];

		// Known ZObject calls

		$z1 = "<p><a href=\"/wiki/Z1\" title=\"Z1\">Object (<span dir=\"ltr\" class=\"ext-wikilambda-inline-zid\">"
			. "Z1</span>)";
		$z1EnglishLabel = $z1 . "</a>\n</p>";
		$z1EnglishLabelDesc = $z1 . ": <span class=\"ext-wikilambda-inline-description\">The root concept of an"
			. " item in the Wikifunctions system, from which all other objects descend.</span></a>\n</p>";

		yield 'Z1 use in English works' => [
			// {{#wikifunctionlabel:Z1|en}}
			'Z1',
			'en',
			$z1EnglishLabel,
			$z1EnglishLabelDesc
		];

		yield 'Z1 use in French falls back (undefined by default)' => [
			// {{#wikifunctionlabel:Z1|fr}}
			'Z1',
			'fr',
			$z1EnglishLabel,
			$z1EnglishLabelDesc
		];

		yield 'Z1 use in a made-up code falls back (undefined)' => [
			// {{#wikifunctionlabel:Z1|qqz}}
			'Z1',
			'qqz',
			$z1EnglishLabel,
			$z1EnglishLabelDesc
		];

		yield 'Z1 use without a language code falls back' => [
			// {{#wikifunctionlabel:Z1}}
			'Z1',
			null,
			$z1EnglishLabel,
			$z1EnglishLabelDesc
		];

		$z400 = "<p><a href=\"/index.php?title=Z400&amp;action=edit&amp;redlink=1\" class=\"new\""
			. " title=\"Z400 (page does not exist)\">Unlabelled (<span dir=\"ltr\" class=\"ext-wikilambda-inline-zid\">"
			. "Z400</span>)";
		$z400EnglishLabel = $z400 . "</a>\n</p>";
		$z400EnglishLabelDesc = $z400 . ": <span class=\"ext-wikilambda-inline-description\">Unknown</span></a>\n</p>";

		// Unknown ZObject calls
		yield 'Z400 use in English works' => [
			// {{#wikifunctionlabel:Z400|en}}
			'Z400',
			'en',
			$z400EnglishLabel,
			$z400EnglishLabelDesc
		];

		$z61 = "<p><a href=\"/wiki/Z61\" title=\"Z61\">Programming language ("
			. "<span dir=\"ltr\" class=\"ext-wikilambda-inline-zid\">Z61</span>)";
		$z61EnglishLabel = $z61 . "</a>\n</p>";
		$z61EnglishLabelDesc = $z61 . ": <span class=\"ext-wikilambda-inline-description\">"
			. "Description with wikitext phab:T1234</span></a>\n</p>";

		// Description with wikitext
		yield 'Z61 use with wikitext in description' => [
			// {{#wikifunctionlabel:Z61}}
			'Z61',
			null,
			$z61EnglishLabel,
			$z61EnglishLabelDesc,
		];
	}

	private function parseWikitextToHtml( string $wikiText, ?string $language ): ParserOutput {
		$language ??= 'en';

		if (
			!$this->getServiceContainer()->getLanguageNameUtils()->isSupportedLanguage( $language )
		) {
			$language = 'en';
		}

		$language = $this->getServiceContainer()->getLanguageFactory()->getRawLanguage( $language );

		$parserOptions = new ParserOptions( User::newFromId( 0 ), $language );
		$parser = $this->getServiceContainer()->getParserFactory()->create();

		$title = Title::newFromTextThrow( 'PageRenderingHandlerTestPage', $this->getDefaultWikitextNS() );

		return $parser->parse( $wikiText, $title, $parserOptions );
	}

}
