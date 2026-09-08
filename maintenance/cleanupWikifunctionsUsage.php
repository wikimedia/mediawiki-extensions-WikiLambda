<?php

/**
 * WikiLambda maintenance script to remove rows from the shared wikifunctions_usage table
 * that no re-render can ever correct.
 *
 * Most stale usage rows fix themselves: the next Parsoid render of the page writes the
 * page's whole Function set and drops the rest. Some cannot, because the thing that would
 * do the writing has gone — the page, the wiki, or the Function. This script removes those.
 *
 * What it does depends on the wiki it runs on, so run it over every wiki that has WikiLambda
 * enabled, e.g. with foreachwikiindblist. On a client wiki it drops the rows of pages that
 * no longer exist there. On the repo, which is the one place that knows about all of the
 * Functions and sees the whole table, it also reports wikis that the farm does not know and
 * drops the rows of deleted Functions and the dimension rows that nothing points at.
 *
 * The --dryRun option reports what would be removed without removing it.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Maintenance;

use MediaWiki\Extension\WikiLambda\ClientStorage\WikifunctionsUsageStore;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\MainConfigNames;
use MediaWiki\Maintenance\Maintenance;
use MediaWiki\WikiMap\WikiMap;

$IP = getenv( 'MW_INSTALL_PATH' );
if ( $IP === false ) {
	$IP = __DIR__ . '/../../..';
}
require_once "$IP/maintenance/Maintenance.php";

class CleanupWikifunctionsUsage extends Maintenance {

	private WikifunctionsUsageStore $usageStore;
	private bool $dryRun;

	public function __construct() {
		parent::__construct();
		$this->requireExtension( 'WikiLambda' );
		$this->addDescription(
			'Removes rows from the shared wikifunctions_usage table that no re-render can '
			. 'correct: those of pages, wikis and Functions that no longer exist.'
		);
		$this->addOption(
			'dryRun',
			'Report what would be removed without removing it (default: false)',
			false,
			false
		);
		$this->addOption(
			'deleteUnknownWikis',
			'Also drop the rows of wikis that this farm does not know. Off by default: a '
			. 'wiki can look unknown because of a configuration mistake, and its rows '
			. 'cannot be rebuilt.',
			false,
			false
		);
		$this->setBatchSize( 500 );
	}

	/**
	 * @return bool
	 */
	public function execute() {
		$this->usageStore = WikiLambdaServices::getWikifunctionsUsageStore();
		$this->dryRun = (bool)$this->getOption( 'dryRun' );
		$mode = WikiLambdaServices::getMode();

		if ( $mode->isClient() ) {
			$this->cleanupDeletedPages();
		}

		// The repo is the only wiki that holds the Function pages, and it needs to see the
		// whole table, so it does the work that is not about one client wiki. Running this
		// over the whole farm therefore does that work exactly once.
		if ( $mode->isRepo() ) {
			$this->reportUnknownWikis();
			$this->cleanupDeletedFunctions();
			$this->cleanupOrphanWikiDimensions();
		}

		if ( !$mode->isClient() && !$mode->isRepo() ) {
			$this->output( "WikiLambda is in neither client nor repo mode here; nothing to do.\n" );
		}

		return true;
	}

	/**
	 * Drop the rows of pages that this wiki no longer has.
	 *
	 * ClientHooks::onPageDeleteComplete clears a deleted page, so this only finds what
	 * that hook missed. Page IDs are not re-used, so a missing page does not come back.
	 */
	private function cleanupDeletedPages(): void {
		$wiki = WikiMap::getCurrentWikiId();
		$dbr = $this->getReplicaDB();
		$afterPageId = 0;
		$removed = 0;

		$this->output( "Looking for usage rows of pages that $wiki no longer has...\n" );

		while ( true ) {
			$pageIds = $this->usageStore->fetchUsedPageIdsOnWiki( $wiki, $afterPageId, $this->getBatchSize() );
			if ( !$pageIds ) {
				break;
			}
			$afterPageId = end( $pageIds );

			$existing = array_map( 'intval', $dbr->newSelectQueryBuilder()
				->select( 'page_id' )
				->from( 'page' )
				->where( [ 'page_id' => $pageIds ] )
				->caller( __METHOD__ )->fetchFieldValues() );

			$missing = array_values( array_diff( $pageIds, $existing ) );
			if ( !$missing ) {
				continue;
			}

			$removed += count( $missing );
			$this->output( '  ' . count( $missing ) . ' page(s) gone: ' . implode( ', ', $missing ) . "\n" );

			if ( !$this->dryRun ) {
				$this->usageStore->deleteUsageForPages( $wiki, $missing );
				$this->waitForReplication();
			}
		}

		$this->reportTotal( "page(s) that no longer exist on $wiki", $removed );
	}

	/**
	 * Report the wikis in the table that this farm does not know, and drop their rows if
	 * the operator asked for that.
	 *
	 * Reporting is the default because these rows cannot be rebuilt: a wiki that has left
	 * the farm renders no more pages, so a wiki that only looks unknown — a renamed
	 * database, an incomplete configuration — would lose its usage for good.
	 */
	private function reportUnknownWikis(): void {
		// Three ways to be known, because no one of them is reliable everywhere: a
		// development farm can hold wikis that WikiMap cannot resolve, and it does not
		// always resolve the wiki it is running on.
		$currentWiki = WikiMap::getCurrentWikiId();
		$localDatabases = $this->getConfig()->get( MainConfigNames::LocalDatabases );

		$unknown = array_values( array_filter(
			$this->usageStore->fetchUsageWikis(),
			static fn ( string $wiki ): bool => $wiki !== $currentWiki
				&& !in_array( $wiki, $localDatabases, true )
				&& WikiMap::getWiki( $wiki ) === null
		) );

		if ( !$unknown ) {
			$this->output( "No usage rows are held for wikis that this farm does not know.\n" );
			return;
		}

		$this->output( 'Wikis in the table that this farm does not know: ' . implode( ', ', $unknown ) . "\n" );

		if ( !$this->getOption( 'deleteUnknownWikis' ) ) {
			$this->output( "  Not removed. Check each one, then re-run with --deleteUnknownWikis.\n" );
			return;
		}

		foreach ( $unknown as $wiki ) {
			$this->output( "  Dropping the rows of $wiki\n" );
			if ( !$this->dryRun ) {
				$this->usageStore->deleteUsageForWiki( $wiki );
				$this->waitForReplication();
			}
		}

		$this->reportTotal( 'wiki(s) that the farm does not know', count( $unknown ) );
	}

	/**
	 * Drop the rows of Functions that no longer have a page on the repo.
	 *
	 * A re-render does not clear these: the call site may still be there, still naming the
	 * ZID that has gone.
	 */
	private function cleanupDeletedFunctions(): void {
		$functions = $this->usageStore->fetchUsedFunctions();
		if ( !$functions ) {
			return;
		}

		$existing = $this->getReplicaDB()->newSelectQueryBuilder()
			->select( 'page_title' )
			->from( 'page' )
			->where( [ 'page_namespace' => NS_MAIN, 'page_title' => $functions ] )
			->caller( __METHOD__ )->fetchFieldValues();

		$missing = array_values( array_diff( $functions, $existing ) );
		if ( !$missing ) {
			$this->output( "Every Function in the table still has a page here.\n" );
			return;
		}

		$this->output( 'Function(s) with no page here: ' . implode( ', ', $missing ) . "\n" );

		if ( !$this->dryRun ) {
			$this->usageStore->deleteUsageForFunctions( $missing );
			$this->waitForReplication();
		}

		$this->reportTotal( 'deleted Function(s)', count( $missing ) );
	}

	/**
	 * Drop the (wiki, namespace) dimension rows that no usage row points at.
	 *
	 * Several pages share one dimension row, so nothing removes it when the last of them
	 * stops using a Function.
	 */
	private function cleanupOrphanWikiDimensions(): void {
		if ( $this->dryRun ) {
			// The store's method both counts and deletes, and there is no counting-only
			// form worth adding for a table this small. Say what will happen instead.
			$this->output( "Skipping the orphan (wiki, namespace) rows; re-run without --dryRun to remove them.\n" );
			return;
		}

		$this->reportTotal( 'orphan (wiki, namespace) row(s)', $this->usageStore->deleteOrphanWikiDimensions() );
	}

	private function reportTotal( string $what, int $count ): void {
		$verb = $this->dryRun ? 'Would remove' : 'Removed';
		$this->output( "$verb the usage of $count $what.\n" );
	}
}

// @codeCoverageIgnoreStart
$maintClass = CleanupWikifunctionsUsage::class;
require_once RUN_MAINTENANCE_IF_MAIN;
// @codeCoverageIgnoreEnd
