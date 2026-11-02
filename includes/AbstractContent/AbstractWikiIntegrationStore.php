<?php
/**
 * WikiLambda cross-wiki Abstract Wikipedia integrations Data Access Object service
 *
 * Reads and writes the shared `abstractwiki_integrations` table, which records when each
 * client wiki starts and stops showing an abstract article at a local title. The table lives
 * on the shared x1 cluster via the 'virtual-abstractwiki' virtual domain.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\AbstractContent;

use Wikimedia\Rdbms\IConnectionProvider;
use Wikimedia\Rdbms\IDatabase;

class AbstractWikiIntegrationStore {

	public const VIRTUAL_DOMAIN = 'virtual-abstractwiki';

	/** The wiki removed the article from its opted-in list, or changed its item. */
	public const REASON_OPTED_OUT = 1;
	/** A local article now exists at the title, by creation, move or undeletion. */
	public const REASON_LOCAL_ARTICLE = 2;

	public function __construct(
		private readonly IConnectionProvider $dbProvider
	) {
	}

	private function getPrimaryDB(): IDatabase {
		return $this->dbProvider->getPrimaryDatabase( self::VIRTUAL_DOMAIN );
	}

	/**
	 * Make the live integrations of a client wiki match the given list. Close the rows whose
	 * title is not in the list or now has a different item, and open rows for the new titles.
	 * Safe to repeat, so it also serves to backfill or repair a wiki's rows.
	 *
	 * @param string $wiki The client wiki's ID, e.g. 'enwiki'
	 * @param array<string,string> $qidsByTitle Primary title (DB key) => item ID, e.g. 'Q90'
	 * @param string $timestamp When the change happened, in any format ConvertibleTimestamp takes
	 */
	public function syncWiki( string $wiki, array $qidsByTitle, string $timestamp ): void {
		$dbw = $this->getPrimaryDB();
		$liveRows = $dbw->newSelectQueryBuilder()
			->select( [ 'awi_id', 'awi_title', 'awi_qid' ] )
			->from( 'abstractwiki_integrations' )
			->where( [ 'awi_wiki' => $wiki, 'awi_removed' => null ] )
			->caller( __METHOD__ )->fetchResultSet();

		$closeIds = [];
		foreach ( $liveRows as $row ) {
			if ( ( $qidsByTitle[ $row->awi_title ] ?? null ) === $row->awi_qid ) {
				// Unset, so that a duplicate live row for the same title gets closed.
				unset( $qidsByTitle[ $row->awi_title ] );
			} else {
				$closeIds[] = (int)$row->awi_id;
			}
		}

		if ( $closeIds ) {
			$dbw->newUpdateQueryBuilder()
				->update( 'abstractwiki_integrations' )
				->set( [
					'awi_removed' => $dbw->timestamp( $timestamp ),
					'awi_removed_reason' => self::REASON_OPTED_OUT,
				] )
				->where( [ 'awi_id' => $closeIds ] )
				->caller( __METHOD__ )->execute();
		}

		if ( $qidsByTitle ) {
			$newRows = [];
			foreach ( $qidsByTitle as $title => $qid ) {
				$newRows[] = [
					'awi_wiki' => $wiki,
					// PHP turns numeric string keys, like '1984', into integers.
					'awi_title' => (string)$title,
					'awi_qid' => $qid,
					'awi_added' => $dbw->timestamp( $timestamp ),
				];
			}
			$dbw->newInsertQueryBuilder()
				->insertInto( 'abstractwiki_integrations' )
				->rows( $newRows )
				->caller( __METHOD__ )->execute();
		}
	}

	/**
	 * Open an integration for a title, unless it already has a live one.
	 *
	 * @param string $wiki The client wiki's ID, e.g. 'enwiki'
	 * @param string $title Primary title (DB key)
	 * @param string $qid Item ID, e.g. 'Q90'
	 * @param string $timestamp When the change happened, in any format ConvertibleTimestamp takes
	 */
	public function openTitle( string $wiki, string $title, string $qid, string $timestamp ): void {
		$dbw = $this->getPrimaryDB();
		$isLive = (bool)$dbw->newSelectQueryBuilder()
			->select( 'awi_id' )
			->from( 'abstractwiki_integrations' )
			->where( [ 'awi_wiki' => $wiki, 'awi_title' => $title, 'awi_removed' => null ] )
			->caller( __METHOD__ )->fetchField();
		if ( $isLive ) {
			return;
		}

		$dbw->newInsertQueryBuilder()
			->insertInto( 'abstractwiki_integrations' )
			->row( [
				'awi_wiki' => $wiki,
				'awi_title' => $title,
				'awi_qid' => $qid,
				'awi_added' => $dbw->timestamp( $timestamp ),
			] )
			->caller( __METHOD__ )->execute();
	}

	/**
	 * Close the live integration of a title, if there is one.
	 *
	 * @param string $wiki The client wiki's ID, e.g. 'enwiki'
	 * @param string $title Primary title (DB key)
	 * @param int $reason One of the REASON_* constants
	 * @param string $timestamp When the change happened, in any format ConvertibleTimestamp takes
	 */
	public function closeTitle( string $wiki, string $title, int $reason, string $timestamp ): void {
		$dbw = $this->getPrimaryDB();
		$dbw->newUpdateQueryBuilder()
			->update( 'abstractwiki_integrations' )
			->set( [
				'awi_removed' => $dbw->timestamp( $timestamp ),
				'awi_removed_reason' => $reason,
			] )
			->where( [ 'awi_wiki' => $wiki, 'awi_title' => $title, 'awi_removed' => null ] )
			->caller( __METHOD__ )->execute();
	}
}
