<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Jobs;

use MediaWiki\Extension\WikiLambda\WikifunctionsClientStore;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\JobQueue\GenericParameterJob;
use MediaWiki\JobQueue\Job;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Title\Title;
use MediaWiki\WikiMap\WikiMap;
use Psr\Log\LoggerInterface;

/**
 * Asynchronous job to record that a page is using a function in the database,
 * which allows us to avoid a database write on an API GET.
 */
class WikifunctionsClientUsageUpdateJob extends Job implements GenericParameterJob {

	private LoggerInterface $logger;
	private WikifunctionsClientStore $wikifunctionsClientStore;

	private string $targetFunction;
	private string $targetPageText;
	private int $targetPageNamespace;

	public function __construct( array $params ) {
		// Note: This will set $this->params, though we don't use it.
		parent::__construct( 'wikifunctionsClientUsageUpdate', $params );

		$this->targetFunction = $params['targetFunction'];
		$this->targetPageText = $params['targetPageText'];
		$this->targetPageNamespace = $params['targetPageNamespace'];

		// Non-injected items
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaClient' );
		$this->wikifunctionsClientStore = WikiLambdaServices::getWikifunctionsClientStore();

		$this->logger->debug(
			__CLASS__ . ' created for {targetFunction} on {targetPageNS}:{targetPage}',
			[
				'targetFunction' => $this->targetFunction,
				'targetPage' => $this->targetPageText,
				'targetPageNS' => $this->targetPageNamespace,
			]
		);
	}

	/**
	 * @return bool
	 */
	public function run() {
		$this->logger->debug(
			__CLASS__ . ' initiated for {targetFunction} on {targetPageNS}:{targetPage}',
			[
				'targetFunction' => $this->targetFunction,
				'targetPage' => $this->targetPageText,
				'targetPageNS' => $this->targetPageNamespace,
			]
		);

		// If client mode isn't enabled on this wiki, there's nothing to do
		if ( !WikiLambdaServices::getMode()->isClient() ) {
			$this->logger->warning(
				__CLASS__ . ' triggered for {targetFunction} on {targetPageNS}:{targetPage}; not in client mode.',
				[
					'targetFunction' => $this->targetFunction,
					'targetPage' => $this->targetPageText,
					'targetPageNS' => $this->targetPageNamespace,
				]
			);

			// Nothing for us to do.
			return true;
		}

		// (T434194) Don't run for invalid ZIDs, `{{#function:foo}}` can't be added to the DB
		if ( !ZObjectUtils::isValidZObjectReference( $this->targetFunction ) ) {
			$this->logger->info(
				__CLASS__ . ' got {targetFunction}, which is not a Function ZID; not recording usage.',
				[
					'targetFunction' => $this->targetFunction,
					'targetPage' => $this->targetPageText,
					'targetPageNS' => $this->targetPageNamespace,
				]
			);
			return true;
		}

		// FIXME: Don't proceed but evict from page if cache job finds that parser object doesn't have our flag? We
		// have set it (on the PC, not Title) via $extApi->getMetadata()->setExtensionData( 'wikilambda', 'present' );

		$title = Title::newFromText( $this->targetPageText, $this->targetPageNamespace );

		if ( !$title ) {
			$this->logger->warning(
				__CLASS__ . ' got an unparseable title for {targetFunction} on {targetPageNS}:{targetPage}',
				[
					'targetFunction' => $this->targetFunction,
					'targetPage' => $this->targetPageText,
					'targetPageNS' => $this->targetPageNamespace,
				]
			);
			return true;
		}

		$success = $this->wikifunctionsClientStore->insertWikifunctionsUsage(
			$this->targetFunction,
			$title
		);

		// Dual-write to the shared cross-wiki usage table on x1 (T390557). We resolve the
		// page_id here, in the job, rather than at parse time: by the time the job runs the
		// page row exists for a real save, whereas a preview of a not-yet-created page
		// resolves to id 0 and is skipped below — so unsaved previews can't pollute the
		// shared table. Cleanup of removed usage is handled by ClientHooks::onPageSaveComplete.
		$pageId = $title->getId();
		if ( $pageId > 0 ) {
			WikiLambdaServices::getWikifunctionsUsageStore()->insertUsage(
				$this->targetFunction,
				WikiMap::getCurrentWikiId(),
				$pageId,
				$title->getNamespace(),
				// Store null rather than the empty string for the main namespace.
				$title->getNsText() ?: null,
				$title->getDBkey()
			);
		}

		if ( $success ) {
			$this->logger->debug(
				__CLASS__ . ' Updated usage table for {targetFunction} on {targetPageNS}:{targetPage}',
				[
					'targetFunction' => $this->targetFunction,
					'targetPage' => $this->targetPageText,
					'targetPageNS' => $this->targetPageNamespace,
				]
			);
		} else {
			$this->logger->info(
				__CLASS__ . ' Didn\'t update usage for {targetFunction} on {targetPageNS}:{targetPage}; already there?',
				[
					'targetFunction' => $this->targetFunction,
					'targetPage' => $this->targetPageText,
					'targetPageNS' => $this->targetPageNamespace,
				]
			);

		}

		return true;
	}
}
