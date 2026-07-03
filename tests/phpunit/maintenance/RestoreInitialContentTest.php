<?php

/**
 * WikiLambda integration test for the restoreInitialContent maintenance script and the
 * RepoHooks installer callbacks that no-op once a snapshot has been restored.
 *
 * Covers the full dump → wipe → restore round trip (using dumpInitialContent.php to build the
 * bundle), the manifest-validation abort path, and the update.php guards that skip the slow
 * per-object creation once the snapshot marker is present.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Maintenance;

use MediaWiki\Deferred\DeferredUpdates;
use MediaWiki\Extension\WikiLambda\HookHandler\RepoHooks;
use MediaWiki\Extension\WikiLambda\InitialContentSnapshot;
use MediaWiki\Extension\WikiLambda\Maintenance\DumpInitialContent;
use MediaWiki\Extension\WikiLambda\Maintenance\RestoreInitialContent;
use MediaWiki\Installer\DatabaseUpdater;
use MediaWiki\Json\FormatJson;
use MediaWiki\Maintenance\MaintenanceFatalError;
use MediaWiki\Title\Title;
use Wikimedia\Rdbms\IDBAccessObject;

require_once dirname( __DIR__, 3 ) . '/maintenance/dumpInitialContent.php';
require_once dirname( __DIR__, 3 ) . '/maintenance/restoreInitialContent.php';

/**
 * @group Database
 * @group WikiLambdaIntegration
 *
 * @covers \MediaWiki\Extension\WikiLambda\Maintenance\RestoreInitialContent
 * @covers \MediaWiki\Extension\WikiLambda\Maintenance\DumpInitialContent
 * @covers \MediaWiki\Extension\WikiLambda\InitialContentSnapshot
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\RepoHooks::createInitialContent
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\RepoHooks::initializeZObjectJoinTable
 */
class RestoreInitialContentTest extends WikiLambdaMaintenanceTestCase {

	/**
	 * The secondary tables the bundle snapshots, in a fixed order so pre/post row-count maps
	 * compare with assertSame(). Kept in sync with InitialContentSnapshot::SECONDARY_TABLES.
	 */
	private const SECONDARY_TABLES = [
		'wikilambda_zobject_labels',
		'wikilambda_zobject_join',
		'wikilambda_zobject_function_join',
		'wikilambda_zobject_label_conflicts',
		'wikilambda_zlanguages',
	];

	protected function getMaintenanceClass(): string {
		return RestoreInitialContent::class;
	}

	/**
	 * getFunctionSchemataSha() shells out to git; if the submodule SHA can't be resolved then
	 * dump refuses to write a manifest (and restore refuses to validate one), so a round trip
	 * is impossible. Skip rather than fail in that environment.
	 */
	private function skipIfNoFunctionSchemataSha(): void {
		if ( InitialContentSnapshot::getFunctionSchemataSha() === null ) {
			$this->markTestSkipped(
				'function-schemata submodule SHA could not be resolved (git unavailable); '
				. 'the snapshot round trip cannot run in this environment.'
			);
		}
	}

	/**
	 * Build a snapshot bundle from the current wiki state into a fresh temp dir.
	 *
	 * DumpInitialContent is run as a plain instance (not via $this->maintenance, which is the
	 * RestoreInitialContent under test) with --quiet so its progress output does not leak into
	 * the test's captured output.
	 *
	 * @return string The bundle directory.
	 */
	private function buildBundle(): string {
		$dir = $this->makeTempDumpDir();
		$dump = new DumpInitialContent();
		$dump->loadWithArgv( [ '--output-dir', $dir, '--quiet' ] );
		$dump->execute();

		// Guard against a silently-empty dump so failures here are attributed to the dump step.
		$this->assertFileExists( "$dir/initial-content.xml" );
		$this->assertFileExists( "$dir/secondary-tables.json" );
		$this->assertFileExists( "$dir/manifest.json" );

		return $dir;
	}

	public function testRoundTrip_restoresPagesAndSecondaryTables(): void {
		$this->skipIfNoFunctionSchemataSha();
		$this->setUpAsRepoMode();

		// Seed a handful of real built-ins so the secondary tables are populated for the round trip.
		$this->insertZids( [ 'Z1', 'Z2', 'Z4', 'Z6', 'Z11', 'Z12', 'Z60', 'Z1002' ] );
		DeferredUpdates::doUpdates();

		// Capture the authoritative pre-state.
		$expectedTitles = $this->fetchMainNamespaceTitles();
		$expectedRowCounts = $this->fetchSecondaryTableRowCounts();
		$sampleLabel = $this->fetchSampleLabelRow();

		$this->assertNotEmpty( $expectedTitles, 'Seeding should have created NS_MAIN pages' );
		$this->assertGreaterThan(
			0,
			$expectedRowCounts['wikilambda_zobject_labels'],
			'Seeding should have populated the labels table'
		);
		$this->assertNotNull( $sampleLabel, 'A representative label row should exist to round-trip' );

		$dir = $this->buildBundle();

		// Wipe the live state: delete the NS_MAIN pages and truncate every secondary table.
		$this->wipeInitialContent( $expectedTitles );
		$this->assertSame( [], $this->fetchMainNamespaceTitles(), 'All NS_MAIN pages should be gone' );
		foreach ( self::SECONDARY_TABLES as $table ) {
			$this->assertSame(
				0,
				$this->fetchSecondaryTableRowCounts()[$table],
				"Secondary table $table should be empty before restore"
			);
		}

		// Restore from the bundle via the script under test.
		$this->maintenance->loadWithArgv( [ '--input-dir', $dir ] );
		$this->maintenance->execute();

		// The NS_MAIN pages and secondary tables should match the captured pre-state.
		$this->assertEqualsCanonicalizing(
			$expectedTitles,
			$this->fetchMainNamespaceTitles(),
			'Restored NS_MAIN page titles should match the pre-dump set'
		);
		$this->assertSame(
			$expectedRowCounts,
			$this->fetchSecondaryTableRowCounts(),
			'Restored secondary-table row counts should match the pre-dump counts'
		);

		// A specific label row should round-trip (its surrogate key may differ, so match on the
		// semantic columns only).
		$dbr = $this->getServiceContainer()->getConnectionProvider()->getPrimaryDatabase();
		$restoredSample = (int)$dbr->newSelectQueryBuilder()
			->select( 'COUNT(*)' )
			->from( 'wikilambda_zobject_labels' )
			->where( $sampleLabel )
			->caller( __METHOD__ )
			->fetchField();
		$this->assertSame( 1, $restoredSample, 'The sampled label row should be present exactly once' );

		// The snapshot marker should be recorded so a subsequent update.php no-ops.
		$this->assertTrue( $this->snapshotMarkerExists(), 'Restore should record the snapshot marker' );
	}

	public function testRestore_schemataMismatch_fatalErrorsAndDoesNotMutate(): void {
		$this->skipIfNoFunctionSchemataSha();
		$this->setUpAsRepoMode();

		$this->insertZids( [ 'Z1', 'Z6' ] );
		DeferredUpdates::doUpdates();

		$dir = $this->buildBundle();

		// Tamper the manifest so its function-schemata SHA no longer matches the checked-out one.
		$manifestFile = "$dir/manifest.json";
		$manifest = FormatJson::decode( file_get_contents( $manifestFile ), true );
		$manifest['functionSchemataSha'] = str_repeat( '0', 40 );
		file_put_contents( $manifestFile, FormatJson::encode( $manifest, true, FormatJson::UTF8_OK ) );

		// Capture the state that must remain untouched.
		$rowCountsBefore = $this->fetchSecondaryTableRowCounts();
		$titlesBefore = $this->fetchMainNamespaceTitles();
		$this->assertFalse( $this->snapshotMarkerExists(), 'Precondition: no snapshot marker yet' );

		// Restore validates the manifest before importing or inserting anything, so it must abort
		// (fatalError() throws MaintenanceFatalError) before any mutation happens. We catch it
		// ourselves rather than using expectCallToFatalError() so the post-conditions can be asserted.
		$this->maintenance->loadWithArgv( [ '--input-dir', $dir ] );
		try {
			$this->maintenance->execute();
			$this->fail( 'RestoreInitialContent should have fatalError()ed on a schemata-SHA mismatch' );
		} catch ( MaintenanceFatalError $e ) {
			// Expected: the bundle was produced against a different function-schemata revision.
		}

		$this->assertFalse(
			$this->snapshotMarkerExists(),
			'A rejected bundle must not record the snapshot marker'
		);
		$this->assertSame(
			$rowCountsBefore,
			$this->fetchSecondaryTableRowCounts(),
			'A rejected bundle must not mutate the secondary tables'
		);
		$this->assertEqualsCanonicalizing(
			$titlesBefore,
			$this->fetchMainNamespaceTitles(),
			'A rejected bundle must not import any pages'
		);
	}

	public function testCreateInitialContent_skippedWhenSnapshotMarkerPresent(): void {
		$this->setUpAsRepoMode();
		$this->insertSnapshotMarker();

		$functionTitle = Title::newFromText( 'Z8', NS_MAIN );
		$this->assertFalse( $functionTitle->exists(), 'Precondition: Z8 should not yet exist' );

		$updater = DatabaseUpdater::newForDB( $this->getDb() );
		RepoHooks::createInitialContent( $updater );

		$this->assertFalse(
			Title::newFromText( 'Z8', NS_MAIN )->exists( IDBAccessObject::READ_LATEST ),
			'createInitialContent must not create any pages once the snapshot marker is present'
		);
	}

	public function testInitializeZObjectJoinTable_skippedWhenSnapshotMarkerPresent(): void {
		$this->setUpAsRepoMode();
		$this->insertSnapshotMarker();

		$initialisedKey = 'Initialized wikilambda_zobject_join for Z8s';
		$updater = DatabaseUpdater::newForDB( $this->getDb() );

		$this->assertFalse(
			$updater->updateRowExists( $initialisedKey ),
			'Precondition: the join-table initialisation should not yet be recorded'
		);

		RepoHooks::initializeZObjectJoinTable( $updater );

		// The unguarded path would run updateSecondaryTables() and then record $initialisedKey; the
		// guard returns before either, so the key is never written.
		$this->assertFalse(
			$updater->updateRowExists( $initialisedKey ),
			'initializeZObjectJoinTable must no-op once the snapshot marker is present'
		);
	}

	/**
	 * @return string[] Sorted list of NS_MAIN page titles (the ZIDs) currently present.
	 */
	private function fetchMainNamespaceTitles(): array {
		$dbr = $this->getServiceContainer()->getConnectionProvider()->getPrimaryDatabase();
		$titles = $dbr->newSelectQueryBuilder()
			->select( 'page_title' )
			->from( 'page' )
			->where( [ 'page_namespace' => NS_MAIN ] )
			->caller( __METHOD__ )
			->fetchFieldValues();
		sort( $titles );
		return $titles;
	}

	/**
	 * @return array<string,int> Map of secondary-table name to current row count, keyed in
	 *   SECONDARY_TABLES order.
	 */
	private function fetchSecondaryTableRowCounts(): array {
		$dbr = $this->getServiceContainer()->getConnectionProvider()->getPrimaryDatabase();
		$counts = [];
		foreach ( self::SECONDARY_TABLES as $table ) {
			$counts[$table] = (int)$dbr->newSelectQueryBuilder()
				->select( 'COUNT(*)' )
				->from( $table )
				->caller( __METHOD__ )
				->fetchField();
		}
		return $counts;
	}

	/**
	 * Grab one representative label row's semantic columns for a content round-trip assertion.
	 *
	 * @return array<string,mixed>|null The column => value map (excluding the surrogate key), or
	 *   null if the labels table is empty.
	 */
	private function fetchSampleLabelRow(): ?array {
		$dbr = $this->getServiceContainer()->getConnectionProvider()->getPrimaryDatabase();
		$row = $dbr->newSelectQueryBuilder()
			->select( [
				'wlzl_zobject_zid',
				'wlzl_type',
				'wlzl_language',
				'wlzl_label',
				'wlzl_label_primary',
			] )
			->from( 'wikilambda_zobject_labels' )
			->where( [ 'wlzl_label_primary' => true ] )
			->orderBy( [ 'wlzl_zobject_zid', 'wlzl_language' ] )
			->limit( 1 )
			->caller( __METHOD__ )
			->fetchRow();
		return $row ? (array)$row : null;
	}

	/**
	 * Delete every NS_MAIN page and truncate every WikiLambda secondary table, leaving a clean
	 * slate for restore.
	 *
	 * @param string[] $titles NS_MAIN page titles to delete.
	 */
	private function wipeInitialContent( array $titles ): void {
		$services = $this->getServiceContainer();
		$wikiPageFactory = $services->getWikiPageFactory();
		$sysop = $this->getTestSysop()->getUser();

		foreach ( $titles as $title ) {
			$page = $wikiPageFactory->newFromTitle( Title::newFromText( $title, NS_MAIN ) );
			$this->deletePage( $page, 'Wiping for snapshot-restore test', $sysop );
		}
		// Flush the secondary-data removal updates queued by the deletions.
		DeferredUpdates::doUpdates();

		// Truncate each table outright so the pre-restore state is unambiguously empty (deletion
		// removal updates only touch the deleted ZIDs' rows).
		$dbw = $services->getConnectionProvider()->getPrimaryDatabase();
		foreach ( self::SECONDARY_TABLES as $table ) {
			$dbw->newDeleteQueryBuilder()
				->deleteFrom( $table )
				->where( [ true ] )
				->caller( __METHOD__ )
				->execute();
		}
	}

	private function insertSnapshotMarker(): void {
		$this->getDb()->newInsertQueryBuilder()
			->insertInto( 'updatelog' )
			->ignore()
			->row( [ 'ul_key' => InitialContentSnapshot::MARKER ] )
			->caller( __METHOD__ )
			->execute();
	}

	private function snapshotMarkerExists(): bool {
		return (bool)$this->getServiceContainer()->getConnectionProvider()->getPrimaryDatabase()
			->newSelectQueryBuilder()
			->select( '1' )
			->from( 'updatelog' )
			->where( [ 'ul_key' => InitialContentSnapshot::MARKER ] )
			->caller( __METHOD__ )
			->fetchField();
	}
}
