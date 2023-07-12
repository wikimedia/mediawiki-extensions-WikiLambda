<?php
/**
 * WikiLambda extension hooks
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use DatabaseUpdater;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\MediaWikiServices;
use MediaWiki\Title\Title;
use RuntimeException;
use User;

class Hooks implements \MediaWiki\Installer\Hook\LoadExtensionSchemaUpdatesHook {

	public static function registerExtension() {
		require_once __DIR__ . '/defines.php';

		global $wgNamespaceContentModels;
		$wgNamespaceContentModels[ NS_MAIN ] = CONTENT_MODEL_ZOBJECT;

		global $wgNamespaceProtection;
		$wgNamespaceProtection[ NS_MAIN ] = [ 'wikilambda-edit', 'wikilambda-create' ];

		// (T267232) Prevent ZObject pages from being transcluded; sadly this isn't available as
		// an extension.json attribute as of yet.
		global $wgNonincludableNamespaces;
		$wgNonincludableNamespaces[] = NS_MAIN;
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/LoadExtensionSchemaUpdates
	 *
	 * @param DatabaseUpdater $updater DatabaseUpdater subclass
	 */
	public function onLoadExtensionSchemaUpdates( $updater ) {
		$db = $updater->getDB();
		$type = $db->getType();
		$dir = __DIR__ . '/../sql';

		if ( !in_array( $type, [ 'mysql', 'sqlite', 'postgres' ] ) ) {
			wfWarn( "Database type '$type' is not supported by the WikiLambda extension." );
			return;
		}

		$tables = [
			'zobject_labels',
			'zobject_label_conflicts',
			'zobject_function_join',
			'ztester_results',
			'zlanguages'
		];

		foreach ( $tables as $key => $table ) {
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
	}

	/**
	 * Return path of data definition JSON files.
	 *
	 * @return string
	 */
	protected static function getDataPath() {
		return dirname( __DIR__ ) . '/function-schemata/data/definitions/';
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

		// Note: Hard-coding the English version for messages as this can run without a Context and so no language set.
		$creatingUserName = wfMessage( 'wikilambda-systemuser' )->inLanguage( 'en' )->text();
		$creatingUser = User::newSystemUser( $creatingUserName, [ 'steal' => true ] );
		$creatingComment = wfMessage( 'wikilambda-bootstrapcreationeditsummary' )->inLanguage( 'en' )->text();

		if ( !$creatingUser ) {
			// Something went wrong, give up.
			return;
		}

		$initialDataToLoadPath = static::getDataPath();

		$dependenciesFile = file_get_contents( $initialDataToLoadPath . 'dependencies.json' );
		if ( $dependenciesFile === false ) {
			throw new RuntimeException(
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

		if ( array_key_exists( $zid,  $dependencies ) ) {
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
		$page = MediaWikiServices::getInstance()->getWikiPageFactory()->newFromTitle( $title );

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
		} catch ( ZErrorException $e ) {
			$updater->output( "\t❌ Unable to make a ZObject for {$title->getPrefixedText()}.\n" );
			return false;
		}

		$status = $page->doUserEditContent(
			/* content */ $content,
			/* user */ $user,
			/* edit summary */ $comment
		);

		if ( $status->isOK() ) {
			array_push( $inserted, $zid );
			$updater->insertUpdateRow( $updateRowName );
			if ( !defined( 'MW_PHPUNIT_TEST' ) ) {
				// Don't log this during unit testing, quibble thinks it means we're broken.
				$updater->output( "\tSuccessfully created {$title->getPrefixedText()}.\n" );
			}
		} else {
			$firstError = $status->getErrors()[0];
			$error = wfMessage( $firstError[ 'message' ], $firstError[ 'params' ] );
			$updater->output( "\t❌ Unable to make a page for {$title->getPrefixedText()}: $error\n" );
		}

		return $status->isOK();
	}

}
