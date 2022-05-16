<?php
/**
 * WikiLambda updateTypedLists development script
 *
 * Replaces canonical untyped arrays with canonical typed arrays (Benjamin arrays), by
 * prepending the expected type of the items from the list. The built-in keys that contain
 * arrays are are:
 * * Z12K1: TypedList( Z11 )
 * * Z8K1: TypedList( Z17 )
 * * Z8K3: TypedList( Z20 )
 * * Z8K4: TypedList( Z14 )
 * * Z60K2: TypedList( Z6 )
 * * Z50K1: TypedList( Z3 )
 * * Z31K2: TypedList( Z6 )
 * * Z32K1: TypedList( Z31 )
 * * Z4K2: TypedList( Z3 )
 * The rest of lists will be appended with the default type "Z1":
 * * Z810K2: TypedList( Z1 )
 * * Z2k2: TypedList( Z1 )
 *
 * The command applies this transformation to the files available in the 'data'
 * directory. If the flag '--db' is used, then this transformation will be applied
 * to all the ZObjects persisted in the database.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\MediaWikiServices;

$IP = getenv( 'MW_INSTALL_PATH' );
if ( $IP === false ) {
	$IP = __DIR__ . '/../../..';
}

require_once "$IP/maintenance/Maintenance.php";

class UpdateTypedLists extends Maintenance {

	/**
	 * @var ZObjectStore
	 */
	private $zObjectStore = null;

	/**
	 * @var int
	 */
	private $updatedFields = 0;

	/**
	 * @var array
	 */
	private $itemTypes = [
		"Z4K2" => "Z3",
		"Z8K1" => "Z17",
		"Z8K3" => "Z20",
		"Z8K4" => "Z14",
		"Z12K1" => "Z11",
		"Z31K2" => "Z6",
		"Z32K1" => "Z31",
		"Z50K1" => "Z3",
		"Z60K2" => "Z6"
	];

	/**
	 * @var string
	 */
	private $defaultType = "Z1";

	public function __construct() {
		parent::__construct();
		$this->requireExtension( 'WikiLambda' );
		$this->addDescription( 'Updates all saved ZObjects to have canonical typed lists for the builtin types' );

		$this->addOption( 'db', 'Modify the persisted ZObject in the database', false, false );
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
		$db = $this->getOption( 'db' );

		if ( $db ) {
			$this->updateInDatabase();
		} else {
			$this->updateInFiles();
		}
	}

	/**
	 * Fetches every ZObject in the database and updates it after replacing its lists
	 * with canonical typed lists.
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

			$newObject = $this->transformTypedLists( $content->getObject() );

			// And we update the data
			$response = $this->zObjectStore->updateZObject(
				/* String zid */ $zid,
				/* String content  $this->prettyJson( $newObject ), */
				/* String content */ FormatJson::encode( $newObject, true, FormatJson::UTF8_OK ),
				/* Edit summary */ $creatingComment,
				/* User */ $creatingUser,
				/* Flags */ 0
			);

			if ( $response->isOK() ) {
				$this->output( "> $zid: DONE\n" );
			} else {
				$this->output( "> $zid: UPDATE FAILED\n" );
				$this->output( $response->getErrors() );
				$this->output( "\n" );
			}
		}
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
			$newObject = $this->transformTypedLists( $content->getObject() );

			file_put_contents(
				$initialDataToLoadPath . $filename,
				$this->spacesToTabs( FormatJson::encode( $newObject, true, FormatJson::UTF8_OK ) )
			);

			$this->output( "> $zid: DONE\n" );
		}
		$this->output( $this->updatedFields . " keys were successfully updated\n" );
	}

	/**
	 * Walks a ZObject and transforms its lists into canonical typed list.
	 *
	 * @param stdClass $zObject
	 * @return stdClass
	 */
	private function transformTypedLists( $zObject ) {
		return ZObjectUtils::applyTransformation(
			$zObject,
			function ( $key, $value ) {
				return $this->updateCanonicalTypedLists( $key, $value );
			}
		);
	}

	/**
	 * Transforms the given under the given key into a typed list
	 *
	 * @param string $key
	 * @param array $value
	 * @return array Explicit string
	 */
	private function updateCanonicalTypedLists( $key, $value ) {
		if ( is_array( $value ) ) {
			$this->updatedFields++;
			return array_merge( [ $this->itemTypes[$key] ?? $this->defaultType ], $value );
		}
		return $value;
	}
}

$maintClass = UpdateTypedLists::class;

require_once RUN_MAINTENANCE_IF_MAIN;
