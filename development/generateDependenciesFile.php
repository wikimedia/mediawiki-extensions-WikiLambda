<?php
/**
 * WikiLambda generateDependenciesFile development script
 *
 * Reads the data directory and for each ZObject generates an array of Zids that need
 * to be inserted before. This excludes those Zids in ZTypeRegistry::BUILT_IN_TYPES.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;

$IP = getenv( 'MW_INSTALL_PATH' );
if ( $IP === false ) {
	$IP = __DIR__ . '/../../..';
}

require_once "$IP/maintenance/Maintenance.php";

class GenerateDependenciesFile extends Maintenance {

	public function __construct() {
		parent::__construct();
		$this->requireExtension( 'WikiLambda' );
		$this->addDescription(
			'Generates the file dependencies.json with the inter-dependencies of built-in ZObjects'
		);
	}

	public function execute() {
		$registry = ZTypeRegistry::singleton();
		// Matches references that must point to a type (HACK_REFERENCE_TYPE)
		// which currently are Z1K1 and Z3K1, and to a language (HACK_REFERENCE_LANGUAGE)
		// which currently is Z11K1
		$refPattern = '/\"Z(?:1|3|11)K1\"\:\s?\"(Z[1-9]\d*)\"/';
		$trackedZids = [];

		$initialDataToLoadPath = dirname( __DIR__ ) . '/function-schemata/data/definitions/';
		$initialDataToLoadListing = array_filter(
			scandir( $initialDataToLoadPath ),
			static function ( $key ) {
				return (bool)preg_match( '/^Z\d+\.json$/', $key );
			}
		);

		// Naturally sort, so Z2 gets created before Z10 etc.
		natsort( $initialDataToLoadListing );

		foreach ( $initialDataToLoadListing as $filename ) {
			$zid = substr( $filename, 0, -5 );
			$trackedZids[] = $zid;
			$title = Title::newFromText( $zid, NS_ZOBJECT );
			$data = file_get_contents( $initialDataToLoadPath . $filename );

			if ( !$data ) {
				// Something went wrong, give up.
				return;
			}

			$unknownRefs = [];
			$matches = [];

			preg_match_all( $refPattern, $data, $matches, PREG_PATTERN_ORDER );
			foreach ( $matches[1] as $match ) {
				if (
					!$registry->isZTypeBuiltIn( $match ) // Avoid builtins
					&& !in_array( $match, $unknownRefs ) // Avoid repetitions
					&& ( $match !== $zid ) // Avoid self-dependency
				) {
					$unknownRefs[] = $match;
				}
			}

			if ( count( $unknownRefs ) > 0 ) {
				$dependencies[ $zid ] = $unknownRefs;
			}

			$this->output( "> $zid: DONE\n" );
		}

		file_put_contents(
			$initialDataToLoadPath . "dependencies.json",
			$this->spacesToTabs( FormatJson::encode( $dependencies, true, FormatJson::UTF8_OK ) )
		);

		$this->output( "Dependencies manifest was successfully created\n" );
	}

	/**
	 * Replaces 4 spaces with one tab and adds a final EOL character, to follow
	 * the way data json files are stored.
	 *
	 * @param string $json
	 * @return string
	 */
	private function spacesToTabs( $json ) {
		return str_replace( '    ', "\t", $json ) . "\n";
	}
}

$maintClass = GenerateDependenciesFile::class;

require_once RUN_MAINTENANCE_IF_MAIN;
