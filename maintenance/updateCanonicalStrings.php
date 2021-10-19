<?php
/**
 * WikiLambda updateCanonicalStrings development script
 *
 * Replaces the value of the keys Z2K1 (ZPersistentObject identity) and Z14K4 (ZImplementation built-in)
 * to contain canonical Z6 (ZString) instead of Z9 (ZReferences). If the flag '--files' is present, it
 * replaces the values from the files available in the 'data' directory instead.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\MediaWikiServices;

$IP = getenv( 'MW_INSTALL_PATH' );
if ( $IP === false ) {
	$IP = __DIR__ . '/../../..';
}

require_once "$IP/maintenance/Maintenance.php";

class UpdateCanonicalStrings extends Maintenance {

	private $zObjectStore = null;
	private $updatedFields = 0;

	public function __construct() {
		parent::__construct();
		$this->requireExtension( 'WikiLambda' );
		$this->addDescription( 'Updates all saved ZObjects to have canonical strings for their keys Z2K1 and Z14K4' );

		$this->addOption( 'files', 'Modify the files of builtin ZObjects', false, false );
	}

	public function execute() {
		// Construct the ZObjectStore, because ServiceWiring hasn't run
		$services = MediaWikiServices::getInstance();
		$this->zObjectStore = new ZObjectStore(
			$services->getDBLoadBalancer(),
			$services->getTitleFactory(),
			$services->getWikiPageFactory(),
			$services->getRevisionStore()
		);

		// Either we alter the db or we alter the builtin files.
		// The db is going to be the most common thing to do, the
		// builtin files are just going to be one time thing, so let's
		// use the parameter to specify the files
		$files = $this->getOption( 'files' );

		if ( $files ) {
			$this->updateInFiles();
		} else {
			$this->updateInDatabase();
		}
	}

	/**
	 * Fetches every ZObject in the database and updates it after applying the language
	 * code to language Zid transformation to all its ZMonolingualString (Z11).
	 */
	private function updateInDatabase() {
		$zids = $this->zObjectStore->fetchAllZids();

		$creatingUserName = wfMessage( 'wikilambda-systemuser' )->inLanguage( 'en' )->text();
		$creatingUser = User::newSystemUser( $creatingUserName, [ 'steal' => true ] );
		$creatingComment = wfMessage( 'wikilambda-bootstrapcreationeditsummary' )->inLanguage( 'en' )->text();

		foreach ( $zids as $zid ) {
			$title = Title::newFromText( $zid, NS_MAIN );
			try {
				$content = $this->zObjectStore->fetchZObjectByTitle( $title );
			} catch ( \Exception $e ) {
				$this->output( "> $zid: FETCH FAILED\n" );
				$this->output( $e->getMessage() . "\n" );
			}
			$newObject = $this->transformCanonicalStrings( $content->getObject() );

			// And we update the data
			$response = $this->zObjectStore->updateZObject(
				/* String zid */ $zid,
				/* String content  $this->prettyJson( $newObject ), */
				/* String content */ FormatJson::encode( $newObject, true, FormatJson::UTF8_OK ),
				/* Edit summary */ $creatingComment,
				/* User */ $creatingUser,
				/* Flags */ 0
			);

			if ( $response instanceof \WikiPage ) {
				$this->output( "> $zid: DONE\n" );
			} else {
				$this->output( "> $zid: UPDATE FAILED\n" );
				$this->output( $response->getMessage() . "\n" );
			}
		}
	}

	/**
	 * Walks a ZObject and applies the language code to language Zid ID to every
	 * ZMonolingualString (Z11) that it finds.
	 *
	 * @param stdClass $zObject
	 * @return stdClass
	 */
	private function transformCanonicalStrings( $zObject ) {
		return ZObjectUtils::applyTransformationToKeys(
			$zObject,
			[ "Z2K1", "Z14K4" ],
			function ( $item ) {
				return $this->updateCanonicalRefToString( $item );
			}
		);
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

	/**
	 * Reads every json file in the data directory, and updates the file after applying the language
	 * code to language Zid transformation to all its ZMonolingualString (Z11).
	 */
	private function updateInFiles() {
		$initialDataToLoadPath = dirname( __DIR__ ) . '/function-schemata/data/definitions/';
		$initialDataToLoadListing = array_filter(
			scandir( $initialDataToLoadPath ),
			static function ( $key ) {
				return (bool)preg_match( '/^Z\d+\.json$/', $key );
			}
		);

		foreach ( $initialDataToLoadListing as $filename ) {
			$zid = substr( $filename, 0, -5 );
			$title = Title::newFromText( $zid, NS_MAIN );
			$data = file_get_contents( $initialDataToLoadPath . $filename );

			if ( !$data ) {
				// Something went wrong, give up.
				return;
			}
			$content = ZObjectContentHandler::makeContent( $data, $title );
			$newObject = $this->transformCanonicalStrings( $content->getObject() );

			file_put_contents(
				$initialDataToLoadPath . $filename,
				$this->spacesToTabs( FormatJson::encode( $newObject, true, FormatJson::UTF8_OK ) )
			);

			$this->output( "> $zid: DONE\n" );
		}
		$this->output( $this->updatedFields . " keys were successfully updated\n" );
	}

	/**
	 * Transforms a reference to a canonical (explicit) string
	 *
	 * @param stdClass|string $ref Reference
	 * @return stdClass Explicit string
	 */
	private function updateCanonicalRefToString( $ref ) {
		if ( is_string( $ref ) ) {
			$this->updatedFields++;
			return [
				ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_STRING,
				ZTypeRegistry::Z_STRING_VALUE => $ref
			];
		}
		if ( array_key_exists( ZTypeRegistry::Z_OBJECT_TYPE, $ref ) ) {
			$type = $ref->{ ZTypeRegistry::Z_OBJECT_TYPE };
			if ( $type === ZTypeRegistry::Z_REFERENCE ) {
				$this->updatedFields++;
				return [
					ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_STRING,
					ZTypeRegistry::Z_STRING_VALUE => $ref->{ ZTypeRegistry::Z_REFERENCE_VALUE }
				];
			}
		}
		return $ref;
	}

}

$maintClass = UpdateCanonicalStrings::class;

require_once RUN_MAINTENANCE_IF_MAIN;
