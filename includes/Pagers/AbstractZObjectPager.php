<?php
/**
 * WikiLambda AbstractZObjectPager extends AlphabeticPager
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Pagers;

use MediaWiki\Context\IContextSource;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Pager\AlphabeticPager;
use Wikimedia\Rdbms\Subquery;

abstract class AbstractZObjectPager extends AlphabeticPager {

	public const ORDER_BY_NAME = 'name';
	public const ORDER_BY_OLDEST = 'oldest';
	public const ORDER_BY_LATEST = 'latest';
	public const ORDER_BY_OPTIONS = [ self::ORDER_BY_NAME, self::ORDER_BY_OLDEST, self::ORDER_BY_LATEST ];

	private ZObjectStore $zObjectStore;
	private array $languageZids;
	private string $orderby;

	/**
	 * @param IContextSource|null $context Context.
	 * @param ZObjectStore $zObjectStore
	 * @param array $languageZids
	 * @param string|null $orderby
	 */
	public function __construct( $context, $zObjectStore, $languageZids, $orderby = null ) {
		$this->zObjectStore = $zObjectStore;
		$this->languageZids = $languageZids;
		$this->orderby = $orderby ?? self::ORDER_BY_NAME;

		parent::__construct( $context );
	}

	/**
	 * Get the ZObjectStore object
	 *
	 * @return ZObjectStore
	 */
	public function getZObjectStore() {
		return $this->zObjectStore;
	}

	/**
	 * Provides all parameters needed for the main paged query. It returns
	 * an associative array with the following elements:
	 *    tables => Table(s) for passing to Database::select()
	 *    fields => Field(s) for passing to Database::select(), may be *
	 *    conds => WHERE conditions
	 *    options => option array
	 *    join_conds => JOIN conditions
	 *
	 * For Wikilambda ZObjects:
	 * * Fetches from labels table
	 * * Uses the normalised primary label for alphabetic pagination
	 *
	 * @return array
	 */
	public function getQueryInfo() {
		// Returns table with unique zids and the most preferred primary label
		$subquery = $this->zObjectStore->getPreferredLabelsQuery( $this->languageZids );

		$tables = [ 'preferred_labels' => new Subquery( $subquery ) ];
		$fields = [
			'page_id',
			'wlzl_zobject_zid',
			'wlzl_label',
			'wlzl_label_normalised',
			'wlzl_language',
			'wlzl_label_primary'
		];

		$queryInfo = [
			'tables' => $tables,
			'fields' => $fields,
			'conds' => [],
			'join_conds' => [],
			'options' => []
		];

		return $queryInfo;
	}

	/**
	 * Return the name of the field that is used for alphabetic sorting.
	 *
	 * @return string
	 */
	public function getIndexField() {
		switch ( $this->orderby ) {
			case self::ORDER_BY_NAME:
				return 'wlzl_label_normalised';
			case self::ORDER_BY_LATEST:
			case self::ORDER_BY_OLDEST:
			default:
				return 'page_id';
		}
	}

	/**
	 * Return the direction or order results in
	 *
	 * @return bool
	 */
	public function getDefaultDirections() {
		switch ( $this->orderby ) {
			case self::ORDER_BY_LATEST:
				return self::DIR_DESCENDING;
			case self::ORDER_BY_NAME:
			case self::ORDER_BY_OLDEST:
			default:
				return self::DIR_ASCENDING;
		}
	}

	/**
	 * @return string
	 */
	public function getEmptyBody() {
		return $this->msg( 'wikilambda-special-list-empty' );
	}

	/**
	 * @return string
	 */
	public function getBottomLinks() {
		$wikitext = "\n== " . $this->msg( 'wikilambda-special-list-all-pages' ) . " ==\n";

		$wikitext .= "\n* [[Special:ListObjectsByType|" .
			$this->msg( 'wikilambda-special-objectsbytype-link' ) . "]]\n";

		$wikitext .= "\n* [[Special:ListDuplicateObjectNames|" .
			$this->msg( 'wikilambda-special-listduplicateobjectlabels-link' ) . "]]\n";

		$wikitext .= "\n* [[Special:ListMissingLabels|" .
			$this->msg( 'wikilambda-special-missinglabels' ) . "]]\n";

		$wikitext .= "\n* [[Special:ListFunctionsByTests|" .
			$this->msg( 'wikilambda-special-functionsbytests' ) . "]]\n";

		return $wikitext;
	}

	/**
	 * Process each row returned from the query.
	 * This is where we build up the list of ZObjects.
	 *
	 * @param \stdClass $row
	 * @return string
	 */
	public function formatRow( $row ) {
		$zid = $row->wlzl_zobject_zid;
		$label = $row->wlzl_label;
		return "# [[$zid|$label]] ($zid)\n";
	}
}
