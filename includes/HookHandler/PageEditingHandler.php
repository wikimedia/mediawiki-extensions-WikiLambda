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
use MediaWiki\Config\Config;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentUtils;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Linker\LinkTarget;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Revision\RenderedRevision;
use MediaWiki\Revision\SlotRecord;
use MediaWiki\Status\Status;
use MediaWiki\Title\Title;
use Psr\Log\LoggerInterface;
use Wikimedia\Message\MessageSpecifier;
use Wikimedia\Rdbms\IConnectionProvider;
use Wikimedia\Rdbms\IReadableDatabase;

class PageEditingHandler implements
	\MediaWiki\Title\Hook\NamespaceIsMovableHook,
	\MediaWiki\Storage\Hook\MultiContentSaveHook,
	\MediaWiki\Permissions\Hook\GetUserPermissionsErrorsHook
{
	private Config $config;
	private ZObjectStore $zObjectStore;
	private IReadableDatabase $dbr;

	private LoggerInterface $logger;

	public function __construct(
		Config $config,
		IConnectionProvider $dbProvider,
		ZObjectStore $zObjectStore

	) {
		$this->config = $config;
		$this->zObjectStore = $zObjectStore;
		$this->dbr = $dbProvider->getReplicaDatabase();

		$this->logger = LoggerFactory::getInstance( 'WikiLambda' );
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/NamespaceIsMovable
	 * @inheritDoc
	 */
	public function onNamespaceIsMovable( $index, &$result ) {
		// For Repo Mode:
		if ( $this->config->get( 'WikiLambdaEnableRepoMode' ) ) {
			// If Repo Mode is enabled, NS_MAIN will always be ZObject content
			if ( $index === NS_MAIN ) {
				$result = false;
				// Over-ride any other extensions which might have other ideas
				return false;
			}
		}

		// For Abstract Mode:
		if ( $this->config->get( 'WikiLambdaEnableAbstractMode' ) ) {
			foreach ( $this->config->get( 'WikiLambdaAbstractNamespaces' ) as $configuredIndex ) {
				if ( $index === $configuredIndex ) {
					// NOTE: If we want to later support moving abstract content pages (e.g. draft-to-main), we'll
					// need to adjust this.
					$result = false;
					// Over-ride any other extensions which might have other ideas
					return false;
				}
			}
		}
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/MultiContentSave
	 * @inheritDoc
	 */
	public function onMultiContentSave( $renderedRevision, $user, $summary, $flags, $hookStatus ) {
		// Abstract Mode is enabled
		if ( $this->config->get( 'WikiLambdaEnableAbstractMode' ) ) {
			$linkTarget = $renderedRevision->getRevision()->getPageAsLinkTarget();

			$configuredNamespaces = array_keys( $this->config->get( 'WikiLambdaAbstractNamespaces' ) );

			// If namespace is one of the Abstract Namespaces, check for title and content type
			if ( in_array( $linkTarget->getNamespace(), $configuredNamespaces, true ) ) {
				return $this->abstractContentSave( $linkTarget, $renderedRevision, $hookStatus );
			}
			// Abstract Mode but not an Abstract namespace: not our content
		}

		// Repo Mode is enabled
		if ( $this->config->get( 'WikiLambdaEnableRepoMode' ) ) {
			$linkTarget = $renderedRevision->getRevision()->getPageAsLinkTarget();

			// If namespace is Main (ZObjects) check title, content type and validity:
			if ( $linkTarget->inNamespace( NS_MAIN ) ) {
				return $this->repoContentSave( $linkTarget, $renderedRevision, $hookStatus );
			}
			// Repo Mode but not Main namespace: not our content
		}

		// Nothing for us to do
	}

	/**
	 * Given a page being saved on Repo Enabled mode and in the Main namespace,
	 * this method makes sure that:
	 * * the title is well formed (is a ZObject Id),
	 * * the content is of the right kind (ZObjectContent),
	 * * the content passes validation checks, and
	 * * the labels don't clash with existing ones
	 *
	 * @param LinkTarget $linkTarget
	 * @param RenderedRevision $renderedRevision
	 * @param Status $hookStatus
	 * @return bool
	 */
	private function repoContentSave( $linkTarget, $renderedRevision, $hookStatus ): bool {
		$zid = $linkTarget->getDBkey();
		if ( !ZObjectUtils::isValidZObjectReference( $zid ) ) {
			// Title not valid; exit with error
			$hookStatus->fatal( 'wikilambda-invalidzobjecttitle', $zid );
			return false;
		}

		$content = $renderedRevision->getRevision()->getSlots()->getContent( SlotRecord::MAIN );

		if ( !( $content instanceof ZObjectContent ) ) {
			// Not the right type of content; exit with error
			$hookStatus->fatal( 'wikilambda-invalidcontenttype' );
			return false;
		}

		if ( !$content->isValid() ) {
			// Repo content not valid; exit with error
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
			// No clashes; success
			return true;
		}

		// Label clashes found; exit with error
		foreach ( $clashes as $language => $clash_zid ) {
			$hookStatus->fatal( 'wikilambda-labelclash', $clash_zid, $language );
		}
		return false;
	}

	/**
	 * Given a page being saved on Abstract Enabled mode, and in an Abstract namespace,
	 * this method makes sure that:
	 * * the title is well formed (is a Wikidata Item Qid), and
	 * * the content is of the right kind (AbstractWikiContent).
	 *
	 * @param LinkTarget $linkTarget
	 * @param RenderedRevision $renderedRevision
	 * @param Status $hookStatus
	 * @return bool
	 */
	private function abstractContentSave( $linkTarget, $renderedRevision, $hookStatus ): bool {
		$qid = $linkTarget->getDBkey();
		if ( !AbstractContentUtils::isValidWikidataItemReference( $qid ) ) {
			// Title not valid; exit with error
			$hookStatus->fatal( 'wikilambda-invalidabstracttitle', $qid );
			return false;
		}

		$content = $renderedRevision->getRevision()->getSlots()->getContent( SlotRecord::MAIN );

		if ( !( $content instanceof AbstractWikiContent ) ) {
			// Not the right type of content; exit with error
			$hookStatus->fatal( 'wikilambda-invalidcontenttype' );
			return false;
		}

		// All checks passed for Abstract Content; success
		return true;
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/getUserPermissionsErrors
	 * @inheritDoc
	 */
	public function onGetUserPermissionsErrors( $title, $user, $action, &$result ) {
		// TODO (T362234): Is there a nicer way of getting 'all change actions'?
		$knownBlockedActions = [ 'create', 'edit', 'upload' ];
		if ( !in_array( $action, $knownBlockedActions, true ) ) {
			// Not an action we care about; nothing for us to do.
			return;
		}

		// Repo Mode is enabled
		if ( $this->config->get( 'WikiLambdaEnableRepoMode' ) ) {
			if ( $title->inNamespace( NS_MAIN ) ) {
				// Main namespace; check for errors in Repo content and exit
				return $this->getRepoUserPermissionsErrors( $title, $result );
			}
		}

		// Abstract Mode is enabled
		if ( $this->config->get( 'WikiLambdaEnableAbstractMode' ) ) {
			$configuredNamespaces = array_keys( $this->config->get( 'WikiLambdaAbstractNamespaces' ) );
			if ( in_array( $title->getNamespace(), $configuredNamespaces, true ) ) {
				// Abstract Wiki namespace; check for errors in Abstract content and exit
				return $this->getAbstractUserPermissionsErrors( $title, $result );
			}
		}

		// Nothing for us to do
	}

	/**
	 * For change actions over Repo content (Repo mode enabled, and Main namespace),
	 * check title validity.
	 *
	 * NOTE: We don't do per-user rights checks here; that's left to ZObjectAuthorization
	 *
	 * @param Title $title Title being checked against
	 * @param array|string|MessageSpecifier &$result User permissions error to add.
	 * @return bool|void True or no return value to continue or false to abort
	 */
	private function getRepoUserPermissionsErrors( $title, &$result ) {
		$zid = $title->getDBkey();

		if ( !ZObjectUtils::isValidZObjectReference( $zid ) ) {
			// ZObject content, but title is not a valid Zid; return error
			$result = ApiMessage::create(
				wfMessage( 'wikilambda-invalidzobjecttitle', $zid ),
				'wikilambda-invalidzobjecttitle'
			);
			return false;
		}

		return true;
	}

	/**
	 * For change actions over Abstract content (Abstract mode enabled, and Abstract namespace),
	 * check title validity.
	 *
	 * @param Title $title Title being checked against
	 * @param array|string|MessageSpecifier &$result User permissions error to add.
	 * @return bool|void True or no return value to continue or false to abort
	 */
	private function getAbstractUserPermissionsErrors( $title, &$result ) {
		$qid = $title->getDBkey();

		if ( !AbstractContentUtils::isValidWikidataItemReference( $qid ) ) {
			// Abstract Wiki content, but title is not a Wikidata Item Id; return error
			$result = ApiMessage::create(
				wfMessage( 'wikilambda-invalidabstracttitle', $qid ),
				'wikilambda-invalidabstracttitle'
			);
			return false;
		}

		return true;
	}

	/**
	 * Utility function to round-trip data through JSON encoding/decoding
	 *
	 * @param mixed $data
	 * @return array
	 */
	private function roundTripJson( $data ): array {
		return json_decode( json_encode( $data ), true );
	}

}
