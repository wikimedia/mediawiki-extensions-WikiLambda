<?php

/**
 * WikiLambda integration test suite for the ZObjectEditAction class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ZObjectContent;

use MediaWiki\Context\DerivativeContext;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaRepoModeIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\ZObjectContent\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectContent\ZObjectEditAction;
use MediaWiki\Html\Html;
use MediaWiki\Page\Article;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent\ZObjectEditAction
 * @group Database
 */
class ZObjectEditActionTest extends WikiLambdaRepoModeIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		// The edit page title needs the type of the test ZObjects.
		$this->insertZids( [ 'Z6' ] );
	}

	private function buildAction( Title $title, FauxRequest $request ): ZObjectEditAction {
		$context = new DerivativeContext( RequestContext::getMain() );
		$context->setTitle( $title );
		$context->setLanguage( 'en' );
		$context->setRequest( $request );
		return new ZObjectEditAction(
			Article::newFromTitle( $title, $context ),
			$context,
			$this->getServiceContainer()->getRevisionStore(),
			$this->getServiceContainer()->getContentHandlerFactory()
		);
	}

	private function makeContent( string $zid, string $value ): ZObjectContent {
		return new ZObjectContent( json_encode( [
			'Z1K1' => 'Z2',
			'Z2K1' => [ 'Z1K1' => 'Z6', 'Z6K1' => $zid ],
			'Z2K2' => $value,
			'Z2K3' => [ 'Z1K1' => 'Z12', 'Z12K1' => [ 'Z11' ] ],
		] ) );
	}

	/**
	 * @param string $zid
	 * @param string[] $values One revision per value
	 * @return array{0:Title,1:int[]} [ $title, $revisionIds ]
	 */
	private function createZObjectWithRevisions( string $zid, array $values ): array {
		$title = Title::newFromText( $zid, NS_MAIN );
		$revIds = [];
		foreach ( $values as $value ) {
			$revIds[] = $this->editPage( $title, $this->makeContent( $zid, $value ), '', NS_MAIN )
				->getNewRevision()->getId();
		}
		return [ $title, $revIds ];
	}

	public function testShow_undoLatestRevision() {
		[ $title, $revIds ] = $this->createZObjectWithRevisions( 'Z10001', [ 'first', 'second' ] );
		$action = $this->buildAction(
			$title, new FauxRequest( [ 'undo' => $revIds[1], 'undoafter' => $revIds[0] ] )
		);

		$action->show();

		$output = $action->getOutput();
		$this->assertJsonStringEqualsJsonString(
			$this->makeContent( 'Z10001', 'first' )->serialize(),
			$output->getJsConfigVars()[ 'wgWikiLambda' ][ 'undoContent' ]
		);
		$this->assertStringNotContainsString( 'cdx-message--error', $output->getHTML() );
	}

	public function testShow_undoFailure() {
		// ZObject content has no three-way merge, so an older revision cannot be undone.
		[ $title, $revIds ] = $this->createZObjectWithRevisions(
			'Z10001', [ 'first', 'second', 'third' ]
		);
		$action = $this->buildAction(
			$title, new FauxRequest( [ 'undo' => $revIds[1], 'undoafter' => $revIds[0] ] )
		);

		$action->show();

		$output = $action->getOutput();
		$this->assertArrayNotHasKey( 'undoContent', $output->getJsConfigVars()[ 'wgWikiLambda' ] );
		$this->assertStringContainsString(
			Html::errorBox( $output->msg( 'undo-failure' )->parse() ),
			$output->getHTML()
		);
		$this->assertContains( 'mediawiki.codex.messagebox.styles', $output->getModuleStyles() );
	}

	public function testShow_noUndo() {
		[ $title ] = $this->createZObjectWithRevisions( 'Z10001', [ 'first' ] );
		$action = $this->buildAction( $title, new FauxRequest() );

		$action->show();

		$this->assertArrayNotHasKey(
			'undoContent', $action->getOutput()->getJsConfigVars()[ 'wgWikiLambda' ]
		);
	}
}
