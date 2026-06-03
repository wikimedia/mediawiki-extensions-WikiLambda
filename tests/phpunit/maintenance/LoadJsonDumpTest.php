<?php

/**
 * WikiLambda integration test for the loadJsonDump maintenance script.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Maintenance;

use MediaWiki\Extension\WikiLambda\Maintenance\LoadJsonDump;
use MediaWiki\Title\Title;

require_once dirname( __DIR__, 3 ) . '/maintenance/loadJsonDump.php';

/**
 * @group Database
 * @group WikiLambdaIntegration
 *
 * @covers \MediaWiki\Extension\WikiLambda\Maintenance\LoadJsonDump
 */
class LoadJsonDumpTest extends WikiLambdaMaintenanceTestCase {

	private string $dumpPath;
	private string $dumpDirName;

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsRepoMode();
		$this->dumpPath = $this->makeTempDumpDir();
		$this->dumpDirName = basename( $this->dumpPath );
	}

	protected function getMaintenanceClass(): string {
		return LoadJsonDump::class;
	}

	/**
	 * Write the index file Z0.json mapping ZID => revision number, plus
	 * one fixture file per entry containing a minimal valid Z2 wrapping
	 * a Z6 string. Only ZIDs in $existingFiles get a corresponding file
	 * written; this lets tests build pathological layouts (e.g. an index
	 * that references a missing fixture).
	 *
	 * @param array<string,int> $index ZID => revision
	 * @param string[]|null $existingFiles ZIDs that should have a file written. Defaults to all keys of $index.
	 */
	private function writeDump( array $index, ?array $existingFiles = null ): void {
		file_put_contents( "$this->dumpPath/Z0.json", json_encode( $index ) );
		$existingFiles ??= array_keys( $index );
		foreach ( $existingFiles as $zid ) {
			file_put_contents(
				"$this->dumpPath/$zid.{$index[$zid]}.json",
				$this->makeMinimalZ2( $zid )
			);
		}
	}

	private function writeDoneFile( string $zid, int $revision ): void {
		file_put_contents(
			"$this->dumpPath/$zid.$revision.done.json",
			$this->makeMinimalZ2( $zid )
		);
	}

	private function makeMinimalZ2( string $zid ): string {
		return json_encode( [
			'Z1K1' => 'Z2',
			'Z2K1' => [ 'Z1K1' => 'Z6', 'Z6K1' => $zid ],
			'Z2K2' => [ 'Z1K1' => 'Z6', 'Z6K1' => "value of $zid" ],
			'Z2K3' => [ 'Z1K1' => 'Z12', 'Z12K1' => [ 'Z11' ] ],
			'Z2K4' => [ 'Z1K1' => 'Z32', 'Z32K1' => [ 'Z31' ] ],
			'Z2K5' => [ 'Z1K1' => 'Z12', 'Z12K1' => [ 'Z11' ] ],
		] );
	}

	private function assertZidExists( string $zid ): void {
		$title = Title::newFromText( $zid, NS_MAIN );
		$this->assertTrue( $title->exists(), "$zid should have been created" );
	}

	private function assertZidDoesNotExist( string $zid ): void {
		$title = Title::newFromText( $zid, NS_MAIN );
		$this->assertFalse( $title->exists(), "$zid should not have been created" );
	}

	public function testNoDir_fatalErrors(): void {
		$this->expectCallToFatalError();
		$this->maintenance->execute();
	}

	public function testMissingZ0Json_fatalErrors(): void {
		// Tmp dir exists but contains no Z0.json
		$this->maintenance->loadWithArgv( [ '--dir', $this->dumpDirName ] );

		$this->expectCallToFatalError();
		$this->maintenance->execute();
	}

	public function testHappyPath_createsAndRenames(): void {
		$this->writeDump( [ 'Z40010' => 1, 'Z40011' => 1 ] );
		$this->maintenance->loadWithArgv( [ '--dir', $this->dumpDirName ] );

		$this->maintenance->execute();

		$this->assertZidExists( 'Z40010' );
		$this->assertZidExists( 'Z40011' );
		$this->assertFileExists( "$this->dumpPath/Z40010.1.done.json" );
		$this->assertFileExists( "$this->dumpPath/Z40011.1.done.json" );
		$this->assertFileDoesNotExist( "$this->dumpPath/Z40010.1.json" );
	}

	public function testAlreadyDone_skipsByDefault(): void {
		// Index references Z40020 but only the .done.json marker exists.
		file_put_contents(
			"$this->dumpPath/Z0.json",
			json_encode( [ 'Z40020' => 1 ] )
		);
		$this->writeDoneFile( 'Z40020', 1 );

		$this->expectOutputRegex( '/Z40020\.1\.json was already inserted\. Skipping\./' );
		$this->maintenance->loadWithArgv( [ '--dir', $this->dumpDirName ] );
		$this->maintenance->execute();

		$this->assertZidDoesNotExist( 'Z40020' );
	}

	public function testRefreshFlag_reprocessesDone(): void {
		file_put_contents(
			"$this->dumpPath/Z0.json",
			json_encode( [ 'Z40030' => 1 ] )
		);
		$this->writeDoneFile( 'Z40030', 1 );

		$this->expectOutputRegex( '/Z40030\.1\.json was already inserted\. Reinserting\./' );
		$this->maintenance->loadWithArgv( [ '--dir', $this->dumpDirName, '--refresh' ] );
		$this->maintenance->execute();

		$this->assertZidExists( 'Z40030' );
	}

	public function testZidFlag_processesOnlyOne(): void {
		$this->writeDump( [ 'Z40040' => 1, 'Z40041' => 1, 'Z40042' => 1 ] );
		$this->maintenance->loadWithArgv( [ '--dir', $this->dumpDirName, '--zid', 'Z40041' ] );

		$this->maintenance->execute();

		$this->assertZidDoesNotExist( 'Z40040' );
		$this->assertZidExists( 'Z40041' );
		$this->assertZidDoesNotExist( 'Z40042' );
	}

	public function testZidFlag_unknownZid_fatalErrors(): void {
		$this->writeDump( [ 'Z40050' => 1 ] );
		$this->maintenance->loadWithArgv( [ '--dir', $this->dumpDirName, '--zid', 'Z99999' ] );

		$this->expectCallToFatalError();
		$this->maintenance->execute();
	}

	public function testRangeFiltering_processesSubset(): void {
		$this->writeDump( [
			'Z40060' => 1,
			'Z40070' => 1,
			'Z40080' => 1,
			'Z40090' => 1,
		] );
		$this->maintenance->loadWithArgv( [
			'--dir', $this->dumpDirName,
			'--from', 'Z40065',
			'--to', 'Z40085',
		] );

		$this->maintenance->execute();

		$this->assertZidDoesNotExist( 'Z40060' );
		$this->assertZidExists( 'Z40070' );
		$this->assertZidExists( 'Z40080' );
		$this->assertZidDoesNotExist( 'Z40090' );
	}
}
