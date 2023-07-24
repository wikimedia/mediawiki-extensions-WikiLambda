<?php

/**
 * WikiLambda loadPreDefinedObject maintenance script
 *
 * Loads specified pre-defined Object, range of Objects, or all pre-defined Objects into the database.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\Title\Title;
use MediaWiki\Title\TitleFactory;

$IP = getenv( 'MW_INSTALL_PATH' );
if ( $IP === false ) {
	$IP = __DIR__ . '/../../..';
}
require_once "$IP/maintenance/Maintenance.php";

class LoadPreDefinedObject extends Maintenance {

	/**
	 * @inheritDoc
	 */
	public function __construct() {
		parent::__construct();
		$this->requireExtension( 'WikiLambda' );
		$this->addDescription( 'Loads a specified pre-defined Object into the database' );

		$this->addOption(
			'zid',
			'Which ZID to load',
			false,
			true
		);

		$this->addOption(
			'from',
			'Which range of ZIDs to load from',
			false,
			true
		);

		$this->addOption(
			'to',
			'Which range of ZIDs to load to',
			false,
			true
		);

		$this->addOption(
			'all',
			'Load for all pre-defined ZIDs (Z1 – Z9999)',
			false,
			false
		);

		$this->addOption(
			'force',
			'Forces the load even if the Object already exists (clears the Object)',
			false,
			false
		);

		// TODO (T335418): Add a feature to reload the 'content' but retain the user-written/-extended
		// labels, aliases, and short descriptions, for use e.g. when
	}

	/**
	 * @inheritDoc
	 */
	public function execute() {
		// Construct the ZObjectStore, because ServiceWiring hasn't run
		$services = MediaWikiServices::getInstance();
		$titleFactory = $services->getTitleFactory();
		$zObjectStore = new ZObjectStore(
			$services->getDBLoadBalancer(),
			$services->getTitleFactory(),
			$services->getWikiPageFactory(),
			$services->getRevisionStore(),
			LoggerFactory::getInstance( 'WikiLambda' )
		);

		$from = $this->getOption( 'from' );
		$to = $this->getOption( 'to' );

		if ( (bool)$from xor (bool)$to ) {
			$this->fatalError( 'The flag "--from" must be used with the flag "--to" to set a range' . "\n" );
		}

		if ( !is_numeric( $from ) || $from < 1 || $from > 9999 ) {
			$this->fatalError( 'The flag "--from" must be a number between 1 and 9999' . "\n" );
		}

		if ( !is_numeric( $to ) || $to < 1 || $to > 9999 ) {
			$this->fatalError( 'The flag "--to" must be a number between 1 and 9999' . "\n" );
		}

		if ( $from > $to ) {
			$this->fatalError( 'The flag "--from" must be lower than the flag "--to"' . "\n" );
		}

		if ( $this->getOption( 'all' ) ) {
			$from = 1;
			$to = 9999;
		}

		$zid = $this->getOption( 'zid' );
		if ( $zid ) {
			if ( !is_numeric( $zid ) || $zid < 1 || $zid > 9999 ) {
				$this->fatalError( 'The flag "--zid" must be a number between 1 and 9999' . "\n" );
			}

			$from = $zid;
			$to = $zid;
		}

		$force = $this->getOption( 'force' ) || false;

		$path = dirname( __DIR__ ) . '/function-schemata/data/definitions/';
		$initialDataToLoadListing = array_filter(
			scandir( $path ),
			static function ( $key ) use ( $from, $to ) {
				if ( preg_match( '/^Z(\d+)\.json$/', $key, $match ) ) {
					if ( $match[1] >= $from && $match[1] <= $to ) {
						return true;
					}
				}
				return false;
			}
		);
		// Naturally sort, so Z2 gets created before Z12 etc.
		natsort( $initialDataToLoadListing );

		$success = 0;
		$failure = 0;
		$skipped = 0;
		foreach ( $initialDataToLoadListing as $filename ) {

			$zid = substr( $filename, 1, -5 );

			switch ( $this->makeEdit( $zid, $path, $titleFactory, $zObjectStore, $force ) ) {
				case 1:
					$success++;
					break;

				case -1:
					$failure++;
					break;

				case 0:
					$skipped++;
					break;

				default:
					throw new RuntimeException( 'Unrecognised return value!' );
			}
		}

		if ( $success > 0 ) {
			$this->output( $success . ' objects creates or updates successes.' . "\n" );
		}

		if ( $skipped > 0 ) {
			$this->output( $skipped . ' objects creates or updates skipped.' . "\n" );
		}

		if ( $failure > 0 ) {
			$this->fatalError( $failure . ' objects creates or updates failed.' . "\n" );
		}
	}

	// phpcs:disable MediaWiki.Commenting.FunctionComment.MissingDocumentationPrivate
	private function makeEdit(
		string $zid, string $path, TitleFactory $titleFactory, ZObjectStore $zObjectStore, bool $force
	) {
		$data = file_get_contents( $path . 'Z' . $zid . '.json' );

		if ( !$data ) {
			$this->error( 'The ZObject "Z' . $zid . '" was not found in the definitions folder.' );
			return -1;
		}

		$title = $titleFactory->newFromText( 'Z' . $zid, NS_MAIN );
		if ( !( $title instanceof Title ) ) {
			$this->error( 'The ZObject title "Z' . $zid . '" could not be loaded somehow; invalid name?' );
			return -1;
		}

		if ( !$title->exists() ) {
			$creating = true;
		} else {
			if ( !$force ) {
				$this->error( 'The ZObject "Z' . $zid . '" already exists and --force was not passed.' );
				return 0;
			}
			$creating = false;
		}

		$editSummary = wfMessage(
			$creating
				? 'wikilambda-bootstrapcreationeditsummary'
				: 'wikilambda-bootstrapupdatingeditsummary'
		)->inLanguage( 'en' )->text();

		// And we create or update the ZObject
		$response = $zObjectStore->updateZObjectAsSystemUser(
			/* String zid */ 'Z' . $zid,
			/* String content */ $data,
			/* Edit summary */ $editSummary,
			/* Update flags */ $creating ? EDIT_NEW : EDIT_UPDATE
		);

		if ( $response->isOK() ) {
			$this->output( ( $creating ? 'Created ' : 'Updated ' ) . '"Z' . $zid . '".' . "\n" );
			return 1;
		} else {
			$this->error( "Problem " . ( $creating ? 'creating' : 'updating' ) . ' "Z' . $zid . "\":\n" );
			$this->error( $response->getErrors() );
			$this->error( "\n" );
			return -1;
		}
	}
}

$maintClass = LoadPreDefinedObject::class;
require_once RUN_MAINTENANCE_IF_MAIN;
