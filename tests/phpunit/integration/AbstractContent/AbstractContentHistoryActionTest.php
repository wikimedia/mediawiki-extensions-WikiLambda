<?php

/**
 * WikiLambda integration test suite for the AbstractContentHistoryAction class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Context\DerivativeContext;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentHistoryAction;
use MediaWiki\Page\Article;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentHistoryAction
 * @group Database
 */
class AbstractContentHistoryActionTest extends WikiLambdaIntegrationTestCase {

	private const TEST_ABSTRACT_NS = 2300;

	public function testGetName() {
		$title = Title::newFromText( 'Q42', self::TEST_ABSTRACT_NS );
		$context = new DerivativeContext( RequestContext::getMain() );
		$context->setTitle( $title );

		$article = Article::newFromTitle( $title, $context );

		$action = new AbstractContentHistoryAction( $article, $context );

		$this->assertSame( 'history', $action->getName() );
	}
}
