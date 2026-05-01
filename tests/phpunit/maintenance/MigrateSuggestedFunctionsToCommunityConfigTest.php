<?php

/**
 * WikiLambda integration test for the migrateSuggestedFunctionsToCommunityConfig
 * maintenance script.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Maintenance;

use MediaWiki\Extension\WikiLambda\Maintenance\MigrateSuggestedFunctionsToCommunityConfig;
use MediaWiki\MainConfigNames;
use MediaWiki\Maintenance\MaintenanceFatalError;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\Title\Title;

require_once dirname( __DIR__, 3 ) . '/maintenance/migrateSuggestedFunctionsToCommunityConfig.php';

/**
 * @group Database
 * @group WikiLambdaIntegration
 *
 * @covers \MediaWiki\Extension\WikiLambda\Maintenance\MigrateSuggestedFunctionsToCommunityConfig
 */
class MigrateSuggestedFunctionsToCommunityConfigTest extends WikiLambdaMaintenanceTestCase {

	protected function setUp(): void {
		if ( !ExtensionRegistry::getInstance()->isLoaded( 'CommunityConfiguration' ) ) {
			$this->markTestSkipped( 'CommunityConfiguration extension is not loaded' );
		}
		parent::setUp();

		// The script reads its legacy fixture via wfMessage() against
		// MediaWiki:Wikilambda-suggested-functions.json. PHPUnit runs with
		// $wgUseDatabaseMessages=false, which makes the MessageCache ignore
		// MediaWiki:-namespace edits — flipping the config alone is not
		// enough because the cache reads the flag eagerly at construction.
		$this->overrideConfigValue( MainConfigNames::UseDatabaseMessages, true );
		$this->getServiceContainer()->getMessageCache()->enable();
	}

	protected function getMaintenanceClass(): string {
		return MigrateSuggestedFunctionsToCommunityConfig::class;
	}

	private function setLegacyList( string $rawJson ): void {
		$this->editPage(
			Title::makeTitle( NS_MEDIAWIKI, 'Wikilambda-suggested-functions.json' ),
			$rawJson,
			'Test fixture'
		);
	}

	private function getStoredSuggestions(): array {
		$factory = $this->getServiceContainer()->getService( 'CommunityConfiguration.ProviderFactory' );
		$provider = $factory->newProvider( 'WikifunctionsSuggestions' );
		$status = $provider->loadValidConfiguration();
		$this->assertTrue( $status->isOK(), "Provider should load: $status" );
		return array_values( (array)( $status->getValue()->SuggestedFunctions ?? [] ) );
	}

	private function presetProvider( array $list ): void {
		$factory = $this->getServiceContainer()->getService( 'CommunityConfiguration.ProviderFactory' );
		$provider = $factory->newProvider( 'WikifunctionsSuggestions' );
		$status = $provider->alwaysStoreValidConfiguration(
			(object)[ 'SuggestedFunctions' => $list ],
			$this->getTestSysop()->getUser(),
			'Pre-populate for test'
		);
		$this->assertTrue( $status->isOK(), "Pre-populating provider should succeed: $status" );
	}

	public function testNoLegacyMessage_outputsNoImport(): void {
		$before = $this->getStoredSuggestions();

		$this->expectOutputRegex( '/No legacy MediaWiki:Wikilambda-suggested-functions\.json/' );
		$this->maintenance->execute();

		$this->assertSame(
			$before,
			$this->getStoredSuggestions(),
			'Provider must be unchanged when there is no legacy message'
		);
	}

	public function testDryRun_doesNotWrite(): void {
		$this->setLegacyList( json_encode( [ 'Z100', 'Z200' ] ) );
		$before = $this->getStoredSuggestions();

		$this->expectOutputRegex( '/Dry run: would update CommunityConfiguration/' );
		$this->maintenance->execute();

		$this->assertSame( $before, $this->getStoredSuggestions(), 'Dry run must not write' );
	}

	public function testImplement_writesProvider(): void {
		$this->setLegacyList( json_encode( [ 'Z100', 'Z200' ] ) );
		$this->maintenance->loadWithArgv( [ '--implement' ] );

		$this->expectOutputRegex( '/Saved MediaWiki:WikifunctionsSuggestions\.json/' );
		$this->maintenance->execute();

		$this->assertSame( [ 'Z100', 'Z200' ], $this->getStoredSuggestions() );
	}

	public function testInvalidEntries_areDropped(): void {
		// Three invalid entries: 'X3' (wrong prefix), 42 (non-string), 'garbage' (not a ZID).
		$this->setLegacyList( json_encode( [ 'Z100', 'X3', 42, 'Z200', 'garbage' ] ) );
		$this->maintenance->loadWithArgv( [ '--implement' ] );

		$this->expectOutputRegex( '/Dropped 3 invalid or excess entries/' );
		$this->maintenance->execute();

		$this->assertSame( [ 'Z100', 'Z200' ], $this->getStoredSuggestions() );
	}

	public function testCapsAtFive(): void {
		$this->setLegacyList( json_encode( [ 'Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7' ] ) );
		$this->maintenance->loadWithArgv( [ '--implement' ] );

		$this->maintenance->execute();

		$this->assertSame(
			[ 'Z1', 'Z2', 'Z3', 'Z4', 'Z5' ],
			$this->getStoredSuggestions(),
			'Only the first five valid entries must be kept'
		);
	}

	public function testCurrentMatches_nothingToDo(): void {
		$this->presetProvider( [ 'Z100', 'Z200' ] );
		$this->setLegacyList( json_encode( [ 'Z100', 'Z200' ] ) );
		$this->maintenance->loadWithArgv( [ '--implement' ] );

		$this->expectOutputRegex( '/already matches; nothing to do/' );
		$this->maintenance->execute();

		$this->assertSame( [ 'Z100', 'Z200' ], $this->getStoredSuggestions() );
	}

	public function testInvalidJson_fatalErrors(): void {
		// Syntactically valid JSON, but decodes to a string rather than an array.
		$this->setLegacyList( '"this is a string, not an array"' );

		$this->expectException( MaintenanceFatalError::class );
		$this->maintenance->execute();
	}
}
