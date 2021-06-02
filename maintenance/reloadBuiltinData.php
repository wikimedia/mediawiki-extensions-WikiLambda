<?php
/**
 * WikiLambda reloadBuiltinData maintenance script
 *
 * Reloads all builtin data into the database. If the builtins have been updated manually,
 * this script erases all the updates, restoring the data to their first state in the files.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\MediaWikiServices;

$IP = getenv( 'MW_INSTALL_PATH' );
if ( $IP === false ) {
	$IP = __DIR__ . '/../../..';
}

require_once "$IP/maintenance/Maintenance.php";

class ReloadBuiltinData extends Maintenance {

	// TODO: T260314: magical future of having changes re-apply

	public function __construct() {
		parent::__construct();
		$this->requireExtension( 'WikiLambda' );
		$this->addDescription( 'Restores saved ZObjects with the updated builtin ZObjects from the data directory' );
	}

	public function execute() {
		// Construct the ZObjectStore, because ServiceWiring hasn't run
		$services = MediaWikiServices::getInstance();
		$zObjectStore = new ZObjectStore(
			$services->getDBLoadBalancer(),
			$services->getTitleFactory(),
			$services->getWikiPageFactory(),
			$services->getRevisionStore()
		);

		$initialDataToLoadPath = dirname( __DIR__ ) . '/data/';
		$initialDataToLoadListing = array_filter(
			scandir( $initialDataToLoadPath ),
			static function ( $key ) {
				return (bool)preg_match( '/^Z\d+\.json$/', $key );
			}
		);

		$creatingUserName = wfMessage( 'wikilambda-systemuser' )->inLanguage( 'en' )->text();
		$creatingUser = User::newSystemUser( $creatingUserName, [ 'steal' => true ] );
		$creatingComment = wfMessage( 'wikilambda-bootstrapcreationeditsummary' )->inLanguage( 'en' )->text();

		// Naturally sort, so Z2 gets created before Z10 etc.
		natsort( $initialDataToLoadListing );

		foreach ( $initialDataToLoadListing as $filename ) {
			$zid = substr( $filename, 0, -5 );
			$data = file_get_contents( $initialDataToLoadPath . $filename );

			if ( !$data ) {
				// Something went wrong, give up.
				return;
			}

			// We delete the label so that there's no conflicts
			$zObjectStore->deleteZObjectLabelsByZid( $zid );

			// And we update the data
			$response = $zObjectStore->updateZObject(
				/* String zid */ $zid,
				/* String content */ $data,
				/* Edit summary */ $creatingComment,
				/* User */ $creatingUser,
				/* Flags */ 0
			);

			if ( $response instanceof \WikiPage ) {
				$this->output( "Updated $zid \n" );
			} else {
				$this->output( "Problem updating $zid \n" );
				$this->output( $response->getMessage() );
				$this->output( "\n" );
			}
		}
	}
}

$maintClass = ReloadBuiltinData::class;

require_once RUN_MAINTENANCE_IF_MAIN;
