<?php

/**
 * WikiLambda extension 'repo-mode' hooks
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\HookHandler;

use MediaWiki\CommentStore\CommentStoreComment;
use MediaWiki\Config\ConfigException;
use MediaWiki\Deferred\DeferredUpdates;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContentHandler;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use MediaWiki\Extension\WikiLambda\ZObjectSecondaryDataUpdate;
use MediaWiki\Installer\DatabaseUpdater;
use MediaWiki\MediaWikiServices;
use MediaWiki\RecentChanges\RecentChange;
use MediaWiki\Revision\SlotRecord;
use MediaWiki\Title\Title;
use MediaWiki\User\User;
use Wikimedia\Services\NoSuchServiceException;

class RepoHooks implements
	\MediaWiki\Installer\Hook\LoadExtensionSchemaUpdatesHook,
	\MediaWiki\Hook\MediaWikiServicesHook
	{

	public static function registerExtension() {
		// We define the content model regardless of if 'repo mode' is enabled
		require_once __DIR__ . '/../defines.php';

		// Can't use MediaWikiServices or config objects yet, so use globals
		global $wgWikiLambdaEnableRepoMode;

		if ( !$wgWikiLambdaEnableRepoMode ) {
			// Nothing for us to do.
			return;
		}

		// Register the namespace as using content our content model
		global $wgNamespaceContentModels;
		$wgNamespaceContentModels[ NS_MAIN ] = CONTENT_MODEL_ZOBJECT;

		// Ensure that the namespace is protected with the right permissions
		global $wgNamespaceProtection;
		$wgNamespaceProtection[ NS_MAIN ] = [ 'wikilambda-edit', 'wikilambda-create' ];

		// (T267232) Prevent ZObject pages from being transcluded; sadly this isn't available as
		// an extension.json attribute as of yet.
		global $wgNonincludableNamespaces;
		$wgNonincludableNamespaces[] = NS_MAIN;
	}

	/**
	 * We do this here because registerExtension() is called too early to use i18n messages.
	 *
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/MediaWikiServices
	 *
	 * @param MediaWikiServices $services MediaWikiServices instance
	 */
	public function onMediaWikiServices( $services ) {
		$config = $services->getMainConfig();
		if ( !$config->get( 'WikiLambdaEnableAbstractMode' ) ) {
			// Nothing for us to do.
			return;
		}

		$contentHandler = $services->getContentHandlerFactory();
		if ( !$contentHandler->isDefinedModel( CONTENT_MODEL_ABSTRACT ) ) {
			if ( method_exists( $contentHandler, 'defineContentHandler' ) ) {
				// @phan-suppress-next-line PhanUndeclaredMethod this apparently phan doesn't take the hint above
				$contentHandler->defineContentHandler( CONTENT_MODEL_ABSTRACT, AbstractWikiContentHandler::class );
			} else {
				throw new ConfigException( 'Abstract content model is not registered and we cannot inject it.' );
			}
		}

		$abstractNamespaceConfig = $config->get( 'WikiLambdaAbstractNamespaces' );

		// We support multiple abstract namespaces, so loop through; initial deployment will only be for one.
		foreach ( $abstractNamespaceConfig as $namespaceID => $nsdata ) {

			// We only need to do the below steps if we're in dev-mode, and not occupying the main namespace
			if ( $namespaceID !== NS_MAIN ) {
				$namespaceEnglishName = $nsdata[0];

				// Register the namespace at all (plus its talk)
				global $wgExtraNamespaces;
				$wgExtraNamespaces[ $namespaceID ] = $namespaceEnglishName;
				$wgExtraNamespaces[ $namespaceID + 1 ] = $namespaceEnglishName . ' talk';

				// Register the namespace as including content
				global $wgContentNamespaces;
				$wgContentNamespaces[] = $namespaceID;
			}

			// Register the namespace as using content our content model
			global $wgNamespaceContentModels;
			$wgNamespaceContentModels[ $namespaceID ] = CONTENT_MODEL_ABSTRACT;

			// Ensure that the namespace is protected with the right permissions
			global $wgNamespaceProtection;
			$wgNamespaceProtection[ $namespaceID ] = [ 'wikilambda-abstract-edit', 'wikilambda-abstract-create' ];

			// Set that our namespace cannot be transcluded
			global $wgNonincludableNamespaces;
			$wgNonincludableNamespaces[] = $namespaceID;
		}
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/LoadExtensionSchemaUpdates
	 *
	 * @param DatabaseUpdater $updater DatabaseUpdater subclass
	 */
	public function onLoadExtensionSchemaUpdates( $updater ) {
		$db = $updater->getDB();
		$type = $db->getType();
		$dir = __DIR__ . '/../../sql';

		if ( !in_array( $type, [ 'mysql', 'sqlite', 'postgres' ] ) ) {
			wfWarn( "Database type '$type' is not supported by the WikiLambda extension." );
			return;
		}

		$config = MediaWikiServices::getInstance()->getMainConfig();

		// Insert the tables for client-mode, if needed (most production wikis, and development machines)
		if ( $config->has( 'WikiLambdaEnableClientMode' ) && $config->get( 'WikiLambdaEnableClientMode' ) ) {
			// Note that we're calling ::has() first, as we'll likely be in pre-extension registry mode
			$clientTables = [ 'usage' ];

			foreach ( $clientTables as $table ) {
				$updater->addExtensionTable( 'wikifunctionsclient_' . $table, "$dir/$type/table-$table.sql" );
			}
		}

		// Insert the tables for repo-mode, if needed (Wikifunctions.org and development machines only)
		if ( $config->has( 'WikiLambdaEnableRepoMode' ) && $config->get( 'WikiLambdaEnableRepoMode' ) ) {
			$repoTables = [
				'zobject_labels',
				'zobject_label_conflicts',
				'zobject_function_join',
				'ztester_results',
				'zlanguages',
				'zobject_join'
			];

			foreach ( $repoTables as $table ) {
				$updater->addExtensionTable( 'wikilambda_' . $table, "$dir/$type/table-$table.sql" );
			}

			// Database updates:
			// (T285368) Add primary label field to labels table
			$updater->addExtensionField(
				'wikilambda_zobject_labels',
				'wlzl_label_primary',
				"$dir/$type/patch-add-primary-label-field.sql"
			);

			// (T262089) Add return type field to labels table
			$updater->addExtensionField(
				'wikilambda_zobject_labels',
				'wlzl_return_type',
				"$dir/$type/patch-add-return-type-field.sql"
			);

			$updater->addExtensionUpdate( [ [ self::class, 'createInitialContent' ] ] );
			$updater->addExtensionUpdate( [ [ self::class, 'initializeZObjectJoinTable' ] ] );
		}
	}

	/**
	 * Return path of data definition JSON files.
	 *
	 * @return string
	 */
	protected static function getDataPath() {
		return dirname( __DIR__ ) . '/../function-schemata/data/definitions/';
	}

	/**
	 * Installer/Updater callback to create the initial "system" ZObjects on any installation. This
	 * is a callback so that it runs after the tables have been created/updated.
	 *
	 * @param DatabaseUpdater $updater
	 * @param bool $overwrite If true, overwrites the content, else skips if present
	 */
	public static function createInitialContent( DatabaseUpdater $updater, $overwrite = false ) {
		// Ensure that the extension is set up (namespace is defined) even when running in update.php outside of MW.
		self::registerExtension();

		$config = MediaWikiServices::getInstance()->getMainConfig();
		if ( !$config->get( 'WikiLambdaEnableRepoMode' ) ) {
			// Nothing for us to do.
			return;
		}

		$contentHandler = MediaWikiServices::getInstance()->getContentHandlerFactory();
		if ( !$contentHandler->isDefinedModel( CONTENT_MODEL_ZOBJECT ) ) {
			if ( method_exists( $contentHandler, 'defineContentHandler' ) ) {
				// @phan-suppress-next-line PhanUndeclaredMethod this apparently phan doesn't take the hint above
				$contentHandler->defineContentHandler( CONTENT_MODEL_ZOBJECT, ZObjectContentHandler::class );
			} else {
				throw new ConfigException( 'WikiLambda content model is not registered and we cannot inject it.' );
			}
		}

		// Note: Hard-coding the English version for messages as this can run without a Context and so no language set.
		$creatingUserName = wfMessage( 'wikilambda-systemuser' )->inLanguage( 'en' )->text();
		$creatingUser = User::newSystemUser( $creatingUserName, [ 'steal' => true ] );
		// We use wikilambda-bootstrapupdatingeditsummary in maintenance scripts when updating.
		$creatingComment = wfMessage( 'wikilambda-bootstrapcreationeditsummary' )->inLanguage( 'en' )->text();

		if ( !$creatingUser ) {
			// Something went wrong, give up.
			return;
		}

		$initialDataToLoadPath = static::getDataPath();

		$dependenciesFile = file_get_contents( $initialDataToLoadPath . 'dependencies.json' );
		if ( $dependenciesFile === false ) {
			throw new ConfigException(
				'Could not load dependencies file from function-schemata sub-repository of the WikiLambda extension.'
					. ' Have you initiated & fetched it? Try `git submodule update --init --recursive`.'
			);
		}
		$dependencies = json_decode( $dependenciesFile, true );

		$initialDataToLoadListing = array_filter(
			scandir( $initialDataToLoadPath ),
			static function ( $key ) {
				return (bool)preg_match( '/^Z\d+\.json$/', $key );
			}
		);

		// Naturally sort, so Z2/Persistent Object gets created before others
		natsort( $initialDataToLoadListing );

		$inserted = [];
		foreach ( $initialDataToLoadListing as $filename ) {
			static::insertContentObject(
				$updater,
				$filename,
				$dependencies,
				$creatingUser,
				$creatingComment,
				$overwrite,
				$inserted
			);
		}
	}

	/**
	 * Inserts into the database the ZObject found in a given filename of the data directory. First checks
	 * whether the ZObject has any dependencies, according to the dependencies.json manifest file, and if so,
	 * inserts all the dependencies before trying the current ZObject.
	 *
	 * Runs in a static context and so can't be part of the normal code in ZObjectStore.
	 *
	 * @param DatabaseUpdater $updater
	 * @param string $filename
	 * @param array $dependencies
	 * @param User $user
	 * @param string $comment
	 * @param bool $overwrite
	 * @param string[] &$inserted
	 * @param string[] $track
	 * @return bool Has successfully inserted the content object
	 */
	protected static function insertContentObject(
		$updater, $filename, $dependencies, $user, $comment, $overwrite = false, &$inserted = [], $track = []
	) {
		$initialDataToLoadPath = static::getDataPath();
		$updateRowName = "create WikiLambda initial content - $filename";

		$langReg = ZLangRegistry::singleton();
		$typeReg = ZTypeRegistry::singleton();

		// Check dependencies
		$zid = substr( $filename, 0, -5 );

		if ( array_key_exists( $zid, $dependencies ) ) {
			$deps = $dependencies[ $zid ];
			foreach ( $deps as $dep ) {
				if (
					// Avoid circular dependencies
					!in_array( $dep, $track )
					&& !$langReg->isZidCached( $dep )
					&& !$typeReg->isZidCached( $dep )
				) {
					// Call recursively till all dependencies have been added
					$success = self::insertContentObject(
						$updater,
						"$dep.json",
						$dependencies,
						$user,
						$comment,
						$overwrite,
						$inserted,
						array_merge( $track, (array)$dep )
					);
					// If any of the dependencies fail, we desist on the current insertion
					if ( !$success ) {
						return false;
					}
				}
			}
		}

		$zid = substr( $filename, 0, -5 );
		$title = Title::newFromText( $zid, NS_MAIN );
		$services = MediaWikiServices::getInstance();
		$page = $services->getWikiPageFactory()->newFromTitle( $title );

		// If we don't want to overwrite the ZObjects, and if Zid has already been inserted,
		// just purge the page to update secondary data and return true
		if (
			( $overwrite && in_array( $zid, $inserted ) ) ||
			( !$overwrite && $updater->updateRowExists( $updateRowName ) )
		) {
			$page->doPurge();
			return true;
		}

		$data = file_get_contents( $initialDataToLoadPath . $filename );
		if ( !$data ) {
			// something went wrong, give up.
			$updater->output( "\t❌ Unable to load file contents for {$title->getPrefixedText()}.\n" );
			return false;
		}

		try {
			$content = ZObjectContentHandler::makeContent( $data, $title );
		} catch ( ZErrorException ) {
			$updater->output( "\t❌ Unable to make a ZObject for {$title->getPrefixedText()}.\n" );
			return false;
		}

		static::ensureZObjectStoreIsPresent( $services );

		$pageUpdater = $page->newPageUpdater( $user );
		$pageUpdater->setContent( SlotRecord::MAIN, $content );
		$pageUpdater->setRcPatrolStatus( RecentChange::PRC_PATROLLED );

		$pageUpdater->saveRevision(
			CommentStoreComment::newUnsavedComment( $comment ?? '' ),
			EDIT_AUTOSUMMARY | EDIT_NEW
		);

		if ( $pageUpdater->wasSuccessful() ) {
			array_push( $inserted, $zid );
			$updater->insertUpdateRow( $updateRowName );
			if ( !defined( 'MW_PHPUNIT_TEST' ) ) {
				// Don't log this during unit testing, quibble thinks it means we're broken.
				$updater->output( "\tSuccessfully created {$title->getPrefixedText()}.\n" );
			}
		} else {
			$firstError = $pageUpdater->getStatus()->getErrors()[0];
			$error = wfMessage( $firstError[ 'message' ], $firstError[ 'params' ] )->text();
			$updater->output( "\t❌ Unable to make a page for {$title->getPrefixedText()}: $error\n" );
		}

		return $pageUpdater->wasSuccessful();
	}

	/**
	 * Installer/Updater callback to ensure that wikilambda_zobject_join has been populated for all
	 * existing functions (Z8s). This is a callback so that it runs after the tables have been
	 * created/updated.  This function can be removed when we are confident that all WikiLambda
	 * installations have a fully populated wikilambda_zobject_join table.
	 *
	 * @param DatabaseUpdater $updater
	 */
	public static function initializeZObjectJoinTable( DatabaseUpdater $updater ) {
		$updateKey = 'Initialized wikilambda_zobject_join for Z8s';

		if ( !$updater->updateRowExists( $updateKey ) ) {
			static::updateSecondaryTables( $updater, 'Z8' );
			$updater->insertUpdateRow( $updateKey );
		} else {
			$updater->output( "...wikilambda_zobject_join table already initialized\n" );
		}
	}

	/**
	 * Ensures that secondary DB tables have been populated for ZObjects of the given zType.  For
	 * each such ZObject, a new instance of ZObjectSecondaryDataUpdate is created and added to
	 * DeferredUpdates.
	 *
	 * N.B. This function assumes that wikilambda_zobject_labels is fully populated; it calls
	 * fetchZidsOfType to get a list of ZObjects of the given zType.
	 *
	 * Note there is a WikiLambda maintenance script (updateSecondaryTables.php) that provides
	 * similar functionality (and with some code that duplicates what's here, which could not
	 * easily be avoided).
	 *
	 * @param DatabaseUpdater $updater
	 * @param string $zType The type of ZObject for which to do updates.
	 * @param bool $verbose If true, print the ZID of each ZObject for which updating is done
	 * (default = false)
	 * @param bool $dryRun If true, do nothing, just print the output statements
	 * (default = false)
	 */
	public static function updateSecondaryTables(
		$updater,
		$zType,
		$verbose = false,
		$dryRun = false
	) {
		$services = MediaWikiServices::getInstance();

		$config = $services->getMainConfig();
		if ( !$config->get( 'WikiLambdaEnableRepoMode' ) ) {
			// Nothing for us to do.
			return;
		}

		static::ensureZObjectStoreIsPresent( $services );
		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$zObjectCache = WikiLambdaServices::getZObjectStash();
		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT, $config, $zObjectStore, $zObjectCache );

		$targets = $zObjectStore->fetchZidsOfType( $zType );

		if ( count( $targets ) === 0 ) {
			if ( !defined( 'MW_PHPUNIT_TEST' ) ) {
				// Don't output during unit testing; causes the test to be labeled as risky.
				$updater->output( "No ZObjects of type " . $zType . " for which secondary tables need updating\n" );
			}
			return;
		}

		if ( !defined( 'MW_PHPUNIT_TEST' ) ) {
			// Don't output during unit testing; causes the test to be labeled as risky.
			if ( $dryRun ) {
				$updater->output( "Would have updated" );
			} else {
				$updater->output( "Updating" );
			}
			$updater->output( " secondary tables for " . count( $targets ) . " ZObjects of type " .
				$zType . "\n" );
		}

		$offset = 0;
		$queryLimit = 10;
		do {
			$contents = $zObjectStore->fetchBatchZObjects( array_slice( $targets, $offset,
				$queryLimit ) );
			$offset += $queryLimit;

			foreach ( $contents as $zid => $persistentObject ) {
				if ( $verbose ) {
					$updater->output( "  $zid" );
				}
				if ( $dryRun ) {
					continue;
				}
				$title = Title::newFromText( $zid, NS_MAIN );
				$data = json_encode( $persistentObject->getSerialized() );
				$content = $handler::makeContent( $data, $title );
				$update = new ZObjectSecondaryDataUpdate(
					$title,
					$content,
					$zObjectStore,
					$zObjectCache,
					// Not trying to update the orchestrator cache here, as we're in a maintenance script
					null
				);
				DeferredUpdates::addUpdate( $update );
			}
			if ( $verbose ) {
				$updater->output( "\n" );
			}

		} while ( count( $targets ) - $offset > 0 );
	}

	/**
	 * Checks for the existence of WikiLambdaZObjectStore in $services, and creates it
	 * if needed.
	 *
	 * @param MediaWikiServices $services
	 */
	private static function ensureZObjectStoreIsPresent( $services ) {
		// If we're in the installer, it won't have registered our extension's services yet.
		try {
			$services->get( 'WikiLambdaZObjectStore' );
		} catch ( NoSuchServiceException ) {
			$zObjectStore = WikiLambdaServices::buildZObjectStore( $services );
			$services->defineService(
				'WikiLambdaZObjectStore',
				static function () use ( $zObjectStore ) {
					return $zObjectStore;
				}
			);
		}

		try {
			$services->get( 'WikiLambdaZObjectStash' );
		} catch ( NoSuchServiceException ) {
			$zObjectCache = WikiLambdaServices::buildZObjectStash( $services );
			$services->defineService(
				'WikiLambdaZObjectStash',
				static function () use ( $zObjectCache ) {
					return $zObjectCache;
				}
			);
		}
	}
}
