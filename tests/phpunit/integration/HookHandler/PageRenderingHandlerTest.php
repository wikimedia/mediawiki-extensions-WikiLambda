<?php

/**
 * WikiLambda integration test suite for hook handlers that affect page rendering
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\HookHandler;

use Article;
use MediaWiki\Config\HashConfig;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\HookHandler\PageRenderingHandler;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Languages\LanguageNameUtils;
use MediaWiki\Output\OutputPage;
use MediaWiki\Request\WebRequest;
use MediaWiki\Title\Title;
use MediaWiki\User\Options\UserOptionsLookup;
use Skin;
use SkinTemplate;

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

		$mockHashConfigRepoMode = $this->createMock( HashConfig::class );
		$mockHashConfigRepoMode->method( 'get' )->with( 'WikiLambdaEnableRepoMode' )->willReturn( true );

		$mockUserOptionsLookup = $this->createMock( UserOptionsLookup::class );
		$mockUserOptionsLookup->method( 'getOption' )->willReturn( 'de' );

		$mockLanguageNameUtils = $this->createMock( LanguageNameUtils::class );
		$mockLanguageNameUtils->method( 'getLanguageName' )->willReturn( '' );

		$this->pageRenderingHandler = new PageRenderingHandler(
			$mockHashConfigRepoMode,
			// $mockHashConfigNotRepoMode,
			$mockUserOptionsLookup,
			$mockLanguageNameUtils,
			$this->createNoOpMock( ZObjectStore::class )
		);

		$mockHashConfigNotRepoMode = $this->createMock( HashConfig::class );
		$mockHashConfigNotRepoMode->method( 'get' )->with( 'WikiLambdaEnableRepoMode' )->willReturn( false );

		$this->pageRenderingHandlerRepoModeOff = new PageRenderingHandler(
			$mockHashConfigNotRepoMode,
			$mockUserOptionsLookup,
			$mockLanguageNameUtils,
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
				/* expectedEdit */ '/wiki/Z1?action=edit&uselang=en',
				/* expectedHistory */ '/wiki/Z1?action=history&uselang=en',
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
				/* expectedEdit */ '/wiki/Z1?action=edit&uselang=en',
				/* expectedHistory */ '/wiki/Z1?action=history&uselang=en',
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
				/* expectedEdit */ '/wiki/Z1?action=edit&uselang=en',
				/* expectedHistory */ '/wiki/Z1?action=history&uselang=en',
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
				/* expectedEdit */ '/wiki/Z1?action=edit&uselang=en',
				/* expectedHistory */ '/wiki/Z1?action=history&uselang=en',
				/* expectedTalk */ '/wiki/Talk:Z1?fish=chips&uselang=en',
			],
			'Z1 view page, logged in user, English explicit view, oldid set' => [
				/* titleText */ 'Z1',
				/* isZObject */ true,
				/* languageCode */ 'en',
				/* user */ 'WikiLambdaTestUser',
				/* params */ [ 'oldid' => '1234' ],
				/* editPage */ '/wiki/Z1?action=edit',
				/* expectedView */ '/view/en/Z1',
				/* expectedEdit */ '/wiki/Z1?action=edit&uselang=en&oldid=1234',
				/* expectedHistory */ '/wiki/Z1?action=history&uselang=en',
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
				/* expectedEdit */ '/wiki/Z1?action=edit&uselang=fr',
				/* expectedHistory */ '/wiki/Z1?action=history&uselang=fr',
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
				/* expectedHistory */ '/wiki/Z1?action=history&uselang=de',
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
			// Duplicated because upstream (SkinTemplate) is migrating from 'namespaces' to 'associated-pages'
			'namespaces' => [
				'talk' => [ 'href' => $talkPath ]
			]
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

		$this->assertEquals(
			$expectedTalk, $links['namespaces']['talk']['href'],
			'Check that we\'ve re-written the link to the talk page correctly in the old namespaces field too'
		);

		// Re-set our fake 'links' to the original value, and test that we don't modify them in non-repo mode
		$links = $linksOriginal;
		$this->pageRenderingHandlerRepoModeOff->onSkinTemplateNavigation__Universal( $mockSkinTemplate, $links );
		$this->assertEquals(
			$linksOriginal, $links,
			'Check that we\'ve not changed re-written the links in non-repo mode'
		);
	}
}
