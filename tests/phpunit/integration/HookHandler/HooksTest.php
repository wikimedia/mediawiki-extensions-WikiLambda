<?php

/**
 * WikiLambda integration test suite for hooks
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\HookHandler;

use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Hooks
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\PageRenderingHandler
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\PageEditingHandler
 * @group Database
 */
class HooksTest extends WikiLambdaIntegrationTestCase {
	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsRepoMode();
	}

	public function testRegisterExtension() {
		$zObjectTitle = Title::newFromText( 'Z1' );
		$this->assertTrue( $zObjectTitle->isContentPage() );

		$this->assertSame( 'zobject', CONTENT_MODEL_ZOBJECT ?? '' );
		$this->assertSame( CONTENT_MODEL_ZOBJECT, $zObjectTitle->getContentModel() );

		$this->assertFalse( $zObjectTitle->isWikitextPage() );

		global $wgNonincludableNamespaces;
		$this->assertArrayHasKey( NS_MAIN, $wgNonincludableNamespaces );

		global $wgNamespaceProtection;
		$this->assertContains( 'wikilambda-edit', $wgNamespaceProtection[NS_MAIN] );
		$this->assertContains( 'wikilambda-create', $wgNamespaceProtection[NS_MAIN] );
	}
}
