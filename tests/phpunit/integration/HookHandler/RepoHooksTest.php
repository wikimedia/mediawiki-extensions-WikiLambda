<?php

/**
 * WikiLambda integration test suite for RepoHooks
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\HookHandler;

use MediaWiki\Extension\WikiLambda\HookHandler\RepoHooks;
use MediaWiki\Extension\WikiLambda\InitialContentSnapshot;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Installer\DatabaseUpdater;
use Wikimedia\Rdbms\IMaintainableDatabase;

/**
 * Note that most of the testing of the RepoHooks is done through the standalone integration tests,
 * to avoid adding too many heavy tests to the main CI job.
 *
 * These edge-case tests fully mock the DatabaseUpdater, so they touch no real database; each sets
 * whatever repo/client mode it needs via config overrides rather than relying on an ambient mode.
 *
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\RepoHooks
 */
class RepoHooksTest extends WikiLambdaIntegrationTestCase {

	/**
	 * Build a mock DatabaseUpdater whose getDB()->getType() returns the given type.
	 *
	 * @param string $dbType e.g. 'mysql', 'sqlite', 'postgres', 'oracle'
	 * @return DatabaseUpdater
	 */
	private function newMockUpdater( string $dbType = 'mysql' ): DatabaseUpdater {
		$mockDb = $this->createMock( IMaintainableDatabase::class );
		$mockDb->method( 'getType' )->willReturn( $dbType );

		$mockUpdater = $this->createMock( DatabaseUpdater::class );
		$mockUpdater->method( 'getDB' )->willReturn( $mockDb );

		return $mockUpdater;
	}

	// ─── onLoadExtensionSchemaUpdates ──────────────────────────

	public function testOnLoadExtensionSchemaUpdates_unsupportedDbType() {
		$hooks = new RepoHooks();

		$mockUpdater = $this->newMockUpdater( 'oracle' );
		// Should not call addExtensionTable at all for unsupported DB types
		$mockUpdater->expects( $this->never() )->method( 'addExtensionTable' );
		$mockUpdater->expects( $this->never() )->method( 'addExtensionField' );
		$mockUpdater->expects( $this->never() )->method( 'addExtensionUpdate' );

		// Unsupported types bail out via wfWarn() (E_USER_NOTICE) having touched nothing.
		$this->expectPHPError(
			E_USER_NOTICE,
			static fn () => $hooks->onLoadExtensionSchemaUpdates( $mockUpdater ),
			"Database type 'oracle' is not supported"
		);
	}

	public function testOnLoadExtensionSchemaUpdates_clientModeOnly() {
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', false );
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );

		$hooks = new RepoHooks();
		$mockUpdater = $this->newMockUpdater( 'mysql' );

		// Client mode should add the usage table
		$mockUpdater->expects( $this->once() )
			->method( 'addExtensionTable' )
			->with(
				'wikifunctionsclient_usage',
				$this->stringContains( 'mysql/table-usage.sql' )
			);

		// No repo-mode fields or updates
		$mockUpdater->expects( $this->never() )->method( 'addExtensionField' );
		$mockUpdater->expects( $this->never() )->method( 'addExtensionUpdate' );

		$hooks->onLoadExtensionSchemaUpdates( $mockUpdater );
	}

	public function testOnLoadExtensionSchemaUpdates_repoModeOnly() {
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', true );
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', false );

		$hooks = new RepoHooks();
		$mockUpdater = $this->newMockUpdater( 'mysql' );

		// 6 repo tables
		$mockUpdater->expects( $this->exactly( 6 ) )->method( 'addExtensionTable' );
		// 2 repo fields (wlzl_label_primary, wlzl_return_type)
		$mockUpdater->expects( $this->exactly( 2 ) )->method( 'addExtensionField' );
		// 3 repo extension updates (maybeRestoreInitialContent, createInitialContent,
		// initializeZObjectJoinTable)
		$mockUpdater->expects( $this->exactly( 3 ) )->method( 'addExtensionUpdate' );

		$hooks->onLoadExtensionSchemaUpdates( $mockUpdater );
	}

	public function testOnLoadExtensionSchemaUpdates_bothModes() {
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', true );
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );

		$hooks = new RepoHooks();
		$mockUpdater = $this->newMockUpdater( 'sqlite' );

		// 1 client table + 6 repo tables = 7
		$mockUpdater->expects( $this->exactly( 7 ) )->method( 'addExtensionTable' );

		$hooks->onLoadExtensionSchemaUpdates( $mockUpdater );
	}

	public function testOnLoadExtensionSchemaUpdates_neitherMode() {
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', false );
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', false );

		$hooks = new RepoHooks();
		$mockUpdater = $this->newMockUpdater( 'mysql' );

		$mockUpdater->expects( $this->never() )->method( 'addExtensionTable' );
		$mockUpdater->expects( $this->never() )->method( 'addExtensionField' );
		$mockUpdater->expects( $this->never() )->method( 'addExtensionUpdate' );

		$hooks->onLoadExtensionSchemaUpdates( $mockUpdater );
	}

	public function testOnLoadExtensionSchemaUpdates_postgres() {
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', true );
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', false );

		$hooks = new RepoHooks();
		$mockUpdater = $this->newMockUpdater( 'postgres' );

		// Should use postgres-specific SQL paths
		$mockUpdater->expects( $this->exactly( 6 ) )
			->method( 'addExtensionTable' )
			->with(
				$this->anything(),
				$this->stringContains( 'postgres/' )
			);

		$hooks->onLoadExtensionSchemaUpdates( $mockUpdater );
	}

	// ─── onMediaWikiServices ──────────────────────────────────

	public function testOnMediaWikiServices_abstractModeDisabled() {
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractMode', false );

		$hooks = new RepoHooks();
		$services = $this->getServiceContainer();

		// Should return early without touching content handlers or namespaces
		$hooks->onMediaWikiServices( $services );

		// If we reach here without error, the early return was hit
		$this->addToAssertionCount( 1 );
	}

	// ─── initializeZObjectJoinTable ───────────────────────────

	public function testInitializeZObjectJoinTable_alreadyInitialized() {
		$mockUpdater = $this->newMockUpdater();
		// No snapshot restore has run (MARKER absent), but the per-type init row is already
		// present, so we reach the "already initialized" no-op output branch rather than the
		// snapshot-skip early return (which is covered by RestoreInitialContentTest).
		$mockUpdater->method( 'updateRowExists' )->willReturnCallback(
			static fn ( $key ) => $key !== InitialContentSnapshot::MARKER
		);

		// The join table is left untouched: no re-population, just the informational output.
		$mockUpdater->expects( $this->never() )->method( 'insertUpdateRow' );
		$mockUpdater->expects( $this->once() )
			->method( 'output' )
			->with( $this->stringContains( 'already initialized' ) );

		RepoHooks::initializeZObjectJoinTable( $mockUpdater );
	}
}
