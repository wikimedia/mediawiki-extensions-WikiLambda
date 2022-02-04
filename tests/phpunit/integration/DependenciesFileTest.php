<?php

/**
 * WikiLambda integration test suite for completeness of data/definitions/dependencies.json file
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use GenerateDependenciesFile;
use MediaWikiIntegrationTestCase;

// maintenance files must be loaded explicitly
require_once __DIR__ . '/../../../maintenance/generateDependenciesFile.php';

/**
 * Asserts that dependency file has been generated after updating the
 * data definitions directory by running the generateDependenciesFile
 * maintenance script.
 *
 * @coversNothing
 */
class DependenciesFileTest extends MediaWikiIntegrationTestCase {

	/**
	 * Compares the content of the data dependencies.json file with
	 * the generated dependencies JSON, and asserts that the result
	 * is the same.
	 *
	 * @coversNothing
	 */
	public function testDependenciesFileComplete() {
		$help = 'Please run the maintenance script '
			. '`extensions/WikiLambda/maintenance/generateDependenciesFile.php` '
			. 'and update the `function-schemata` git submodule.';

		$dependenciesDir = dirname( __DIR__, 3 ) . '/function-schemata/data/definitions/';
		$dependenciesFile = file_get_contents( $dependenciesDir . 'dependencies.json' );
		$currentDependencies = json_decode( $dependenciesFile, true );

		$dependenciesScript = new GenerateDependenciesFile();
		$expectedDependencies = $dependenciesScript->generateDependenciesJSON();

		foreach ( $expectedDependencies as $zid => $dep ) {
			// Assert that the key is available
			$this->assertArrayHasKey( $zid, $currentDependencies, "Dependencies for $zid cannot be found: $help" );
			// Assert that the value is the expected
			$this->assertSame( $dep, $currentDependencies[ $zid ], "Dependencies for $zid are not updated: $help" );
			unset( $currentDependencies[ $zid ] );
		}

		// Assert that deleted Zids have been removed from the dependencies file
		$this->assertCount( 0, $currentDependencies, "Dependencies file has unnecessary entries: $help" );
	}
}
