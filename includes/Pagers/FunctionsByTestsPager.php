<?php
/**
 * WikiLambda FunctionsByTestsPager extends AbstractZObjectPager by
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
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use Wikimedia\Rdbms\Subquery;

/**
 * Pages Functions filtered by their testing status and quality.
 */
class FunctionsByTestsPager extends AbstractZObjectPager {

	private array $filters;

	/**
	 * @param IContextSource|null $context Context.
	 * @param ZObjectStore $zObjectStore
	 * @param array $languageZids
	 * @param bool|null $excludePreDefined
	 * @param array|null $filters [ min, max, connected, pending, pass, fail ]
	 */
	public function __construct(
		$context, $zObjectStore, $languageZids, $excludePreDefined = null, $filters = []
	) {
		parent::__construct( $context, $zObjectStore, $languageZids, null, $excludePreDefined );

		$this->filters = $filters;
	}

	/**
	 * Gets the base conditions from the parent class and adds the
	 * additional conditions for this pager, depending on the filters.
	 * This pager inner joins the preferredLabels table returned by the
	 * AbstractZObjectPager with a table with all function ids and their
	 * relevant test counts:
	 * - all_tests: All the tests created for each function.
	 * - connected_tests: Number of connected tests for each function.
	 * - failing_tests: Number of tests failing for each function
	 *   (against at least one connected implementation)
	 * - matching_tests: Number of tests that match the conditions passed
	 *   as input in the Request: connected status and failure/success status.
	 *
	 * @return array
	 */
	public function getQueryInfo() {
		// Get base queryInfo from parent
		$queryInfo = parent::getQueryInfo();

		$min = $this->filters[ 'min' ];
		$max = $this->filters[ 'max' ];
		$connected = $this->filters[ 'connected' ];
		$pending = $this->filters[ 'pending' ];
		$pass = $this->filters[ 'pass' ];
		$fail = $this->filters[ 'fail' ];

		$testStatus = $this->getZObjectStore()->getTestStatusQuery();
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
		// Table with all function ids and their test counts:
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

		// Add additional data to parent queryInfo
		// 1. Return all test counts in the main select
		array_push( $queryInfo[ 'fields' ], 'all_tests', 'matching_tests', 'connected_tests', 'failing_tests' );
		// 2. Join filteredFunctions with preferredLabels
		$queryInfo[ 'tables' ][ 'tests' ] = new Subquery( $filteredFunctions->getSQL() );
		$queryInfo[ 'join_conds' ][ 'tests' ] = [ 'LEFT JOIN', 'wlzl_zobject_zid = tests.function_zid' ];
		// 3. Return functions for which matching_tests count is less than max.
		$queryInfo[ 'conds' ][ 'wlzl_type' ] = ZTypeRegistry::Z_FUNCTION;
		if ( $max > -1 ) {
			$queryInfo[ 'conds' ][] = "matching_tests <= $max";
		}
		if ( $min > 0 ) {
			$queryInfo[ 'conds' ][] = "matching_tests >= $min";
		}

		return $queryInfo;
	}

	/**
	 * @param \stdClass $row
	 * @return string
	 */
	public function formatRow( $row ) {
		$zid = $row->wlzl_zobject_zid;
		$label = $row->wlzl_label;

		$functionInfo = "# [[$zid|$label]] ($zid)";

		$tests = $row->all_tests;
		$fail = $row->failing_tests;
		$conn = $row->connected_tests;

		$testsMsg = $this->msg( 'wikilambda-special-functionsbytests-row-tests' )->params( $tests )->text();
		$failMsg = $this->msg( 'wikilambda-special-functionsbytests-row-failing' )->params( $fail )->text();
		$connMsg = $this->msg( 'wikilambda-special-functionsbytests-row-connected' )->params( $conn )->text();

		$testInfo = "$testsMsg, "
			. "<span class='ext-wikilambda-special-tests-connected'>$connMsg</span>"
			. ( (int)$fail == 0 ? '' : ", <span class='ext-wikilambda-special-tests-failing'>$failMsg</span>" );

		return $functionInfo . ' - ' . $this->msg( 'parentheses' )->params( $testInfo )->text() . "\n";
	}
}
