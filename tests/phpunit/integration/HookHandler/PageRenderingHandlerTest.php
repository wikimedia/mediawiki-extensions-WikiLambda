<?php

/**
 * WikiLambda integration test suite for hook handlers that affect page rendering
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\HookHandler;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\HookHandler\PageRenderingHandler;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Languages\LanguageNameUtils;
use MediaWiki\Title\Title;
use MediaWiki\User\Options\UserOptionsLookup;

/**
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\PageRenderingHandler
 * @group Database
 */
class PageRenderingHandlerTest extends WikiLambdaIntegrationTestCase {

	protected function setUp(): void {
			parent::setUp();
			$this->setUpAsRepoMode();
	}

	public function testShowMissingObject() {
		$title = Title::makeTitle( NS_MAIN, 'Z123456' );

		$pageRenderingHandler = new PageRenderingHandler(
			$this->createNoOpMock( UserOptionsLookup::class ),
			$this->createNoOpMock( LanguageNameUtils::class ),
			$this->createNoOpMock( ZObjectStore::class )
		);

		$context = new RequestContext();
		$context->setTitle( $title );
		$context->setLanguage( 'qqx' );
		$pageRenderingHandler->showMissingObject( $context );

		$this->assertStringContainsString( '(wikilambda-noobject)', $context->getOutput()->getHTML() );
	}

}
