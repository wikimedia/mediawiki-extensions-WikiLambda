<?php

/**
 * WikiLambda integration test for the loadPreDefinedObject maintenance script.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Maintenance;

use MediaWiki\Extension\WikiLambda\Maintenance\LoadPreDefinedObject;
use MediaWiki\Title\Title;

require_once dirname( __DIR__, 3 ) . '/maintenance/loadPreDefinedObject.php';

/**
 * @group Database
 * @group WikiLambdaIntegration
 *
 * @covers \MediaWiki\Extension\WikiLambda\Maintenance\LoadPreDefinedObject
 */
class LoadPreDefinedObjectTest extends WikiLambdaMaintenanceTestCase {

	protected function getMaintenanceClass(): string {
		return LoadPreDefinedObject::class;
	}

	// ====== Option validation ======
	//
	// All entries here exercise getOptions(), which fatalErrors before any
	// filesystem or DB access. These tests therefore don't need
	// setUpAsRepoMode(); they're pure validation.

	public static function provideInvalidOptions(): iterable {
		yield 'no flags at all' => [ [] ];
		yield '--force and --merge are mutually exclusive' => [ [ '--all', '--force', '--merge' ] ];
		yield '--current and --builtin are mutually exclusive' => [ [ '--all', '--merge', '--current', '--builtin' ] ];
		yield '--current requires --merge' => [ [ '--all', '--current' ] ];
		yield '--builtin requires --merge' => [ [ '--all', '--builtin' ] ];
		yield '--wait must be numeric' => [ [ '--all', '--wait', 'abc' ] ];
		yield '--all conflicts with --zid' => [ [ '--all', '--zid', 'Z1' ] ];
		yield '--all conflicts with --from/--to' => [ [ '--all', '--from', 'Z1', '--to', 'Z2' ] ];
		yield '--zid out of range (Z99999)' => [ [ '--zid', 'Z99999' ] ];
		yield '--zid non-numeric' => [ [ '--zid', 'abc' ] ];
		yield '--zid conflicts with --from/--to' => [ [ '--zid', 'Z1', '--from', 'Z1', '--to', 'Z2' ] ];
		yield '--from without --to' => [ [ '--from', 'Z1' ] ];
		yield '--from greater than --to' => [ [ '--from', 'Z9', '--to', 'Z1' ] ];
		yield '--from non-numeric' => [ [ '--from', 'abc', '--to', 'Z2' ] ];
	}

	/**
	 * @dataProvider provideInvalidOptions
	 */
	public function testInvalidOptions_fatalError( array $argv ): void {
		$this->maintenance->loadWithArgv( $argv );
		$this->expectCallToFatalError();
		$this->maintenance->execute();
	}

	// ====== Behavior ======

	public function testZidFlag_createsNewZObject(): void {
		$this->setUpAsRepoMode();

		$this->maintenance->loadWithArgv( [ '--zid', 'Z1' ] );
		$this->maintenance->execute();

		$this->assertTrue(
			Title::newFromText( 'Z1', NS_MAIN )->exists(),
			'Z1 should have been created from the canonical built-in fixture.'
		);
	}

	public function testZidFlag_acceptsBareNumber(): void {
		$this->setUpAsRepoMode();

		// "--zid 1" should be equivalent to "--zid Z1" (the script strips a leading Z).
		$this->maintenance->loadWithArgv( [ '--zid', '1' ] );
		$this->maintenance->execute();

		$this->assertTrue( Title::newFromText( 'Z1', NS_MAIN )->exists() );
	}

	public function testZidFlag_skipsExistingWithoutForceOrMerge(): void {
		$this->setUpAsRepoMode();
		$this->insertZids( [ 'Z1' ] );

		// Without --force or --merge, the script reports the skip on stderr (not
		// captured by expectOutputRegex) and increments $skipped, which surfaces
		// in the stdout summary.
		$this->expectOutputRegex( '/1 objects were skipped/' );
		$this->maintenance->loadWithArgv( [ '--zid', 'Z1' ] );
		$this->maintenance->execute();
	}

	public function testZidFlag_forceUpdatesExisting(): void {
		$this->setUpAsRepoMode();
		$this->insertZids( [ 'Z1' ] );

		// /s flag lets . match newlines so we can match across the per-ZID
		// "Updated" line and the trailing summary in one assertion.
		$this->expectOutputRegex( '/Updated Z1.*1 objects were created or updated successfully/s' );
		$this->maintenance->loadWithArgv( [ '--zid', 'Z1', '--force' ] );
		$this->maintenance->execute();
	}

	public function testRangeWithNoMatchingFiles_isNoOp(): void {
		$this->setUpAsRepoMode();

		// Z9998-Z9999 has no .json files in function-schemata, so $zidsToLoad is
		// empty: the script outputs "Done!" and exits cleanly without any
		// success/skip/failure summary lines.
		$this->expectOutputRegex( '/Done!/' );
		$this->maintenance->loadWithArgv( [ '--from', 'Z9998', '--to', 'Z9999' ] );
		$this->maintenance->execute();
	}
}
