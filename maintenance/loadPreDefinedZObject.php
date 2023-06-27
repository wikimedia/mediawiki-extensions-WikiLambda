<?php

/**
 * WikiLambda loadPreDefinedZObject maintenance script
 *
 * Loads specified pre-defined ZObject into the database.
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

$IP = getenv( 'MW_INSTALL_PATH' );
if ( $IP === false ) {
	$IP = __DIR__ . '/../../..';
}
require_once "$IP/maintenance/Maintenance.php";

class LoadPreDefinedZObject extends Maintenance {

	/**
	 * @inheritDoc
	 */
	public function __construct() {
		parent::__construct();
		$this->requireExtension( 'WikiLambda' );
		$this->addDescription( 'Loads a specified pre-defined ZObject into the database' );

		$this->addOption(
			'zid',
			'Which ZID to load',
			true,
			true
		);

		$this->addOption(
			'force',
			'Forces the load even if the ZObject already exists (clears the ZObject)',
			false,
			false
		);
	}

	/**
	 * @inheritDoc
	 */
	public function execute() {
		// Construct the ZObjectStore, because ServiceWiring hasn't run
		$services = MediaWikiServices::getInstance();

		$zid = $this->getOption( 'zid' );

		$force = $this->getOption( 'force' );

		$data = file_get_contents( dirname( __DIR__ ) . '/function-schemata/data/definitions/' . $zid . '.json' );

		if ( !$data ) {
			// Something went wrong, give up.
			$this->output( 'The ZObject was not found in the definitions folder.' . "\n" );
			return;
		}

		$zObjectStore = new ZObjectStore(
			$services->getDBLoadBalancer(),
			$services->getTitleFactory(),
			$services->getWikiPageFactory(),
			$services->getRevisionStore(),
			LoggerFactory::getInstance( 'WikiLambda' )
		);

		$titleFactory = $services->getTitleFactory();
		$title = $titleFactory->newFromText( $zid, NS_MAIN );
		if ( !( $title instanceof Title ) ) {
			$this->output( 'The ZObject title could not be loaded somehow; invalid name?' . "\n" );
			return;
		}

		if ( !$title->exists() ) {
			$creating = true;
		} else {
			if ( !$force ) {
				$this->output( 'The ZObject title already exists and --force was not passed, giving up.' . "\n" );
				return;
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
			/* String zid */ $zid,
			/* String content */ $data,
			/* Edit summary */ $editSummary,
			/* Update flags */ $creating ? EDIT_NEW : EDIT_UPDATE
		);

		if ( $response->isOK() ) {
			$this->output( ( $creating ? 'Created ' : 'Updated ' ) . $zid . "successfully.\n" );
		} else {
			$this->output( "Problem " . ( $creating ? 'creating' : 'updating' ) . ' \'' . $zid . "':\n" );
			$this->output( $response->getErrors() );
			$this->output( "\n" );
		}
	}
}

$maintClass = LoadPreDefinedZObject::class;
require_once RUN_MAINTENANCE_IF_MAIN;
