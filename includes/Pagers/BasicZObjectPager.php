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

	private array $filters;

	/**
	 * @param IContextSource|null $context Context.
	 * @param ZObjectStore $zObjectStore
	 * @param array $languageZids
	 * @param string|null $orderby
	 * @param bool|null $excludePreDefined
	 * @param array $filters
	 */
	public function __construct(
		$context, $zObjectStore, $languageZids, $orderby = null, $excludePreDefined = null, $filters = []
	) {
		parent::__construct( $context, $zObjectStore, $languageZids, $orderby, $excludePreDefined );

		$this->filters = $filters;
	}

	/**
	 * Gets the base conditions from the parent class and adds the
	 * additional conditions for this pager, depending on the filters:
	 * - WHERE wlzl_type = type
	 * - WHERE wlzl_language != missing_language
	 *
	 * @return array
	 */
	public function getQueryInfo() {
		// Get base queryInfo from parent
		$queryInfo = parent::getQueryInfo();

		// Special:ListObjectsByType and Special:ListMissingLabels
		if ( array_key_exists( 'type', $this->filters ) ) {
			$queryInfo[ 'conds' ][ 'wlzl_type' ] = $this->filters[ 'type' ];
		}

		// Special:ListMissingLabels
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
		return $this->msg( 'wikilambda-special-objectsbytype-empty' );
	}
}
