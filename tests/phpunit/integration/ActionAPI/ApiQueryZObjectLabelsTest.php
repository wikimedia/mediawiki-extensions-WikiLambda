<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI;

use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\ApiQueryZObjectLabels
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectStore
 * @group Database
 * @group API
 */
class ApiQueryZObjectLabelsTest extends WikiLambdaApiTestCase {

	private const EN = 'Z1002';
	private const ES = 'Z1003';
	private const IT = 'Z1787';
	private const EGL = 'Z1726';

	/**
	 * Content of wikilambda_zobject_labels table
	 * @var array [zid, type, returnType, language, label, primary]
	 */
	private $labelData = [
		[ 'Z490', 'Z4', null, self::EN, 'Text', 1 ],
		[ 'Z490', 'Z4', null, self::ES, 'Texto', 1 ],
		[ 'Z490', 'Z4', null, self::EN, 'Long text', 0 ],
		[ 'Z490', 'Z4', null, self::EN, 'Paragraph', 0 ],
		[ 'Z492', 'Z4', null, self::EN, 'Word', 1 ],
		[ 'Z492', 'Z4', null, self::ES, 'Palabra', 1 ],
		[ 'Z492', 'Z4', null, self::EN, 'Short tiny text', 0 ],
		[ 'Z492', 'Z4', null, self::ES, 'Textitos', 0 ],
		[ 'Z491', 'Z8', 'Z4', self::EN, 'Text of a given length', 1 ],
		[ 'Z491', 'Z8', 'Z4', self::EN, 'Generic text', 0 ],
		[ 'Z480', 'Z8', 'Z10000', self::EN, 'Make pangolin', 1 ],
		[ 'Z481', 'Z8', 'Z1', self::EN, 'Return anything', 1 ],
		[ 'Z482', 'Z10001', null, self::EN, 'Anything', 1 ],
		[ 'Z483', 'Z7', null, self::EN, 'Wikidata Enumeration', 1 ],
		[ 'Z900', 'Z8', 'Z881(Z1)', self::EN, 'append element to Typed list', 1 ],

		// Objects for testing matchRate: type=Z20000
		[ 'Z20001', 'Z20000', null, self::EN, 'Age', 1 ],
		[ 'Z20002', 'Z20000', null, self::EN, 'Age range', 1 ],
		[ 'Z20003', 'Z20000', null, self::EN, 'Age in years', 1 ],
		[ 'Z20004', 'Z20000', null, self::EN, 'Range of natural numbers', 1 ],
		[ 'Z20005', 'Z20000', null, self::EN, 'Average', 1 ],
		[ 'Z20006', 'Z20000', null, self::EN, 'Arrange integers', 1 ],

		// Objects for testing matchRate: type=Z30000
		[ 'Z30001', 'Z30000', null, self::EN, 'One', 1 ],
		[ 'Z30002', 'Z30000', null, self::EN, 'Two', 1 ],
		[ 'Z30003', 'Z30000', null, self::EN, 'Three', 1 ],
		[ 'Z30004', 'Z30000', null, self::EN, 'One two three', 1 ],
		[ 'Z30005', 'Z30000', null, self::EN, 'Three two one', 1 ],
		[ 'Z30006', 'Z30000', null, self::EN, 'One four five', 1 ],
		[ 'Z30007', 'Z30000', null, self::EN, 'Three four five', 1 ],
	];

	/**
	 * Content of wikilambda_zobject_join table
	 * @var array [zid, type, key, related zid, related type]
	 */
	private $joinData = [
		// Z491 (Text of a given length) → Z4
		[ 'Z491', 'Z8', 'Z8K2', 'Z4', 'Z4' ],
		// Z480 (Make pangolin) → Z10000
		[ 'Z480', 'Z8', 'Z8K2', 'Z10000', 'Z4' ],
		// Z481 (Return anything) → Z1
		[ 'Z481', 'Z8', 'Z8K2', 'Z1', 'Z4' ],
		// Z483 (Wikidata Enumeration) → Z6884
		[ 'Z483', 'Z7', 'Z7K1', 'Z6884', 'Z8' ],
		// Z6884 → Z4
		[ 'Z6884', 'Z8', 'Z8K2', 'Z4', 'Z4' ],
		// Z900 (append element to Typed list) → Z881(Z1)
		[ 'Z900', 'Z8', 'Z8K2', 'Z881(Z1)', 'Z4' ],
	];

	public function addDBDataOnce(): void {
		$langs = ZLangRegistry::singleton();
		$langs->register( self::EN, 'en' );
		$langs->register( self::ES, 'es' );

		// Add label data:
		$rows = [];
		foreach ( $this->labelData as $data ) {
			$rows[] = [
				'wlzl_zobject_zid' => $data[0],
				'wlzl_type' => $data[1],
				'wlzl_return_type' => $data[2],
				'wlzl_language' => $data[3],
				'wlzl_label' => $data[4],
				'wlzl_label_normalised' => ZObjectUtils::comparableString( $data[4] ),
				'wlzl_label_primary' => $data[5]
			];
		}
		$this->getDb()->newInsertQueryBuilder()
			->insertInto( 'wikilambda_zobject_labels' )
			->rows( $rows )
			->caller( __METHOD__ )
			->execute();

		// Add join data
		$rows = [];
		foreach ( $this->joinData as $data ) {
			$rows[] = [
				'wlzo_main_zid' => $data[0],
				'wlzo_main_type' => $data[1],
				'wlzo_key' => $data[2],
				'wlzo_related_zobject' => $data[3],
				'wlzo_related_type' => $data[4]
			];
		}
		$this->getDb()->newInsertQueryBuilder()
			->insertInto( 'wikilambda_zobject_join' )
			->rows( $rows )
			->caller( __METHOD__ )
			->execute();
	}

	private function resultFor( $zid, $resultTerm, $matchTerm = null ) {
		$ZID = 0;
		$TYPE = 1;
		$LANG = 3;
		$LABEL = 4;
		$PRIMARY = 5;

		$resultRow = null;
		$matchRow = null;

		foreach ( $this->labelData as $row ) {
			if ( $row[$ZID] === $zid ) {
				if ( ( $row[$LABEL] === $matchTerm ) || ( $row[$ZID] === $matchTerm ) ) {
					$matchRow = $row;
				}
				if ( $row[$LABEL] === $resultTerm ) {
					$resultRow = $row;
				}
			}
		}

		return $resultRow === null ? null : [
			'page_id' => 0,
			'page_is_redirect' => false,
			'page_namespace' => NS_MAIN,
			'page_content_model' => CONTENT_MODEL_ZOBJECT,
			'page_title' => $zid,
			'page_type' => $resultRow[$TYPE],
			'match_label' => ( $matchRow !== null ) ? $matchTerm : null,
			'match_is_primary' => ( $matchRow !== null ) ? strval( $matchRow[$PRIMARY] ) : null,
			'match_lang' => ( $matchRow !== null ) ? $matchRow[$LANG] : null,
			'label' => $resultRow[$LABEL],
			'type_label' => null
		];
	}

	private function unsetMatchRate( $results ) {
		if (
			isset( $results[ 'query' ] ) &&
			isset( $results[ 'query' ][ 'wikilambdasearch_labels' ] ) &&
			is_array( $results[ 'query' ][ 'wikilambdasearch_labels' ] )
		) {
			foreach ( $results[ 'query' ][ 'wikilambdasearch_labels' ] as &$result ) {
				if ( isset( $result[ 'match_rate' ] ) ) {
					unset( $result[ 'match_rate' ] );
				}
			}
		}
		return $results;
	}

	/**
	 * @dataProvider provideTestSearchLabels
	 */
	public function testSearchLabels( $apiParams, $expectedResults, $expectedContinue = null ) {
		// Make request:
		$request = array_merge( [
			'action' => 'query',
			'list' => 'wikilambdasearch_labels',
		], $apiParams );
		$actualResponse = $this->doApiRequest( $request );

		// Unset match rate for more stable testing
		$actualResponse = $this->unsetMatchRate( $actualResponse[0] );

		// Build expected response:
		$expectedResponse = [ 'batchcomplete' => true ];
		if ( count( $expectedResults ) > 0 ) {
			$results = array_map( function ( $result ) {
				$zid = $result[0];
				$label = $result[1];
				$matchLabel = count( $result ) > 2 ? $result[2] : null;
				return $this->resultFor( $zid, $label, $matchLabel );
			}, $expectedResults );
			$expectedResponse[ 'query' ] = [ 'wikilambdasearch_labels' => $results ];
			if ( $expectedContinue ) {
				$expectedResponse[ 'continue' ] = $expectedContinue;
			}
		}

		$this->assertEquals( $expectedResponse, $actualResponse );
	}

	public static function provideTestSearchLabels() {
		yield 'no results' => [
			// search for "boolean" substring among objects of type Z1
			[
				'wikilambdasearch_search' => 'boolean',
				'wikilambdasearch_language' => 'en',
				'wikilambdasearch_type' => 'Z1',
			],
			// renders no results
			[]
		];

		// T394712: use case 2: any function (return anything)
		yield 'returns all results that match the given type' => [
			// search for objects of type Z8
			[
				'wikilambdasearch_language' => 'en',
				'wikilambdasearch_type' => 'Z8',
			],
			// renders results: Z491, Z480, Z481, Z900
			[
				[ 'Z491', 'Text of a given length' ],
				[ 'Z480', 'Make pangolin' ],
				[ 'Z481', 'Return anything' ],
				[ 'Z900', 'append element to Typed list' ],
			]
		];

		yield 'returns all results that match any of the given types' => [
			// search for objects of types Z8 and Z10001
			[
				'wikilambdasearch_language' => 'en',
				'wikilambdasearch_type' => 'Z8|Z10001'
			],
			// renders results: Z491, Z480, Z481, Z482, Z900
			[
				[ 'Z491', 'Text of a given length' ],
				[ 'Z480', 'Make pangolin' ],
				[ 'Z481', 'Return anything' ],
				[ 'Z482', 'Anything' ],
				[ 'Z900', 'append element to Typed list' ],
			]
		];

		yield 'returns all results that match the given return type (strict match)' => [
			// search for objects of that resolve to the type Z10000
			[
				'wikilambdasearch_language' => 'en',
				'wikilambdasearch_return_type' => 'Z10000'
			],
			// renders result: Z480
			[
				[ 'Z480', 'Make pangolin' ],
			]
		];

		yield 'returns all results that can match the given return type (not strict match)' => [
			// search for objects that resolve to the types Z10000 or Z1
			[
				'wikilambdasearch_language' => 'en',
				'wikilambdasearch_return_type' => 'Z10000|Z1'
			],
			// renders results: Z480 and Z481
			[
				[ 'Z480', 'Make pangolin' ],
				[ 'Z481', 'Return anything' ],
			]
		];

		// T394712: use case 1: anything that resolves to a type (functions, types or function calls)
		yield 'returns all results that resolve to the given return type (all types)' => [
			// search for objects of that resolve to the type Z4
			[
				'wikilambdasearch_language' => 'en',
				'wikilambdasearch_return_type' => 'Z4'
			],
			// renders results: types Z490, Z492, function Z491, and enumeration (function call) Z483
			[
				[ 'Z490', 'Text' ],
				[ 'Z492', 'Word' ],
				[ 'Z491', 'Text of a given length' ],
				[ 'Z483', 'Wikidata Enumeration' ],
			]
		];

		// T394712: use case 3: any function that returns a Z4 (non strictly, also Z1 allowed)
		yield 'returns all results that match the given type and resolve to any of the given types' => [
			// search for objects of type Z8
			[
				'wikilambdasearch_language' => 'en',
				'wikilambdasearch_type' => 'Z8',
				'wikilambdasearch_return_type' => 'Z4|Z1'
			],
			// renders results: function returning type Z491, and function returning anything Z481
			[
				[ 'Z491', 'Text of a given length' ],
				[ 'Z481', 'Return anything' ],
			]
		];

		// T394712: use case 4: any persisted object that directly resolves to a Z4 (literal Z4 or Z7)
		yield 'returns all results that match any of the given types and resolve the given type' => [
			// search for objects of type Z8
			[
				'wikilambdasearch_language' => 'en',
				'wikilambdasearch_type' => 'Z4|Z7',
				'wikilambdasearch_return_type' => 'Z4'
			],
			// renders results: types Z490, Z492 and enumeration Z483
			[
				[ 'Z490', 'Text' ],
				[ 'Z492', 'Word' ],
				[ 'Z483', 'Wikidata Enumeration' ],
			]
		];

		yield 'paginates the results if limit is less than total values' => [
			// search for first page of types
			[
				'wikilambdasearch_language' => 'es',
				'wikilambdasearch_type' => 'Z4',
				'wikilambdasearch_limit' => 1,
			],
			// renders first page with one type
			[
				[ 'Z490', 'Texto' ],
			],
			// returns pagination parameters continue
			[
				'wikilambdasearch_continue' => '1',
				'continue' => '-||',
			]
		];

		yield 'does not paginate if limit is more or equal than the total values' => [
			// search for first page of types
			[
				'wikilambdasearch_language' => 'es',
				'wikilambdasearch_type' => 'Z4',
				'wikilambdasearch_limit' => 2,
			],
			// renders first page with one type
			[
				[ 'Z490', 'Texto' ],
				[ 'Z492', 'Palabra' ],
			]
		];

		yield 'returns the second page if continue' => [
			// search for first page of types
			[
				'wikilambdasearch_language' => 'es',
				'wikilambdasearch_type' => 'Z4',
				'wikilambdasearch_limit' => 1,
				'wikilambdasearch_continue' => 1,
			],
			// renders first page with one type
			[
				[ 'Z492', 'Palabra' ],
			]
		];

		yield 'returns labels in the requested language or fallback' => [
			// limit results to the first eight for better test maintainability
			[
				'wikilambdasearch_language' => 'es',
				'wikilambdasearch_limit' => 8
			],
			[
				[ 'Z490', 'Texto' ],
				[ 'Z492', 'Palabra' ],
				[ 'Z491', 'Text of a given length' ],
				[ 'Z480', 'Make pangolin' ],
				[ 'Z481', 'Return anything' ],
				[ 'Z482', 'Anything' ],
				[ 'Z483', 'Wikidata Enumeration' ],
				[ 'Z900', 'append element to Typed list' ],
			],
			// expect continue
			[
				'wikilambdasearch_continue' => '1',
				'continue' => '-||',
			]
		];

		yield 'returns results that match the search term (case insensitive)' => [
			// search for "TEXT"
			[
				'wikilambdasearch_language' => 'en',
				'wikilambdasearch_search' => 'TEXT',
			],
			// results that match with Text and text
			[
				[ 'Z490', 'Text', 'Text' ],
				[ 'Z492', 'Word', 'Textitos' ],
				[ 'Z491', 'Text of a given length', 'Text of a given length' ],
			]
		];

		yield 'returns results that exactly match the search term (case sensitive)' => [
			// search for "TEXT"
			[
				'wikilambdasearch_language' => 'en',
				'wikilambdasearch_search' => 'TEXT',
				'wikilambdasearch_exact' => 1,
			],
			// no results, as doesn't match with "Text"
			[]
		];

		yield 'returns results that match by zid' => [
			// search for Z48
			[
				'wikilambdasearch_language' => 'en',
				'wikilambdasearch_search' => 'Z48',
			],
			// match with all objects in Z48*
			[
				[ 'Z480', 'Make pangolin', 'Z480' ],
				[ 'Z481', 'Return anything', 'Z481' ],
				[ 'Z482', 'Anything', 'Z482' ],
				[ 'Z483', 'Wikidata Enumeration', 'Z483' ],
			]
		];

		yield 'returns all objects that match a substring ordered by match rate' => [
			// search for Z48
			[
				'wikilambdasearch_language' => 'en',
				'wikilambdasearch_search' => 'Any',
			],
			// match with all objects in Z48*
			[
				[ 'Z482', 'Anything', 'Anything' ],
				[ 'Z481', 'Return anything', 'Return anything' ],
			]
		];

		yield 'returns all objects that match a substring and a type' => [
			// search for Text
			[
				'wikilambdasearch_language' => 'en',
				'wikilambdasearch_search' => 'Text',
				'wikilambdasearch_type' => 'Z4',
			],
			// results that match with Text and text
			[
				[ 'Z490', 'Text', 'Text' ],
				[ 'Z492', 'Word', 'Textitos' ],
			]
		];

		yield 'returns all objects that match a substring and a return type' => [
			// search for Text
			[
				'wikilambdasearch_language' => 'en',
				'wikilambdasearch_search' => 'Text',
				'wikilambdasearch_return_type' => 'Z4',
			],
			// results that match with Text and text
			[
				[ 'Z490', 'Text', 'Text' ],
				[ 'Z492', 'Word', 'Textitos' ],
				[ 'Z491', 'Text of a given length', 'Text of a given length' ],
			]
		];

		yield 'returns functions with compound return type Z881(Z1)' => [
			[
				'wikilambdasearch_language' => 'en',
				'wikilambdasearch_type' => 'Z8',
				'wikilambdasearch_return_type' => 'Z881'
			],
			[
				[ 'Z900', 'append element to Typed list' ],
			],
		];

		// T400268: aggregate results of tokenized search term
		yield 'returns all results that match both tokens of the search term' => [
			// search for objects of that resolve to the type Z4
			[
				'wikilambdasearch_language' => 'en',
				'wikilambdasearch_search' => 'enum wikidata'
			],
			// renders results: Z483 Wikidata enumeration
			[
				[ 'Z483', 'Wikidata Enumeration', 'Wikidata Enumeration' ],
			]
		];
	}

	/**
	 * @dataProvider provideMatchRates
	 */
	public function testMatchRates( $apiParams, $expectedResults ) {
		// Make request (do not page):
		$request = array_merge( [
			'action' => 'query',
			'list' => 'wikilambdasearch_labels',
			'wikilambdasearch_limit' => 5000
		], $apiParams );

		$actualResponse = $this->doApiRequest( $request );
		$actualResults = $actualResponse[0][ 'query' ][ 'wikilambdasearch_labels' ];

		// Make sure that the result count is the expected
		$this->assertSameSize( $expectedResults, $actualResults );

		// Make sure that the results are ordered correctly
		foreach ( $expectedResults as $index => $expectedResult ) {
			$actualResult = $actualResults[ $index ];
			$this->assertSame( $expectedResult[0], $actualResult[ 'page_title' ] );
			$this->assertSame( $expectedResult[1], $actualResult[ 'label' ] );
			if ( $expectedResult[2] ) {
				$this->assertSame( $expectedResult[2], $actualResult[ 'match_rate' ] );
			}
		}
	}

	public static function provideMatchRates() {
		yield 'search one token string' => [
			[
				'wikilambdasearch_search' => 'age',
				'wikilambdasearch_language' => 'en',
				'wikilambdasearch_type' => 'Z20000'
			],
			[
				[ 'Z20001', 'Age', 1.0 ],
				[ 'Z20002', 'Age range', null ],
				[ 'Z20003', 'Age in years', null ],
				// Matches substring "age", but rated low
				[ 'Z20005', 'Average', null ],
			]
		];

		yield 'search multiple token string with exact match' => [
			[
				'wikilambdasearch_search' => 'age range',
				'wikilambdasearch_language' => 'en',
				'wikilambdasearch_type' => 'Z20000'
			],
			[
				[ 'Z20002', 'Age range', 1.0 ],
				[ 'Z20001', 'Age', null ],
				[ 'Z20003', 'Age in years', null ],
				// Matches token "range", but rated low
				[ 'Z20004', 'Range of natural numbers', null ],
				[ 'Z20006', 'Arrange integers', null ],
				// Matches token "age", but rated the lowest
				[ 'Z20005', 'Average', null ],
			]
		];

		yield 'search multiple token string and order matches by different criteria' => [
			[
				'wikilambdasearch_search' => 'one two three',
				'wikilambdasearch_language' => 'en',
				'wikilambdasearch_type' => 'Z30000'
			],
			[
				// Full match: scores 1.0
				[ 'Z30004', 'One two three', 1.0 ],
				// All tokens match: boosted due to full coverage
				[ 'Z30005', 'Three two one', null ],
				// Fully matches the first token: boosted due to position
				[ 'Z30001', 'One', null ],
				// Fully matches a longer token
				[ 'Z30003', 'Three', null ],
				// Partially matches first token at the beginning
				[ 'Z30006', 'One four five', null ],
				// Fully matches a shorter and middle token
				[ 'Z30002', 'Two', null ],
				// Partially matches one of the later tokens
				[ 'Z30007', 'Three four five', null ],
			]
		];
	}
}
