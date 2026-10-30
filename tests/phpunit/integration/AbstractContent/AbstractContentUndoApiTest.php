<?php

/**
 * WikiLambda integration test suite for undo saves of Abstract content through action=edit
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\AbstractContent;

use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent;
use MediaWiki\Extension\WikiLambda\Tests\Integration\AbstractModeTestConfigTrait;
use MediaWiki\Tests\Api\ApiTestCase;
use MediaWiki\Title\Title;

/**
 * The Abstract editor saves an unchanged undo with the 'undo' parameter of action=edit (T420915).
 *
 * @covers \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContentHandler
 * @group API
 * @group Database
 */
class AbstractContentUndoApiTest extends ApiTestCase {

	use AbstractModeTestConfigTrait;

	private const TEST_ABSTRACT_NS = 2300;

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsAbstractMode();
	}

	public function testUndoIsTagged() {
		$title = Title::newFromText( 'Q42', self::TEST_ABSTRACT_NS );
		$firstJson = '{"qid":"Q42","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}';
		$secondJson = '{"qid":"Q42","sections":{"Q8776414":{"index":0,"fragments":["Z89","Z90"]}}}';
		$undoAfter = $this->editPage( $title, new AbstractWikiContent( $firstJson ) )
			->getNewRevision()->getId();
		$undo = $this->editPage( $title, new AbstractWikiContent( $secondJson ) )
			->getNewRevision()->getId();

		[ $result ] = $this->doApiRequestWithToken( [
			'action' => 'edit',
			'title' => $title->getPrefixedText(),
			'undo' => $undo,
			'undoafter' => $undoAfter,
		], null, $this->getTestSysop()->getAuthority() );

		$newRevId = $result['edit']['newrevid'];
		$this->assertJsonStringEqualsJsonString(
			$firstJson,
			$this->getServiceContainer()->getRevisionLookup()->getRevisionById( $newRevId )
				->getMainContentRaw()->serialize()
		);
		$this->assertContains(
			'mw-undo',
			$this->getServiceContainer()->getChangeTagsStore()->getTags( $this->getDb(), null, $newRevId )
		);
	}
}
