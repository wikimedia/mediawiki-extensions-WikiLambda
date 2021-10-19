<?php
/**
 * WikiLambda updateLanguageCodes development script
 *
 * Replaces language codes for the corresponding Z60 (ZLanguage) Zids in all ZObjects
 * persisted in wiki. If the flag '--files' is present, it replaces the language codes
 * from the files available in the 'data' directory instead.
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

class UpdateLanguageCodes extends Maintenance {

	private const Z_LANGUAGE = 'Z60';
	private const Z_LANGUAGE_CODE = 'Z60K1';

	private $zObjectStore = null;
	private $languageZids = [];
	private $updatedFields = 0;

	public function __construct() {
		parent::__construct();
		$this->requireExtension( 'WikiLambda' );
		$this->addDescription( 'Updates all saved ZObjects to use Z60 languages instead of string language codes' );

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

		$this->registerLanguageCodes();

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
	 * Fetches all ZObjects of type Z60 and registers them locally to make the
	 * language code to language Zid transformation. It is reasonable to register
	 * all languages in memory before doing the transformation, as fetching a
	 * language object by language code is extremely database-intensive.
	 */
	private function registerLanguageCodes() {
		$zids = $this->zObjectStore->fetchZidsOfType( self::Z_LANGUAGE );
		foreach ( $zids as $zid ) {
			$title = Title::newFromText( $zid, NS_MAIN );
			$content = $this->zObjectStore->fetchZObjectByTitle( $title );
			$zobject = $content->getObject()->{ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE};
			if ( $zobject->{ZTypeRegistry::Z_OBJECT_TYPE} === self::Z_LANGUAGE ) {
				if ( property_exists( $zobject, self::Z_LANGUAGE_CODE ) ) {
					$code = $zobject->{self::Z_LANGUAGE_CODE};
					$this->languageZids[ $code ] = $zid;
				} else {
					$this->output( "$zid doesn't have property " . self::Z_LANGUAGE_CODE );
				}
			} else {
				$this->output( "$zid is not of type " . self::Z_LANGUAGE );
			}
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
			$newObject = $this->transformLanguageCodeIntoZid( $content->getObject() );

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
	private function transformLanguageCodeIntoZid( $zObject ) {
		return ZObjectUtils::applyTransformationToType(
			$zObject,
			ZTypeRegistry::Z_MONOLINGUALSTRING,
			function ( $item ) {
				return $this->updateMonolingualLanguageCode( $item );
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
			$newObject = $this->transformLanguageCodeIntoZid( $content->getObject() );

			file_put_contents(
				$initialDataToLoadPath . $filename,
				$this->spacesToTabs( FormatJson::encode( $newObject, true, FormatJson::UTF8_OK ) )
			);

			$this->output( "> $zid: DONE\n" );
		}
		$this->output( $this->updatedFields . " keys were successfully updated\n" );
	}

	/**
	 * Transforms a ZMonolingualString replacing the laguage code from its language key (Z11K1)
	 * with the equivalent ZLanguage object Zid.
	 *
	 * @param stdClass $monolingual Monolingual string with language codes
	 * @return stdClass Monolingual string with Zids instead of language codes
	 */
	private function updateMonolingualLanguageCode( $monolingual ) {
		$languageCode = $monolingual->{ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE};
		if ( array_key_exists( $languageCode, $this->languageZids ) ) {
			$languageZid = $this->languageZids[ $languageCode ];
			$monolingual->{ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE} = $languageZid;
			$this->updatedFields++;
		}
		return $monolingual;
	}
}

$maintClass = UpdateLanguageCodes::class;

require_once RUN_MAINTENANCE_IF_MAIN;
