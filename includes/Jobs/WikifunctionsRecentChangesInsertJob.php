<?php
/**
 * WikiLambda ZLangRegistry
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Jobs;

use GenericParameterJob;
use Job;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\Title\Title;
use MediaWiki\User\CentralId\CentralIdLookup;
use Psr\Log\LoggerInterface;
use RecentChange;

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

	public function __construct( array $params ) {
		// This job, triggered from RecentChanges activity, takes the edit and fans it out to each
		// relevant client wiki to process locally.

		parent::__construct( 'wikifunctionsRecentChangesInsert', $params );
		$this->logger = LoggerFactory::getInstance( 'WikiLambda' );

		// We use a CentralIdLookupFactory if configured to convert the repo wiki's user IDs to our local wiki's
		// ones. If null, we assume this wiki is not connected to a central system.
		$this->centralIdLookup = MediaWikiServices::getInstance()->getCentralIdLookupFactory()->getNonLocalLookup();

		$this->params = $params;

		$this->logger->debug(
			__CLASS__ . ' created for {targetZObject}',
			[
				'targetZObject' => $params['target']
			]
		);
	}

	public function run(): bool {
		// What pages would the job be updating?
		$wikifunctionsClientStore = WikiLambdaServices::getWikifunctionsClientStore();
		$pagesUsingFunction = $wikifunctionsClientStore->fetchWikifunctionsUsage( $this->params['target'] );

		// Work out whether the job is still needed
		if ( count( $pagesUsingFunction ) === 0 ) {
			// We were triggered by the repo, but we aren't using that Function.
			$this->logger->warning(
				__CLASS__ . ' triggered for {item} but it is seemingly unused; data error?',
				[
					'item' => $this->params['target'],
				]
			);
			return true;
		}

		// Build the RecentChange attributes common to all entries regardless of page on which it's used
		$generalAttributes = [
			'rc_type' => RC_EXTERNAL,
			'rc_source' => self::SRC_WIKIFUNCTIONS,

			// Our standard flags, invariant between changes: never minor or deletes or creates
			'rc_minor' => false,
			'rc_deleted' => false,
			'rc_new' => false,

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
			// FIXME: Is this right?
			// TODO (T383156): This should be a paramterised message with information about the change
			'rc_comment_text' => $this->params['summary']
		];

		// Ask CentralAuth for the user ID lookup, if available.
		$clientUserId = 0;
		if ( $this->centralIdLookup ) {
			$localUser = $this->centralIdLookup->localUserFromCentralId( $this->params['user'] );
			if ( $localUser ) {
				$clientUserId = $localUser->getId();
			}
		}
		$generalAttributes['rc_actor'] = $clientUserId;

		foreach ( $pagesUsingFunction as $titleString ) {
			$title = Title::newFromText( $titleString );

			$this->logger->debug(
				__METHOD__ . ": Inserting recent change for update '{source}' on page '{target}'",
				[
					'source' => $this->params['target'],
					'target' => $title->getDBkey()
				]
			);

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

			$changeEntry = RecentChange::newFromRow( $generalAttributes + $titleSpecificAttribs );
			$changeEntry->save();
		}
	}
}
