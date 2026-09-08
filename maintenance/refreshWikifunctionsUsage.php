<?php

/**
 * WikiLambda maintenance script to rebuild this wiki's rows in the shared
 * wikifunctions_usage table.
 *
 * The table is written from the Parsoid render of a page: when the render is cached,
 * ClientHooks::onParserCacheSaveComplete reads the Functions out of it and records the
 * page's whole set. This script does nothing more than force that render for every page
 * that already holds a usage row, and lets the ordinary code path do the writing. It
 * therefore holds no knowledge of the table itself, and can be dropped once RefreshLinksJob
 * runs on Parsoid metadata (T393716) and template changes reach the table on their own.
 *
 * The render must be forced. ParserOutputAccess hands back a warm cache entry without
 * saving it again, and an entry that is not saved fires no hook, so a run without
 * OPT_FORCE_PARSE would report success and change nothing.
 *
 * Modelled on core's maintenance/prewarmParsoidParserCache.php, which does the same thing
 * for every page of a wiki. This one visits only the pages that have usage to correct —
 * a few thousand across the farm, rather than a few hundred thousand per wiki.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Maintenance;

use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Maintenance\Maintenance;
use MediaWiki\Page\ParserOutputAccess;
use MediaWiki\Parser\ParserOptions;
use MediaWiki\Revision\SlotRecord;
use MediaWiki\WikiMap\WikiMap;
use Wikimedia\Parsoid\Core\ClientError;
use Wikimedia\Parsoid\Core\ResourceLimitExceededException;

$IP = getenv( 'MW_INSTALL_PATH' );
if ( $IP === false ) {
	$IP = __DIR__ . '/../../..';
}
require_once "$IP/maintenance/Maintenance.php";

class RefreshWikifunctionsUsage extends Maintenance {

	private int $parsed = 0;
	private int $skipped = 0;
	private int $failed = 0;

	public function __construct() {
		parent::__construct();
		$this->requireExtension( 'WikiLambda' );
		$this->addDescription(
			'Rebuilds this wiki\'s rows in the shared wikifunctions_usage table, by forcing '
			. 'a Parsoid render of every page that holds one.'
		);
		$this->addOption( 'startFrom', 'Start from this page ID, to resume a run', false, true );
		$this->addOption(
			'dryRun',
			'List the pages that would be rendered without rendering them (default: false)',
			false,
			false
		);
		$this->setBatchSize( 50 );
	}

	/**
	 * @return bool
	 */
	public function execute() {
		if ( !WikiLambdaServices::getMode()->isClient() ) {
			$this->output( "WikiLambda is not in client mode here, so this wiki records no usage.\n" );
			return true;
		}

		$wiki = WikiMap::getCurrentWikiId();
		$dryRun = $this->getOption( 'dryRun' );
		$usageStore = WikiLambdaServices::getWikifunctionsUsageStore();
		$pageStore = $this->getServiceContainer()->getPageStore();
		$revisionLookup = $this->getServiceContainer()->getRevisionLookup();
		$parsoidSiteConfig = $this->getServiceContainer()->getParsoidSiteConfig();
		$parserOutputAccess = $this->getServiceContainer()->getParserOutputAccess();

		$afterPageId = (int)$this->getOption( 'startFrom', 0 );

		$this->output( "Refreshing the Function usage that $wiki records...\n" );

		while ( true ) {
			$pageIds = $usageStore->fetchUsedPageIdsOnWiki( $wiki, $afterPageId, $this->getBatchSize() );
			if ( !$pageIds ) {
				break;
			}
			$this->output( 'Batch: ' . reset( $pageIds ) . ' - ' . end( $pageIds ) . "\n" );
			$afterPageId = end( $pageIds );

			foreach ( $pageIds as $pageId ) {
				if ( $dryRun ) {
					$this->output( "  [Would render] Page ID: $pageId\n" );
					$this->parsed++;
					continue;
				}

				$page = $pageStore->getPageById( $pageId );
				if ( !$page ) {
					// cleanupWikifunctionsUsage.php is the script that removes these.
					$this->output( "  [Skipped] Page ID: $pageId no longer exists\n" );
					$this->skipped++;
					continue;
				}

				$revision = $revisionLookup->getRevisionById( $page->getLatest() );
				if ( !$revision ) {
					$this->output( "  [Skipped] Page ID: $pageId has no current revision\n" );
					$this->skipped++;
					continue;
				}

				$model = $revision->getSlot( SlotRecord::MAIN )->getModel();
				if ( !$parsoidSiteConfig->supportsContentModel( $model ) ) {
					// ParserOutputAccess would write a placeholder to the parser cache, and
					// the hook would then read no Functions from it and drop the page's rows.
					$this->output( "  [Skipped] Page ID: $pageId has unsupported content model $model\n" );
					$this->skipped++;
					continue;
				}

				$parserOptions = ParserOptions::newFromAnon();
				$parserOptions->setUseParsoid();
				$parserOptions->setRenderReason( 'refreshWikifunctionsUsage' );

				try {
					$status = $parserOutputAccess->getParserOutput(
						$page,
						$parserOptions,
						$revision,
						// Without this a warm cache entry is returned but not saved again, so
						// the hook that records the usage never runs.
						ParserOutputAccess::OPT_FORCE_PARSE
					);
				} catch ( ClientError | ResourceLimitExceededException $e ) {
					$this->output( "  [Failed] Page ID: $pageId — {$e->getMessage()}\n" );
					$this->failed++;
					continue;
				}

				if ( !$status->isOK() ) {
					$this->output( "  [Failed] Page ID: $pageId could not be rendered\n" );
					$this->failed++;
					continue;
				}

				$this->parsed++;
			}

			$this->waitForReplication();
		}

		$verb = $dryRun ? 'Would render' : 'Rendered';
		$this->output( "$verb {$this->parsed} page(s); skipped {$this->skipped}; {$this->failed} failed.\n" );
		if ( !$dryRun && $this->parsed ) {
			$this->output( "Run the job queue to apply the usage each render recorded.\n" );
		}

		return true;
	}
}

// @codeCoverageIgnoreStart
$maintClass = RefreshWikifunctionsUsage::class;
require_once RUN_MAINTENANCE_IF_MAIN;
// @codeCoverageIgnoreEnd
