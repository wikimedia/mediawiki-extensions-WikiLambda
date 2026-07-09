<?php

/**
 * WikiLambda restoreInitialContent maintenance script
 *
 * Restores a snapshot bundle produced by dumpInitialContent.php: it imports the built-in
 * ZObject pages and bulk-loads the WikiLambda secondary tables, then writes the updatelog
 * marker so a subsequent update.php no-ops instead of replaying the ~1,500 per-object edits
 * that RepoHooks::createInitialContent() performs.
 *
 * The bundle is a pure performance cache. InitialContentSnapshot::restore() validates it up
 * front and returns false on any mismatch, in which case this script exits non-zero so the
 * caller can fall back to the authoritative slow path. All the real work lives in
 * InitialContentSnapshot; this is a thin wrapper.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Maintenance;

use MediaWiki\Extension\WikiLambda\InitialContentSnapshot;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Maintenance\Maintenance;

$IP = getenv( 'MW_INSTALL_PATH' );
if ( $IP === false ) {
	$IP = __DIR__ . '/../../..';
}
require_once "$IP/maintenance/Maintenance.php";

class RestoreInitialContent extends Maintenance {

	/**
	 * @inheritDoc
	 */
	public function __construct() {
		parent::__construct();
		$this->requireExtension( 'WikiLambda' );
		$this->addDescription(
			'Restores a snapshot bundle produced by dumpInitialContent.php (built-in ZObject pages '
			. 'and WikiLambda secondary tables). Exits non-zero on any mismatch so the caller can '
			. 'fall back to a normal install/update.'
		);

		$this->addOption(
			'input-dir',
			'Directory containing the snapshot bundle files (default: maintenance/initial-content)',
			false,
			true
		);
	}

	/**
	 * @inheritDoc
	 */
	public function execute() {
		if ( !WikiLambdaServices::getMode()->isRepo() ) {
			$this->fatalError( 'WikiLambda repo mode is not enabled; there is no initial content to restore.' );
		}

		$inputDir = rtrim( $this->getOption( 'input-dir', InitialContentSnapshot::DEFAULT_DIR ), '/' );

		$dbw = $this->getServiceContainer()->getConnectionProvider()->getPrimaryDatabase();
		$restored = InitialContentSnapshot::restore( $dbw, $inputDir, fn ( $m ) => $this->output( $m . "\n" ) );
		if ( !$restored ) {
			$this->fatalError( 'Snapshot restore did not run; see above.' );
		}

		// Record the marker so a subsequent update.php no-ops. A standalone run isn't driven by
		// DatabaseUpdater, so write it directly rather than via insertUpdateRow().
		$dbw->newInsertQueryBuilder()
			->insertInto( 'updatelog' )
			->ignore()
			->row( [ 'ul_key' => InitialContentSnapshot::MARKER ] )
			->caller( __METHOD__ )
			->execute();

		$this->output( "Done. Restored WikiLambda initial content from snapshot bundle in '$inputDir'.\n" );
	}
}

$maintClass = RestoreInitialContent::class;
require_once RUN_MAINTENANCE_IF_MAIN;
