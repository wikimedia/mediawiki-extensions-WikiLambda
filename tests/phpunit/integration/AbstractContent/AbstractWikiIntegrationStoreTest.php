<?php

/**
 * WikiLambda integration test suite for AbstractWikiIntegrationStore.
 *
 * In tests the 'virtual-abstractwiki' virtual domain maps to the wiki's own database, so wiki
 * IDs here are only opaque strings.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiIntegrationStore;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiIntegrationStore
 * @group Database
 */
class AbstractWikiIntegrationStoreTest extends WikiLambdaAbstractClientIntegrationTestCase {

	private AbstractWikiIntegrationStore $store;

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsAbstractClientMode();
		$this->store = WikiLambdaServices::getAbstractWikiIntegrationStore();
	}

	/**
	 * @param array $expected Rows, sorted by their values, as assertResultSet() sorts the result
	 */
	private function assertRows( array $expected ): void {
		$this->newSelectQueryBuilder()
			->select( [ 'awi_wiki', 'awi_title', 'awi_qid', 'awi_added', 'awi_removed', 'awi_removed_reason' ] )
			->from( 'abstractwiki_integrations' )
			->assertResultSet( $expected );
	}

	public function testSyncWiki_opensNewTitles() {
		$this->store->syncWiki( 'enwiki', [ 'Paris' => 'Q90', '1984' => 'Q2001' ], '20260101000000' );

		$this->assertRows( [
			[ 'enwiki', '1984', 'Q2001', '20260101000000', null, null ],
			[ 'enwiki', 'Paris', 'Q90', '20260101000000', null, null ],
		] );
	}

	public function testSyncWiki_isIdempotent() {
		$this->store->syncWiki( 'enwiki', [ 'Paris' => 'Q90' ], '20260101000000' );
		$this->store->syncWiki( 'enwiki', [ 'Paris' => 'Q90' ], '20260201000000' );

		$this->assertRows( [
			[ 'enwiki', 'Paris', 'Q90', '20260101000000', null, null ],
		] );
	}

	public function testSyncWiki_closesRemovedAndChangedTitles() {
		$this->store->syncWiki( 'enwiki', [ 'Paris' => 'Q90', 'Rome' => 'Q220' ], '20260101000000' );
		$this->store->syncWiki( 'enwiki', [ 'Paris' => 'Q1' ], '20260201000000' );

		$optedOut = (string)AbstractWikiIntegrationStore::REASON_OPTED_OUT;
		$this->assertRows( [
			[ 'enwiki', 'Paris', 'Q1', '20260201000000', null, null ],
			[ 'enwiki', 'Paris', 'Q90', '20260101000000', '20260201000000', $optedOut ],
			[ 'enwiki', 'Rome', 'Q220', '20260101000000', '20260201000000', $optedOut ],
		] );
	}

	public function testSyncWiki_leavesOtherWikisAlone() {
		$this->store->syncWiki( 'enwiki', [ 'Paris' => 'Q90' ], '20260101000000' );
		$this->store->syncWiki( 'frwiki', [], '20260201000000' );

		$this->assertRows( [
			[ 'enwiki', 'Paris', 'Q90', '20260101000000', null, null ],
		] );
	}

	public function testOpenTitle_opensOnlyIfNotLive() {
		$this->store->syncWiki( 'enwiki', [ 'Paris' => 'Q90' ], '20260101000000' );
		$this->store->openTitle( 'enwiki', 'Paris', 'Q90', '20260201000000' );
		$this->store->openTitle( 'enwiki', 'Rome', 'Q220', '20260201000000' );

		$this->assertRows( [
			[ 'enwiki', 'Paris', 'Q90', '20260101000000', null, null ],
			[ 'enwiki', 'Rome', 'Q220', '20260201000000', null, null ],
		] );
	}

	public function testCloseTitle_closesOnlyTheLiveRowOfThatTitle() {
		$this->store->syncWiki( 'enwiki', [ 'Paris' => 'Q90', 'Rome' => 'Q220' ], '20260101000000' );
		$this->store->closeTitle(
			'enwiki', 'Paris', AbstractWikiIntegrationStore::REASON_LOCAL_ARTICLE, '20260201000000'
		);

		$this->assertRows( [
			[
				'enwiki', 'Paris', 'Q90', '20260101000000', '20260201000000',
				(string)AbstractWikiIntegrationStore::REASON_LOCAL_ARTICLE
			],
			[ 'enwiki', 'Rome', 'Q220', '20260101000000', null, null ],
		] );
	}
}
