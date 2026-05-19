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

	// ------------------------------------------------------------------
	// createErrorChip
	// ------------------------------------------------------------------

	public function testCreateErrorChip_containsChipClasses() {
		$result = UIUtils::createErrorChip( 'wikilambda-commons-image-error-invalid-mid' );
		$this->assertStringContainsString( 'cdx-info-chip', $result );
		$this->assertStringContainsString( 'cdx-info-chip--error', $result );
	}

	public function testCreateErrorChip_containsMessageText() {
		$result = UIUtils::createErrorChip( 'wikilambda-commons-image-error-invalid-mid' );
		$this->assertStringContainsString( 'Image M-ID', $result );
	}

	public function testCreateErrorChip_dataErrorKeyDefaultsToErrorKey() {
		$result = UIUtils::createErrorChip( 'wikilambda-commons-image-error-invalid-mid' );
		$this->assertStringContainsString(
			'data-error-key="wikilambda-commons-image-error-invalid-mid"',
			$result
		);
	}

	public function testCreateErrorChip_dataErrorKeyOverride() {
		$result = UIUtils::createErrorChip( 'wikilambda-commons-image-error-invalid-mid', 'custom-key' );
		$this->assertStringContainsString( 'data-error-key="custom-key"', $result );
	}

	public function testCreateErrorChip_noRawScriptTags() {
		$result = UIUtils::createErrorChip( 'wikilambda-commons-image-error-invalid-mid' );
		$this->assertStringNotContainsString( '<script>', $result );
	}
}
