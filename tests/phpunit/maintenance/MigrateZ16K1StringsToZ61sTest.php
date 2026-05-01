<?php

/**
 * WikiLambda integration test for the migrateZ16K1StringsToZ61s
 * maintenance script.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Maintenance;

use MediaWiki\Extension\WikiLambda\Maintenance\MigrateZ16K1StringsToZ61s;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;

require_once dirname( __DIR__, 3 ) . '/maintenance/migrateZ16K1StringsToZ61s.php';

/**
 * @group Database
 * @group WikiLambdaIntegration
 *
 * @covers \MediaWiki\Extension\WikiLambda\Maintenance\MigrateZ16K1StringsToZ61s
 */
class MigrateZ16K1StringsToZ61sTest extends WikiLambdaMaintenanceTestCase {

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsRepoMode();
		$this->insertZids( [ 'Z14', 'Z16', 'Z61', 'Z600', 'Z610', 'Z620' ] );
	}

	protected function getMaintenanceClass(): string {
		return MigrateZ16K1StringsToZ61s::class;
	}

	/**
	 * Persist a Z14 instance under $zid. If $z14k3 is null, no Z14K3 (code) slot
	 * is set — emulating a Z14 that uses Z14K2 (composition) or Z14K4 (built-in)
	 * exclusively, which the script must skip with "not using a ZCode!".
	 *
	 * @param string $zid
	 * @param array|null $z14k3
	 */
	private function insertImplementation( string $zid, ?array $z14k3 ): void {
		$z14 = [
			'Z1K1' => 'Z14',
			'Z14K1' => 'Z1',
		];
		if ( $z14k3 !== null ) {
			$z14['Z14K3'] = $z14k3;
		} else {
			$z14['Z14K4'] = 'Z1';
		}
		$z2 = [
			'Z1K1' => 'Z2',
			'Z2K1' => [ 'Z1K1' => 'Z6', 'Z6K1' => $zid ],
			'Z2K2' => $z14,
			'Z2K3' => [ 'Z1K1' => 'Z12', 'Z12K1' => [ 'Z11' ] ],
			'Z2K4' => [ 'Z1K1' => 'Z32', 'Z32K1' => [ 'Z31' ] ],
			'Z2K5' => [ 'Z1K1' => 'Z12', 'Z12K1' => [ 'Z11' ] ],
		];
		$this->editPage( $zid, json_encode( $z2 ), 'Test fixture', NS_MAIN );
	}

	/**
	 * Build a legacy-form Z14K3: a Z16 whose Z16K1 is an inline Z61 with a
	 * hard-coded $programmingLanguage string. This is the shape the migrate
	 * script exists to upgrade.
	 *
	 * @param string $programmingLanguage
	 * @return array
	 */
	private function legacyZ14K3( string $programmingLanguage ): array {
		return [
			'Z1K1' => 'Z16',
			'Z16K1' => [
				'Z1K1' => 'Z61',
				'Z61K1' => $programmingLanguage,
			],
			'Z16K2' => 'function() {}',
		];
	}

	public function testAlreadyMigrated_skipsObject(): void {
		$this->insertImplementation( 'Z40001', [
			'Z1K1' => 'Z16',
			'Z16K1' => 'Z600',
			'Z16K2' => 'function() {}',
		] );

		$this->expectOutputRegex( '/Z40001:.*already a ZReference/' );
		$this->maintenance->execute();
	}

	// The script interpolates a ZString into its output via "'$programmingLanguage'".
	// ZString::__toString() returns the JSON-encoded form ("javascript"), so the
	// actual rendered text is '"javascript"' rather than 'javascript'. The regexes
	// below lock in that current rendering — any future change to the script's
	// output format should land alongside an update here.

	public function testJavascriptString_dryRunReportsMapping(): void {
		$this->insertImplementation( 'Z40002', $this->legacyZ14K3( 'javascript' ) );

		$this->expectOutputRegex( "/Would have updated Z40002, changing '\"javascript\"' to 'Z600'/" );
		$this->maintenance->execute();
	}

	public function testPython_dryRunReportsMapping(): void {
		$this->insertImplementation( 'Z40003', $this->legacyZ14K3( 'python' ) );

		$this->expectOutputRegex( "/changing '\"python\"' to 'Z610'/" );
		$this->maintenance->execute();
	}

	public function testPython3_dryRunReportsMapping(): void {
		$this->insertImplementation( 'Z40004', $this->legacyZ14K3( 'python-3' ) );

		$this->expectOutputRegex( "/changing '\"python-3\"' to 'Z610'/" );
		$this->maintenance->execute();
	}

	public function testLua_dryRunReportsMapping(): void {
		$this->insertImplementation( 'Z40005', $this->legacyZ14K3( 'lua' ) );

		$this->expectOutputRegex( "/changing '\"lua\"' to 'Z620'/" );
		$this->maintenance->execute();
	}

	public function testUnknownLanguage_skipsObject(): void {
		$this->insertImplementation( 'Z40006', $this->legacyZ14K3( 'cobol' ) );

		$this->expectOutputRegex( "/not understood: \"cobol\"/" );
		$this->maintenance->execute();
	}

	public function testNoZ14K3_skipsObject(): void {
		$this->insertImplementation( 'Z40007', null );

		$this->expectOutputRegex( '/not using a ZCode!/' );
		$this->maintenance->execute();
	}

	public function testImplement_writesZReferenceForJavascript(): void {
		$this->insertImplementation( 'Z40008', $this->legacyZ14K3( 'javascript' ) );

		$this->maintenance->loadWithArgv( [ '--implement' ] );
		$this->maintenance->execute();

		$store = WikiLambdaServices::getZObjectStore();
		$batch = $store->fetchBatchZObjects( [ 'Z40008' ] );
		$this->assertArrayHasKey( 'Z40008', $batch );

		$z16k1 = $batch['Z40008']
			->getInnerZObject()
			->getValueByKey( 'Z14K3' )
			->getValueByKey( 'Z16K1' );
		$this->assertInstanceOf(
			ZReference::class,
			$z16k1,
			'Z16K1 should be a ZReference after --implement'
		);
		$this->assertSame( 'Z600', $z16k1->getZValue() );
	}
}
