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
use MediaWiki\Extension\WikiLambda\Diff\ZObjectDiffer;
use MediaWiki\Extension\WikiLambda\Jobs\WikifunctionsClientFanOutQueueJob;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\RecentChanges\RecentChange;
use MediaWiki\Revision\RenderedRevision;
use MediaWiki\Revision\SlotRecord;
use MediaWiki\Status\Status;
use MediaWiki\Title\Title;
use MediaWiki\User\User;
use MediaWiki\User\UserIdentity;
use Psr\Log\LoggerInterface;
use Wikimedia\Message\MessageSpecifier;
use Wikimedia\Rdbms\IConnectionProvider;
use Wikimedia\Rdbms\IReadableDatabase;

class PageEditingHandler implements
	\MediaWiki\Hook\NamespaceIsMovableHook,
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

		// Start collecting the structured data about the edit that we'll send to client wikis
		$changeData = [];

		$changeComment = $recentChange->getAttribute( 'rc_comment_text' );

		// If this is a logged action, we only care the edge case of deletions; other kinds, like moves, are irrelevant
		$logType = $recentChange->getAttribute( 'rc_log_type' );
		if ( $logType !== null ) {
			if ( $logType === 'delete' ) {
				// … and specifically, full page deletions and restorations; revision deletions don't matter, as they
				// won't ever affect the current revision (so a previous RC entry for the creation of the newer rev will
				// have been sent to the client wikis).
				$logAction = $recentChange->getAttribute( 'rc_log_action' );
				if ( $logAction !== 'restore' && $logAction !== 'delete' ) {
					return;
				}
				$changeData['action'] = $logAction;

				// We need to look up the comment made for the log entry in this case.
				$changeId = $recentChange->getAttribute( 'rc_logid' );

				// Ideally we'd get this from the LogFormatterFactory's method, but it appears broken for RC entries:
				// $changeComment = $this->logFormatterFactory->newFromRow( $recentChange )->getComment();

				// This walks rc_logid => log_id; log_comment_id => comment_id; then returns comment_text
				$changeComment = $this->dbr->newSelectQueryBuilder()
					->select( [ 'comment_text' ] )
					->from( 'recentchanges' )
					->where( [ 'log_id' => $changeId ] )
					->join( 'logging', null, [ 'rc_logid = log_id' ] )
					->join( 'comment', null, [ 'log_comment_id = comment_id' ] )
					->caller( __METHOD__ )
					->fetchField();
			}
		}

		$targetTitle = Title::castFromPageReference( $targetPage );
		if ( $targetTitle === null ) {
			// This isn't a valid title, so we don't care.
			return;
		}

		$newId = $recentChange->getAttribute( 'rc_this_oldid' );
		$changeData['newId'] = $newId;
		$newTargetZObject = $this->zObjectStore->fetchZObjectByTitle( $targetTitle, $newId );
		if ( !$newTargetZObject ) {
			// This isn't a ZObject, so we don't care.
			return;
		}

		$changedObject = $newTargetZObject->getZid();
		$changeData['target'] = $changedObject;
		$changeData['type'] = $newTargetZObject->getZType();

		// (T383156): Only act if this is (a) a change to a Function or a linked Imp/Test & (b) the kind we care about.
		switch ( $changeData['type'] ) {
			case ZTypeRegistry::Z_FUNCTION:
				// For consistency, we'll include this even when it's the Function itself that changed
				$changeData['function'] = $changedObject;
				$this->logger->debug(
					__METHOD__ . ': Handling edit to a Function {obj} revision {rev}',
					[
						'obj' => $changedObject,
						'rev' => $newId
					]
				);
				break;

			case ZTypeRegistry::Z_IMPLEMENTATION:
				$targetFunctionZid = $newTargetZObject->getInnerZObject()->getValueByKey(
					ZTypeRegistry::Z_IMPLEMENTATION_FUNCTION
				)->getZValue();

				$targetContent = $this->zObjectStore->fetchZObjectByTitle( Title::newFromDBkey( $targetFunctionZid ) );
				if ( !( $targetContent instanceof ZObjectContent ) ) {
					// Something has gone wrong; let's exit.
					return;
				}
				$targetFunction = $targetContent->getInnerZObject();
				'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZFunction $targetFunction';
				$approvedImplementations = $targetFunction->getImplementationZids();
				if ( !in_array( $changedObject, $approvedImplementations ) ) {
					// This isn't an approved Implementation, so we don't care.
					return;
				}

				$this->logger->debug(
					__METHOD__ . ': Handling edit to a connected Implementation {obj} revision {rev} of Function {fun}',
					[
						'obj' => $changedObject,
						'rev' => $newId,
						'fun' => $targetFunctionZid
					]
				);

				$changeData['function'] = $targetFunctionZid;
				break;

			case ZTypeRegistry::Z_TESTER:
				$targetFunctionZid = $newTargetZObject->getInnerZObject()->getValueByKey(
					ZTypeRegistry::Z_TESTER_FUNCTION
				)->getZValue();

				$targetContent = $this->zObjectStore->fetchZObjectByTitle( Title::newFromDBkey( $targetFunctionZid ) );
				if ( !( $targetContent instanceof ZObjectContent ) ) {
					// Something has gone wrong; let's exit.
					return;
				}
				$targetFunction = $targetContent->getInnerZObject();
				'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZFunction $targetFunction';
				$approvedTesters = $targetFunction->getTesterZids();
				if ( !in_array( $changedObject, $approvedTesters ) ) {
					// This isn't an approved Tester, so we don't care.
					return;
				}

				$this->logger->debug(
					__METHOD__ . ': Handling edit to a connected Tester {obj} revision {rev} of Function {fun}',
					[
						'obj' => $changedObject,
						'rev' => $newId,
						'fun' => $targetFunctionZid
					]
				);

				$changeData['function'] = $targetFunctionZid;
				break;

			default:
				// We only care about certain ZObjects
				$this->logger->debug(
					__METHOD__ . ': Ignoring edit to an irrelevant Object {obj} revision {rev}',
					[
						'obj' => $changedObject,
						'rev' => $newId
					]
				);
				return;
		}

		// Now, we construct the changes that were made in the edit we're being told about.
		// If we've already decided above that this is a deletion/undeletion, do nothing else.
		if ( $logType === null ) {
			// If this has been created, short-circuit
			if ( $recentChange->getAttribute( 'rc_new' ) ) {
				$changeData['action'] = 'create';

				$this->logger->debug(
					__METHOD__ . ': Handled creation of {obj} revision {rev}',
					[
						'obj' => $changedObject,
						'rev' => $newId
					]
				);
			} else {
				$changeData['action'] = 'edit';
				$changeData['operations'] = [];

				$oldId = $recentChange->getAttribute( 'rc_last_oldid' );
				if ( !$oldId ) {
					// This is a new page, so there's nothing to diff against
					$fromContentObject = '';
				} else {
					$fromContentObject = $this->roundTripJson(
						$this->zObjectStore->fetchZObjectByTitle( $targetTitle, $oldId )->getObject()
					);
				}

				$toContentObject = $this->roundTripJson( $newTargetZObject->getObject() );

				// TODO (T389090): Consider refactoring the below to use the same code as in ZObjectAuthorization?
				$differ = new ZObjectDiffer();
				$diffOps = $differ->doDiff( $fromContentObject, $toContentObject );
				$flattedDiffOps = ZObjectDiffer::flattenDiff( $diffOps );

				// Filter out irrelevant changes (e.g. label changed)
				foreach ( $flattedDiffOps as $index => $diffOp ) {

					$firstPathElement = ( $diffOp['path'] === [] )
						// If the edit is a creation, the 'path' will not be useful
						? ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE
						: $diffOp['path'][0];

					$lastPathElement = ( is_numeric( end( $diffOp['path'] ) ) )
						// Bump up a layer if this is an array value change
						? $diffOp['path'][count( $diffOp['path'] ) - 2]
						: end( $diffOp['path'] );

					// Discard irrelevant label/alias/etc. changes
					if (
						// Any changes not to the Z2K2 (e.g. label/alias/short description changes)
						( $firstPathElement !== ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ) ||
						// Any changes to a Z12K1 (i.e. addition/removal of a label or short description)
						( $lastPathElement === ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE ) ||
						// Any changes to a Z11K2 (i.e. change of a label or short description)
						( $lastPathElement === ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE ) ||
						// Any changes to a Z32K1 (i.e. addition/removal of an alias)
						( $lastPathElement === ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE ) ||
						// Any changes to a Z31K2 (i.e. change of an alias)
						( $lastPathElement === ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE )
					) {
						// Given the above, we don't care about this change, so skip to the next (if any)
						$this->logger->debug(
							__METHOD__ . ': Ignoring label-only edit to Object {obj} revision {rev}',
							[
								'obj' => $changedObject,
								'rev' => $newId
							]
						);

						unset( $flattedDiffOps[$index] );
						continue;
					}

					// (T383156): At this point we think this is a relevant change, so build structured data about what
					// changed (e.g. implementation approved, tester value edited) so it can be sent to client wikis.

					// Edits to a Function, mostly additions/removals of Implementations or Testers
					if ( $newTargetZObject->getZType() === ZTypeRegistry::Z_FUNCTION ) {

						$changeType = $diffOp['op']->getType();

						// Note: We don't handle 'copy' operations, as they're invalid in our model
						if ( !in_array( $changeType, [ 'add', 'remove', 'change' ] ) ) {
							$this->logger->error(
								__METHOD__ . ': Unhandled {type} diff operation on {obj} revision {rev}: {diffOp}',
								[
									'type' => $changeType,
									'obj' => $changedObject,
									'rev' => $newId,
									'diffOp' => var_export( $diffOp, true )
								]
							);
							continue;
						}

						if ( $changeType === 'add' ) {
							$changeData['operations'][implode( '.', $diffOp['path'] )][$changeType][] =
								$diffOp['op']->getNewValue();
						}

						if ( $changeType === 'remove' ) {
							$changeData['operations'][implode( '.', $diffOp['path'] )][$changeType][] =
								$diffOp['op']->getOldValue();
						}

						if ( $changeType === 'change' ) {
							$changeData['operations'][implode( '.', $diffOp['path'] )][$changeType][] = [
								$diffOp['op']->getOldValue(),
								$diffOp['op']->getNewValue()
							];
						}

						$this->logger->debug(
							__METHOD__ . ': Handled Imp/Test approval {type} diff on Function {obj} revision {rev}',
							[
								'type' => $diffOp['op']->getType(),
								'obj' => $changedObject,
								'rev' => $newId
							]
						);

						// We've handled this change, so move on to the next
						continue;
					}

					if (
						// If we're covering a change to a connected Implementation/Tester, we just care that it changed
						$newTargetZObject->getZType() === ZTypeRegistry::Z_IMPLEMENTATION ||
						$newTargetZObject->getZType() === ZTypeRegistry::Z_TESTER
					) {
						$changeData['operations'][$newTargetZObject->getZType()] = implode( '.', $diffOp['path'] );

						$this->logger->debug(
							__METHOD__ . ': Handled edit of approved Imp/Test on {type} {obj} revision {rev}',
							[
								'type' => $newTargetZObject->getZType(),
								'obj' => $changedObject,
								'rev' => $newId
							]
						);

						// We've handled this change, so move on to the next
						continue;
					}

					$this->logger->error(
						__METHOD__ . ': Unhandled diff operation on {changedObject} revision {revision}: {diffOp}',
						[
							'changedObject' => $changedObject,
							'revision' => $newId,
							'diffOp' => var_export( $diffOp, true )
						]
					);
					return;
				}

				if ( count( $flattedDiffOps ) === 0 ) {
					// No relevant changes left after filtering
					$this->logger->debug(
						__METHOD__ . ': No interesting diff operations on {changedObject} revision {revision}',
						[
							'changedObject' => $changedObject,
							'revision' => $newId
						]
					);
					return;
				}

				// TODO (T383156): Add labels for this Function for the UX to render (? all languages)
			}
		}
		$changeData['oldId'] = $oldId ?? 0;

		$generalUpdateJob = new WikifunctionsClientFanOutQueueJob( [
			'target' => $targetPage->getDBkey(),
			'timestamp' => $recentChange->getAttribute( 'rc_timestamp' ),
			'summary' => $changeComment,
			'data' => $changeData,
			'user' => $recentChange->getPerformerIdentity()->getId(),
			'bot' => $recentChange->getAttribute( 'rc_bot' ),
		] );

		$jobQueueGroup = MediaWikiServices::getInstance()->getJobQueueGroup();
		$jobQueueGroup->lazyPush( $generalUpdateJob );

		// The return value isn't used, but we return something so we can show in tests that we reached this point
		return true;
	}

	// phpcs:enable MediaWiki.NamingConventions.LowerCamelFunctionsName.FunctionName

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
