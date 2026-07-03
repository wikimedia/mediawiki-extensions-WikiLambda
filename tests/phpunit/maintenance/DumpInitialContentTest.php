<?php

/**
 * WikiLambda integration test for the dumpInitialContent maintenance script.
 *
 * Exercises the snapshot-bundle producer in isolation: that it writes the three
 * bundle files and that the manifest faithfully describes what was dumped. The
 * dump/restore round trip itself is covered by RestoreInitialContentTest.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Maintenance;

use MediaWiki\Deferred\DeferredUpdates;
use MediaWiki\Extension\WikiLambda\InitialContentSnapshot;
use MediaWiki\Extension\WikiLambda\Maintenance\DumpInitialContent;
use MediaWiki\Json\FormatJson;

require_once dirname( __DIR__, 3 ) . '/maintenance/dumpInitialContent.php';

/**
 * @group Database
 * @group WikiLambdaIntegration
 *
 * @covers \MediaWiki\Extension\WikiLambda\Maintenance\DumpInitialContent
 * @covers \MediaWiki\Extension\WikiLambda\InitialContentSnapshot
 */
class DumpInitialContentTest extends WikiLambdaMaintenanceTestCase {

	/**
	 * The secondary tables the bundle snapshots, in the order the dump writes them. Kept in
	 * sync with InitialContentSnapshot::SECONDARY_TABLES (which also holds each table's surrogate PK).
	 */
	private const SECONDARY_TABLES = [
		'wikilambda_zobject_labels',
		'wikilambda_zobject_join',
		'wikilambda_zobject_function_join',
		'wikilambda_zobject_label_conflicts',
		'wikilambda_zlanguages',
	];

	protected function getMaintenanceClass(): string {
		return DumpInitialContent::class;
	}

	/**
	 * getFunctionSchemataSha() shells out to git; if the submodule SHA can't be resolved the
	 * dump refuses to write an unverifiable manifest and fatalErrors. Any test that produces a
	 * real bundle is therefore meaningless in that environment, so skip rather than fail.
	 */
	private function skipIfNoFunctionSchemataSha(): void {
		if ( InitialContentSnapshot::getFunctionSchemataSha() === null ) {
			$this->markTestSkipped(
				'function-schemata submodule SHA could not be resolved (git unavailable); '
				. 'snapshot bundles cannot be produced in this environment.'
			);
		}
	}

	/**
	 * @return array<string,int> Map of secondary-table name to current row count.
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

	public function testDumpDisabledRepoMode_fatalErrors(): void {
		// The script exists only to snapshot repo-mode initial content; with repo mode off it
		// aborts before touching the filesystem.
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', false );

		$this->expectCallToFatalError();
		$this->maintenance->execute();
	}

	public function testDumpWritesBundleFilesAndManifest(): void {
		$this->skipIfNoFunctionSchemataSha();
		$this->setUpAsRepoMode();

		// Seed a handful of real built-ins so the secondary tables are non-empty and the manifest
		// row counts are meaningful.
		$this->insertZids( [ 'Z1', 'Z2', 'Z4', 'Z6', 'Z11', 'Z12', 'Z60', 'Z1002' ] );
		$this->flushDeferredUpdates();

		$expectedPageCount = $this->fetchMainNamespacePageCount();
		$expectedRowCounts = $this->fetchSecondaryTableRowCounts();

		$dir = $this->makeTempDumpDir();
		$this->maintenance->loadWithArgv( [ '--output-dir', $dir ] );
		$this->maintenance->execute();

		$this->assertFileExists( "$dir/initial-content.xml", 'Pages XML dump should be written' );
		$this->assertFileExists( "$dir/secondary-tables.json", 'Secondary-tables sidecar should be written' );
		$this->assertFileExists( "$dir/manifest.json", 'Manifest should be written' );

		// Guard the silent-empty-export failure mode: the dump must be non-empty and actually
		// contain exported pages, not just a bare <mediawiki> wrapper.
		$xml = file_get_contents( "$dir/initial-content.xml" );
		$this->assertNotSame( '', $xml, 'Pages XML dump should not be empty' );
		$this->assertStringContainsString( '<mediawiki', $xml, 'Pages XML dump should be a MediaWiki export' );
		$this->assertStringContainsString( '<page>', $xml, 'Pages XML dump should contain exported pages' );

		$manifest = FormatJson::decode( file_get_contents( "$dir/manifest.json" ), true );
		$this->assertIsArray( $manifest );

		$this->assertSame(
			InitialContentSnapshot::FORMAT_VERSION,
			$manifest['formatVersion'],
			'Manifest stamps the current snapshot format version'
		);
		$this->assertSame(
			InitialContentSnapshot::getFunctionSchemataSha(),
			$manifest['functionSchemataSha'],
			'Manifest stamps the checked-out function-schemata submodule SHA'
		);
		$this->assertSame(
			$expectedPageCount,
			$manifest['pageCount'],
			'Manifest page count matches the number of NS_MAIN pages'
		);
		$this->assertSame(
			$expectedRowCounts,
			$manifest['tableRowCounts'],
			'Manifest table row counts match the live secondary tables'
		);
	}

	public function testDumpSidecarOmitsAutoIncrementPrimaryKey(): void {
		$this->skipIfNoFunctionSchemataSha();
		$this->setUpAsRepoMode();

		// A labelled built-in guarantees at least one wikilambda_zobject_labels row.
		$this->insertZids( [ 'Z1', 'Z2', 'Z6', 'Z12', 'Z1002' ] );
		$this->flushDeferredUpdates();

		$dir = $this->makeTempDumpDir();
		$this->maintenance->loadWithArgv( [ '--output-dir', $dir ] );
		$this->maintenance->execute();

		$dump = FormatJson::decode( file_get_contents( "$dir/secondary-tables.json" ), true );
		$this->assertIsArray( $dump );
		$this->assertNotEmpty(
			$dump['wikilambda_zobject_labels'],
			'Seeded built-ins should have produced label rows to dump'
		);

		// The surrogate key is deliberately dropped so restore lets the DB reassign it.
		foreach ( $dump['wikilambda_zobject_labels'] as $row ) {
			$this->assertArrayNotHasKey(
				'wlzl_id',
				$row,
				'The auto-increment surrogate key must be omitted from the sidecar'
			);
			$this->assertArrayHasKey( 'wlzl_zobject_zid', $row, 'Semantic columns must be retained' );
		}
	}

	/**
	 * @return int Number of NS_MAIN pages currently present.
	 */
	private function fetchMainNamespacePageCount(): int {
		return (int)$this->getServiceContainer()->getConnectionProvider()->getPrimaryDatabase()
			->newSelectQueryBuilder()
			->select( 'COUNT(*)' )
			->from( 'page' )
			->where( [ 'page_namespace' => NS_MAIN ] )
			->caller( __METHOD__ )
			->fetchField();
	}

	/**
	 * Flush the deferred secondary-data updates queued by editPage()/insertZids() so the
	 * secondary tables are populated before we snapshot them.
	 */
	private function flushDeferredUpdates(): void {
		DeferredUpdates::doUpdates();
		$this->assertSame(
			[],
			DeferredUpdates::getPendingUpdates(),
			'No secondary-data updates should be left pending before dumping'
		);
	}
}
