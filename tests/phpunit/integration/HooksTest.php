<?php

/**
 * WikiLambda integration test suite for hooks
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use Title;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\Hooks
 * @group Database
 */
class HooksTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers ::onMultiContentSave
	 */
	public function testOnMultiContentSave_badTitle() {
		$invalidTitleText = 'Bad page title';

		$invalidZIDStatus = $this->editPage(
			$invalidTitleText, ZTestType::TEST_ENCODING, 'Test bad title', NS_MAIN
		);

		$this->assertFalse( $invalidZIDStatus->isOK() );
		$this->assertTrue( $invalidZIDStatus->hasMessage( 'wikilambda-invalidzobjecttitle' ) );

		$invalidTitle = Title::newFromText( $invalidTitleText, NS_MAIN );
		$this->assertFalse( $invalidTitle->exists() );
	}

	/**
	 * @covers ::onMultiContentSave
	 */
	public function testOnMultiContentSave_badContent() {
		$invalidContent = '{"Z1K1": "Z3"}';

		$invalidZIDStatus = $this->editPage(
			ZTestType::TEST_ZID, $invalidContent, 'Test bad content', NS_MAIN
		);

		$this->assertFalse( $invalidZIDStatus->isOK() );
		$this->assertTrue( $invalidZIDStatus->hasMessage( 'wikilambda-invalidzobject' ) );
	}
}
