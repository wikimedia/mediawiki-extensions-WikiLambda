<?php

/**
 * WikiLambda integration test suite for hook handlers that affect page rendering
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\HookHandler;

use Article;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\HookHandler\PageRenderingHandler;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Languages\LanguageNameUtils;
use MediaWiki\Output\OutputPage;
use MediaWiki\Title\Title;
use MediaWiki\User\Options\UserOptionsLookup;
use Skin;

/**
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\PageRenderingHandler
 * @group Database
 */
class PageRenderingHandlerTest extends WikiLambdaIntegrationTestCase {

	private PageRenderingHandler $pageRenderingHandler;

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsRepoMode();

		$mockLanguageNameUtils = $this->createMock( LanguageNameUtils::class );
		$mockLanguageNameUtils->method( 'getLanguageName' )->willReturn( '' );

		$this->pageRenderingHandler = new PageRenderingHandler(
			$this->createNoOpMock( UserOptionsLookup::class ),
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

		$this->assertStringContainsString( '(wikilambda-noobject)', $context->getOutput()->getHTML() );
	}

	public function testOnBeforeDisplayNoArticleText_skippedOutsideNS0() {
		$title = Title::makeTitle( NS_TALK, 'Z123456' );
		$context = new RequestContext();
		$context->setTitle( $title );
		$context->setLanguage( 'qqx' );

		$article = Article::newFromTitle( $title, $context );

		$this->pageRenderingHandler->onBeforeDisplayNoArticleText( $article );

		$this->assertStringContainsString( '', $context->getOutput()->getHTML() );
	}

	public function testOnBeforePageDisplay() {
		$title = Title::makeTitle( NS_MAIN, 'Z1' );

		$mockSkin = $this->createMock( Skin::class );

		$context = new RequestContext();
		$context->setTitle( $title );
		$context->setLanguage( 'qqx' );

		$outputPage = new OutputPage( $context );

		$this->pageRenderingHandler->onBeforePageDisplay( $outputPage, $mockSkin );

		// We set wgUserLanguageName to the language label; make sure that's set
		$this->assertArrayHasKey( 'wgUserLanguageName', $outputPage->getJSVars() );
		$this->assertSame( '', $outputPage->getJSVars()['wgUserLanguageName'] );

		// We register ext.wikilambda.languageselector; make sure that's set
		$this->assertArrayContains( [ 'ext.wikilambda.languageselector' ], $outputPage->getModules() );
	}
}
