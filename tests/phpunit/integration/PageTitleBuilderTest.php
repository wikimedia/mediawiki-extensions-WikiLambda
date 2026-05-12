<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\PageTitle\PageTitleBuilder;
use MediaWiki\Extension\WikiLambda\ZObjectContent\ZObjectContent;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\PageTitle\PageTitleBuilder
 * @group Database
 */
class PageTitleBuilderTest extends WikiLambdaIntegrationTestCase {
	private function newZObjectContentFixture(): ZObjectContent {
		$content = new ZObjectContent(
			'{"Z1K1":"Z2","Z2K1":{"Z1K1":"Z6","Z6K1":"Z401"},"Z2K2":"",' .
				'"Z2K3":{"Z1K1":"Z12","Z12K1":["Z11",{"Z1K1":"Z11","Z11K1":"Z1004","Z11K2":"Éxample"}]}}'
		);
		$this->assertTrue( $content->isValid() );
		return $content;
	}

	public function testCreateAbstractViewPageTitle_includesQid() {
		$html = PageTitleBuilder::createAbstractViewPageTitle( 'Example', 'en', 'ltr', 'Q42' );
		$this->assertStringStartsWith( '<span class="ext-wikilambda-viewpage-header">', $html );
		$this->assertStringContainsString(
			'<span class="ext-wikilambda-viewpage-header__title" lang="en" dir="ltr">Example</span>',
			$html
		);
		$this->assertStringContainsString( '<span class="ext-wikilambda-viewpage-header__qid"', $html );
		$this->assertStringContainsString( '>Q42<', $html );
	}

	public function testCreateAbstractEditPageTitle_withQid() {
		$html = PageTitleBuilder::createAbstractEditPageTitle( 'Create...', 'en', 'ltr', 'Q42' );
		$this->assertStringStartsWith( '<span class="ext-wikilambda-editpage-header">', $html );
		$this->assertStringContainsString(
			'<span class="ext-wikilambda-editpage-header__title" lang="en" dir="ltr">Create...</span>',
			$html
		);
		$this->assertStringContainsString( '<span class="ext-wikilambda-editpage-header__qid"', $html );
		$this->assertStringContainsString( '>Q42<', $html );
	}

	public function testCreateAbstractEditPageTitle_withoutQid() {
		$html = PageTitleBuilder::createAbstractEditPageTitle( 'Create a New Abstract Article', 'en', 'ltr' );
		$this->assertStringStartsWith( '<span class="ext-wikilambda-editpage-header">', $html );
		$this->assertStringContainsString(
			'<span class="ext-wikilambda-editpage-header__title" lang="en" dir="ltr">'
				. 'Create a New Abstract Article</span>',
			$html
		);
		$this->assertStringNotContainsString( 'ext-wikilambda-editpage-header__qid', $html );
	}

	/**
	 * @group Database
	 */
	public function testCreateZObjectViewPageTitle_includesZid() {
		$this->registerLangs( [ 'en' ] );
		$this->insertZids( [ 'Z6' ] );

		$testZid = 'Z401';
		$testTitle = Title::newFromText( $testZid, NS_MAIN );
		$content = $this->newZObjectContentFixture();

		$html = PageTitleBuilder::createZObjectViewPageTitle( $content, $testTitle, $this->makeLanguage( 'en' ) );
		$this->assertStringContainsString( 'ext-wikilambda-viewpage-header__zid', $html );
		$this->assertStringContainsString( '>Z401<', $html );
	}

	/**
	 * @group Database
	 */
	public function testCreateZObjectViewPageTitle_variants() {
		$this->registerLangs( [ 'en', 'fr', 'pcd' ] );
		$this->insertZids( [ 'Z6' ] );

		$testZid = 'Z401';
		$testTitle = Title::newFromText( $testZid, NS_MAIN );
		$content = $this->newZObjectContentFixture();

		// In English, we see 'Untitled' in en and the Type sub-title in en (with no BCP47 chip)
		// @phpcs:ignore Generic.Files.LineLength.TooLong
		$enHeader = PageTitleBuilder::createZObjectViewPageTitle( $content, $testTitle, $this->makeLanguage( 'en' ) );
		$this->assertStringStartsWith( '<span lang="en" class="ext-wikilambda-viewpage-header">', $enHeader );
		$this->assertStringContainsString( 'ext-wikilambda-viewpage-header__zid', $enHeader );
		$this->assertStringContainsString( '>Z401<', $enHeader );
		// @phpcs:ignore Generic.Files.LineLength.TooLong
		$this->assertStringContainsString( '<span class="ext-wikilambda-viewpage-header__title ext-wikilambda-viewpage-header__title--function-name ext-wikilambda-viewpage-header__title--untitled">Untitled</span>', $enHeader );
		// @phpcs:ignore Generic.Files.LineLength.TooLong
		$this->assertStringContainsString( '<div class="ext-wikilambda-viewpage-header__type"> <span class="ext-wikilambda-viewpage-header__type-label">String</span></div>', $enHeader );

		// In French, we see the label and not 'Untitled', but the Type sub-title is in en with a BCP47 chip
		// @phpcs:ignore Generic.Files.LineLength.TooLong
		$frHeader = PageTitleBuilder::createZObjectViewPageTitle( $content, $testTitle, $this->makeLanguage( 'fr' ) );
		$this->assertStringStartsWith( '<span lang="fr" class="ext-wikilambda-viewpage-header">', $frHeader );
		// @phpcs:ignore Generic.Files.LineLength.TooLong
		$this->assertStringContainsString( '><span class="ext-wikilambda-viewpage-header__title ext-wikilambda-viewpage-header__title--function-name">Éxample</span>', $frHeader );
		// @phpcs:ignore Generic.Files.LineLength.TooLong
		$this->assertStringContainsString( '<div class="ext-wikilambda-viewpage-header__type"><span title="English" class="ext-wikilambda-viewpage-header__bcp47-code">en</span>', $frHeader );
		$this->assertStringNotContainsString( 'ext-wikilambda-viewpage-header__title--untitled', $frHeader );

		// In Picard, we see the fr label with a BCP47 chip, and the Type sub-title is in en with a different chip
		$frHeader = PageTitleBuilder::createZObjectViewPageTitle(
			$content,
			$testTitle,
			$this->makeLanguage( 'pcd' )
		);
		$this->assertStringStartsWith( '<span lang="pcd" class="ext-wikilambda-viewpage-header">', $frHeader );
		// @phpcs:ignore Generic.Files.LineLength.TooLong
		$this->assertStringContainsString( '<span title="français" class="ext-wikilambda-viewpage-header__bcp47-code">fr</span> <span class="ext-wikilambda-viewpage-header__title ext-wikilambda-viewpage-header__title--function-name">Éxample</span>', $frHeader );
		// @phpcs:ignore Generic.Files.LineLength.TooLong
		$this->assertStringContainsString( '<div class="ext-wikilambda-viewpage-header__type"><span title="English" class="ext-wikilambda-viewpage-header__bcp47-code">en</span>', $frHeader );
		$this->assertStringNotContainsString( 'ext-wikilambda-viewpage-header__title--untitled', $frHeader );

		// Test with a broken ZObject
		$brokenContent = new ZObjectContent(
			'{"Z1K1":"Z2","Z2K1":{"Z1K1":"Z6","Z6K1":"Z401"},"Z2K2":"",' .
				'"Z2K3":{"Z1K1":"Z12","Z12K1":["Z11",{"Z1K1":"Z11","Z11K2":"Éxample"}]}}'
		);
		$brokenHeader = PageTitleBuilder::createZObjectViewPageTitle(
			$brokenContent,
			$testTitle,
			$this->makeLanguage( 'en' )
		);
		$this->assertSame( '', $brokenHeader );
	}

	/**
	 * @group Database
	 */
	public function testCreateZObjectEditPageTitle_variants() {
		$this->registerLangs( [ 'en' ] );
		$this->insertZids( [ 'Z6' ] );

		$content = $this->newZObjectContentFixture();
		$context = RequestContext::getMain();

		// In English, the type label should be in the user's language (no visible type chip),
		// and the name label is French, so the name chip exists but is hidden by CSS.
		$html = PageTitleBuilder::createZObjectEditPageTitle( $content, $this->makeLanguage( 'en' ), $context );
		$this->assertStringStartsWith( '<span class="ext-wikilambda-editpage-header">', $html );
		$this->assertStringContainsString( 'ext-wikilambda-editpage-header__zid', $html );
		$this->assertStringContainsString( '>Z401<', $html );
		$this->assertStringContainsString( 'ext-wikilambda-editpage-header__bcp47-code-type', $html );
		$this->assertStringContainsString( 'ext-wikilambda-editpage-header__bcp47-code-name', $html );
		$this->assertStringContainsString( 'ext-wikilambda-editpage-header__bcp47-code--hidden', $html );

		$this->registerLangs( [ 'en', 'fr', 'pcd' ] );

		// In French, the name is in French (no visible name chip) but the type is in English,
		// so the type chip is visible and the name chip is present but hidden.
		$frHtml = PageTitleBuilder::createZObjectEditPageTitle( $content, $this->makeLanguage( 'fr' ), $context );
		$this->assertStringContainsString(
			'ext-wikilambda-editpage-header__bcp47-code ext-wikilambda-editpage-header__bcp47-code-type',
			$frHtml
		);
		$this->assertStringContainsString( '>en<', $frHtml );
		$this->assertStringContainsString(
			'ext-wikilambda-editpage-header__bcp47-code ext-wikilambda-editpage-header__bcp47-code-name',
			$frHtml
		);
		$this->assertStringContainsString( '>fr<', $frHtml );
		$this->assertStringContainsString( 'ext-wikilambda-editpage-header__bcp47-code--hidden', $frHtml );

		// In Picard, neither type nor name are in the user's language, so both chips are visible.
		$pcdHtml = PageTitleBuilder::createZObjectEditPageTitle( $content, $this->makeLanguage( 'pcd' ), $context );
		$this->assertStringContainsString( '>en<', $pcdHtml );
		$this->assertStringContainsString( '>fr<', $pcdHtml );
		$this->assertStringNotContainsString( 'ext-wikilambda-editpage-header__bcp47-code--hidden', $pcdHtml );
	}
}
