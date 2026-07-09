<?php

/**
 * WikiLambda dumpInitialContent maintenance script
 *
 * Produces a snapshot bundle of the installed initial content (the built-in ZObject pages
 * and their WikiLambda secondary tables) so that install.php/update.php can restore it quickly
 * via RepoHooks::maybeRestoreInitialContent() (or restoreInitialContent.php) instead of replaying
 * the ~1,500 per-object edits that RepoHooks::createInitialContent() performs.
 *
 * The bundle is a pure performance cache: restore validates it and falls back to the
 * authoritative slow path on any mismatch, so a stale or corrupt bundle can only cost time,
 * never correctness. All the real work lives in InitialContentSnapshot; this is a thin wrapper.
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
use RuntimeException;

$IP = getenv( 'MW_INSTALL_PATH' );
if ( $IP === false ) {
	$IP = __DIR__ . '/../../..';
}
require_once "$IP/maintenance/Maintenance.php";

class DumpInitialContent extends Maintenance {

	/**
	 * @inheritDoc
	 */
	public function __construct() {
		parent::__construct();
		$this->requireExtension( 'WikiLambda' );
		$this->addDescription(
			'Dumps a snapshot bundle of the installed initial content (built-in ZObject pages and '
			. 'WikiLambda secondary tables) for fast restore during install.php/update.php.'
		);

		$this->addOption(
			'output-dir',
			'Directory into which to write the snapshot bundle files (default: maintenance/initial-content)',
			false,
			true
		);
	}

	/**
	 * @inheritDoc
	 */
	public function execute() {
		if ( !WikiLambdaServices::getMode()->isRepo() ) {
			$this->fatalError( 'WikiLambda repo mode is not enabled; there is no initial content to dump.' );
		}

		$outputDir = $this->getOption( 'output-dir', InitialContentSnapshot::DEFAULT_DIR );
		if ( !is_dir( $outputDir ) && !mkdir( $outputDir, 0777, true ) ) {
			$this->fatalError( "Could not create output directory '$outputDir'." );
		}
		$outputDir = rtrim( $outputDir, '/' );

		try {
			$manifest = InitialContentSnapshot::dump( $outputDir, fn ( $m ) => $this->output( $m . "\n" ) );
		} catch ( RuntimeException $e ) {
			$this->fatalError( $e->getMessage() );
		}

		$this->output( "Done. Wrote snapshot bundle for {$manifest['pageCount']} pages to '$outputDir'.\n" );
	}
}

$maintClass = DumpInitialContent::class;
require_once RUN_MAINTENANCE_IF_MAIN;
