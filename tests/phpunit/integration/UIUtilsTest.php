<?php

/**
 * WikiLambda unit test suite for the UIUtils file
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\UIUtils;

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

}
