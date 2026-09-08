<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Jobs;

use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\JobQueue\GenericParameterJob;
use MediaWiki\JobQueue\Job;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\WikiMap\WikiMap;
use Psr\Log\LoggerInterface;
use Wikimedia\Rdbms\IDBAccessObject;

/**
 * Asynchronous job to record which Functions a page uses, so that an API GET does not
 * have to write to the database.
 *
 * The job carries the whole set of Functions for one revision, not a single Function to
 * add, and writes it as a snapshot. That is what makes it safe when the queue runs
 * behind: a job for an old revision cannot put back a Function that a later edit removed,
 * because it checks the revision first and does nothing if the page has moved on.
 */
class WikifunctionsClientUsageUpdateJob extends Job implements GenericParameterJob {

	private LoggerInterface $logger;

	private ?int $pageId;
	private ?int $revId;
	/** @var string[] */
	private array $functions;
	private bool $legacyParams;

	public function __construct( array $params ) {
		// Note: This will set $this->params, though we don't use it.
		parent::__construct( 'wikifunctionsClientUsageUpdate', $params );

		// (T433542) The previous version of this job named one Function and added it. Such
		// a job is not safe to apply now, as it says nothing about the revision it came
		// from, so it cannot be told apart from a stale one. Recognise the old parameters
		// and do nothing. TODO: Remove this after one train has gone out.
		$this->legacyParams = isset( $params['targetFunction'] );

		$this->pageId = $params['pageId'] ?? null;
		$this->revId = $params['revId'] ?? null;
		$this->functions = $params['functions'] ?? [];

		// Non-injected items
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaClient' );
	}

	/**
	 * @inheritDoc
	 */
	public function ignoreDuplicates() {
		// The parameters hold the page, the revision and the full Function set, so two
		// jobs with the same parameters write the same rows. Let the queue drop the
		// repeats that a page's re-renders produce.
		return true;
	}

	/**
	 * @return bool
	 */
	public function run() {
		if ( $this->legacyParams ) {
			$this->logger->info( __CLASS__ . ' ignored a job queued by the previous version.' );
			return true;
		}

		// If client mode isn't enabled on this wiki, there's nothing to do
		if ( !WikiLambdaServices::getMode()->isClient() ) {
			$this->logger->warning(
				__CLASS__ . ' triggered for page {pageId}; not in client mode.',
				[ 'pageId' => $this->pageId ]
			);
			return true;
		}

		if ( !$this->pageId || !$this->revId ) {
			$this->logger->warning(
				__CLASS__ . ' got no page or revision to record usage for.',
				[ 'pageId' => $this->pageId, 'revId' => $this->revId ]
			);
			return true;
		}

		$services = MediaWikiServices::getInstance();

		// Read the page from the primary, as the check below turns on how fresh it is.
		$page = $services->getPageStore()->getPageById( $this->pageId, IDBAccessObject::READ_LATEST );
		if ( !$page ) {
			// The page went away after it was rendered; ClientHooks::onPageDeleteComplete
			// has already dropped its rows.
			return true;
		}

		if ( $page->getLatest() !== $this->revId ) {
			// A newer revision has been saved since the render this job came from, and that
			// revision's own job holds the right answer. Writing this one would undo it.
			$this->logger->debug(
				__CLASS__ . ' skipped stale usage for page {pageId}: revision {revId} is no longer current.',
				[ 'pageId' => $this->pageId, 'revId' => $this->revId ]
			);
			return true;
		}

		// (T434194) The store keys on the numeric part of the ZID and rejects anything else,
		// which would fail the job for as long as it is retried. The parameters reach here
		// from a render of arbitrary wikitext, so drop what the store cannot take.
		$functions = array_values( array_filter(
			$this->functions,
			static fn ( $function ): bool =>
				is_string( $function ) && ZObjectUtils::isValidZObjectReference( $function )
		) );

		$title = $services->getTitleFactory()->newFromPageIdentity( $page );

		WikiLambdaServices::getWikifunctionsUsageStore()->setUsageForPage(
			WikiMap::getCurrentWikiId(),
			$this->pageId,
			$title->getNamespace(),
			// Store null rather than the empty string for the main namespace.
			$title->getNsText() ?: null,
			$title->getDBkey(),
			$functions
		);

		$this->logger->debug(
			__CLASS__ . ' recorded {count} Function(s) for page {pageId}',
			[ 'count' => count( $functions ), 'pageId' => $this->pageId ]
		);

		return true;
	}
}
