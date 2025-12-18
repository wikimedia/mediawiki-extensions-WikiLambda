<?php

/**
 * WikiLambda unit test suite for the UIUtils file
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\UIUtils;
use MediaWiki\Html\Html;

/**
 * @covers \MediaWiki\Extension\WikiLambda\UIUtils
 * @group Database
 */
class UIUtilsTest extends WikiLambdaIntegrationTestCase {

	public function testCreateCodexProgressIndicator() {
		$ariaLabel = 'Loading data';
		$actual = UIUtils::createCodexProgressIndicator( $ariaLabel );

		$this->assertIsString( $actual );
		$this->assertStringContainsString( 'cdx-progress-indicator', $actual );
		$this->assertStringContainsString( 'aria-label="' . $ariaLabel . '"', $actual );
		$this->assertStringContainsString( '<progress', $actual );
	}

	public function testWrapBCP47CodeInFakeCodexChip() {
		$actual = UIUtils::wrapBCP47CodeInFakeCodexChip(
			'en', 'English', 'ext-wikilambda-viewpage-header__bcp47-code'
		);
		$expected = Html::element(
			'span',
			[
				'title' => 'English',
				'class' => 'ext-wikilambda-viewpage-header__bcp47-code'
			],
			'en'
		);
		$this->assertIsString( $actual );

		// correctly generates BCP47 code
		$this->assertSame( $expected, $actual );
	}

	public function testGetBCP47ClassName() {
		$actual1 = UIUtils::getBCP47ClassName(
			'name', 'en', 'en'
		);
		$expected1 = 'ext-wikilambda-editpage-header__bcp47-code '
			. 'ext-wikilambda-editpage-header__bcp47-code-name '
			. 'ext-wikilambda-editpage-header__bcp47-code--hidden';
		$this->assertSame( $expected1, $actual1 );

		$actual2 = UIUtils::getBCP47ClassName(
			'type', 'en', 'es'
		);
		$expected2 = 'ext-wikilambda-editpage-header__bcp47-code '
			. 'ext-wikilambda-editpage-header__bcp47-code-type';
		$this->assertSame( $expected2, $actual2 );
	}
}
