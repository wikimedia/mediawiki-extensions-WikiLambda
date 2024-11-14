<?php
/**
 * WikiLambda ZObjectAlphabeticPager extends AlphabeticPager
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Pagers;

use AlphabeticPager;
use MediaWiki\Context\IContextSource;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use Wikimedia\Rdbms\Subquery;

class ZObjectAlphabeticPager extends AlphabeticPager {

	private ZObjectStore $zObjectStore;
	private array $languageZids;
	private array $filters;

	/**
	 * @param IContextSource|null $context Context.
	 * @param ZObjectStore $zObjectStore
	 * @param array $filters
	 * @param array $languageZids
	 */
	public function __construct( $context, ZObjectStore $zObjectStore, $filters, $languageZids ) {
		parent::__construct( $context );
		$this->zObjectStore = $zObjectStore;
		$this->filters = $filters;
		$this->languageZids = $languageZids;
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
	 * @return array [ $query, $offsetCondition ]
	 */
	public function getQueryInfo() {
		// Returns table with unique zids and the most preferred primary label
		$subquery = $this->zObjectStore->getPreferredLabelsQuery( $this->languageZids );

		// Create additional filters and fields for Special pages:
		$tables = [ 'preferred_labels' => new Subquery( $subquery ) ];
		$fields = [ 'wlzl_zobject_zid', 'wlzl_label', 'wlzl_label_normalised',
			'wlzl_id', 'wlzl_language', 'wlzl_label_primary' ];
		$conditions = [];
		$joins = [];
		$options = [ 'ORDER BY' => 'wlzl_label ASC' ];

		// Special:ListObjectsByType
		if ( array_key_exists( 'type', $this->filters ) ) {
			// When type is passed, create list of objects of that type
			$conditions[ 'wlzl_type' ] = $this->filters[ 'type' ];
		} else {
			// When type is not passed, create list of types that have instances
			$conditions[ 'wlzl_zobject_zid' ] = $this->zObjectStore->fetchAllInstancedTypes();
		}

		// Special:ListMissingLabels
		if ( array_key_exists( 'missing_language', $this->filters ) ) {
			$conditions[] = $this->getDatabase()->expr( 'wlzl_language', '!=', $this->filters[ 'missing_language' ] );
		}

		// Special:ListFunctionsByTests
		if ( array_key_exists( 'testfilters', $this->filters ) ) {
			$min = $this->filters[ 'testfilters' ][ 'min' ];
			$max = $this->filters[ 'testfilters' ][ 'max' ];
			$connected = $this->filters[ 'testfilters' ][ 'connected' ];
			$pending = $this->filters[ 'testfilters' ][ 'pending' ];
			$pass = $this->filters[ 'testfilters' ][ 'pass' ];
			$fail = $this->filters[ 'testfilters' ][ 'fail' ];

			$testStatus = $this->zObjectStore->getTestStatusQuery();
			$testFilters = [];
			// Connection status filter:
			// * Add where clause only if one value is selected
			// * If both true or both false, leave unfiltered
			if ( $connected !== $pending ) {
				$testFilters[] = 'is_connected = ' . (int)$connected;
			}
			// Test results filter:
			// * Add where clause only if one value is selected
			// * If both true or both false, leave unfiltered
			if ( $pass !== $fail ) {
				$testFilters[] = 'is_passing = ' . (int)$pass;
			}

			// Conditional to count matching tests, if no filters count 1 per entry
			$matchingConditional = 1;
			if ( count( $testFilters ) > 0 ) {
				$matchingConditional = $this->getDatabase()->conditional( $testFilters, '1', 'NULL' );
			}

			// Table with all function ids and their test count:
			// * all_tests: count of all tests for this function
			// * connected_tests: count of all tests connected to this function
			// * failing_tests: count of all failing tests for this function
			// * matching_tests: count of all tests that match the input filters
			$filteredFunctions = $this->getDatabase()->newSelectQueryBuilder()
				->select( [
					'function_zid',
					'all_tests',
					'connected_tests' => 'COUNT( CASE WHEN is_connected = 1 THEN 1 END )',
					'failing_tests' => 'COUNT( CASE WHEN is_passing = 0 THEN 1 END )',
					'matching_tests' => 'COUNT( ' . $matchingConditional . ' )'
				] )
				->from( new Subquery( $testStatus ), 'filtered_functions' )
				->groupBy( [ 'function_zid', 'all_tests' ] );

			// Return all test counts in the main select
			array_push( $fields, 'all_tests', 'matching_tests', 'connected_tests', 'failing_tests' );
			$tables[ 'tests' ] = new Subquery( $filteredFunctions->getSQL() );
			$joins[ 'tests' ] = [ 'LEFT JOIN', 'wlzl_zobject_zid = tests.function_zid' ];
			// Return functions for which matching_tests count is less than max.
			// If max is a negative value, set no filters.
			if ( $max > -1 ) {
				$conditions[] = "matching_tests <= $max";
			}
			if ( $min > 0 ) {
				$conditions[] = "matching_tests >= $min";
			}
		}

		// Add filtering and ordering options
		$query = [
			'tables' => $tables,
			'fields' => $fields,
			'conds' => $conditions,
			'join_conds' => $joins,
			'options' => $options
		];

		return $query;
	}

	/**
	 * Return the name of the field that is used for alphabetic sorting.
	 *
	 * @return string
	 */
	public function getIndexField() {
		return 'wlzl_label_normalised';
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

		$formatted = array_key_exists( 'type', $this->filters ) ?
			"# [[$zid|$label]] ($zid)" :
			"# [[Special:ListObjectsByType/$zid|$label]] ($zid)";

		// Additional info for Special:ListFunctionsByTests
		if ( array_key_exists( 'testfilters', $this->filters ) ) {
			$tests = $row->all_tests;
			$fail = $row->failing_tests;
			$conn = $row->connected_tests;

			$testsMsg = $this->msg( 'wikilambda-special-functionsbytests-row-tests' )->params( $tests )->text();
			$failMsg = $this->msg( 'wikilambda-special-functionsbytests-row-failing' )->params( $fail )->text();
			$connMsg = $this->msg( 'wikilambda-special-functionsbytests-row-connected' )->params( $conn )->text();

			$testInfo = "$testsMsg, "
				. "<span class='ext-wikilambda-special-tests-connected'>$connMsg</span>"
			  . ( (int)$fail == 0 ? '' : ", <span class='ext-wikilambda-special-tests-failing'>$failMsg</span>" );

			$formatted .= " - " . $this->msg( 'parentheses' )->params( $testInfo )->text();
		}

		return "$formatted\n";
	}

}
