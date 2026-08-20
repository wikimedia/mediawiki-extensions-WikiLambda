<?php
/**
 * WikiLambda Function-usage summary for the query API
 *
 * Reports, for each requested Function, how many pages use it and from how many wikis,
 * so the Vue app can show those counts on the Function page and point at
 * Special:FunctionUsage for the detail.
 *
 * Modelled on the GlobalUsage extension's ApiQueryGlobalUsage, which exposes the
 * equivalent cross-wiki data for Commons media files.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ActionAPI;

use MediaWiki\Api\ApiQuery;
use MediaWiki\Api\ApiQueryBase;
use MediaWiki\Extension\WikiLambda\ClientStorage\WikifunctionsUsageStore;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

class ApiQueryZFunctionUsage extends ApiQueryBase {

	use WikiLambdaApiModeGuardTrait;

	/**
	 * How many Functions one request may ask about.
	 *
	 * Each answer costs a scan of that Function's usage rows on the shared cluster, so
	 * this does not inherit the query page set's 500-title allowance for users with
	 * apihighlimits. Matches FetchHandler::MAX_REQUESTED_ZIDS.
	 */
	public const MAX_REQUESTED_ZIDS = 50;

	/**
	 * @codeCoverageIgnore
	 */
	public function __construct(
		ApiQuery $query,
		string $moduleName,
		private readonly WikifunctionsUsageStore $usageStore
	) {
		// Every query module's parameter prefix has to be unique, even one with no parameters
		// of its own, so this cannot be the bare 'wikilambdafn_' that ApiQueryZFunctionReference
		// already claims; extend it with the module's own name, as ApiQueryFunctions does to
		// ApiQueryZObjectLabels' 'wikilambdasearch_'.
		parent::__construct( $query, $moduleName, 'wikilambdafn_usage_' );
	}

	/**
	 * @inheritDoc
	 */
	public function execute() {
		// Only the repo can read the shared usage table.
		$this->dieIfNotRepoMode();

		$pages = $this->getPageSet()->getGoodPages();
		if ( count( $pages ) > self::MAX_REQUESTED_ZIDS ) {
			$this->dieWithError( [
				'apierror-wikilambdafn_usage-too-many',
				count( $pages ),
				self::MAX_REQUESTED_ZIDS
			] );
		}

		$result = $this->getResult();

		foreach ( $pages as $pageId => $page ) {
			$zid = $page->getDBkey();
			// Silently skip pages that aren't ZObjects; the caller asked about a title we
			// have nothing to say about, which is not an error.
			if ( $page->getNamespace() !== NS_MAIN || !ZObjectUtils::isValidZObjectReference( $zid ) ) {
				continue;
			}

			// We don't check that the target is a Function: only Functions can be used, so
			// anything else simply has no usage, and confirming the type would mean reading
			// the ZObject for no gain.
			$result->addValue(
				[ 'query', 'pages', $pageId ],
				$this->getModuleName(),
				$this->usageStore->getUsageSummary( $zid )
			);
		}
	}

	/**
	 * @inheritDoc
	 * @codeCoverageIgnore
	 */
	public function getCacheMode( $params ) {
		// The counts are the same for everyone, so they can be cached publicly.
		return 'public';
	}

	/**
	 * @inheritDoc
	 * @codeCoverageIgnore
	 */
	protected function getAllowedParams(): array {
		// The target Functions come from the query's titles/pageids; there is nothing to
		// filter and, as this reports two numbers per page, nothing to paginate.
		return [];
	}

	/**
	 * @inheritDoc
	 * @codeCoverageIgnore
	 */
	protected function getExamplesMessages() {
		return [
			'action=query&prop=wikilambdafn_usage&titles=Z801'
				=> 'apihelp-query+wikilambdafn_usage-example-simple'
		];
	}
}
