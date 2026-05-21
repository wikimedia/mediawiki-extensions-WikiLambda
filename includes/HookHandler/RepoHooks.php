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
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectContent\ZObjectContentHandler;
use MediaWiki\Extension\WikiLambda\ZObjectContent\ZObjectSecondaryDataUpdate;
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
		// We define the content models regardless of if 'repo mode' or 'abstract mode' are enabled
		require_once __DIR__ . '/../defines.php';

		// Can't use MediaWikiServices or config objects yet, so use globals
		global $wgWikiLambdaEnableRepoMode, $wgWikiLambdaEnableAbstractMode;

		if ( $wgWikiLambdaEnableRepoMode ) {
			self::registerRepoModeConfig();
		}

		if ( $wgWikiLambdaEnableAbstractMode ) {
			self::registerAbstractModeConfig();
		}
	}

	/**
	 * Configure namespaces, user rights, groups, and rate limits that exist only on a
	 * Wikifunctions-style repo wiki. Doing this from the registerExtension callback
	 * (rather than statically in extension.json) keeps them off Special:ListGroupRights
	 * on client-only wikis such as Wikipedia. (T407066)
	 *
	 * Safe to call repeatedly: the merges are duplicate-free so tests that re-fire
	 * the callback via setUpAsRepoMode() converge on the same state.
	 */
	private static function registerRepoModeConfig(): void {
		// Register the namespace as using content our content model
		global $wgNamespaceContentModels;
		$wgNamespaceContentModels[ NS_MAIN ] = CONTENT_MODEL_ZOBJECT;

		// Ensure that the namespace is protected with the right permissions
		global $wgNamespaceProtection;
		$wgNamespaceProtection[ NS_MAIN ] = [ 'wikilambda-edit', 'wikilambda-create' ];

		// (T267232) Prevent ZObject pages from being transcluded; sadly this isn't available as
		// an extension.json attribute as of yet.
		global $wgNonincludableNamespaces;
		if ( !in_array( NS_MAIN, $wgNonincludableNamespaces, true ) ) {
			$wgNonincludableNamespaces[] = NS_MAIN;
		}

		$availableRights = [
			'wikilambda-bypass-cache',
			'wikilambda-connect-implementation',
			'wikilambda-connect-tester',
			'wikilambda-create',
			'wikilambda-create-arbitrary-zid',
			'wikilambda-create-boolean',
			'wikilambda-create-converter',
			'wikilambda-create-enum-value',
			'wikilambda-create-function',
			'wikilambda-create-function-call',
			'wikilambda-create-generic-enum',
			'wikilambda-create-implementation',
			'wikilambda-create-language',
			'wikilambda-create-predefined',
			'wikilambda-create-programming',
			'wikilambda-create-tester',
			'wikilambda-create-type',
			'wikilambda-create-unit',
			'wikilambda-disconnect-implementation',
			'wikilambda-disconnect-tester',
			'wikilambda-edit',
			'wikilambda-edit-argument-label',
			'wikilambda-edit-attached-implementation',
			'wikilambda-edit-attached-tester',
			'wikilambda-edit-boolean',
			'wikilambda-edit-function-attached-implementation',
			'wikilambda-edit-function-attached-tester',
			'wikilambda-edit-builtin-function',
			'wikilambda-edit-connected-converter',
			'wikilambda-edit-converter',
			'wikilambda-edit-enum-value',
			'wikilambda-edit-error-key-label',
			'wikilambda-edit-function-call',
			'wikilambda-edit-generic-enum-type',
			'wikilambda-edit-generic-enum-item',
			'wikilambda-edit-generic-enum-id',
			'wikilambda-edit-implementation',
			'wikilambda-edit-key-label',
			'wikilambda-edit-language',
			'wikilambda-edit-object-alias',
			'wikilambda-edit-object-description',
			'wikilambda-edit-object-label',
			'wikilambda-edit-object-type',
			'wikilambda-edit-predefined',
			'wikilambda-edit-programming',
			'wikilambda-edit-running-function',
			'wikilambda-edit-running-function-definition',
			'wikilambda-edit-tester',
			'wikilambda-edit-type',
			'wikilambda-edit-unit',
			'wikilambda-edit-user-function',
			'wikilambda-execute',
			'wikilambda-execute-unsaved-code',
			'wikifunctions-run',
		];

		// '*'-group entries set to false are explicit denials we keep recorded so a
		// downstream wiki adding the right to '*' doesn't accidentally re-grant it.
		// 'functioneer' and 'functionmaintainer' inherit 'user' rights via the implicit
		// 'user' group membership in User::getEffectiveGroups(), so they only list deltas.
		$groupPermissions = [
			'*' => [
				'wikilambda-bypass-cache' => false,
				'wikilambda-create-function-call' => false,
				'wikilambda-edit-function-call' => false,
				'wikilambda-execute' => true,
				'wikifunctions-run' => true,
			],
			'user' => [
				'wikilambda-execute-unsaved-code' => true,
				'wikilambda-create' => true,
				'wikilambda-create-converter' => true,
				'wikilambda-create-function' => true,
				'wikilambda-create-implementation' => true,
				'wikilambda-create-tester' => true,
				'wikilambda-edit' => true,
				'wikilambda-edit-argument-label' => true,
				'wikilambda-edit-converter' => true,
				'wikilambda-edit-error-key-label' => true,
				'wikilambda-edit-implementation' => true,
				'wikilambda-edit-key-label' => true,
				'wikilambda-edit-object-alias' => true,
				'wikilambda-edit-object-description' => true,
				'wikilambda-edit-object-label' => true,
				'wikilambda-edit-tester' => true,
				'wikilambda-edit-user-function' => true,
			],
			'functioneer' => [
				'wikilambda-connect-implementation' => true,
				'wikilambda-connect-tester' => true,
				'wikilambda-create-generic-enum' => true,
				'wikilambda-create-type' => true,
				'wikilambda-disconnect-implementation' => true,
				'wikilambda-disconnect-tester' => true,
				'wikilambda-edit-attached-implementation' => true,
				'wikilambda-edit-attached-tester' => true,
				'wikilambda-edit-generic-enum-item' => true,
				'wikilambda-edit-running-function' => true,
			],
			'functionmaintainer' => [
				'wikilambda-create-arbitrary-zid' => true,
				'wikilambda-create-boolean' => true,
				'wikilambda-create-enum-value' => true,
				'wikilambda-create-language' => true,
				'wikilambda-create-predefined' => true,
				'wikilambda-create-programming' => true,
				'wikilambda-create-unit' => true,
				'wikilambda-edit-boolean' => true,
				'wikilambda-edit-builtin-function' => true,
				'wikilambda-edit-connected-converter' => true,
				'wikilambda-edit-enum-value' => true,
				'wikilambda-edit-generic-enum-id' => true,
				'wikilambda-edit-generic-enum-type' => true,
				'wikilambda-edit-language' => true,
				'wikilambda-edit-object-type' => true,
				'wikilambda-edit-predefined' => true,
				'wikilambda-edit-programming' => true,
				'wikilambda-edit-running-function-definition' => true,
				'wikilambda-edit-type' => true,
				'wikilambda-edit-unit' => true,
				'wikilambda-edit-function-attached-implementation' => true,
				'wikilambda-edit-function-attached-tester' => true,
			],
		];

		$rateLimits = [
			// Functioneers can make 20 calls per minute
			'functioneer' => [ 20, 60 ],
			// Regular (logged-in) users can make 5 calls per minute
			'user' => [ 5, 60 ],
			// Brand new users (and temporary accounts and logged-out users) can only make 1 call per minute
			'newbie' => [ 1, 60 ],
		];

		// 'sysop' can promote/demote 'functioneer'; 'bureaucrat' the same for 'functionmaintainer'.
		$groupChangeRights = [
			'sysop' => 'functioneer',
			'bureaucrat' => 'functionmaintainer',
		];

		self::applyRegisteredConfig(
			$availableRights, $groupPermissions, $rateLimits, $groupChangeRights
		);
	}

	/**
	 * Configure the user rights and group permissions needed for Abstract Wikipedia
	 * content authoring. Gated separately from repo-mode rights so an abstract-mode
	 * wiki that is not a Wikifunctions repo still gets these. (T407066)
	 *
	 * Safe to call repeatedly.
	 */
	private static function registerAbstractModeConfig(): void {
		$availableRights = [
			'wikilambda-abstract-create',
			'wikilambda-abstract-edit',
		];

		$groupPermissions = [
			'*' => [
				'wikilambda-abstract-create' => false,
				'wikilambda-abstract-edit' => false,
			],
			'user' => [
				'wikilambda-abstract-create' => true,
				'wikilambda-abstract-edit' => true,
			],
		];

		self::applyRegisteredConfig( $availableRights, $groupPermissions, [], [] );
	}

	/**
	 * Idempotent merge of WikiLambda's permission-shaped globals.
	 *
	 * Indexed arrays ($wgAvailableRights, $wgPrivilegedGroups, $wgAddGroups[<admin>],
	 * $wgRemoveGroups[<admin>]) are appended only with entries not already present.
	 * Associative permission maps ($wgGroupPermissions[<group>], $wgRateLimits[<right>])
	 * are merged using the '+' operator so values from LocalSettings.php (or any earlier
	 * registration pass) win over our defaults — matching the merge semantics that
	 * MediaWiki's ExtensionProcessor applies when these are declared in extension.json.
	 *
	 * @param string[] $availableRights
	 * @param array<string,array<string,bool>> $groupPermissions
	 * @param array<string,int[]> $rateLimits Per-group [count, period] entries for 'wikilambda-execute'
	 * @param array<string,string> $groupChangeRights Map of administrator group => target group
	 */
	private static function applyRegisteredConfig(
		array $availableRights,
		array $groupPermissions,
		array $rateLimits,
		array $groupChangeRights
	): void {
		global $wgAvailableRights, $wgGroupPermissions, $wgRateLimits,
			$wgAddGroups, $wgRemoveGroups, $wgPrivilegedGroups;

		$wgAvailableRights = array_values( array_unique(
			array_merge( $wgAvailableRights, $availableRights )
		) );

		foreach ( $groupPermissions as $group => $perms ) {
			$wgGroupPermissions[$group] = ( $wgGroupPermissions[$group] ?? [] ) + $perms;
		}

		if ( $rateLimits ) {
			$wgRateLimits['wikilambda-execute'] =
				( $wgRateLimits['wikilambda-execute'] ?? [] ) + $rateLimits;
		}

		foreach ( $groupChangeRights as $admin => $target ) {
			foreach ( [ &$wgAddGroups, &$wgRemoveGroups ] as &$bucket ) {
				$bucket[$admin] ??= [];
				if ( !in_array( $target, $bucket[$admin], true ) ) {
					$bucket[$admin][] = $target;
				}
			}
			unset( $bucket );

			if ( !in_array( $target, $wgPrivilegedGroups, true ) ) {
				$wgPrivilegedGroups[] = $target;
			}
		}
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

		$abstractNamespaceConfig = $config->get( 'WikiLambdaAbstractNamespaces' );

		// We support multiple abstract namespaces, so loop through; initial deployment will only be for one.
		foreach ( $abstractNamespaceConfig as $namespaceID => $nsdata ) {

			// We only need to do the below steps if we're in dev-mode, and not occupying the main namespace
			// (T420617) HACK: Ignore all NSes lower than 10, not just NS_MAIN, whilst we fix prod config.
			if ( $namespaceID > 10 ) {
				$namespaceEnglishName = $nsdata[0];

				// Register the namespace at all (plus its talk)
				global $wgExtraNamespaces;
				$wgExtraNamespaces[ $namespaceID ] = $namespaceEnglishName;
				$wgExtraNamespaces[ $namespaceID + 1 ] = $namespaceEnglishName . '_talk';

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

		// Insert the tables for abstract-client-mode, if needed.
		// Virtual domain must be defined for the 'virtual-awstorage' key:
		//
		// Locally, use the same DB with:
		// $wgVirtualDomainsMapping['virtual-awstorage'] = [
		// 	'db' => false
		// ];
		//
		// In production, use x1 shared DB with:
		// $wgVirtualDomainsMapping['virtual-awstorage'] = [
		//   'cluster' => 'extension1',
		//   'db' => 'wikishared'
		// ];
		if (
			$config->has( 'WikiLambdaEnableAbstractClientMode' ) &&
			$config->get( 'WikiLambdaEnableAbstractClientMode' )
		) {
			$awTables = [ 'aw_article_sections' ];
			foreach ( $awTables as $table ) {
				$updater->addExtensionUpdateOnVirtualDomain( [
					AWArticleStore::AW_STORAGE_VIRTUAL_DOMAIN,
					'addTable',
					$table,
					"$dir/$type/table-$table.sql",
					true
				] );
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
		$zObjectCache = WikiLambdaServices::getMemcachedWrapper();
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
			$services->get( 'WikiLambdaMemcachedWrapper' );
		} catch ( NoSuchServiceException ) {
			$memcachedWrapper = WikiLambdaServices::buildMemcachedWrapper( $services );
			$services->defineService(
				'WikiLambdaMemcachedWrapper',
				static function () use ( $memcachedWrapper ) {
					return $memcachedWrapper;
				}
			);
		}
	}
}
