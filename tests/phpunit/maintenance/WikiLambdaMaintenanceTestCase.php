<?php

/**
 * WikiLambda maintenance test abstract class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Maintenance;

use MediaWiki\Extension\WikiLambda\HookHandler\RepoHooks;
use MediaWiki\Extension\WikiLambda\Registry\ZObjectRegistry;
use MediaWiki\Tests\Maintenance\MaintenanceBaseTestCase;
use RuntimeException;

abstract class WikiLambdaMaintenanceTestCase extends MaintenanceBaseTestCase {

	/**
	 * Set configuration flag WikiLambdaEnableRepoMode to true and
	 * register the Z504 ZErrorType to avoid unbounded fallback recursion.
	 */
	protected function setUpAsRepoMode(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', true );
		RepoHooks::registerExtension();

		// Always register Z504, as otherwise we get an infinite recursion of not finding Z504
		$this->insertZids( [ 'Z504' ] );
	}

	/**
	 * Inserts the given ZObjects from the function-schemata data definitions directory.
	 *
	 * @param string[] $zids
	 */
	protected function insertZids( array $zids ): void {
		foreach ( $zids as $zid ) {
			$data = self::getDefinition( $zid );
			$this->editPage( $zid, $data, 'Test ZObject creation', NS_MAIN );
		}
	}

	/**
	 * Look up a built-in ZObject definition by ZID.
	 *
	 * @param string $zid
	 * @return string
	 */
	private static function getDefinition( string $zid ): string {
		$mainFile = dirname( __DIR__, 3 ) . '/function-schemata/data/definitions' . "/$zid.json";
		if ( !file_exists( $mainFile ) ) {
			throw new RuntimeException( "ZObject definition for $zid not found." );
		}
		return file_get_contents( $mainFile );
	}

	protected function tearDown(): void {
		ZObjectRegistry::clearAll();
		parent::tearDown();
	}
}
