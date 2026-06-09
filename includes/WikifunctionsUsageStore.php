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

namespace MediaWiki\Extension\WikiLambda;

use InvalidArgumentException;
use Wikimedia\Rdbms\IConnectionProvider;
use Wikimedia\Rdbms\IDatabase;
use Wikimedia\Rdbms\IReadableDatabase;

class WikifunctionsUsageStore {

	/**
	 * The virtual database domain on which the wikifunctions_usage table lives.
	 *
	 * In production this maps to the shared x1 cluster ('extension1' / 'wikishared');
	 * locally it maps to the wiki's own database. The mapping is configured in
	 * LocalSettings.php / mediawiki-config via $wgVirtualDomainsMapping — see the note in
	 * RepoHooks::onLoadExtensionSchemaUpdates().
	 */
	public const USAGE_VIRTUAL_DOMAIN = 'virtual-wikifunctions-usage';

	public function __construct( private readonly IConnectionProvider $dbProvider ) {
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
	 * @return int
	 * @throws InvalidArgumentException if $function is not a valid ZID reference
	 */
	public function countUsage( string $function, ?int $namespaceId = null ): int {
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

		return $queryBuilder->fetchRowCount();
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
