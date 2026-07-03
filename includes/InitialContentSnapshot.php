<?php

/**
 * WikiLambda initial-content snapshot core.
 *
 * Single source of truth for the initial-content snapshot bundle: the built-in ZObject pages
 * and their WikiLambda secondary tables, dumped so that install.php/update.php can restore them
 * quickly instead of replaying the ~1,500 per-object edits that
 * RepoHooks::createInitialContent() performs.
 *
 * The bundle is a pure performance cache: restore() validates it up front and returns false on
 * any mismatch so the caller can fall back to the authoritative slow path, meaning a stale or
 * corrupt bundle can only cost time, never correctness.
 *
 * This logic is shared by the dumpInitialContent.php / restoreInitialContent.php maintenance
 * scripts and by RepoHooks::maybeRestoreInitialContent() (the automatic install/update path).
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use MediaWiki\Export\DumpFileOutput;
use MediaWiki\Export\WikiExporter;
use MediaWiki\Import\ImportStreamSource;
use MediaWiki\Json\FormatJson;
use MediaWiki\MediaWikiServices;
use MediaWiki\Permissions\UltimateAuthority;
use MediaWiki\Shell\Shell;
use MediaWiki\User\User;
use RuntimeException;
use Wikimedia\Rdbms\IDatabase;

class InitialContentSnapshot {

	/**
	 * Updatelog marker key set once the initial content has been restored from a snapshot bundle.
	 * When present, RepoHooks::createInitialContent() and initializeZObjectJoinTable() short-circuit
	 * so update.php doesn't replay the ~1,500 per-object edits (nor purge each page) over
	 * already-restored state.
	 */
	public const MARKER = 'WikiLambda initial content restored from snapshot';

	/**
	 * Bundle format version, stamped into the manifest and checked on restore. Bump whenever the
	 * on-disk bundle layout changes so stale bundles are rejected rather than mis-restored.
	 */
	public const FORMAT_VERSION = 1;

	/**
	 * The WikiLambda repo-mode secondary tables to snapshot, mapped to their auto-increment
	 * surrogate primary key. These are derived indexes over the ZObject pages; we dump them raw
	 * so restore can skip the (slow) secondary-data updates.
	 *
	 * The surrogate key is omitted from the dump (nothing references it) so restore lets the DB
	 * assign fresh values. Preserving explicit key values would work on MySQL/SQLite but leave a
	 * PostgreSQL identity sequence un-advanced, colliding on the first post-restore insert.
	 *
	 * wikilambda_ztester_results is deliberately excluded: its rows key on revision IDs, which
	 * importDump reassigns on the target wiki, so restored rows would dangle. It is a recomputable
	 * cache, so a restored wiki correctly starts with it empty.
	 */
	public const SECONDARY_TABLES = [
		'wikilambda_zobject_labels' => 'wlzl_id',
		'wikilambda_zobject_join' => 'wlzo_id',
		'wikilambda_zobject_function_join' => 'wlzf_id',
		'wikilambda_zobject_label_conflicts' => 'wlzlc_id',
		'wikilambda_zlanguages' => 'wlzlangs_id',
	];

	public const PAGES_FILE = 'initial-content.xml';
	public const SECONDARY_TABLES_FILE = 'secondary-tables.json';
	public const MANIFEST_FILE = 'manifest.json';

	/** Default bundle location, shared by the dump/restore scripts and the install/update hook. */
	public const DEFAULT_DIR = __DIR__ . '/../maintenance/initial-content';

	/** Number of secondary-table rows to insert per statement, within the single transaction. */
	private const INSERT_BATCH_SIZE = 500;

	/**
	 * Resolve the currently checked-out commit SHA of the function-schemata submodule. Used to
	 * stamp and validate initial-content snapshot bundles, so a bundle produced against a
	 * different set of built-in definitions is never restored.
	 *
	 * @return string|null The 40-character SHA, or null if it could not be determined
	 */
	public static function getFunctionSchemataSha(): ?string {
		$submodulePath = dirname( __DIR__ ) . '/function-schemata';
		$result = Shell::command( 'git', '-C', $submodulePath, 'rev-parse', 'HEAD' )
			->execute();

		if ( $result->getExitCode() !== 0 ) {
			return null;
		}

		$sha = trim( $result->getStdout() );
		return preg_match( '/^[0-9a-f]{40}$/', $sha ) ? $sha : null;
	}

	/**
	 * Produce a snapshot bundle (pages XML dump, secondary-tables sidecar and manifest) from the
	 * current wiki state into the given directory.
	 *
	 * @param string $dir Directory into which to write the bundle files (created by the caller)
	 * @param callable $output Progress sink, called as function( string $message ): void
	 * @return array The manifest that was written
	 * @throws RuntimeException On a silently-empty page export or an unresolvable submodule SHA
	 */
	public static function dump( string $dir, callable $output ): array {
		$dir = rtrim( $dir, '/' );

		$pageCount = self::dumpPages( "$dir/" . self::PAGES_FILE );
		$output( "Exported $pageCount page(s)." );

		$tableRowCounts = self::dumpSecondaryTables( "$dir/" . self::SECONDARY_TABLES_FILE );
		$output( "Dumped " . count( $tableRowCounts ) . ' secondary table(s).' );

		$manifest = self::writeManifest( "$dir/" . self::MANIFEST_FILE, $pageCount, $tableRowCounts );
		$output( 'Wrote manifest.' );

		return $manifest;
	}

	/**
	 * Restore a snapshot bundle from the given directory: validate it, then import the built-in
	 * ZObject pages and bulk-load the WikiLambda secondary tables.
	 *
	 * The bundle is validated in full before any mutation happens, so a false return always means
	 * nothing was changed and the caller can safely fall back to the slow per-object load. This
	 * method deliberately does NOT write the updatelog marker: the correct mechanism differs by
	 * context (a raw insert for a standalone script run, DatabaseUpdater::insertUpdateRow() for the
	 * install/update hook), so the caller records it after a true return.
	 *
	 * @param IDatabase $dbw Primary database handle to bulk-insert the secondary tables into
	 * @param string $dir Directory containing the bundle files
	 * @param callable $output Progress/diagnostic sink, called as function( string $message ): void
	 * @return bool True if the bundle was valid and restored; false if it was missing, invalid or
	 *   mismatched (a reason is emitted via $output and nothing was mutated)
	 * @throws RuntimeException If a validated bundle then fails to import or insert
	 */
	public static function restore( IDatabase $dbw, string $dir, callable $output ): bool {
		$dir = rtrim( $dir, '/' );
		$manifestFile = "$dir/" . self::MANIFEST_FILE;
		$pagesFile = "$dir/" . self::PAGES_FILE;
		$sidecarFile = "$dir/" . self::SECONDARY_TABLES_FILE;

		$validated = self::validateBundle( $manifestFile, $pagesFile, $sidecarFile, $output );
		if ( $validated === null ) {
			return false;
		}
		[ $manifest, $dump ] = $validated;

		self::importPages( $pagesFile );
		self::restoreSecondaryTables( $dbw, $dump );
		$pageCount = (int)( $manifest['pageCount'] ?? 0 );
		$output( "Restored $pageCount ZObject page(s) from snapshot bundle." );

		return true;
	}

	/**
	 * Validate the bundle's manifest, presence of all files and secondary-tables sidecar before any
	 * mutation. Returns the decoded, allowlist-checked secondary-tables dump on success.
	 *
	 * @param string $manifestFile
	 * @param string $pagesFile
	 * @param string $sidecarFile
	 * @param callable $output Reason sink for the fallback path
	 * @return array{0:array,1:array<string,array>}|null A [ manifest, secondary-tables dump ] pair,
	 *   or null if the bundle is missing, invalid or mismatched
	 */
	private static function validateBundle(
		string $manifestFile,
		string $pagesFile,
		string $sidecarFile,
		callable $output
	): ?array {
		if ( !is_file( $manifestFile ) ) {
			$output( "No snapshot manifest at '$manifestFile'." );
			return null;
		}

		$manifest = FormatJson::decode( file_get_contents( $manifestFile ), true );
		if ( !is_array( $manifest ) ) {
			$output( "Snapshot manifest at '$manifestFile' is not valid JSON." );
			return null;
		}

		$bundleVersion = $manifest['formatVersion'] ?? null;
		if ( $bundleVersion !== self::FORMAT_VERSION ) {
			$output(
				"Snapshot bundle format version '" . var_export( $bundleVersion, true ) . "' does not match "
				. 'the current version ' . self::FORMAT_VERSION . '.'
			);
			return null;
		}

		$currentSha = self::getFunctionSchemataSha();
		if ( $currentSha === null ) {
			$output( 'Could not resolve the current function-schemata submodule commit SHA to validate against.' );
			return null;
		}
		if ( ( $manifest['functionSchemataSha'] ?? null ) !== $currentSha ) {
			$output(
				'Snapshot bundle was produced against a different function-schemata revision '
				. "(bundle: '" . ( $manifest['functionSchemataSha'] ?? 'none' ) . "', current: '$currentSha')."
			);
			return null;
		}

		if ( !is_file( $pagesFile ) ) {
			$output( "Snapshot pages dump not found at '$pagesFile'." );
			return null;
		}
		if ( !is_file( $sidecarFile ) ) {
			$output( "Snapshot secondary-tables sidecar not found at '$sidecarFile'." );
			return null;
		}

		$dump = FormatJson::decode( file_get_contents( $sidecarFile ), true );
		if ( !is_array( $dump ) ) {
			$output( "Snapshot secondary-tables sidecar at '$sidecarFile' is not valid JSON." );
			return null;
		}
		foreach ( array_keys( $dump ) as $table ) {
			if ( !array_key_exists( $table, self::SECONDARY_TABLES ) ) {
				$output( "Snapshot sidecar names an unexpected table '$table'; refusing to restore." );
				return null;
			}
		}

		return [ $manifest, $dump ];
	}

	/**
	 * Export the current revision of every NS_MAIN ZObject page to an XML dump file, using core's
	 * WikiExporter so the output can be replayed by importPages() (equivalent to importDump.php).
	 *
	 * @param string $file Destination XML file path
	 * @return int Number of NS_MAIN pages exported
	 * @throws RuntimeException On a silently-empty export
	 */
	private static function dumpPages( string $file ): int {
		$services = MediaWikiServices::getInstance();
		$dbr = $services->getConnectionProvider()->getReplicaDatabase();
		$fname = __METHOD__;

		$exporter = $services->getWikiExporterFactory()->getWikiExporter(
			$dbr,
			WikiExporter::CURRENT,
			WikiExporter::TEXT,
			[ NS_MAIN ]
		);

		$sink = new DumpFileOutput( $file );
		$exporter->setOutputSink( $sink );
		$exporter->openStream();
		$exporter->allPages();
		$exporter->closeStream();

		$pageCount = (int)$dbr->newSelectQueryBuilder()
			->select( 'COUNT(*)' )
			->from( 'page' )
			->where( [ 'page_namespace' => NS_MAIN ] )
			->caller( $fname )
			->fetchField();

		// Guard against a silently-empty export: a completed openStream()/closeStream() always
		// writes the XML wrapper, so a zero-byte file means the sink captured nothing. Restoring
		// from such a bundle would yield a wiki with no ZObject pages, so refuse to write it.
		clearstatcache( true, $file );
		if ( $pageCount > 0 && !filesize( $file ) ) {
			throw new RuntimeException(
				"Page export wrote an empty dump to '$file' despite $pageCount NS_MAIN pages existing; aborting."
			);
		}

		return $pageCount;
	}

	/**
	 * Dump the WikiLambda secondary tables to a portable JSON sidecar, keyed by table name.
	 * Uses the DB abstraction (not raw SQL) so the bundle is backend-agnostic.
	 *
	 * @param string $file Destination JSON file path
	 * @return array<string,int> Map of table name to row count
	 */
	private static function dumpSecondaryTables( string $file ): array {
		$dbr = MediaWikiServices::getInstance()->getConnectionProvider()->getReplicaDatabase();
		$fname = __METHOD__;

		$dump = [];
		$rowCounts = [];
		foreach ( self::SECONDARY_TABLES as $table => $primaryKey ) {
			$rows = [];
			$res = $dbr->newSelectQueryBuilder()
				->select( '*' )
				->from( $table )
				// Deterministic order so a regenerated bundle produces a minimal, reviewable diff.
				->orderBy( $primaryKey )
				->caller( $fname )
				->fetchResultSet();
			foreach ( $res as $row ) {
				$row = (array)$row;
				// Drop the surrogate key so restore lets the DB reassign it (see SECONDARY_TABLES).
				unset( $row[$primaryKey] );
				$rows[] = $row;
			}
			$dump[$table] = $rows;
			$rowCounts[$table] = count( $rows );
		}

		file_put_contents( $file, FormatJson::encode( $dump, true, FormatJson::UTF8_OK ) );

		return $rowCounts;
	}

	/**
	 * Write the bundle manifest describing what was dumped, so restore() can validate the bundle
	 * before trusting it.
	 *
	 * @param string $file Destination manifest file path
	 * @param int $pageCount Number of NS_MAIN pages exported
	 * @param array<string,int> $tableRowCounts Map of table name to row count
	 * @return array The manifest that was written
	 * @throws RuntimeException If the function-schemata submodule SHA cannot be resolved
	 */
	private static function writeManifest( string $file, int $pageCount, array $tableRowCounts ): array {
		$sha = self::getFunctionSchemataSha();
		if ( $sha === null ) {
			throw new RuntimeException(
				'Could not resolve the function-schemata submodule commit SHA; refusing to write an '
				. 'unverifiable snapshot bundle. Ensure git is available and the submodule is checked out.'
			);
		}

		$manifest = [
			'formatVersion' => self::FORMAT_VERSION,
			'functionSchemataSha' => $sha,
			'pageCount' => $pageCount,
			'tableRowCounts' => $tableRowCounts,
		];

		file_put_contents( $file, FormatJson::encode( $manifest, true, FormatJson::UTF8_OK ) );

		return $manifest;
	}

	/**
	 * Import the built-in ZObject pages from the bundle's XML dump, with secondary/link updates
	 * disabled since we restore those tables directly from the sidecar.
	 *
	 * NOTE: this is the profiling-sensitive step. It uses core's importer (equivalent to
	 * importDump.php --no-updates); if profiling shows XML import is the bottleneck, this method
	 * can be swapped for a raw page/revision/slots/content/text table restore without changing the
	 * rest of the flow.
	 *
	 * @param string $file XML dump file path
	 * @throws RuntimeException If the dump cannot be opened or the import fails
	 */
	private static function importPages( string $file ): void {
		$status = ImportStreamSource::newFromFile( $file );
		if ( !$status->isGood() ) {
			throw new RuntimeException(
				"Could not open snapshot pages dump '$file': " . $status->getMessage()->text()
			);
		}

		$user = User::newSystemUser( User::MAINTENANCE_SCRIPT_USER, [ 'steal' => true ] );
		$importer = MediaWikiServices::getInstance()
			->getWikiImporterFactory()
			->getWikiImporter( $status->getValue(), new UltimateAuthority( $user ) );

		// We restore the WikiLambda secondary tables raw, so skip the link/secondary-data updates.
		$importer->setNoUpdates( true );
		$importer->disableStatisticsUpdate();

		try {
			$imported = $importer->doImport();
		} catch ( \Throwable $e ) {
			throw new RuntimeException( "Import of snapshot pages dump '$file' failed: " . $e->getMessage(), 0, $e );
		}
		if ( !$imported ) {
			throw new RuntimeException( "Import of snapshot pages dump '$file' reported failure." );
		}
	}

	/**
	 * Bulk-insert the (already allowlist-checked) secondary-table rows into their assumed-empty
	 * tables, within a single atomic section so the restore is all-or-nothing.
	 *
	 * @param IDatabase $dbw Primary database handle
	 * @param array<string,array> $dump Map of table name to rows to insert
	 * @throws RuntimeException If the insert fails
	 */
	private static function restoreSecondaryTables( IDatabase $dbw, array $dump ): void {
		$fname = __METHOD__;
		try {
			$dbw->doAtomicSection( $fname, static function ( IDatabase $dbw ) use ( $dump, $fname ) {
				foreach ( $dump as $table => $rows ) {
					foreach ( array_chunk( $rows, self::INSERT_BATCH_SIZE ) as $batch ) {
						$dbw->newInsertQueryBuilder()
							->insertInto( $table )
							->rows( $batch )
							->caller( $fname )
							->execute();
					}
				}
			} );
		} catch ( \Throwable $e ) {
			throw new RuntimeException( 'Failed to restore WikiLambda secondary tables: ' . $e->getMessage(), 0, $e );
		}
	}
}
