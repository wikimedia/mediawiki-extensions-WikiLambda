<?php
/**
 * WikiLambda cross-wiki Function-usage Data Access Object service
 *
 * Reads and writes the shared `wikifunctions_usage` table, which records which pages
 * on which wikis use which Functions. The table lives on the shared x1 cluster via the
 * 'virtual-wikifunctions-usage' virtual domain, so the repo (Wikifunctions.org) can read
 * the full cross-wiki picture and each client wiki can query its own usage.
 *
 * Modelled on the GlobalUsage extension's globalimagelinks table and on
 * \MediaWiki\Extension\WikiLambda\AWStorage\DBAWArticleStore for the virtual-domain
 * connection pattern.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ClientStorage;

use InvalidArgumentException;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use Wikimedia\ObjectCache\WANObjectCache;
use Wikimedia\Rdbms\IConnectionProvider;
use Wikimedia\Rdbms\IDatabase;
use Wikimedia\Rdbms\IReadableDatabase;

class WikifunctionsUsageStore {

	/**
	 * How long to cache a Function's usage summary for.
	 *
	 * The counts are read on the repo but written on the client wikis, so there is no
	 * local edit to purge from and the TTL is the only invalidation available. The
	 * numbers are informational, so a few minutes of staleness costs nothing.
	 */
	private const SUMMARY_CACHE_TTL = 15 * 60;

	/**
	 * How long past its TTL to keep a usage summary in the backend.
	 *
	 * This is what makes SUMMARY_CACHE_LOCK work: WANObjectCache only takes the
	 * regeneration mutex when it still has a value to hand the threads that lose it, and
	 * it only still has one if the entry outlives its logical TTL in the store. Must be at
	 * least SUMMARY_CACHE_LOCK, or the value goes away part-way through the lock window.
	 */
	private const SUMMARY_CACHE_STALE_TTL = 60;

	/**
	 * How long after expiry to let just one thread per datacentre recompute a summary,
	 * while the rest serve the stale value.
	 */
	private const SUMMARY_CACHE_LOCK = 30;

	/**
	 * The highest page count getUsageSummary() will report.
	 *
	 * Counting every row for a Function embedded on millions of pages is far more work
	 * than a summary is worth, so stop there and let callers render "1,000+". This bounds
	 * the query's cost, not just its answer. Special:FunctionUsage still counts in full,
	 * because the total it prints has to match the list it is paginating.
	 */
	public const SUMMARY_PAGE_LIMIT = 1000;

	/**
	 * The virtual database domain on which the wikifunctions_usage table lives.
	 *
	 * In production this maps to the shared x1 cluster ('extension1' / 'wikishared');
	 * locally it maps to the wiki's own database. The mapping is configured in
	 * LocalSettings.php / mediawiki-config via $wgVirtualDomainsMapping — see the note in
	 * RepoHooks::onLoadExtensionSchemaUpdates().
	 */
	public const USAGE_VIRTUAL_DOMAIN = 'virtual-wikifunctions-usage';

	public function __construct(
		private readonly IConnectionProvider $dbProvider,
		private readonly WANObjectCache $cache
	) {
	}

	private function getReplicaDB(): IReadableDatabase {
		return $this->dbProvider->getReplicaDatabase( self::USAGE_VIRTUAL_DOMAIN );
	}

	private function getPrimaryDB(): IDatabase {
		return $this->dbProvider->getPrimaryDatabase( self::USAGE_VIRTUAL_DOMAIN );
	}

	/**
	 * Convert a Function ZID ('Z12345') to the numeric form (12345) stored in the
	 * integer wfu_function column. The inverse is a plain 'Z' . $id concatenation,
	 * needed only by read surfaces that return the Function (none yet).
	 *
	 * @param string $function The target Function's ZID, e.g. 'Z12345'
	 * @return int The numeric portion of the ZID, e.g. 12345
	 * @throws InvalidArgumentException if $function is not a valid ZID reference
	 */
	private static function functionToId( string $function ): int {
		if ( !ZObjectUtils::isValidZObjectReference( $function ) ) {
			throw new InvalidArgumentException( "Invalid Function ZID: '$function'" );
		}
		return (int)substr( $function, 1 );
	}

	/**
	 * Resolve a (wiki, namespace) pair to its surrogate id in wikifunctions_usage_wikis,
	 * creating the dimension row on first sight.
	 *
	 * The (wiki, namespace) dimension is small and almost always already present, so we
	 * read from a replica first and only write on a miss. The post-insert read goes to the
	 * primary because INSERT IGNORE is a no-op when a concurrent request won the race, in
	 * which case the row may not yet have replicated. The namespace text is functionally
	 * dependent on (wiki, namespace id) and only changes on the rare event of a namespace
	 * rename, so it is recorded once at creation rather than refreshed on every call.
	 *
	 * @param string $wiki The using wiki's ID, e.g. 'enwiki'
	 * @param int $namespaceId The using page's namespace ID on the using wiki
	 * @param ?string $namespaceText The using page's namespace name on the using wiki, or
	 *   null for the main namespace; stored because the foreign namespaces may not match
	 *   the repo's own
	 * @return int The wfuw_id surrogate key for the (wiki, namespace) pair
	 */
	private function acquireWikiId( string $wiki, int $namespaceId, ?string $namespaceText ): int {
		$conditions = [ 'wfuw_wiki' => $wiki, 'wfuw_namespace_id' => $namespaceId ];

		$wikiId = $this->getReplicaDB()->newSelectQueryBuilder()
			->select( 'wfuw_id' )
			->from( 'wikifunctions_usage_wikis' )
			->where( $conditions )
			->caller( __METHOD__ )->fetchField();
		if ( $wikiId !== false ) {
			return (int)$wikiId;
		}

		$dbw = $this->getPrimaryDB();
		$dbw->newInsertQueryBuilder()
			->insertInto( 'wikifunctions_usage_wikis' )
			->ignore()
			->row( [
				'wfuw_wiki' => $wiki,
				'wfuw_namespace_id' => $namespaceId,
				'wfuw_namespace_text' => $namespaceText,
			] )
			->caller( __METHOD__ )->execute();

		return (int)$dbw->newSelectQueryBuilder()
			->select( 'wfuw_id' )
			->from( 'wikifunctions_usage_wikis' )
			->where( $conditions )
			->caller( __METHOD__ )->fetchField();
	}

	/**
	 * Record that a Function is used on a given page of a given wiki.
	 *
	 * Idempotent on the (function, wiki_id, page_id) primary key, where wiki_id encodes
	 * the (wiki, namespace) pair via wikifunctions_usage_wikis: re-recording the same usage
	 * refreshes the page's title (e.g. an in-namespace rename) rather than duplicating the
	 * row. A move that changes namespace resolves to a different wiki_id, so the caller must
	 * deleteUsageForPage() first to clear the stale row — the namespace is part of the row's
	 * identity here, not a mutable column.
	 *
	 * @param string $function The target Function's ZID, e.g. 'Z12345'
	 * @param string $wiki The using wiki's ID, e.g. 'enwiki'
	 * @param int $pageId The page_id of the using page on the using wiki
	 * @param int $namespaceId The using page's namespace ID on the using wiki
	 * @param ?string $namespaceText The using page's namespace name on the using wiki, or
	 *   null for the main namespace; stored because the foreign namespaces may not match
	 *   the repo's own
	 * @param string $title The using page's title (DBkey, without the namespace)
	 * @throws InvalidArgumentException if $function is not a valid ZID reference
	 */
	public function insertUsage(
		string $function,
		string $wiki,
		int $pageId,
		int $namespaceId,
		?string $namespaceText,
		string $title
	): void {
		// Convert the ZID first: acquireWikiId() writes a dimension row on a miss, so a bad
		// ZID must throw before that, or it leaves a row behind that no fact row points to.
		$functionId = self::functionToId( $function );

		$wikiId = $this->acquireWikiId( $wiki, $namespaceId, $namespaceText );

		$dbw = $this->getPrimaryDB();
		$dbw->newInsertQueryBuilder()
			->insertInto( 'wikifunctions_usage' )
			->row( [
				'wfu_function' => $functionId,
				'wfu_wiki_id' => $wikiId,
				'wfu_page_id' => $pageId,
				'wfu_title' => $title,
			] )
			->onDuplicateKeyUpdate()
			->uniqueIndexFields( [ 'wfu_function', 'wfu_wiki_id', 'wfu_page_id' ] )
			->set( [ 'wfu_title' => $title ] )
			->caller( __METHOD__ )->execute();
	}

	/**
	 * Drop all usage rows for a page on a wiki.
	 *
	 * Robust to page moves and renames: it clears every namespace's rows for the page on
	 * the wiki by deleting across all of the wiki's wfuw_id values (a page that moved
	 * namespace may have rows under more than one). Used when a page is deleted, or before
	 * re-recording a page's usage from scratch on edit. The shared wikifunctions_usage_wikis
	 * dimension rows are left in place, as other pages still reference them.
	 *
	 * @param string $wiki The using wiki's ID, e.g. 'enwiki'
	 * @param int $pageId The page_id of the using page on the using wiki
	 */
	public function deleteUsageForPage( string $wiki, int $pageId ): void {
		$dbw = $this->getPrimaryDB();

		$wikiIds = $dbw->newSelectQueryBuilder()
			->select( 'wfuw_id' )
			->from( 'wikifunctions_usage_wikis' )
			->where( [ 'wfuw_wiki' => $wiki ] )
			->caller( __METHOD__ )->fetchFieldValues();
		if ( !$wikiIds ) {
			return;
		}

		$dbw->newDeleteQueryBuilder()
			->deleteFrom( 'wikifunctions_usage' )
			->where( [
				'wfu_wiki_id' => $wikiIds,
				'wfu_page_id' => $pageId,
			] )
			->caller( __METHOD__ )->execute();
	}

	/**
	 * Refresh the denormalised title for every usage row of a page — e.g. after an
	 * in-namespace rename.
	 *
	 * Only the title can be refreshed in place: the namespace is part of the row's identity
	 * via wfu_wiki_id, so a move that changes namespace resolves to a different wiki_id and
	 * must instead be cleared with deleteUsageForPage() (the page's next re-parse re-records
	 * it under the new id). The page_id is the stable identity and does not change on a move,
	 * so the rows are found by (wiki, page_id), resolving the wiki's wfuw_id set exactly as
	 * deleteUsageForPage() does. The shared wikifunctions_usage_wikis dimension rows are left
	 * in place.
	 *
	 * @param string $wiki The using wiki's ID, e.g. 'enwiki'
	 * @param int $pageId The page_id of the using page on the using wiki
	 * @param string $title The page's new title (DBkey, without the namespace)
	 */
	public function updatePageTitle(
		string $wiki,
		int $pageId,
		string $title
	): void {
		$dbw = $this->getPrimaryDB();

		$wikiIds = $dbw->newSelectQueryBuilder()
			->select( 'wfuw_id' )
			->from( 'wikifunctions_usage_wikis' )
			->where( [ 'wfuw_wiki' => $wiki ] )
			->caller( __METHOD__ )->fetchFieldValues();
		if ( !$wikiIds ) {
			return;
		}

		$dbw->newUpdateQueryBuilder()
			->update( 'wikifunctions_usage' )
			->set( [ 'wfu_title' => $title ] )
			->where( [
				'wfu_wiki_id' => $wikiIds,
				'wfu_page_id' => $pageId,
			] )
			->caller( __METHOD__ )->execute();
	}

	/**
	 * List the pages, across all wikis, on which a Function is used.
	 *
	 * The rows for a Function are clustered under the leading primary-key column, joined
	 * back to wikifunctions_usage_wikis to recover the wiki and namespace. Ordered by wiki
	 * name then page for stable, grouped output; an optional namespace filter is applied on
	 * the dimension table (matching GlobalUsage's per-target query behaviour).
	 *
	 * @param string $function The target Function's ZID, e.g. 'Z12345'
	 * @param ?int $namespaceId Restrict to this namespace ID, or null for all namespaces
	 * @param int $limit Maximum rows to return
	 * @param int $offset Rows to skip, for pagination
	 * @return array<int,array{wiki:string,pageId:int,namespaceId:int,namespaceText:?string,title:string}>
	 * @throws InvalidArgumentException if $function is not a valid ZID reference
	 */
	public function fetchUsage(
		string $function,
		?int $namespaceId = null,
		int $limit = 50,
		int $offset = 0
	): array {
		$dbr = $this->getReplicaDB();

		$queryBuilder = $dbr->newSelectQueryBuilder()
			->select( [
				'wfuw_wiki',
				'wfu_page_id',
				'wfuw_namespace_id',
				'wfuw_namespace_text',
				'wfu_title',
			] )
			->from( 'wikifunctions_usage' )
			->join( 'wikifunctions_usage_wikis', null, 'wfu_wiki_id = wfuw_id' )
			->where( [ 'wfu_function' => self::functionToId( $function ) ] )
			->orderBy( [ 'wfuw_wiki', 'wfu_page_id' ] )
			->limit( $limit )
			->offset( $offset )
			->caller( __METHOD__ );

		if ( $namespaceId !== null ) {
			$queryBuilder->andWhere( [ 'wfuw_namespace_id' => $namespaceId ] );
		}

		$result = [];
		foreach ( $queryBuilder->fetchResultSet() as $row ) {
			$result[] = [
				'wiki' => $row->wfuw_wiki,
				'pageId' => (int)$row->wfu_page_id,
				'namespaceId' => (int)$row->wfuw_namespace_id,
				'namespaceText' => $row->wfuw_namespace_text,
				'title' => $row->wfu_title,
			];
		}
		return $result;
	}

	/**
	 * Count the pages, across all wikis, on which a Function is used.
	 *
	 * @param string $function The target Function's ZID, e.g. 'Z12345'
	 * @param ?int $namespaceId Restrict to this namespace ID, or null for all namespaces
	 * @param ?int $limit Stop counting at this many rows, or null to count them all. The
	 *   limit lands inside the COUNT's subquery, so it bounds the work done rather than
	 *   just the number returned — for callers that only need "at least this many".
	 * @return int
	 * @throws InvalidArgumentException if $function is not a valid ZID reference
	 */
	public function countUsage( string $function, ?int $namespaceId = null, ?int $limit = null ): int {
		$dbr = $this->getReplicaDB();

		$queryBuilder = $dbr->newSelectQueryBuilder()
			->from( 'wikifunctions_usage' )
			->where( [ 'wfu_function' => self::functionToId( $function ) ] )
			->caller( __METHOD__ );

		// The namespace lives on the dimension table, so only join when filtering by it.
		if ( $namespaceId !== null ) {
			$queryBuilder
				->join( 'wikifunctions_usage_wikis', null, 'wfu_wiki_id = wfuw_id' )
				->andWhere( [ 'wfuw_namespace_id' => $namespaceId ] );
		}

		if ( $limit !== null ) {
			$queryBuilder->limit( $limit );
		}

		return $queryBuilder->fetchRowCount();
	}

	/**
	 * Count the wikis from which a Function is used.
	 *
	 * A wiki can hold several rows in the dimension table, one per namespace, so
	 * counting wfu_wiki_id values directly would count a wiki once per namespace. The
	 * naive fix — joining the dimension and counting distinct wfuw_wiki — reads every
	 * one of the Function's usage rows, which is far too much work for a Function that
	 * is used on millions of pages.
	 *
	 * So do it in two steps, the same fetch-then-filter shape as deleteUsageForPage(). The
	 * first query reads the distinct (wiki, namespace) ids; wfu_wiki_id is the second
	 * column of the primary key, so this can be answered from the index rather than by
	 * reading every row. The second reduces those ids to wikis against the dimension
	 * table, which holds one row per (wiki, namespace) pair across all Functions and so
	 * stays small — bounding the id list too. Two queries rather than a subquery because
	 * MariaDB optimises those poorly.
	 *
	 * @param string $function The target Function's ZID, e.g. 'Z12345'
	 * @return int
	 * @throws InvalidArgumentException if $function is not a valid ZID reference
	 */
	public function countUsageWikis( string $function ): int {
		$dbr = $this->getReplicaDB();

		$wikiIds = $dbr->newSelectQueryBuilder()
			->distinct()
			->select( 'wfu_wiki_id' )
			->from( 'wikifunctions_usage' )
			->where( [ 'wfu_function' => self::functionToId( $function ) ] )
			->caller( __METHOD__ )
			->fetchFieldValues();

		if ( !$wikiIds ) {
			return 0;
		}

		return count(
			$dbr->newSelectQueryBuilder()
				->distinct()
				->select( 'wfuw_wiki' )
				->from( 'wikifunctions_usage_wikis' )
				->where( [ 'wfuw_id' => $wikiIds ] )
				->caller( __METHOD__ )
				->fetchFieldValues()
		);
	}

	/**
	 * Summarise a Function's usage: how many pages use it, and from how many wikis.
	 *
	 * Both counts scan the Function's usage rows, so this is cached. The key is global
	 * because the usage table is shared, so the answer does not depend on which wiki
	 * asks. staleTTL and lockTSE together mean that, for the first moments after a key
	 * expires, one thread per datacentre recomputes while the rest serve the previous
	 * value; without staleTTL there would be no stale value to serve and so no mutex,
	 * and every concurrent request would scan the table at once.
	 *
	 * The page count stops at SUMMARY_PAGE_LIMIT; 'pagesLimited' says whether it did, so
	 * callers can render "1,000+" rather than implying an exact figure. The wiki count
	 * needs no such bound, as it cannot exceed the number of wikis in the farm.
	 *
	 * Because this is cached, capped and Special:FunctionUsage counts live and in full,
	 * the two can differ. That is deliberate: the Special page paginates a live list, so
	 * its total has to match the list it is printing, while this is a summary.
	 *
	 * @param string $function The target Function's ZID, e.g. 'Z12345'
	 * @return array{pages:int,wikis:int,pagesLimited:bool}
	 * @throws InvalidArgumentException if $function is not a valid ZID reference
	 */
	public function getUsageSummary( string $function ): array {
		// Validate before the cache lookup, so a bad reference cannot make a cache key.
		$functionId = self::functionToId( $function );

		return $this->cache->getWithSetCallback(
			$this->cache->makeGlobalKey( 'WikiLambda-usage-summary', (string)$functionId ),
			self::SUMMARY_CACHE_TTL,
			function () use ( $function ): array {
				// The primary key is (function, wiki_id, page), so one row per page — as
				// long as callers honour insertUsage()'s delete-first contract for
				// namespace changes, which is also what Special:FunctionUsage's own total
				// relies on. Reuse countUsage() so the two agree below the cap. Ask for one
				// row past the cap, so we can tell "exactly the cap" from "more than it".
				$pages = $this->countUsage( $function, null, self::SUMMARY_PAGE_LIMIT + 1 );

				return [
					'pages' => min( $pages, self::SUMMARY_PAGE_LIMIT ),
					'wikis' => $this->countUsageWikis( $function ),
					'pagesLimited' => $pages > self::SUMMARY_PAGE_LIMIT,
				];
			},
			[
				'staleTTL' => self::SUMMARY_CACHE_STALE_TTL,
				'lockTSE' => self::SUMMARY_CACHE_LOCK,
			]
		);
	}

	/**
	 * List the page IDs, on a single wiki, of the pages that use a Function.
	 *
	 * Unlike fetchUsage(), this is scoped to one wiki and is not paginated: it is for the
	 * RecentChanges fan-out, which must visit every using page on the local wiki. The wiki
	 * lives on the wikifunctions_usage_wikis dimension, so this joins to filter by it.
	 *
	 * @param string $function The target Function's ZID, e.g. 'Z12345'
	 * @param string $wiki The using wiki's ID, e.g. 'enwiki'
	 * @return int[] The using pages' IDs on that wiki
	 */
	public function fetchUsagePageIdsForWiki( string $function, string $wiki ): array {
		$dbr = $this->getReplicaDB();

		return array_map(
			'intval',
			$dbr->newSelectQueryBuilder()
				->select( 'wfu_page_id' )
				->from( 'wikifunctions_usage' )
				->join( 'wikifunctions_usage_wikis', null, 'wfu_wiki_id = wfuw_id' )
				->where( [
					'wfu_function' => self::functionToId( $function ),
					'wfuw_wiki' => $wiki,
				] )
				->caller( __METHOD__ )
				->fetchFieldValues()
		);
	}
}
