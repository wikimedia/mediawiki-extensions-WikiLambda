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

	// ------------------------------------------------------------------
	// setUsageForPage
	// ------------------------------------------------------------------

	public function testSetUsageForPage_recordsTheWholeSet() {
		$this->store->setUsageForPage( 'enwiki', 500, NS_MAIN, null, 'Snapshot', [ 'Z10090', 'Z10091' ] );

		$this->assertCount( 1, $this->store->fetchUsage( 'Z10090' ) );
		$this->assertCount( 1, $this->store->fetchUsage( 'Z10091' ) );
	}

	public function testSetUsageForPage_dropsWhatIsNoLongerUsedAndKeepsTheRest() {
		$this->store->setUsageForPage( 'enwiki', 501, NS_MAIN, null, 'Narrowed', [ 'Z10092', 'Z10093' ] );
		$this->store->setUsageForPage( 'enwiki', 501, NS_MAIN, null, 'Narrowed', [ 'Z10093' ] );

		$this->assertSame( [], $this->store->fetchUsage( 'Z10092' ) );
		$this->assertCount( 1, $this->store->fetchUsage( 'Z10093' ) );
	}

	public function testSetUsageForPage_anEmptySetDropsEveryRow() {
		$this->store->setUsageForPage( 'enwiki', 502, NS_MAIN, null, 'Emptied', [ 'Z10094' ] );
		$this->store->setUsageForPage( 'enwiki', 502, NS_MAIN, null, 'Emptied', [] );

		$this->assertSame( [], $this->store->fetchUsage( 'Z10094' ) );
	}

	public function testSetUsageForPage_refreshesTheDenormalisedTitle() {
		$this->store->setUsageForPage( 'enwiki', 503, NS_TEMPLATE, 'Template', 'Before', [ 'Z10095' ] );
		$this->store->setUsageForPage( 'enwiki', 503, NS_TEMPLATE, 'Template', 'After', [ 'Z10095' ] );

		$usage = $this->store->fetchUsage( 'Z10095' );
		$this->assertCount( 1, $usage );
		$this->assertSame( 'After', $usage[0]['title'] );
	}

	public function testSetUsageForPage_movesTheRowWhenThePageChangesNamespace() {
		// The namespace is part of a row's identity, so the row has to be re-filed rather
		// than updated. One call does both, leaving nothing behind in the old namespace.
		$this->store->setUsageForPage( 'enwiki', 504, NS_USER, 'User', 'Sandbox', [ 'Z10096' ] );
		$this->store->setUsageForPage( 'enwiki', 504, NS_TEMPLATE, 'Template', 'Sandbox', [ 'Z10096' ] );

		$usage = $this->store->fetchUsage( 'Z10096' );
		$this->assertCount( 1, $usage, 'The page must not keep a row under its old namespace' );
		$this->assertSame( NS_TEMPLATE, $usage[0]['namespaceId'] );
	}

	public function testSetUsageForPage_leavesOtherPagesAlone() {
		$this->store->setUsageForPage( 'enwiki', 505, NS_MAIN, null, 'Mine', [ 'Z10097' ] );
		$this->store->setUsageForPage( 'enwiki', 506, NS_MAIN, null, 'Yours', [ 'Z10097' ] );
		$this->store->setUsageForPage( 'enwiki', 505, NS_MAIN, null, 'Mine', [] );

		$usage = $this->store->fetchUsage( 'Z10097' );
		$this->assertCount( 1, $usage );
		$this->assertSame( 506, $usage[0]['pageId'] );
	}

	public function testSetUsageForPage_rejectsATargetThatIsNotAZid() {
		$this->expectException( InvalidArgumentException::class );
		$this->store->setUsageForPage( 'enwiki', 507, NS_MAIN, null, 'Bad', [ 'not-a-zid' ] );
	}

	// ------------------------------------------------------------------
	// Clean-up reads and writes
	// ------------------------------------------------------------------

	public function testFetchUsedPageIdsOnWiki_listsEachPageOnceInOrder() {
		// Page 601 uses two Functions, so it must still appear once.
		$this->store->setUsageForPage( 'enwiki', 602, NS_MAIN, null, 'Two', [ 'Z10100' ] );
		$this->store->setUsageForPage( 'enwiki', 601, NS_MAIN, null, 'One', [ 'Z10100', 'Z10101' ] );
		$this->store->setUsageForPage( 'dewiki', 603, NS_MAIN, null, 'Drei', [ 'Z10100' ] );

		$this->assertSame( [ 601, 602 ], $this->store->fetchUsedPageIdsOnWiki( 'enwiki' ) );
	}

	public function testFetchUsedPageIdsOnWiki_pagesThroughTheWikiFromAGivenId() {
		foreach ( [ 611, 612, 613 ] as $pageId ) {
			$this->store->setUsageForPage( 'enwiki', $pageId, NS_MAIN, null, "Page$pageId", [ 'Z10102' ] );
		}

		$this->assertSame( [ 611, 612 ], $this->store->fetchUsedPageIdsOnWiki( 'enwiki', 0, 2 ) );
		$this->assertSame( [ 613 ], $this->store->fetchUsedPageIdsOnWiki( 'enwiki', 612, 2 ) );
		$this->assertSame( [], $this->store->fetchUsedPageIdsOnWiki( 'enwiki', 613, 2 ) );
	}

	public function testFetchUsedPageIdsOnWiki_isEmptyForAWikiWithNoRows() {
		$this->assertSame( [], $this->store->fetchUsedPageIdsOnWiki( 'nosuchwiki' ) );
	}

	public function testDeleteUsageForPages_dropsOnlyTheNamedPages() {
		$this->store->setUsageForPage( 'enwiki', 621, NS_MAIN, null, 'Doomed', [ 'Z10103' ] );
		$this->store->setUsageForPage( 'enwiki', 622, NS_MAIN, null, 'Doomed too', [ 'Z10103' ] );
		$this->store->setUsageForPage( 'enwiki', 623, NS_MAIN, null, 'Spared', [ 'Z10103' ] );

		$this->store->deleteUsageForPages( 'enwiki', [ 621, 622 ] );

		$usage = $this->store->fetchUsage( 'Z10103' );
		$this->assertCount( 1, $usage );
		$this->assertSame( 623, $usage[0]['pageId'] );
	}

	public function testFetchUsageWikis_listsEachWikiOnce() {
		$this->store->setUsageForPage( 'enwiki', 631, NS_MAIN, null, 'One', [ 'Z10104' ] );
		$this->store->setUsageForPage( 'enwiki', 632, NS_TEMPLATE, 'Template', 'Two', [ 'Z10104' ] );
		$this->store->setUsageForPage( 'dewiki', 633, NS_MAIN, null, 'Drei', [ 'Z10104' ] );

		$wikis = $this->store->fetchUsageWikis();
		sort( $wikis );
		$this->assertSame( [ 'dewiki', 'enwiki' ], $wikis );
	}

	public function testDeleteUsageForWiki_dropsEveryNamespaceOfThatWikiOnly() {
		$this->store->setUsageForPage( 'enwiki', 641, NS_MAIN, null, 'Main', [ 'Z10105' ] );
		$this->store->setUsageForPage( 'enwiki', 642, NS_TEMPLATE, 'Template', 'Tpl', [ 'Z10105' ] );
		$this->store->setUsageForPage( 'dewiki', 643, NS_MAIN, null, 'Drei', [ 'Z10105' ] );

		$this->store->deleteUsageForWiki( 'enwiki' );

		$usage = $this->store->fetchUsage( 'Z10105' );
		$this->assertCount( 1, $usage );
		$this->assertSame( 'dewiki', $usage[0]['wiki'] );
	}

	public function testFetchUsedFunctions_returnsZidsNotNumbers() {
		$this->store->setUsageForPage( 'enwiki', 651, NS_MAIN, null, 'Both', [ 'Z10106', 'Z10107' ] );

		$functions = $this->store->fetchUsedFunctions();
		sort( $functions );
		$this->assertSame( [ 'Z10106', 'Z10107' ], $functions );
	}

	public function testDeleteUsageForFunctions_dropsThemAcrossEveryWiki() {
		$this->store->setUsageForPage( 'enwiki', 661, NS_MAIN, null, 'One', [ 'Z10108', 'Z10109' ] );
		$this->store->setUsageForPage( 'dewiki', 662, NS_MAIN, null, 'Zwei', [ 'Z10108' ] );

		$this->store->deleteUsageForFunctions( [ 'Z10108' ] );

		$this->assertSame( [], $this->store->fetchUsage( 'Z10108' ) );
		$this->assertCount( 1, $this->store->fetchUsage( 'Z10109' ), 'The other Function is untouched' );
	}

	public function testDeleteOrphanWikiDimensions_removesOnlyTheUnreferencedOnes() {
		$this->store->setUsageForPage( 'enwiki', 671, NS_USER, 'User', 'Sandbox', [ 'Z10110' ] );
		$this->store->setUsageForPage( 'enwiki', 672, NS_MAIN, null, 'Kept', [ 'Z10110' ] );

		// Emptying the User-namespace page leaves its dimension row behind with nothing
		// pointing at it, while the main-namespace one is still in use.
		$this->store->setUsageForPage( 'enwiki', 671, NS_USER, 'User', 'Sandbox', [] );

		$this->assertSame( 1, $this->store->deleteOrphanWikiDimensions() );
		$this->assertSame( 0, $this->store->deleteOrphanWikiDimensions(), 'A second run finds nothing' );
		$this->assertCount( 1, $this->store->fetchUsage( 'Z10110' ), 'The rows in use are untouched' );
	}
}
