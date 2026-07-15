<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Jobs;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\JobQueue\GenericParameterJob;
use MediaWiki\JobQueue\Job;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\RecentChanges\RecentChange;
use MediaWiki\Title\Title;
use MediaWiki\User\CentralId\CentralIdLookup;
use MediaWiki\User\ExternalUserNames;
use Psr\Log\LoggerInterface;

/**
 * Foo
 */
class WikifunctionsRecentChangesInsertJob extends Job implements GenericParameterJob {

	/**
	 * @var string
	 */
	public const SRC_WIKIFUNCTIONS = 'wf';

	private LoggerInterface $logger;
	private ?CentralIdLookup $centralIdLookup;

	/**
	 * @var array Array of job parameters
	 * @phan-var array<string,mixed>
	 */
	public $params;

	public function __construct( array $params ) {
		// This job, triggered from RecentChanges activity, takes the edit and fans it out to each
		// relevant client wiki to process locally.

		// Note: This will set $this->params.
		parent::__construct( 'wikifunctionsRecentChangesInsert', $params );

		// Non-injected items
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaClient' );

		// We use the shared (CentralAuth) lookup to map the repo wiki's user to this wiki. If null, this
		// wiki isn't connected to a central system and we can't attribute cross-wiki changes (see run()).
		$this->centralIdLookup = MediaWikiServices::getInstance()->getCentralIdLookupFactory()->getNonLocalLookup();
	}

	public function run(): bool {
		// What pages would the job be updating?
		$wikifunctionsClientStore = WikiLambdaServices::getWikifunctionsClientStore();
		$pagesUsingFunction = $wikifunctionsClientStore->fetchWikifunctionsUsage( $this->params['target'] );

		$this->logger->debug(
			__CLASS__ . ': Processing a change for {targetZObject}',
			[
				'targetZObject' => $this->params['target']
			]
		);

		// Work out whether the job is still needed
		if ( count( $pagesUsingFunction ) === 0 ) {
			// We were triggered by the repo, but we aren't using that Function.
			// Note: Until T385630 is done, this is acting-as-expected, and shouldn't be a source of concern.
			$this->logger->debug(
				__CLASS__ . ' triggered for {item} but it is unused; T385630 would avoid this',
				[
					'item' => $this->params['target'],
				]
			);
			return true;
		}

		$services = MediaWikiServices::getInstance();
		$dbw = $services->getConnectionProvider()->getPrimaryDatabase();
		$commentStore = $services->getCommentStore();

		// Build the RecentChange attributes common to all entries regardless of page on which it's used
		$generalAttributes = [
			'rc_source' => self::SRC_WIKIFUNCTIONS,

			// Our standard flags, invariant between changes: never minor or deletes or creates
			'rc_minor' => false,
			'rc_deleted' => false,

			// There's no patrollable state for this change entry, as it doesn't take place on this wiki
			'rc_patrolled' => RecentChange::PRC_AUTOPATROLLED,

			// Log-related things, all set empty (this is not a log entry)
			'rc_logid' => 0,
			'rc_log_type' => null,
			'rc_log_action' => '',
			'rc_params' => '',

			// Update-specific stuff
			'rc_bot' => $this->params['bot'],
			'rc_timestamp' => wfTimestamp( TS_MW, $this->params['timestamp'] ),
		];

		$changeData = $this->params['data'];
		$changeAction = $changeData['action'];

		if ( !$changeAction || !in_array( $changeAction, [ 'delete', 'restore', 'edit' ] ) ) {
			$this->logger->warning(
				__CLASS__ . ' triggered for {item} with unrecognised action {action}; data error?',
				[
					'item' => $this->params['target'],
					'action' => var_export( $this->params, true ),
					// 'action' => $changeAction,
				]
			);
			return true;
		}

		if ( $changeAction !== 'edit' ) {
			switch ( $changeData['type'] ) {
				case ZTypeRegistry::Z_FUNCTION:
					// Used messages:
					// - wikilambda-recentchanges-explanation-delete-function
					// - wikilambda-recentchanges-explanation-restore-function
					$changeData['message'] = "wikilambda-recentchanges-explanation-$changeAction-function";
					break;

				case ZTypeRegistry::Z_IMPLEMENTATION:
					// Used messages:
					// - wikilambda-recentchanges-explanation-delete-implementation
					// - wikilambda-recentchanges-explanation-restore-implementation
					$changeData['message'] = "wikilambda-recentchanges-explanation-$changeAction-implementation";
					$changeData['messageParams'] = [ $changeData['target'] ];
					break;

				case ZTypeRegistry::Z_TESTER:
					// Used messages:
					// - wikilambda-recentchanges-explanation-delete-tester
					// - wikilambda-recentchanges-explanation-restore-tester
					$changeData['message'] = "wikilambda-recentchanges-explanation-$changeAction-tester";
					$changeData['messageParams'] = [ $changeData['target'] ];
					break;

				default:
					// Unrecognised type; just exit, and log for follow-up
					$this->logger->warning(
						__CLASS__ . ' triggered for {item} deletion/undeletion with unknown type {type}; data error?',
						[
							'item' => $this->params['target'],
							'action' => $changeData['type'],
						]
					);
					return true;
			}
		} else {
			// Note: We just pick the first of multiple operations, as that's what the UX allows you to do. However, if
			// e.g. someone did an API edit that added some Implementations & removed some Testers, we'll show only one.
			$operations = $changeData['operations'];

			switch ( $changeData['type'] ) {
				case ZTypeRegistry::Z_FUNCTION:
					// Changes to Functions are complex – direct errors, and changes to approved Implementations/Testers
					$actionPath = array_key_first( $operations );

					switch ( $actionPath ) {
						case ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS:
						case ZTypeRegistry::Z_FUNCTION_TESTERS:
							$typeTouched = ( $actionPath === ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS )
								? 'implementations' : 'testers';
							$action = array_key_first( $operations[$actionPath] );
							$affected = $operations[$actionPath][$action];

							if ( $action === 'add' ) {
								$changeAction = 'connect';
							} elseif ( $action === 'remove' ) {
								$changeAction = 'disconnect';
							}

							$lang = $services->getContentLanguage();

							// Used messages:
							// - wikilambda-recentchanges-explanation-connect-implementation
							// - wikilambda-recentchanges-explanation-disconnect-implementation
							// - wikilambda-recentchanges-explanation-connect-tester
							// - wikilambda-recentchanges-explanation-disconnect-tester
							$changeData['message'] = "wikilambda-recentchanges-explanation-$changeAction-$typeTouched";
							$changeData['messageParams'] = [ count( $affected ), $lang->listToText( $affected ) ];
							break;

						default:
							// The edit was to something other than the approved Implementations or Testers; use generic
							$changeData['message'] = 'wikilambda-recentchanges-explanation-edit-function';
							break;
					}
					break;

				case ZTypeRegistry::Z_IMPLEMENTATION:
					$changeData['message'] = 'wikilambda-recentchanges-explanation-edit-implementation';
					break;

				case ZTypeRegistry::Z_TESTER:
					$changeData['message'] = 'wikilambda-recentchanges-explanation-edit-tester';
					break;

				default:
					// Unrecognised type; just exit, and log for follow-up
					$this->logger->warning(
						__CLASS__ . ' triggered for {item} with unrecognised type {type}; data error?',
						[
							'item' => $this->params['target'],
							'action' => $changeData['type'],
						]
					);
					return true;
			}
		}

		$comment = $commentStore->createComment( $dbw, $this->params['summary'] ?? '' );

		// Ideally we'd ask the CommentStore if it has an existing Comment ID for this string and re-use that, but
		// that facility isn't available, so we'll just insert the raw string as a new field and let RC deal.
		$generalAttributes['rc_comment'] = $comment->text;

		// Attribute the change to the repo performer. We identify them by a shared central (CentralAuth)
		// id computed on the repo wiki; without one (no central system, or an unattached/anonymous repo
		// user) there's nothing we can safely map, so skip rather than guess.
		$centralUserId = $this->params['centralUserId'] ?? 0;
		if ( !$this->centralIdLookup || !$centralUserId ) {
			$this->logger->warning(
				__CLASS__ . ' has no central user id for the performer of {target}; skipping RecentChange insert',
				[ 'target' => $this->params['target'] ]
			);
			return true;
		}

		$localUser = $this->centralIdLookup->localUserFromCentralId( $centralUserId );
		if ( $localUser ) {
			// They have an attached local account; attribute to it directly.
			$generalAttributes['rc_user'] = $localUser->getId();
			$generalAttributes['rc_user_text'] = $localUser->getName();
		} else {
			// No local account: attribute to the global user name as an interwiki user, exactly as
			// Wikibase does for foreign edits, so the row still records and links. We resolve the name
			// fresh from CentralAuth (rather than plumbing it from the repo) so renames are reflected.
			$globalName = $this->centralIdLookup->nameFromCentralId( $centralUserId );
			$externalUserNames = $this->getExternalUserNames();
			if ( $globalName === null || $globalName === '' || !$externalUserNames ) {
				$this->logger->error(
					__CLASS__ . ' could not resolve a global user name for central id {centralUserId} on {target}; '
						. 'skipping RecentChange insert',
					[ 'centralUserId' => $centralUserId, 'target' => $this->params['target'] ]
				);
				return true;
			}
			$generalAttributes['rc_user'] = 0;
			$generalAttributes['rc_user_text'] = $externalUserNames->addPrefix( $globalName );
		}

		// We can't stuff non-strings into the rc_params field, so we need to JSON-ify it
		$generalAttributes['rc_params'] = json_encode( $changeData );

		// $pagesUsingFunction values are getPrefixedText() strings written by
		// WikifunctionsClientStore::insertWikifunctionsUsage(); Title::newFromText()
		// can parse that form back into namespace + title.
		foreach ( $pagesUsingFunction as $titleString ) {
			$title = Title::newFromText( $titleString );

			$titleSpecificAttribs = [
				'rc_namespace' => $title->getNamespace(),
				'rc_title' => $title->getDBkey(),
				// As we're not adding an edit, we just re-use the most recent edit ID for the page
				'rc_cur_id' => $title->getArticleID(),

				// We're not changing the page, just faking it, so
				// … old and new lengths are the same, and …
				'rc_old_len' => $title->getLength(),
				'rc_new_len' => $title->getLength(),

				// … old and new revisions are the also same
				'rc_this_oldid' => $title->getLatestRevID(),
				'rc_last_oldid' => $title->getLatestRevID(),
			];

			$changeAttributes = $generalAttributes + $titleSpecificAttribs;

			$this->logger->debug(
				__CLASS__ . ': Inserting a RecentChange for {targetZObject} on page {target}',
				[
					'targetZObject' => $this->params['target'],
					'target' => $titleString
				]
			);

			$changeEntry = new RecentChange();
			$changeEntry->setAttribs( $changeAttributes );
			$changeEntry->setExtra( $changeData );
			$changeEntry->save();
		}

		return true;
	}

	/**
	 * Build an ExternalUserNames for the repo wiki, used to attribute changes by repo users who have
	 * no local account here. The repo's interwiki prefix is taken from its entry in the sites table,
	 * identified by the WikiLambdaClientRepoSiteId global key.
	 *
	 * @return ExternalUserNames|null Null if unconfigured, or the repo site/prefix can't be resolved.
	 */
	private function getExternalUserNames(): ?ExternalUserNames {
		$services = MediaWikiServices::getInstance();

		$repoSiteId = $services->getMainConfig()->get( 'WikiLambdaClientRepoSiteId' );
		if ( !$repoSiteId ) {
			return null;
		}

		$repoSite = $services->getSiteLookup()->getSite( $repoSiteId );
		if ( $repoSite === null ) {
			$this->logger->warning(
				__CLASS__ . ': repo site {siteId} is not a known global site key',
				[ 'siteId' => $repoSiteId ]
			);
			return null;
		}

		$interwikiPrefixes = $repoSite->getInterwikiIds();
		if ( $interwikiPrefixes === [] ) {
			$this->logger->warning(
				__CLASS__ . ': repo site {siteId} has no interwiki prefix',
				[ 'siteId' => $repoSiteId ]
			);
			return null;
		}

		return new ExternalUserNames( $interwikiPrefixes[0], false );
	}
}
