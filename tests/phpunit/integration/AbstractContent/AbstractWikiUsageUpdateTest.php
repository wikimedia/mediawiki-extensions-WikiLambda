<?php

/**
 * WikiLambda integration test suite for AbstractWikiUsageUpdate / AbstractWikiUsageRemoval
 * and their wiring into AbstractWikiContentHandler.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Deferred\DeferredUpdates;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiUsageRemoval;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiUsageUpdate;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Revision\SlotRecord;
use MediaWiki\Revision\SlotRenderingProvider;
use MediaWiki\Title\Title;
use MediaWiki\WikiMap\WikiMap;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiUsageUpdate
 * @covers \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiUsageRemoval
 * @group Database
 */
class AbstractWikiUsageUpdateTest extends WikiLambdaAbstractModeIntegrationTestCase {

	private const TEST_ABSTRACT_NS = 2300;

	private function makeContent( array $sections ): AbstractWikiContent {
		return new AbstractWikiContent(
			json_encode( [ 'qid' => 'Q42', 'sections' => $sections ] )
		);
	}

	/**
	 * A Z7 function call fragment with the given target Function ZID.
	 *
	 * @param string $functionZid
	 * @return array
	 */
	private function z7( string $functionZid ): array {
		return [ 'Z1K1' => 'Z7', 'Z7K1' => $functionZid ];
	}

	// ---------------------------------------------------------------
	// extractFunctionZids
	// ---------------------------------------------------------------

	public function testExtractFunctionZids_collectsZ7K1TargetsUniquely() {
		$content = $this->makeContent( [
			'Q8776414' => [ 'index' => 0, 'fragments' => [
				'Z89', $this->z7( 'Z10001' ), $this->z7( 'Z10002' ),
			] ],
			'Q123' => [ 'index' => 1, 'fragments' => [
				'Z89', $this->z7( 'Z10001' ),
			] ],
		] );

		$this->assertSame(
			[ 'Z10001', 'Z10002' ],
			AbstractWikiUsageUpdate::extractFunctionZids( $content )
		);
	}

	public function testExtractFunctionZids_emptyWhenOnlyTypeMarker() {
		$content = $this->makeContent( [
			'Q8776414' => [ 'index' => 0, 'fragments' => [ 'Z89' ] ],
		] );

		$this->assertSame( [], AbstractWikiUsageUpdate::extractFunctionZids( $content ) );
	}

	public function testExtractFunctionZids_ignoresMalformedFragments() {
		$content = $this->makeContent( [
			'Q8776414' => [ 'index' => 0, 'fragments' => [
				'Z89',
				[ 'Z1K1' => 'Z7' ],
				$this->z7( 'not-a-zid' ),
				$this->z7( 'Z10003' ),
			] ],
		] );

		$this->assertSame(
			[ 'Z10003' ],
			AbstractWikiUsageUpdate::extractFunctionZids( $content )
		);
	}

	// ---------------------------------------------------------------
	// doUpdate / removal
	// ---------------------------------------------------------------

	public function testDoUpdate_recordsTheArticlesFunctions() {
		$usageStore = WikiLambdaServices::getWikifunctionsUsageStore();
		// A plain-wikitext page is just a vehicle for a real page ID here; NS_MAIN is the
		// ZObject content model on a repo-mode wiki, which getExistingTestPage rejects.
		$page = $this->getExistingTestPage( 'Help:Abstract usage target' );

		$content = $this->makeContent( [
			'Q8776414' => [ 'index' => 0, 'fragments' => [
				'Z89', $this->z7( 'Z10001' ), $this->z7( 'Z10002' ),
			] ],
		] );

		( new AbstractWikiUsageUpdate( $page->getTitle(), $content, $usageStore ) )->doUpdate();

		$usage = $usageStore->fetchUsage( 'Z10001' );
		$this->assertCount( 1, $usage );
		$this->assertSame( $page->getId(), $usage[0]['pageId'] );
		$this->assertCount( 1, $usageStore->fetchUsage( 'Z10002' ) );
	}

	public function testDoUpdate_refreshesOnReRecord() {
		$usageStore = WikiLambdaServices::getWikifunctionsUsageStore();
		$page = $this->getExistingTestPage( 'Help:Abstract usage refresh' );

		$first = $this->makeContent( [
			'Q8776414' => [ 'index' => 0, 'fragments' => [ 'Z89', $this->z7( 'Z10001' ) ] ],
		] );
		( new AbstractWikiUsageUpdate( $page->getTitle(), $first, $usageStore ) )->doUpdate();

		// The article is edited to call a different Function.
		$second = $this->makeContent( [
			'Q8776414' => [ 'index' => 0, 'fragments' => [ 'Z89', $this->z7( 'Z10002' ) ] ],
		] );
		( new AbstractWikiUsageUpdate( $page->getTitle(), $second, $usageStore ) )->doUpdate();

		$this->assertSame( [], $usageStore->fetchUsage( 'Z10001' ), 'Old usage is cleared' );
		$this->assertCount( 1, $usageStore->fetchUsage( 'Z10002' ), 'New usage is recorded' );
	}

	public function testRemoval_clearsTheArticlesRows() {
		$usageStore = WikiLambdaServices::getWikifunctionsUsageStore();
		$wiki = WikiMap::getCurrentWikiId();
		$usageStore->insertUsage( 'Z10005', $wiki, 777, NS_MAIN, null, 'Gone' );
		$this->assertNotEmpty( $usageStore->fetchUsage( 'Z10005' ) );

		( new AbstractWikiUsageRemoval( $wiki, 777, $usageStore ) )->doUpdate();

		$this->assertSame( [], $usageStore->fetchUsage( 'Z10005' ) );
	}

	/**
	 * End-to-end check of the real save-then-delete flow. Beyond the unit coverage above,
	 * this verifies that getDeletionUpdates() can still resolve the page ID at deletion
	 * time — if the Title's article ID has already been cleared by then, the deletion
	 * clean-up would silently no-op and this test would fail.
	 */
	public function testDeletingAbstractArticle_clearsItsUsageEndToEnd() {
		$this->mockWikidataEntityLookup( [ 'Q42' => [ 'en' => 'Douglas Adams' ] ] );
		$usageStore = WikiLambdaServices::getWikifunctionsUsageStore();

		$abstractJson = json_encode( [
			'qid' => 'Q42',
			'sections' => [
				'Q8776414' => [ 'index' => 0, 'fragments' => [ 'Z89', $this->z7( 'Z10009' ) ] ],
			],
		] );
		$title = Title::newFromText( 'Q42', self::TEST_ABSTRACT_NS );

		// Saving the article records its Function usage via the secondary data update.
		$this->editPage( 'Q42', $abstractJson, 'create', self::TEST_ABSTRACT_NS );
		DeferredUpdates::doUpdates();
		$this->assertCount(
			1,
			$usageStore->fetchUsage( 'Z10009' ),
			'Saving the abstract article should record its Function usage'
		);

		// Deleting the page must clear those rows.
		$page = $this->getServiceContainer()->getWikiPageFactory()->newFromTitle( $title );
		$this->getServiceContainer()->getDeletePageFactory()
			->newDeletePage( $page, $this->getTestSysop()->getAuthority() )
			->deleteUnsafe( 'test deletion' );
		DeferredUpdates::doUpdates();

		$this->assertSame(
			[],
			$usageStore->fetchUsage( 'Z10009' ),
			'Deleting the abstract article should clear its Function usage'
		);
	}

	// ---------------------------------------------------------------
	// Wiring into AbstractWikiContentHandler
	// ---------------------------------------------------------------

	public function testGetSecondaryDataUpdates_includesUsageUpdate() {
		$handler = $this->getServiceContainer()
			->getContentHandlerFactory()
			->getContentHandler( CONTENT_MODEL_ABSTRACT );

		$content = $this->makeContent( [
			'Q8776414' => [ 'index' => 0, 'fragments' => [ 'Z89', $this->z7( 'Z10001' ) ] ],
		] );

		$updates = $handler->getSecondaryDataUpdates(
			Title::newFromText( 'Q42', self::TEST_ABSTRACT_NS ),
			$content,
			SlotRecord::MAIN,
			$this->createMock( SlotRenderingProvider::class )
		);

		$usageUpdates = array_filter(
			$updates,
			static fn ( $update ): bool => $update instanceof AbstractWikiUsageUpdate
		);
		$this->assertCount(
			1,
			$usageUpdates,
			'Exactly one usage update should be queued for valid abstract content'
		);
	}

	public function testGetDeletionUpdates_includesUsageRemoval() {
		$handler = $this->getServiceContainer()
			->getContentHandlerFactory()
			->getContentHandler( CONTENT_MODEL_ABSTRACT );

		$updates = $handler->getDeletionUpdates(
			Title::newFromText( 'Q42', self::TEST_ABSTRACT_NS ),
			SlotRecord::MAIN
		);

		$this->assertNotEmpty( array_filter(
			$updates,
			static fn ( $update ): bool => $update instanceof AbstractWikiUsageRemoval
		), 'A usage removal should be queued on deletion' );
	}
}
