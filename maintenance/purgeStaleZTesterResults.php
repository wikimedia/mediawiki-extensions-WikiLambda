<?php

/**
 * WikiLambda maintenance script to purge stale rows from wikilambda_ztester_results.
 *
 * A row is stale when the stored revision ID for the function, implementation, or tester
 * no longer matches the current page_latest for that ZID. This can happen when:
 * - A CacheTesterResultsJob for an old revision (R1) ran after the object was already
 *   updated to a new revision (R2) and ZObjectSecondaryDataUpdate had already cleared
 *   the cache (which was empty at that point, so the clear was a no-op).
 *
 * The --dryRun option reports how many rows would be deleted without deleting them.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Maintenance;

use MediaWiki\Maintenance\Maintenance;
use Wikimedia\Rdbms\IConnectionProvider;

$IP = getenv( 'MW_INSTALL_PATH' );
if ( $IP === false ) {
	$IP = __DIR__ . '/../../..';
}
require_once "$IP/maintenance/Maintenance.php";

class PurgeStaleZTesterResults extends Maintenance {

	private IConnectionProvider $dbProvider;

	public function __construct() {
		parent::__construct();
		$this->requireExtension( 'WikiLambda' );
		$this->addDescription(
			'Purges stale rows from wikilambda_ztester_results where any of the stored ' .
			'revision IDs (function, implementation, or tester) no longer match the ' .
			'current page_latest for that ZID.'
		);
		$this->addOption(
			'dryRun',
			'Report how many rows would be deleted without actually deleting them (default: false)',
			false,
			false
		);
	}

	public function execute() {
		$services = $this->getServiceContainer();
		$this->dbProvider = $services->getConnectionProvider();

		$dryRun = $this->getOption( 'dryRun' );

		$dbr = $this->dbProvider->getReplicaDatabase();

		// Find stale rows: those where at least one stored revision no longer
		// matches the current page_latest for the corresponding ZID.
		$staleRows = $dbr->newSelectQueryBuilder()
			->select( [
				'wlztr_id',
				'wlztr_zfunction_zid', 'wlztr_zfunction_revision',
				'wlztr_zimplementation_zid', 'wlztr_zimplementation_revision',
				'wlztr_ztester_zid', 'wlztr_ztester_revision',
				'fn_latest' => 'page_function.page_latest',
				'impl_latest' => 'page_implementation.page_latest',
				'tester_latest' => 'page_tester.page_latest',
			] )
			->from( 'wikilambda_ztester_results' )
			->leftJoin( 'page', 'page_function',
				[ 'page_function.page_namespace' => NS_MAIN,
				  'page_function.page_title = wlztr_zfunction_zid' ] )
			->leftJoin( 'page', 'page_implementation',
				[ 'page_implementation.page_namespace' => NS_MAIN,
				  'page_implementation.page_title = wlztr_zimplementation_zid' ] )
			->leftJoin( 'page', 'page_tester',
				[ 'page_tester.page_namespace' => NS_MAIN,
				  'page_tester.page_title = wlztr_ztester_zid' ] )
			->where( $dbr->makeList( [
				$dbr->makeList( [
					'page_function.page_latest IS NOT NULL',
					'page_function.page_latest != wlztr_zfunction_revision',
				], LIST_AND ),
				$dbr->makeList( [
					'page_implementation.page_latest IS NOT NULL',
					'page_implementation.page_latest != wlztr_zimplementation_revision',
				], LIST_AND ),
				$dbr->makeList( [
					'page_tester.page_latest IS NOT NULL',
					'page_tester.page_latest != wlztr_ztester_revision',
				], LIST_AND ),
			], LIST_OR ) )
			->caller( __METHOD__ )
			->fetchResultSet();

		$count = $staleRows->numRows();

		if ( $count === 0 ) {
			$this->output( "No stale rows found in wikilambda_ztester_results.\n" );
			return;
		}

		$staleIds = [];
		foreach ( $staleRows as $row ) {
			$staleIds[] = $row->wlztr_id;
			$this->output( "Row {$row->wlztr_id}:\n" );
			$this->output( $this->formatRevisionLine( 'function', $row->wlztr_zfunction_zid,
				$row->wlztr_zfunction_revision, $row->fn_latest ) );
			$this->output( $this->formatRevisionLine( 'implementation', $row->wlztr_zimplementation_zid,
				$row->wlztr_zimplementation_revision, $row->impl_latest ) );
			$this->output( $this->formatRevisionLine( 'tester', $row->wlztr_ztester_zid,
				$row->wlztr_ztester_revision, $row->tester_latest ) );
		}
		$this->output( "\n" );

		if ( $dryRun ) {
			$this->output( "Would delete $count stale row(s) from wikilambda_ztester_results.\n" );
			return;
		}

		$dbw = $this->dbProvider->getPrimaryDatabase();
		$dbw->newDeleteQueryBuilder()
			->deleteFrom( 'wikilambda_ztester_results' )
			->where( [ 'wlztr_id' => $staleIds ] )
			->caller( __METHOD__ )
			->execute();

		$deleted = $dbw->affectedRows();
		$this->output( "Deleted $deleted stale row(s) from wikilambda_ztester_results.\n" );
	}

	/**
	 * Format one line of revision output for dry-run / reporting (function, implementation, or tester).
	 *
	 * @param string $label Short role label (e.g. "function")
	 * @param string $zid ZID
	 * @param int|string $cached Revision ID stored in wikilambda_ztester_results
	 * @param int|string|null $current Current page_latest for the ZID, or null if unknown
	 * @return string Single line of text, with a [STALE] marker when current differs from cached
	 */
	private function formatRevisionLine( string $label, string $zid, $cached, $current ): string {
		$label = str_pad( $label, 14 );
		if ( $current !== null && (int)$current !== (int)$cached ) {
			return "  $label $zid  rev $cached  ->  $current  [STALE]\n";
		}
		return "  $label $zid  rev $cached\n";
	}
}

$maintClass = PurgeStaleZTesterResults::class;
require_once RUN_MAINTENANCE_IF_MAIN;
