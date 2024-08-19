<?php

/**
 * WikiLambda handler for hooks which alter page editing
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\HookHandler;

use ApiMessage;
use MediaWiki\CommentStore\CommentStoreComment;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Hook\NamespaceIsMovableHook;
use MediaWiki\MediaWikiServices;
use MediaWiki\Permissions\Hook\GetUserPermissionsErrorsHook;
use MediaWiki\Revision\RenderedRevision;
use MediaWiki\Revision\SlotRecord;
use MediaWiki\Status\Status;
use MediaWiki\Storage\Hook\MultiContentSaveHook;
use MediaWiki\Title\Title;
use MediaWiki\User\User;
use MediaWiki\User\UserIdentity;
use MessageSpecifier;

class PageEditingHandler implements NamespaceIsMovableHook, MultiContentSaveHook, GetUserPermissionsErrorsHook {

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/NamespaceIsMovable
	 *
	 * @param int $index
	 * @param bool &$result
	 * @return bool|void
	 */
	public function onNamespaceIsMovable( $index, &$result ) {
		$config = MediaWikiServices::getInstance()->getMainConfig();
		if ( !$config->get( 'WikiLambdaEnableRepoMode' ) ) {
			// Nothing for us to do.
			return;
		}

		if ( $index === NS_MAIN ) {
			$result = false;
			// Over-ride any other extensions which might have other ideas
			return false;
		}

		return null;
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/MultiContentSave
	 *
	 * @param RenderedRevision $renderedRevision
	 * @param UserIdentity $user
	 * @param CommentStoreComment $summary
	 * @param int $flags
	 * @param Status $hookStatus
	 * @return bool|void
	 */
	public function onMultiContentSave( $renderedRevision, $user, $summary, $flags, $hookStatus ) {
		$config = MediaWikiServices::getInstance()->getMainConfig();
		if ( !$config->get( 'WikiLambdaEnableRepoMode' ) ) {
			// Nothing for us to do.
			return;
		}

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
		$config = MediaWikiServices::getInstance()->getMainConfig();
		if ( !$config->get( 'WikiLambdaEnableRepoMode' ) ) {
			// Nothing for us to do.
			return;
		}

		if ( !$title->inNamespace( NS_MAIN ) ) {
			return;
		}

		// TODO (T362234): Is there a nicer way of getting 'all change actions'?
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

		// NOTE: We don't do per-user rights checks here; that's left to ZObjectAuthorization

		return true;
	}
}
