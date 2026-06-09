<?php
/**
 * WikiLambda secondary data update recording the Functions an Abstract Wikipedia
 * article uses, into the shared cross-wiki wikifunctions_usage table (T390557).
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
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Title\Title;
use MediaWiki\WikiMap\WikiMap;
use Psr\Log\LoggerInterface;
use Throwable;

class AbstractWikiUsageUpdate extends DataUpdate {

	private LoggerInterface $logger;

	/**
	 * @param Title $title
	 * @param AbstractWikiContent $content
	 * @param ?WikifunctionsUsageStore $usageStore Optional; resolved lazily in doUpdate() when
	 *   null, so that gathering this update at save time never depends on WikiLambda's
	 *   ServiceWiring (which is not active in some maintenance-script contexts).
	 */
	public function __construct(
		private readonly Title $title,
		private readonly AbstractWikiContent $content,
		private readonly ?WikifunctionsUsageStore $usageStore = null
	) {
		// Non-injected items
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaAbstract' );
	}

	/**
	 * Refresh this article's rows in the shared usage table to the Functions it now uses.
	 *
	 * @return void
	 */
	public function doUpdate() {
		$pageId = $this->title->getArticleID();
		if ( $pageId <= 0 ) {
			$this->logger->warning(
				__METHOD__ . ': Skipping usage update for {page}; no page ID.',
				[ 'page' => $this->title->getPrefixedDBkey() ]
			);
			return;
		}

		// Usage tracking is non-critical: a failure here must never break the page save or
		// a maintenance run, so swallow and log any error (e.g. the shared store being
		// unavailable in a context where WikiLambda's ServiceWiring has not run).
		try {
			$usageStore = $this->usageStore ?? WikiLambdaServices::getWikifunctionsUsageStore();
			$wiki = WikiMap::getCurrentWikiId();
			$functions = self::extractFunctionZids( $this->content );

			// Refresh the page's rows: drop any existing usage, then record the Functions
			// the article's fragments now call. Mirrors the delete-then-record approach used
			// for {{#function:}} usage on client wikis.
			$usageStore->deleteUsageForPage( $wiki, $pageId );

			$namespaceText = $this->title->getNsText() ?: null;
			foreach ( $functions as $function ) {
				$usageStore->insertUsage(
					$function,
					$wiki,
					$pageId,
					$this->title->getNamespace(),
					$namespaceText,
					$this->title->getDBkey()
				);
			}

			$this->logger->debug(
				__METHOD__ . ': Recorded {count} Function(s) used by {page}',
				[ 'count' => count( $functions ), 'page' => $this->title->getPrefixedDBkey() ]
			);
		} catch ( Throwable $e ) {
			$this->logger->warning(
				__METHOD__ . ': Failed to record usage for {page}: {message}',
				[ 'page' => $this->title->getPrefixedDBkey(), 'message' => $e->getMessage() ]
			);
		}
	}

	/**
	 * Extract the ZIDs of the Functions an Abstract Wikipedia article calls.
	 *
	 * Each section's fragments are stored as a typed ("benjamin") list whose first
	 * element is the Z89/HTML-fragment type marker and whose remaining elements are
	 * inline Z7 function calls; the Z7K1 of each is the called Function's ZID.
	 *
	 * @param AbstractWikiContent $content
	 * @return string[] Unique Function ZIDs, in first-seen order.
	 */
	public static function extractFunctionZids( AbstractWikiContent $content ): array {
		$functions = [];
		foreach ( $content->getSections() ?? [] as $section ) {
			$fragments = $section['fragments'] ?? null;
			if ( !is_array( $fragments ) ) {
				continue;
			}
			// Element 0 is the Z89 type marker; the rest are inline Z7 function calls.
			foreach ( array_slice( $fragments, 1 ) as $fragment ) {
				if (
					is_array( $fragment ) &&
					isset( $fragment['Z7K1'] ) &&
					is_string( $fragment['Z7K1'] ) &&
					ZObjectUtils::isValidZObjectReference( $fragment['Z7K1'] )
				) {
					$functions[ $fragment['Z7K1'] ] = true;
				}
			}
		}
		return array_keys( $functions );
	}
}
