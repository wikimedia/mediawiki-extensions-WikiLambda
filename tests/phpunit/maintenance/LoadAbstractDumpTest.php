<?php

/**
 * WikiLambda integration test for the loadAbstractDump maintenance script.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Maintenance;

use MediaWiki\Extension\WikiLambda\Maintenance\LoadAbstractDump;
use MediaWiki\Extension\WikiLambda\WikidataEntityLookup;
use MediaWiki\Title\Title;

require_once dirname( __DIR__, 3 ) . '/maintenance/loadAbstractDump.php';

/**
 * @group Database
 * @group WikiLambdaIntegration
 *
 * @covers \MediaWiki\Extension\WikiLambda\Maintenance\LoadAbstractDump
 */
class LoadAbstractDumpTest extends WikiLambdaMaintenanceTestCase {
	private const ABSTRACT_NS = 2300;

	private string $dumpPath;
	private string $dumpDirName;

	protected function setUp(): void {
		parent::setUp();
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractMode', true );
		$this->dumpPath = $this->makeTempDumpDir();
		$this->dumpDirName = basename( $this->dumpPath );

		// Mock WikidataEntityLookup to simply not stop any write
		// in case WikibaseClient extension is available.
		$mockLookup = $this->createMock( WikidataEntityLookup::class );
		$mockLookup->method( 'wikidataItemExists' )->willReturn( true );
		$this->setService( 'WikiLambdaWikidataEntityLookup', $mockLookup );
	}

	protected function getMaintenanceClass(): string {
		return LoadAbstractDump::class;
	}

	/**
	 * Write the index file Q0.json mapping QID => revision number, plus
	 * one fixture file per entry containing a valid AbstractWikiContent
	 * payload whose qid matches the title.
	 *
	 * @param array<string,int> $index QID => revision
	 * @param string[]|null $existingFiles QIDs that should have a file written. Defaults to all keys of $index.
	 */
	private function writeDump( array $index, ?array $existingFiles = null ): void {
		file_put_contents( "$this->dumpPath/Q0.json", json_encode( $index ) );
		$existingFiles ??= array_keys( $index );
		foreach ( $existingFiles as $qid ) {
			file_put_contents(
				"$this->dumpPath/$qid.{$index[$qid]}.json",
				$this->makePayload( $qid )
			);
		}
	}

	private function writeDoneFile( string $qid, int $revision ): void {
		file_put_contents(
			"$this->dumpPath/$qid.$revision.done.json",
			$this->makePayload( $qid )
		);
	}

	private function makePayload( string $qid ): string {
		return json_encode( [
			'content' => json_encode( [
				'qid' => $qid,
				'sections' => [
					'Q8776414' => [
						'index' => 0,
						'fragments' => [ 'Z89' ],
					],
				],
			] ),
		] );
	}

	private function abstractTitle( string $qid ): Title {
		return Title::makeTitle( self::ABSTRACT_NS, $qid );
	}

	public function testNoDir_fatalErrors(): void {
		$this->expectCallToFatalError();
		$this->maintenance->execute();
	}

	public function testMissingQ0Json_fatalErrors(): void {
		$this->maintenance->loadWithArgv( [ '--dir', $this->dumpDirName ] );

		$this->expectCallToFatalError();
		$this->maintenance->execute();
	}

	public function testFromWithoutTo_fatalErrors(): void {
		file_put_contents( "$this->dumpPath/Q0.json", json_encode( [] ) );
		$this->maintenance->loadWithArgv( [
			'--dir', $this->dumpDirName,
			'--from', 'Q40010',
		] );

		$this->expectCallToFatalError();
		$this->maintenance->execute();
	}

	public function testToWithoutFrom_fatalErrors(): void {
		file_put_contents( "$this->dumpPath/Q0.json", json_encode( [] ) );
		$this->maintenance->loadWithArgv( [
			'--dir', $this->dumpDirName,
			'--to', 'Q40020',
		] );

		$this->expectCallToFatalError();
		$this->maintenance->execute();
	}

	public function testHappyPath_createsAndRenames(): void {
		$this->writeDump( [ 'Q40110' => 1, 'Q40111' => 1 ] );
		$this->maintenance->loadWithArgv( [ '--dir', $this->dumpDirName ] );

		$this->maintenance->execute();

		$this->assertTrue( $this->abstractTitle( 'Q40110' )->exists() );
		$this->assertTrue( $this->abstractTitle( 'Q40111' )->exists() );
		$this->assertFileExists( "$this->dumpPath/Q40110.1.done.json" );
		$this->assertFileDoesNotExist( "$this->dumpPath/Q40110.1.json" );
	}

	public function testInvalidPayload_recordedAsError(): void {
		file_put_contents(
			"$this->dumpPath/Q0.json",
			json_encode( [ 'Q40120' => 1 ] )
		);
		// Payload missing the required "content" key.
		file_put_contents(
			"$this->dumpPath/Q40120.1.json",
			json_encode( [ 'sections' => [] ] )
		);

		$this->expectOutputRegex( '/does not contain valid abstract dump payload/' );
		$this->maintenance->loadWithArgv( [ '--dir', $this->dumpDirName ] );
		$this->maintenance->execute();

		$this->assertFalse( $this->abstractTitle( 'Q40120' )->exists() );
		// File must NOT be renamed when the payload is rejected.
		$this->assertFileExists( "$this->dumpPath/Q40120.1.json" );
		$this->assertFileDoesNotExist( "$this->dumpPath/Q40120.1.done.json" );
	}

	public function testTitleFlag_processesOnlyOne(): void {
		$this->writeDump( [ 'Q40130' => 1, 'Q40131' => 1, 'Q40132' => 1 ] );
		$this->maintenance->loadWithArgv( [
			'--dir', $this->dumpDirName,
			'--title', 'Q40131',
		] );

		$this->maintenance->execute();

		$this->assertFalse( $this->abstractTitle( 'Q40130' )->exists() );
		$this->assertTrue( $this->abstractTitle( 'Q40131' )->exists() );
		$this->assertFalse( $this->abstractTitle( 'Q40132' )->exists() );
	}

	public function testTitleFlag_unknownTitle_fatalErrors(): void {
		$this->writeDump( [ 'Q40140' => 1 ] );
		$this->maintenance->loadWithArgv( [
			'--dir', $this->dumpDirName,
			'--title', 'Q99999',
		] );

		$this->expectCallToFatalError();
		$this->maintenance->execute();
	}

	public function testRangeFiltering_processesSubset(): void {
		$this->writeDump( [
			'Q40160' => 1,
			'Q40170' => 1,
			'Q40180' => 1,
			'Q40190' => 1,
		] );
		$this->maintenance->loadWithArgv( [
			'--dir', $this->dumpDirName,
			'--from', 'Q40165',
			'--to', 'Q40185',
		] );

		$this->maintenance->execute();

		$this->assertFalse( $this->abstractTitle( 'Q40160' )->exists() );
		$this->assertTrue( $this->abstractTitle( 'Q40170' )->exists() );
		$this->assertTrue( $this->abstractTitle( 'Q40180' )->exists() );
		$this->assertFalse( $this->abstractTitle( 'Q40190' )->exists() );
	}

	public function testAlreadyDone_skipsByDefault(): void {
		file_put_contents(
			"$this->dumpPath/Q0.json",
			json_encode( [ 'Q40200' => 1 ] )
		);
		$this->writeDoneFile( 'Q40200', 1 );

		$this->expectOutputRegex( '/Q40200\.1\.json was already inserted\. Skipping\./' );
		$this->maintenance->loadWithArgv( [ '--dir', $this->dumpDirName ] );
		$this->maintenance->execute();

		$this->assertFalse( $this->abstractTitle( 'Q40200' )->exists() );
	}
}
