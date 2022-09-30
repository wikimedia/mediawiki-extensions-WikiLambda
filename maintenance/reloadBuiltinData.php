<?php
/**
 * WikiLambda reloadBuiltinData maintenance script
 *
 * Reloads all builtin data into the database. If the builtins have been updated manually,
 * this script erases all the updates, restoring the data to their first state in the files.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

use MediaWiki\Extension\WikiLambda\Hooks;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\MediaWikiServices;
use MediaWiki\Page\DeletePageFactory;
use MediaWiki\Page\WikiPageFactory;

$IP = getenv( 'MW_INSTALL_PATH' );
if ( $IP === false ) {
	$IP = __DIR__ . '/../../..';
}
require_once "$IP/maintenance/Maintenance.php";

class ReloadBuiltinData extends Maintenance {

	// TODO: T260314: magical future of having changes re-apply

	/**
	 * @var ZObjectStore
	 */
	private $zObjectStore = null;

	/**
	 * @var TitleFactory
	 */
	protected $titleFactory;

	/**
	 * @var WikiPageFactory
	 */
	protected $wikiPageFactory;

	/**
	 * @var DeletePageFactory
	 */
	protected $deletePageFactory;

	/**
	 * @inheritDoc
	 */
	public function __construct() {
		parent::__construct();
		$this->requireExtension( 'WikiLambda' );
		$this->addDescription( 'Restores saved ZObjects with the updated builtin ZObjects from the data directory' );

		$this->addOption(
			'force',
			'Forces the reload by clearing all secondary data and doing '
				. 'an orderly insertion in case a normal reload fails',
			false,
			false
		);

		$this->addOption(
			'clear',
			'Clears all the non built-in ZObjects. The "--clear" flag can only '
				. 'be used along with the "--force" flag.',
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
		$this->titleFactory = $services->getTitleFactory();
		$this->wikiPageFactory = $services->getWikiPageFactory();
		$this->deletePageFactory = $services->getDeletePageFactory();
		$this->zObjectStore = new ZObjectStore(
			$services->getDBLoadBalancer(),
			$services->getTitleFactory(),
			$services->getWikiPageFactory(),
			$services->getRevisionStore()
		);

		$force = $this->getOption( 'force' );
		$clear = $this->getOption( 'clear' );

		if ( $force ) {
			$this->reloadBuiltinForce( $clear === 1 );
		} else {
			if ( $clear ) {
				// We could simply call reloadBuiltinForce( true ) if the user calls the script
				// with the flag --clear, but this is just to make sure that the user is aware
				// of the process occurring, as the force option means total secondary tables being
				// wiped.
				$this->output( 'The flag "--clear" should only be used along with the flag "--force"' );
				$this->output( "\n" );
			} else {
				$this->reloadBuiltinSafe();
			}
		}
	}

	/**
	 * Re-inserts all the builtin ZObject available in data/definitions.
	 * This will not work as an initial data load, and might fail when there's
	 * complex migrations and some objects become not valid. In such case,
	 * one must run the script with the "--force" flag.
	 */
	private function reloadBuiltinSafe() {
		$initialDataToLoadPath = dirname( __DIR__ ) . '/function-schemata/data/definitions/';
		$initialDataToLoadListing = array_filter(
			scandir( $initialDataToLoadPath ),
			static function ( $key ) {
				return (bool)preg_match( '/^Z\d+\.json$/', $key );
			}
		);

		$creatingUserName = wfMessage( 'wikilambda-systemuser' )->inLanguage( 'en' )->text();
		$creatingUser = User::newSystemUser( $creatingUserName, [ 'steal' => true ] );
		$creatingComment = wfMessage( 'wikilambda-bootstrapcreationeditsummary' )->inLanguage( 'en' )->text();

		// Naturally sort, so Z2 gets created before Z12 etc.
		natsort( $initialDataToLoadListing );

		foreach ( $initialDataToLoadListing as $filename ) {
			$zid = substr( $filename, 0, -5 );
			$data = file_get_contents( $initialDataToLoadPath . $filename );

			if ( !$data ) {
				// Something went wrong, give up.
				return;
			}

			// And we update the data
			$response = $this->zObjectStore->updateZObject(
				/* String zid */ $zid,
				/* String content */ $data,
				/* Edit summary */ $creatingComment,
				/* User */ $creatingUser,
				/* Flags */ 0
			);

			if ( $response->isOK() ) {
				$this->output( "Updated $zid \n" );
			} else {
				$this->output( "Problem updating $zid \n" );
				$this->output( $response->getErrors() );
				$this->output( "\n" );
			}
		}
	}

	/**
	 * Re-inserts all the builtin ZObject available in data/definitions.
	 * This method will make sure that the insertion ends succesffully, by
	 * taking drastic measures. It will first clear all the secondary tables
	 * to avoid possible conflicts, and then will call the createInitialContent
	 * hook so that the insertions happen in the right order.
	 *
	 * @param bool $clear Whether to also clear the non-builtin objects
	 */
	private function reloadBuiltinForce( $clear ) {
		// 1. Get builtin and custom Zid arrays
		$allZids = $this->zObjectStore->fetchAllZids();
		$builtinZids = self::getAllBuiltinZids();
		$customZids = array_filter(
			$allZids, static function ( $zid ) use ( $builtinZids ) {
				return !in_array( $zid, $builtinZids );
			}
		);

		if ( $clear ) {
			$user = User::newSystemUser( User::MAINTENANCE_SCRIPT_USER, [ 'steal' => true ] );

			// 2.a. Delete all non-builtin ZObjects
			foreach ( $customZids as $zid ) {
				$status = $this->deleteZObjectUnsafe(
					$zid,
					$user,
					'Maintenance script reloadBuiltinData --force --clear'
				);
				if ( $status->isOK() ) {
					$this->output( "Deleted custom ZObject $zid \n" );
				} else {
					$this->output( "Problem deleting custom ZObject $zid \n" );
					$this->output( var_export( $status->getErrors(), true ) );
					$this->output( "\n" );
					return;
				}
			}
			// 2.b. Clear all secondary tables
			$this->zObjectStore->clearLabelsSecondaryTables();
			$this->zObjectStore->clearFunctionsSecondaryTables();
		} else {
			// 2. Clear only builtin zids from secondary tables
			$this->zObjectStore->deleteFromLabelsSecondaryTables( $builtinZids );
			$this->zObjectStore->deleteFromFunctionsSecondaryTables( $builtinZids );
		}

		// 3. Call Hooks:createInitialContent
		$updater = DatabaseUpdater::newForDB( $this->getDB( DB_PRIMARY ), true, $this );
		Hooks::createInitialContent( $updater, true );
	}

	/**
	 * Deletes a ZObject if the user is allowed to do so. This method is only
	 * for its use by reloadBuiltinData with the --force and --clear flags.
	 *
	 * @param string $zid
	 * @param User $user
	 * @param string $reason
	 * @return StatusValue
	 */
	private function deleteZObjectUnsafe( $zid, $user, $reason = '' ): StatusValue {
		$title = $this->titleFactory->newFromText( $zid, NS_MAIN );
		if ( !( $title instanceof Title ) ) {
			return StatusValue::newFatal( 'wikilambda-invalidzobjecttitle' );
		}
		$page = $this->wikiPageFactory->newFromTitle( $title );
		$deletePage = $this->deletePageFactory->newDeletePage( $page, $user );
		return $deletePage->deleteUnsafe( $reason );
	}

	/**
	 * Returns the array of built-in ZIDS
	 *
	 * @return array
	 */
	private static function getAllBuiltinZids() {
		$dataPath = dirname( __DIR__ ) . '/function-schemata/data/definitions/';
		$filenames = array_filter(
			scandir( $dataPath ),
			static function ( $key ) {
				return (bool)preg_match( '/^Z\d+\.json$/', $key );
			}
		);
		$zids = array_map(
			static function ( $filename ) {
				return substr( $filename, 0, -5 );
			},
			$filenames
		);
		return $zids;
	}
}

$maintClass = ReloadBuiltinData::class;
require_once RUN_MAINTENANCE_IF_MAIN;
