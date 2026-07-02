<?php
/**
 * WikiLambda BasicZObjectPager extends AbstractZObjectPager by
 * adding filter conditions to the base table of all zobjects and
 * their preferred labels given by AbstractZObjectPager::getQueryInfo
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Pagers;

use MediaWiki\Context\IContextSource;
use MediaWiki\Extension\WikiLambda\ZObjectStore;

/**
 * Basic pager for listing ZObjects of a given type. Accepts simple
 * filters such as type. Used for the following special pages:
 * - Special:ListMissingLabels
 * - Special:ListObjectsByType
 */
class BasicZObjectPager extends AbstractZObjectPager {

	/**
	 * @param IContextSource|null $context Context.
	 * @param ZObjectStore $zObjectStore
	 * @param array $languageZids
	 * @param string|null $orderby
	 * @param bool|null $excludePreDefined
	 * @param array $filters
	 */
	public function __construct(
		$context, $zObjectStore, $languageZids, $orderby, $excludePreDefined,
		private readonly array $filters = []
	) {
		parent::__construct(
			$context, $zObjectStore, $languageZids,
			$orderby ?? AbstractZObjectPager::ORDER_BY_NAME,
			$excludePreDefined ?? false
		);
	}

	/**
	 * The type filter (used by Special:ListObjectsByType and
	 * Special:ListMissingLabels) is pushed down into the preferred-labels
	 * ranking subquery rather than applied over its results (T430853).
	 *
	 * @return string|null
	 */
	protected function getTypeFilter(): ?string {
		return $this->filters[ 'type' ] ?? null;
	}

	/**
	 * Gets the base conditions from the parent class and adds the
	 * additional conditions for this pager, depending on the filters:
	 * - WHERE wlzl_return_type = return_type
	 * - WHERE wlzl_language != missing_language
	 *
	 * @return array
	 */
	public function getQueryInfo() {
		// Get base queryInfo from parent
		$queryInfo = parent::getQueryInfo();

		// Special:ListObjectsByType only
		if ( array_key_exists( 'return_type', $this->filters ) && $this->filters[ 'return_type' ] !== 'Z1' ) {
			$queryInfo[ 'conds' ][ 'wlzl_return_type' ] = $this->filters[ 'return_type' ];
		}

		// Special:ListMissingLabels only
		if ( array_key_exists( 'missing_language', $this->filters ) ) {
			$queryInfo[ 'conds' ][] = $this->getDatabase()
				->expr( 'wlzl_language', '!=', $this->filters[ 'missing_language' ] );
		}

		return $queryInfo;
	}

	/**
	 * @return string
	 */
	public function getEmptyBody() {
		return $this->msg( 'wikilambda-special-objectsbytype-empty' )->parse();
	}
}
