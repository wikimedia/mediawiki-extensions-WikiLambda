<?php

/**
 * WikiLambda loadJsonDump maintenance script
 *
 * Loads specified dump of objects from production
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Maintenance\Maintenance;
use MediaWiki\Title\Title;
use MediaWiki\Title\TitleFactory;

$IP = getenv( 'MW_INSTALL_PATH' );
if ( $IP === false ) {
	$IP = __DIR__ . '/../../..';
}
require_once "$IP/maintenance/Maintenance.php";

class LoadJsonDump extends Maintenance {

	/**
	 * @inheritDoc
	 */
	public function __construct() {
		parent::__construct();
		$this->requireExtension( 'WikiLambda' );
		$this->addDescription( 'Loads all the latest versions of the objects located in the specified directory' );

		$this->addOption(
			'dir',
			'Directory name of the wikifunctions dump',
			false,
			true
		);

		$this->addOption(
			'zid',
			'Particular zid to push',
			false,
			true
		);
	}

	/**
	 * @inheritDoc
	 */
	public function execute() {
		// Construct the ZObjectStore, because ServiceWiring hasn't run
		$services = $this->getServiceContainer();
		$titleFactory = $services->getTitleFactory();
		$zObjectStore = new ZObjectStore(
			$services->getDBLoadBalancerFactory(),
			$services->getTitleFactory(),
			$services->getWikiPageFactory(),
			$services->getRevisionStore(),
			$services->getUserGroupManager(),
			LoggerFactory::getInstance( 'WikiLambda' ),
			$services->getMainConfig(),
		);

		// Dump path:
		$dumpDir = $this->getOption( 'dir' );
		if ( !$dumpDir ) {
			$this->fatalError( "Please specify the folder where the cached ZObjects are stored. E.g.:\n"
				. "docker compose exec mediawiki php extensions/WikiLambda/maintenance/loadJsonDump.php "
				. "--dir zobjectcache" );
		}
		$path = dirname( __DIR__ ) . '/' . $dumpDir;

		// Dump only one zid:
		$pushZid = $this->getOption( 'zid' );

		// Get data files
		// Load Z0.json
		$indexFile = file_get_contents( "$path/Z0.json" );
		if ( $indexFile === false ) {
			$this->fatalError( "Could not load Z0.json guide file.\n"
				. "The directory must contain the objects downloaded with "
				. "https://gitlab.wikimedia.org/repos/abstract-wiki/wikifunctions-content-download" );
		}
		$index = json_decode( $indexFile, true );

		$success = 0;
		$errors = [];

		// If only one to insertZid, replace index array with zid => revision, or exit early if not found
		if ( $pushZid ) {
			if ( array_key_exists( $pushZid, $index ) ) {
				$revision = $index[ $pushZid ];
				$index = [ $pushZid => $revision ];
			} else {
				$this->fatalError( "The Zid provided doesn't exist in the directory" );
			}
		}

		// Go through all the zid-version index and push one by one
		foreach ( $index as $zid => $revision ) {
			$filename = "$zid.$revision.json";
			$response = $this->makeEdit( $titleFactory, $zObjectStore, $zid, $path, $filename );

			if ( $response->isOK ) {
				$success++;
				$this->output( $response->message );
			} else {
				// Print error immediately, but also save it for summary
				$this->error( $response->message );
				$errors[] = $response->message;
			}
		}

		// Print summary:
		// * n objects successfully created
		// * n objects failed
		// * details of all failures
		$this->output( "\nDONE!\n" );
		if ( $success > 0 ) {
			$this->output( "$success objects were created or updated successfully.\n" );
		}
		if ( count( $errors ) > 0 ) {
			$this->error( count( $errors ) . " objects failed on creation or update.\n" );

			$this->error( "Failure details:\n" );
			foreach ( $errors as $error ) {
				$this->error( "$error\n" );
			}
		}
	}

	/**
	 * Pushes the object from the given filename.
	 *
	 * @param TitleFactory $titleFactory
	 * @param ZObjectStore $zObjectStore
	 * @param string $zid
	 * @param string $path
	 * @param string $filename
	 * @return \stdClass with isOK and message properties
	 */
	private function makeEdit(
		TitleFactory $titleFactory,
		ZObjectStore $zObjectStore,
		string $zid,
		string $path,
		string $filename
	) {
		// Prepare return object
		$return = (object)[
			'isOK' => true,
			'message' => ''
		];

		$data = file_get_contents( "$path/$filename" );

		if ( !$data ) {
			$return->isOK = false;
			$return->message = "The file $filename was not found in the path $path\n";
			return $return;
		}

		$title = $titleFactory->newFromText( $zid, NS_MAIN );

		if ( !( $title instanceof Title ) ) {
			$return->isOK = false;
			$return->message = "The ZObject $zid cannot be loaded: invalid name\n";
			return $return;
		}

		$creating = !$title->exists();
		$summary = wfMessage(
			$creating
				? 'wikilambda-bootstrapcreationeditsummary'
				: 'wikilambda-bootstrapupdatingeditsummary'
		)->inLanguage( 'en' )->text();

		// We create or update the ZObject
		try {
			$zObjectStore->pushZObject( $zid, $data, $summary );
			$return->message = ( $creating ? "Created" : "Updated" ) . " $zid\n";
		} catch ( ZErrorException $e ) {
			$return->isOK = false;
			$return->message = "❌ Problem " . ( $creating ? 'creating' : 'updating' ) . " $zid:\n"
				. $e->getMessage() . "\n"
				. $e->getZErrorMessage() . "\n";
		} catch ( \Exception $e ) {
			$return->isOK = false;
			$return->message = "❌ Problem " . ( $creating ? 'creating' : 'updating' ) . " $zid:\n"
				. $e->getMessage() . "\n"
				. $e->getTraceAsString() . "\n";
		}

		return $return;
	}
}

$maintClass = LoadJsonDump::class;
require_once RUN_MAINTENANCE_IF_MAIN;
