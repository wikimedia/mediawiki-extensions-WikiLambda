<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\HookHandler\PageRenderingHandler;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Languages\LanguageNameUtils;
use MediaWiki\Title\Title;
use MediaWiki\User\Options\UserOptionsLookup;

/**
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\PageRenderingHandler
 */
class PageRenderingHandlerTest extends WikiLambdaIntegrationTestCase {

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
