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

use MediaWiki\Api\ApiMessage;
use MediaWiki\CommentStore\CommentStoreComment;
use MediaWiki\Config\Config;
use MediaWiki\Extension\WikiLambda\Jobs\WikifunctionsClientFanOutQueueJob;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\MediaWikiServices;
use MediaWiki\Revision\RenderedRevision;
use MediaWiki\Revision\SlotRecord;
use MediaWiki\Status\Status;
use MediaWiki\Title\Title;
use MediaWiki\User\User;
use MediaWiki\User\UserIdentity;
use RecentChange;
use Wikimedia\Message\MessageSpecifier;

class PageEditingHandler implements
	\MediaWiki\Hook\NamespaceIsMovableHook,
	\MediaWiki\Storage\Hook\MultiContentSaveHook,
	\MediaWiki\Permissions\Hook\GetUserPermissionsErrorsHook
{
	private Config $config;
	private ZObjectStore $zObjectStore;

	public function __construct(
		Config $config,
		ZObjectStore $zObjectStore
	) {
		$this->config = $config;
		$this->zObjectStore = $zObjectStore;
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/NamespaceIsMovable
	 *
	 * @param int $index
	 * @param bool &$result
	 * @return bool|void
	 */
	public function onNamespaceIsMovable( $index, &$result ) {
		if ( !$this->config->get( 'WikiLambdaEnableRepoMode' ) ) {
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
		if ( !$this->config->get( 'WikiLambdaEnableRepoMode' ) ) {
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

		$clashes = $this->zObjectStore->findZObjectLabelConflicts(
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
		if ( !$this->config->get( 'WikiLambdaEnableRepoMode' ) ) {
			// Nothing for us to do.
			return;
		}

		if ( !$title->inNamespace( NS_MAIN ) ) {
			return;
		}

		// TODO (T362234): Is there a nicer way of getting 'all change actions'?
		if ( !( $action === 'create' || $action === 'edit' || $action === 'upload' ) ) {
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

	// phpcs:disable MediaWiki.NamingConventions.LowerCamelFunctionsName.FunctionName

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/RecentChange_save
	 *
	 * @param RecentChange $recentChange
	 * @return bool|void
	 */
	public function onRecentChange_save( $recentChange ) {
		// We use this on the repo-mode wiki to create a job that *might* trigger updates to client wikis

		$targetPage = $recentChange->getPage();
		if (
			// We're not in repo-mode
			!$this->config->get( 'WikiLambdaEnableRepoMode' ) ||
			// We're on a page that's not in the main namespace
			$targetPage->getNamespace() !== NS_MAIN
		) {
			// Nothing for us to do.
			return;
		}

		$logType = $recentChange->getAttribute( 'rc_log_type' );
		if ( $logType !== null ) {
			// If this is a logged action, we only care the edge case of deletions
			if ( $logType === 'delete' ) {
				// … and specifically, full page deletions and restorations, not revision deletions
				$logAction = $recentChange->getAttribute( 'rc_log_action' );
				if ( $logAction !== 'restore' && $logAction !== 'delete' ) {
					return;
				}
			}
		}

		$targetTitle = Title::castFromPageReference( $targetPage );
		if ( $targetTitle === null ) {
			// This isn't a valid title, so we don't care.
			return;
		}

		$targetZObject = $this->zObjectStore->fetchZObjectByTitle( $targetTitle );
		if ( !$targetZObject ) {
			// This isn't a ZObject, so we don't care.
			return;
		}

		// (T383156): Only act if this is (a) a change to a Function or a linked Imp/Test & (b) the kind we care about.
		$changeData = [ 'type' => $targetZObject->getZType() ];
		switch ( $targetZObject->getZType() ) {
			case ZTypeRegistry::Z_FUNCTION:
				$changeData['target'] = $targetZObject->getZid();
				$changeData['function'] = $targetZObject->getZid();
				// TODO (T383156):
				// * Filter out irrelevant changes (e.g. label changed)
				// * Add details of what actually changed (e.g. implementation approved)
				// * Add labels for this Function for the UX to render (? all languages)
				break;

			case ZTypeRegistry::Z_IMPLEMENTATION:
				$changeData['target'] = $targetZObject->getZid();
				$changeData['function'] = $targetZObject->getInnerZObject()->getValueByKey(
					ZTypeRegistry::Z_IMPLEMENTATION_FUNCTION
				);
				// TODO (T383156):
				// * Filter out irrelevant Implementations (only care about approved ones)
				// * Filter out irrelevant changes (e.g. label changed)
				break;

			case ZTypeRegistry::Z_TESTER:
				$changeData['target'] = $targetZObject->getInnerZObject();
				$changeData['function'] = $targetZObject->getInnerZObject()->getValueByKey(
					ZTypeRegistry::Z_TESTER_FUNCTION
				);
				// TODO (T383156):
				// * Filter out irrelevant Testers (we only care about approved ones)
				// * Filter out irrelevant changes (e.g. label changed)
				break;

			default:
				// We only care about certain ZObjects
				return;
		}

		$generalUpdateJob = new WikifunctionsClientFanOutQueueJob( [
			'target' => $targetPage->getDBkey(),
			'timestamp' => $recentChange->getAttribute( 'rc_timestamp' ),
			'summary' => $recentChange->getAttribute( 'rc_comment_text' ),
			'data' => $changeData,
			'revision' => $recentChange->getAttribute( 'rc_this_oldid' ),
			'user' => $recentChange->getPerformerIdentity()->getId(),
			'bot' => $recentChange->getAttribute( 'rc_bot' ),
		] );

		$jobQueueGroup = MediaWikiServices::getInstance()->getJobQueueGroup();
		$jobQueueGroup->lazyPush( $generalUpdateJob );
	}

	// phpcs:enable MediaWiki.NamingConventions.LowerCamelFunctionsName.FunctionName

}
