<?php

/**
 * WikiLambda integration test suite for WikifunctionsUsageStore.
 *
 * Exercises the shared cross-wiki `wikifunctions_usage` table (the GlobalUsage-style
 * record of which pages on which wikis use which Functions). Requires the table to have
 * been installed during PHPUnit bootstrap — which in CI/docker happens because
 * LocalSettings.php enables client or repo mode before `onLoadExtensionSchemaUpdates`
 * runs. If you see "no such table wikifunctions_usage" locally, enable client or repo
 * mode in your dev config.
 *
 * In tests the 'virtual-wikifunctions-usage' virtual domain maps to the wiki's own
 * database (db => false), so no real x1 cluster is needed; wiki IDs are therefore just
 * opaque strings here and are not validated against WikiMap.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use InvalidArgumentException;
use MediaWiki\Extension\WikiLambda\ClientStorage\WikifunctionsUsageStore;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ClientStorage\WikifunctionsUsageStore
 *
 * @group Database
 */
class WikifunctionsUsageStoreTest extends WikiLambdaClientIntegrationTestCase {

	private WikifunctionsUsageStore $store;

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsClientMode();
		$this->store = WikiLambdaServices::getWikifunctionsUsageStore();
	}

	public function testInsertUsage_storesAndReturnsTheRow() {
		$this->store->insertUsage( 'Z10001', 'enwiki', 42, NS_TEMPLATE, 'Template', 'Greeting' );

		$this->assertSame(
			[
				[
					'wiki' => 'enwiki',
					'pageId' => 42,
					'namespaceId' => NS_TEMPLATE,
					'namespaceText' => 'Template',
					'title' => 'Greeting',
				],
			],
			$this->store->fetchUsage( 'Z10001' )
		);
	}

	public function testInsertUsage_mainNamespaceStoresNullNamespaceText() {
		$this->store->insertUsage( 'Z10002', 'enwiki', 7, NS_MAIN, null, 'Pythagoras' );

		$usage = $this->store->fetchUsage( 'Z10002' );

		$this->assertSame( NS_MAIN, $usage[0]['namespaceId'] );
		$this->assertNull(
			$usage[0]['namespaceText'],
			'The main namespace stores a null namespace text, not an empty string'
		);
	}

	public function testInsertUsage_isIdempotentOnFunctionWikiPage() {
		$this->store->insertUsage( 'Z10003', 'enwiki', 99, NS_MAIN, null, 'Alpha' );
		$this->store->insertUsage( 'Z10003', 'enwiki', 99, NS_MAIN, null, 'Alpha' );

		$this->assertCount(
			1,
			$this->store->fetchUsage( 'Z10003' ),
			'Re-recording the same usage must not duplicate the row'
		);
		$this->assertSame( 1, $this->store->countUsage( 'Z10003' ) );
	}

	public function testInsertUsage_refreshesTitleOnInNamespaceRename() {
		// A rename within the same namespace keeps the (function, wiki_id, page_id) primary
		// key, so the title is refreshed in place rather than duplicated.
		$this->store->insertUsage( 'Z10004', 'enwiki', 55, NS_TEMPLATE, 'Template', 'Foo' );
		$this->store->insertUsage( 'Z10004', 'enwiki', 55, NS_TEMPLATE, 'Template', 'Foo bar' );

		$usage = $this->store->fetchUsage( 'Z10004' );

		$this->assertCount( 1, $usage, 'An in-namespace rename updates the existing row rather than adding one' );
		$this->assertSame( NS_TEMPLATE, $usage[0]['namespaceId'] );
		$this->assertSame( 'Foo bar', $usage[0]['title'] );
	}

	public function testInsertUsage_namespaceMoveNeedsDeleteToAvoidStaleRow() {
		// The namespace is part of the row's identity (it is encoded in wfu_wiki_id), so a
		// cross-namespace move is modelled as delete-then-reinsert; the write path clears the
		// page's old rows first. deleteUsageForPage() spans every namespace for the page.
		$this->store->insertUsage( 'Z10010', 'enwiki', 60, NS_USER, 'User', 'Foo' );
		$this->store->deleteUsageForPage( 'enwiki', 60 );
		$this->store->insertUsage( 'Z10010', 'enwiki', 60, NS_TEMPLATE, 'Template', 'Foo bar' );

		$usage = $this->store->fetchUsage( 'Z10010' );

		$this->assertCount( 1, $usage, 'The pre-move delete leaves only the new namespace row' );
		$this->assertSame( NS_TEMPLATE, $usage[0]['namespaceId'] );
		$this->assertSame( 'Template', $usage[0]['namespaceText'] );
		$this->assertSame( 'Foo bar', $usage[0]['title'] );
	}

	public function testFetchUsage_ordersByWikiThenPageId() {
		$this->store->insertUsage( 'Z10005', 'enwiki', 9, NS_MAIN, null, 'Nine' );
		$this->store->insertUsage( 'Z10005', 'dewiki', 5, NS_MAIN, null, 'Fünf' );
		$this->store->insertUsage( 'Z10005', 'enwiki', 2, NS_MAIN, null, 'Two' );

		$wikiAndPage = array_map(
			static fn ( array $row ): array => [ $row['wiki'], $row['pageId'] ],
			$this->store->fetchUsage( 'Z10005' )
		);

		$this->assertSame(
			[ [ 'dewiki', 5 ], [ 'enwiki', 2 ], [ 'enwiki', 9 ] ],
			$wikiAndPage
		);
	}

	public function testFetchUsage_filtersByNamespace() {
		$this->store->insertUsage( 'Z10006', 'enwiki', 1, NS_MAIN, null, 'Article' );
		$this->store->insertUsage( 'Z10006', 'enwiki', 2, NS_TEMPLATE, 'Template', 'Tpl' );

		$templates = $this->store->fetchUsage( 'Z10006', NS_TEMPLATE );

		$this->assertCount( 1, $templates );
		$this->assertSame( 'Tpl', $templates[0]['title'] );
		$this->assertSame( 2, $this->store->countUsage( 'Z10006' ) );
		$this->assertSame( 1, $this->store->countUsage( 'Z10006', NS_TEMPLATE ) );
	}

	public function testFetchUsage_returnsEmptyWhenNoRows() {
		$this->assertSame( [], $this->store->fetchUsage( 'Z99999' ) );
		$this->assertSame( 0, $this->store->countUsage( 'Z99999' ) );
		$this->assertSame( 0, $this->store->countUsageWikis( 'Z99999' ) );
	}

	public function testCountUsageWikis_countsEachWikiOnce() {
		// The (wiki, namespace) dimension gives one wiki several surrogate ids, so a wiki
		// used from more than one namespace must still count as a single wiki.
		$this->store->insertUsage( 'Z10040', 'enwiki', 1, NS_MAIN, null, 'Article' );
		$this->store->insertUsage( 'Z10040', 'enwiki', 2, NS_TEMPLATE, 'Template', 'Tpl' );
		$this->store->insertUsage( 'Z10040', 'enwiki', 3, NS_MAIN, null, 'Another' );
		$this->store->insertUsage( 'Z10040', 'dewiki', 4, NS_MAIN, null, 'Artikel' );

		$this->assertSame( 4, $this->store->countUsage( 'Z10040' ) );
		$this->assertSame( 2, $this->store->countUsageWikis( 'Z10040' ) );
	}

	public function testCountUsageWikis_isScopedToTheGivenFunction() {
		$this->store->insertUsage( 'Z10041', 'enwiki', 1, NS_MAIN, null, 'One' );
		$this->store->insertUsage( 'Z10042', 'dewiki', 2, NS_MAIN, null, 'Zwei' );
		$this->store->insertUsage( 'Z10042', 'frwiki', 3, NS_MAIN, null, 'Trois' );

		$this->assertSame( 1, $this->store->countUsageWikis( 'Z10041' ) );
		$this->assertSame( 2, $this->store->countUsageWikis( 'Z10042' ) );
	}

	public function testGetUsageSummary_reportsBothCounts() {
		$this->store->insertUsage( 'Z10043', 'enwiki', 1, NS_MAIN, null, 'Article' );
		$this->store->insertUsage( 'Z10043', 'enwiki', 2, NS_TEMPLATE, 'Template', 'Tpl' );
		$this->store->insertUsage( 'Z10043', 'dewiki', 3, NS_MAIN, null, 'Artikel' );

		$this->assertSame(
			[ 'pages' => 3, 'wikis' => 2, 'pagesLimited' => false ],
			$this->store->getUsageSummary( 'Z10043' )
		);
	}

	public function testCountUsage_stopsAtTheGivenLimit() {
		for ( $pageId = 1; $pageId <= 5; $pageId++ ) {
			$this->store->insertUsage( 'Z10046', 'enwiki', $pageId, NS_MAIN, null, "Page $pageId" );
		}

		$this->assertSame( 5, $this->store->countUsage( 'Z10046' ) );
		$this->assertSame(
			3,
			$this->store->countUsage( 'Z10046', null, 3 ),
			'The limit bounds the count, not just the rows returned'
		);
		$this->assertSame(
			5,
			$this->store->countUsage( 'Z10046', null, 50 ),
			'A limit above the real count does not inflate it'
		);
	}

	public function testGetUsageSummary_capsThePageCountAndSaysSo() {
		$limit = WikifunctionsUsageStore::SUMMARY_PAGE_LIMIT;

		// One page more than the cap, so the summary has to report the cap and flag it.
		for ( $pageId = 1; $pageId <= $limit + 1; $pageId++ ) {
			$this->store->insertUsage( 'Z10047', 'enwiki', $pageId, NS_MAIN, null, "Page $pageId" );
		}

		$this->assertSame(
			[ 'pages' => $limit, 'wikis' => 1, 'pagesLimited' => true ],
			$this->store->getUsageSummary( 'Z10047' )
		);
		$this->assertSame(
			$limit + 1,
			$this->store->countUsage( 'Z10047' ),
			'Special:FunctionUsage still gets the exact total'
		);
	}

	public function testGetUsageSummary_doesNotFlagACountExactlyAtTheCap() {
		$limit = WikifunctionsUsageStore::SUMMARY_PAGE_LIMIT;

		for ( $pageId = 1; $pageId <= $limit; $pageId++ ) {
			$this->store->insertUsage( 'Z10048', 'enwiki', $pageId, NS_MAIN, null, "Page $pageId" );
		}

		$this->assertSame(
			[ 'pages' => $limit, 'wikis' => 1, 'pagesLimited' => false ],
			$this->store->getUsageSummary( 'Z10048' )
		);
	}

	public function testGetUsageSummary_reportsZeroesForAnUnusedFunction() {
		$this->assertSame(
			[ 'pages' => 0, 'wikis' => 0, 'pagesLimited' => false ],
			$this->store->getUsageSummary( 'Z99998' )
		);
	}

	public function testGetUsageSummary_isCached() {
		$this->store->insertUsage( 'Z10044', 'enwiki', 1, NS_MAIN, null, 'One' );
		$first = $this->store->getUsageSummary( 'Z10044' );

		$this->store->insertUsage( 'Z10044', 'dewiki', 2, NS_MAIN, null, 'Zwei' );

		$this->assertSame(
			$first,
			$this->store->getUsageSummary( 'Z10044' ),
			'A new usage row is not visible until the cached summary expires'
		);
		$this->assertSame( 2, $this->store->countUsage( 'Z10044' ), 'The uncached count sees it' );
		$this->assertSame( 2, $this->store->countUsageWikis( 'Z10044' ) );
	}

	public function testGetUsageSummary_outlivesItsTtlSoOneThreadCanRefreshIt() {
		// WANObjectCache only takes the regeneration mutex when it still has a value for
		// the threads that lose it, and it only has one if the entry outlives its logical
		// TTL in the store. Were staleTTL dropped, the entry would vanish at expiry and
		// every concurrent request would rescan the table at once.
		$clock = microtime( true );
		$cache = $this->getServiceContainer()->getMainWANObjectCache();
		$cache->setMockTime( $clock );

		$this->store->insertUsage( 'Z10045', 'enwiki', 1, NS_MAIN, null, 'One' );
		$this->store->getUsageSummary( 'Z10045' );

		// Step just past the logical TTL, but not past the stale window.
		$clock += 15 * 60 + 1;

		$curTTL = null;
		$value = $cache->get( $cache->makeGlobalKey( 'WikiLambda-usage-summary', '10045' ), $curTTL );

		$this->assertSame(
			[ 'pages' => 1, 'wikis' => 1, 'pagesLimited' => false ],
			$value,
			'The expired summary is still in the store, ready to be served as stale'
		);
		$this->assertLessThanOrEqual( 0, $curTTL, 'and is reported as logically expired' );
	}

	public function testGetUsageSummary_rejectsAnInvalidReference() {
		$this->expectException( InvalidArgumentException::class );
		$this->store->getUsageSummary( 'not a ZID' );
	}

	public function testDeleteUsageForPage_removesEveryFunctionForThatPage() {
		$this->store->insertUsage( 'Z10007', 'enwiki', 30, NS_MAIN, null, 'Multi' );
		$this->store->insertUsage( 'Z10008', 'enwiki', 30, NS_MAIN, null, 'Multi' );

		$this->store->deleteUsageForPage( 'enwiki', 30 );

		$this->assertSame( [], $this->store->fetchUsage( 'Z10007' ) );
		$this->assertSame( [], $this->store->fetchUsage( 'Z10008' ) );
	}

	public function testDeleteUsageForPage_isScopedToTheGivenWiki() {
		// The same page_id on two different wikis must not collide.
		$this->store->insertUsage( 'Z10009', 'enwiki', 12, NS_MAIN, null, 'Same id' );
		$this->store->insertUsage( 'Z10009', 'dewiki', 12, NS_MAIN, null, 'Gleiche id' );

		$this->store->deleteUsageForPage( 'enwiki', 12 );

		$remaining = $this->store->fetchUsage( 'Z10009' );
		$this->assertCount( 1, $remaining );
		$this->assertSame( 'dewiki', $remaining[0]['wiki'] );
	}

	public function testUpdatePageTitle_refreshesEveryRowForThePage() {
		// Two Functions used on the same page; an in-namespace rename changes only the title.
		$this->store->insertUsage( 'Z10030', 'enwiki', 77, NS_USER, 'User', 'Sandbox' );
		$this->store->insertUsage( 'Z10031', 'enwiki', 77, NS_USER, 'User', 'Sandbox' );

		$this->store->updatePageTitle( 'enwiki', 77, 'Renamed sandbox' );

		foreach ( [ 'Z10030', 'Z10031' ] as $function ) {
			$usage = $this->store->fetchUsage( $function );
			$this->assertCount( 1, $usage );
			$this->assertSame( 77, $usage[0]['pageId'], 'The page_id is unchanged by a rename' );
			$this->assertSame( 'Renamed sandbox', $usage[0]['title'] );
			$this->assertSame( NS_USER, $usage[0]['namespaceId'], 'The namespace is untouched' );
			$this->assertSame( 'User', $usage[0]['namespaceText'] );
		}
	}

	public function testUpdatePageTitle_isScopedToWikiAndPage() {
		$this->store->insertUsage( 'Z10032', 'enwiki', 88, NS_MAIN, null, 'Target' );
		$this->store->insertUsage( 'Z10032', 'dewiki', 88, NS_MAIN, null, 'Ziel' );

		$this->store->updatePageTitle( 'enwiki', 88, 'Renamed target' );

		$byWiki = [];
		foreach ( $this->store->fetchUsage( 'Z10032' ) as $row ) {
			$byWiki[ $row['wiki'] ] = $row;
		}

		$this->assertSame( 'Renamed target', $byWiki['enwiki']['title'] );
		$this->assertSame(
			'Ziel',
			$byWiki['dewiki']['title'],
			'The same page_id on another wiki must be untouched'
		);
	}
}
