<?php
/**
 * WikiLambda extension hooks
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use ApiMessage;
use CommentStoreComment;
use DatabaseUpdater;
use MediaWiki\Revision\SlotRecord;
use MessageSpecifier;
use MWNamespace;
use Status;
use Title;
use User;
use WikiPage;

class Hooks implements
	\MediaWiki\Hook\BeforePageDisplayHook,
	\MediaWiki\Hook\NamespaceIsMovableHook,
	\MediaWiki\Storage\Hook\MultiContentSaveHook,
	\MediaWiki\Permissions\Hook\GetUserPermissionsErrorsHook,
	\MediaWiki\Installer\Hook\LoadExtensionSchemaUpdatesHook
	{

	public static function registerExtension() {
		require_once __DIR__ . '/defines.php';

		// (T267232) Prevent ZObject: pages from being transcluded; sadly this isn't available as
		// an extension.json attribute as of yet.
		global $wgNonincludableNamespaces;
		$wgNonincludableNamespaces[] = NS_ZOBJECT;
	}

	/**
	 * Declare ZObjects as JSON-dervied, so that (for now) they can be
	 * edited directing using the CodeEditor extension.
	 *
	 * @param Title $title
	 * @param string &$lang
	 * @return bool
	 */
	public static function onCodeEditorGetPageLanguage( Title $title, &$lang ) {
		if (
			$title->hasContentModel( CONTENT_MODEL_ZOBJECT )
			|| $title->inNamespace( NS_ZOBJECT )
		) {
			$lang = 'json';
			return false;
		}
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/BeforePageDisplay
	 *
	 * @param \OutputPage $out
	 * @param \Skin $skin
	 */
	public function onBeforePageDisplay( $out, $skin ) : void {
		$config = $out->getConfig();
		if ( $config->get( 'WikiLambdaEnable' ) ) {
			// Do something.
		}
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
		if ( !$title->inNamespace( NS_ZOBJECT ) ) {
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
		$zPersistentObject = $content->getZObject();
		$newLabels = $zPersistentObject->getLabels()->getZValue();

		if ( $newLabels === [] ) {
			// Unlabelled; don't error.
			return true;
		}

		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$clashes = $zObjectStore->findZObjectLabelConflicts(
			$zid,
			$zPersistentObject->getZType(),
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
		if ( !$title->inNamespace( NS_ZOBJECT ) ) {
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

		if ( !in_array( $type, [ 'mysql', 'sqlite', 'postgres' ] ) ) {
			wfWarn( "Database type '$type' is not supported by the WikiLambda extension." );
			return;
		}

		$tables = [
			'zobject_labels',
			'zobject_label_conflicts',
		];

		foreach ( $tables as $key => $table ) {
			$updater->addExtensionTable( 'wikilambda_' . $table, __DIR__ . "/sql/table-$table-generated-$type.sql" );
		}

		$updater->addExtensionUpdate( [ [ __CLASS__, 'createInitialContent' ] ] );
	}

	/**
	 * Installer/Updater callback to create the initial "system" ZObjects on any installation. This
	 * is a callback so that it runs after the tables have been created/updated.
	 *
	 * @param DatabaseUpdater $updater
	 */
	public static function createInitialContent( DatabaseUpdater $updater ) {
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

		$initialDataToLoadPath = dirname( __DIR__ ) . '/data/';

		$initialDataToLoadListing = array_filter(
			scandir( $initialDataToLoadPath ),
			static function ( $key ) {
				return (bool)preg_match( '/^Z\d+\.json$/', $key );
			}
		);

		// Naturally sort, so Z2 gets created before Z10 etc.
		natsort( $initialDataToLoadListing );

		foreach ( $initialDataToLoadListing as $filename ) {
			$updateRowName = "create WikiLambda initial content - $filename";

			if ( !$updater->updateRowExists( $updateRowName ) ) {
				$title = Title::newFromText( substr( $filename, 0, -5 ), NS_ZOBJECT );
				$page = WikiPage::factory( $title );

				$data = file_get_contents( $initialDataToLoadPath . $filename );
				if ( !$data ) {
					// Something went wrong, give up.
					return;
				}

				try {
					$content = ZObjectContentHandler::makeContent( $data, $title );
				} catch ( \InvalidArgumentException $e ) {
					// Do nothing
					continue;
				}

				$status = $page->doEditContent(
					/* Content */ $content,
					/* Edit summary */ $creatingComment,
					/* Flags */ 0,
					/* Original revision ID */ false,
					/* User */ $creatingUser
				);

				if ( $status->isOK() ) {
					$updater->insertUpdateRow( $updateRowName );
				}
			}
		}
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/NamespaceIsMovable
	 *
	 * @param int $index
	 * @param bool &$result
	 * @return bool|void
	 */
	public function onNamespaceIsMovable( $index, &$result ) {
		if ( MWNamespace::equals( $index, NS_ZOBJECT ) ) {
			$result = false;
			// Over-ride any other extensions which might have other ideas
			return false;
		}

		return null;
	}
}
