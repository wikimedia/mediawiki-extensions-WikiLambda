<?php
/**
 * WikiLambda secondary data removal clearing an Abstract Wikipedia article's rows
 * from the shared cross-wiki wikifunctions_usage table when the page is deleted (T390557).
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\AbstractContent;

use MediaWiki\Deferred\DataUpdate;
use MediaWiki\Extension\WikiLambda\WikifunctionsUsageStore;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Logger\LoggerFactory;
use Throwable;

class AbstractWikiUsageRemoval extends DataUpdate {

	/**
	 * @param string $wiki The using wiki's ID, captured when the update is queued.
	 * @param int $pageId The deleted page's ID, captured while the Title still resolves it.
	 * @param ?WikifunctionsUsageStore $usageStore Optional; resolved lazily in doUpdate() when
	 *   null, so that gathering this update at deletion time never depends on WikiLambda's
	 *   ServiceWiring (which is not active in some maintenance-script contexts).
	 */
	public function __construct(
		private readonly string $wiki,
		private readonly int $pageId,
		private readonly ?WikifunctionsUsageStore $usageStore = null
	) {
	}

	/**
	 * @return void
	 */
	public function doUpdate() {
		if ( $this->pageId <= 0 ) {
			return;
		}

		// Usage tracking is non-critical: never let a failure here break the deletion or a
		// maintenance run; swallow and log any error.
		try {
			$usageStore = $this->usageStore ?? WikiLambdaServices::getWikifunctionsUsageStore();
			$usageStore->deleteUsageForPage( $this->wiki, $this->pageId );
		} catch ( Throwable $e ) {
			LoggerFactory::getInstance( 'WikiLambdaAbstract' )->warning(
				__METHOD__ . ': Failed to clear usage for page {pageId} on {wiki}: {message}',
				[ 'pageId' => $this->pageId, 'wiki' => $this->wiki, 'message' => $e->getMessage() ]
			);
		}
	}
}
