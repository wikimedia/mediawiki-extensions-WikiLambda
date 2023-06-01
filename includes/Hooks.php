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

use ApiMessage;
use CommentStoreComment;
use DatabaseUpdater;
use HtmlArmor;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Linker\LinkRenderer;
use MediaWiki\Linker\LinkTarget;
use MediaWiki\MediaWikiServices;
use MediaWiki\Revision\SlotRecord;
use MediaWiki\Title\Title;
use MessageSpecifier;
use RequestContext;
use RuntimeException;
use Status;
use User;

class Hooks implements
	\MediaWiki\Hook\NamespaceIsMovableHook,
	\MediaWiki\Storage\Hook\MultiContentSaveHook,
	\MediaWiki\Permissions\Hook\GetUserPermissionsErrorsHook,
	\MediaWiki\Installer\Hook\LoadExtensionSchemaUpdatesHook,
	\MediaWiki\Linker\Hook\HtmlPageLinkRendererEndHook
	{

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
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/MultiContentSave
	 *
	 * @param \MediaWiki\Revision\RenderedRevision $renderedRevision
	 * @param \MediaWiki\User\UserIdentity $user
	 * @param CommentStoreComment $summary
	 * @param int $flags
	 * @param Status $hookStatus
	 * @return bool|void
	 */
	public function onMultiContentSave( $renderedRevision, $user, $summary, $flags, $hookStatus ) {
		$title = $renderedRevision->getRevision()->getPageAsLinkTarget();
		if ( !$title->inNamespace( NS_MAIN ) ) {
			return true;
		}

		$zid = $title->getDBkey();
		if ( !ZObjectUtils::isValidZObjectReference( $zid ) ) {
			$hookStatus->fatal( 'wikilambda-invalidzobjecttitle', $zid );
			return false;
		}

		$content = $renderedRevision->getRevision()->getSlots()->getContent( SlotRecord::MAIN );

		if ( !( $content instanceof ZObjectContent ) ) {
			$hookStatus->fatal( 'wikilambda-invalidcontenttype' );
			return false;
		}

		if ( !$content->isValid() ) {
			$hookStatus->fatal( 'wikilambda-invalidzobject' );
			return false;
		}

		// (T260751) Ensure uniqueness of type / label / language triples on save.
		$newLabels = $content->getLabels()->getValueAsList();

		if ( $newLabels === [] ) {
			// Unlabelled; don't error.
			return true;
		}

		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$clashes = $zObjectStore->findZObjectLabelConflicts(
			$zid,
			$content->getZType(),
			$newLabels
		);

		if ( $clashes === [] ) {
			return true;
		}

		foreach ( $clashes as $language => $clash_zid ) {
			$hookStatus->fatal( 'wikilambda-labelclash', $clash_zid, $language );
		}

		return false;
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/getUserPermissionsErrors
	 *
	 * @param Title $title
	 * @param User $user
	 * @param string $action
	 * @param array|string|MessageSpecifier &$result
	 * @return bool|void
	 */
	public function onGetUserPermissionsErrors( $title, $user, $action, &$result ) {
		if ( !$title->inNamespace( NS_MAIN ) ) {
			return;
		}

		// TODO: Is there a nicer way of getting 'all change actions'?
		if ( !( $action == 'create' || $action == 'edit' || $action == 'upload' ) ) {
			return;
		}

		$zid = $title->getDBkey();
		if ( !ZObjectUtils::isValidZObjectReference( $zid ) ) {
			$result = ApiMessage::create(
				wfMessage( 'wikilambda-invalidzobjecttitle', $zid ),
				'wikilambda-invalidzobjecttitle'
			);
			return false;
		}

		// TODO: Per-user rights checks (in getUserPermissionsErrorsExpensive instead)?

		return true;
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

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/NamespaceIsMovable
	 *
	 * @param int $index
	 * @param bool &$result
	 * @return bool|void
	 */
	public function onNamespaceIsMovable( $index, &$result ) {
		if ( $index === NS_MAIN ) {
			$result = false;
			// Over-ride any other extensions which might have other ideas
			return false;
		}

		return null;
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/HtmlPageLinkRendererEnd
	 *
	 * @param LinkRenderer $linkRenderer
	 * @param LinkTarget $linkTarget
	 * @param bool $isKnown
	 * @param string|HtmlArmor &$text
	 * @param string[] &$attribs
	 * @param string &$ret
	 * @return bool|void
	 */
	public function onHtmlPageLinkRendererEnd(
		$linkRenderer, $linkTarget, $isKnown, &$text, &$attribs, &$ret
	) {
		$context = RequestContext::getMain();
		$out = $context->getOutput();

		// Do nothing if any of these apply:
		if (
			// … there's no title in the main context
			!$context->hasTitle()
			// … there's no title set for the output page
			|| !$out->getTitle()
			// … the request is via the API (except for test runs)
			|| ( defined( 'MW_API' ) && MW_API !== 'TEST' )
			// … the target isn't known
			|| !$isKnown
		) {
			return;
		}

		// Convert the slimline LinkTarget into a full-fat Title so we can ask deeper questions
		$targetTitle = Title::newFromLinkTarget( $linkTarget );

		// Do nothing if any of these apply:
		if (
			// … the target isn't one of ours
			!$targetTitle->inNamespace( NS_MAIN ) || !$targetTitle->hasContentModel( CONTENT_MODEL_ZOBJECT )
			// … the label is already over-ridden (e.g. for "prev" and "cur" and revision links on history pages)
			|| ( $text !== null && $targetTitle->getFullText() !== HtmlArmor::getHtml( $text ) )
			) {
			return;
		}

		$zObjectStore = WikiLambdaServices::getZObjectStore();

		// Rather than (rather expensively) fetching the whole object from the ZObjectStore, see if the labels are in
		// the labels table already, which is very much faster:
		$zLangRegistry = ZLangRegistry::singleton();
		$zid = $targetTitle->getBaseText();

		$label = $zObjectStore->fetchZObjectLabel(
			$zid,
			$context->getLanguage()->getCode(),
			true
		);

		// Just in case the database has no entry (e.g. the table is a millisecond behind or so), load the full object.
		if ( $label === null ) {
			$targetZObject = $zObjectStore->fetchZObjectByTitle( $targetTitle );
			// Do nothing if somehow after all that it's not loadable.
			if ( !$targetZObject || !( $targetZObject instanceof ZObjectContent ) || !$targetZObject->isValid() ) {
				return;
			}

			// At this point, we know they're linking to a ZObject page, so show a label, falling back
			// to English even if that's not in the language's fall-back chain.
			$label = $targetZObject->getLabels()
				->buildStringForLanguage( $context->getLanguage() )
				->fallbackWithEnglish()
				->placeholderForTitle()
				->getString();
		}

		// Finally, set the label of the link to the *un*escaped user-supplied label, see
		// https://www.mediawiki.org/wiki/Manual:Hooks/HtmlPageLinkRendererEnd
		//
		// &$text: the contents that the <a> tag should have; either a *plain, unescaped string* or a HtmlArmor object.
		//
		$text = $context->msg( 'wikilambda-zobject-title', [ $label, $zid ] )->text();
	}
}
