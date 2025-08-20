<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI;

use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;

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
	 * @var array
	 */
	private $labelData = [
		[
			'wlzl_zobject_zid' => 'Z490',
			'wlzl_type' => 'Z4',
			'wlzl_language' => self::EN,
			'wlzl_label' => 'Text',
			'wlzl_label_normalised' => 'text',
			'wlzl_label_primary' => 1,
			'wlzl_return_type' => null,
		], [
			'wlzl_zobject_zid' => 'Z490',
			'wlzl_type' => 'Z4',
			'wlzl_language' => self::ES,
			'wlzl_label' => 'Texto',
			'wlzl_label_normalised' => 'texto',
			'wlzl_label_primary' => 1,
			'wlzl_return_type' => null,
		], [
			'wlzl_zobject_zid' => 'Z490',
			'wlzl_type' => 'Z4',
			'wlzl_language' => self::EN,
			'wlzl_label' => 'Long text',
			'wlzl_label_normalised' => 'long text',
			'wlzl_label_primary' => 0,
			'wlzl_return_type' => null,
		], [
			'wlzl_zobject_zid' => 'Z490',
			'wlzl_type' => 'Z4',
			'wlzl_language' => self::EN,
			'wlzl_label' => 'Paragraph',
			'wlzl_label_normalised' => 'paragraph',
			'wlzl_label_primary' => 0,
			'wlzl_return_type' => null,
		], [
			'wlzl_zobject_zid' => 'Z492',
			'wlzl_type' => 'Z4',
			'wlzl_language' => self::EN,
			'wlzl_label' => 'Word',
			'wlzl_label_normalised' => 'word',
			'wlzl_label_primary' => 1,
			'wlzl_return_type' => null,
		], [
			'wlzl_zobject_zid' => 'Z492',
			'wlzl_type' => 'Z4',
			'wlzl_language' => self::ES,
			'wlzl_label' => 'Palabra',
			'wlzl_label_normalised' => 'palabra',
			'wlzl_label_primary' => 1,
			'wlzl_return_type' => null,
		], [
			'wlzl_zobject_zid' => 'Z492',
			'wlzl_type' => 'Z4',
			'wlzl_language' => self::EN,
			'wlzl_label' => 'Short tiny text',
			'wlzl_label_normalised' => 'short tiny text',
			'wlzl_label_primary' => 0,
			'wlzl_return_type' => null,
		], [
			'wlzl_zobject_zid' => 'Z492',
			'wlzl_type' => 'Z4',
			'wlzl_language' => self::ES,
			'wlzl_label' => 'Textitos',
			'wlzl_label_normalised' => 'textito',
			'wlzl_label_primary' => 0,
			'wlzl_return_type' => null,
		], [
			'wlzl_zobject_zid' => 'Z491',
			'wlzl_type' => 'Z8',
			'wlzl_language' => self::EN,
			'wlzl_label' => 'Text of a given length',
			'wlzl_label_normalised' => 'text of a given length',
			'wlzl_label_primary' => 1,
			'wlzl_return_type' => 'Z4',
		], [
			'wlzl_zobject_zid' => 'Z491',
			'wlzl_type' => 'Z8',
			'wlzl_language' => self::EN,
			'wlzl_label' => 'Generic text',
			'wlzl_label_normalised' => 'generic text',
			'wlzl_label_primary' => 0,
			'wlzl_return_type' => 'Z4',
		], [
			'wlzl_zobject_zid' => 'Z480',
			'wlzl_type' => 'Z8',
			'wlzl_language' => self::EN,
			'wlzl_label' => 'Make pangolin',
			'wlzl_label_normalised' => 'make pangolin',
			'wlzl_label_primary' => 1,
			'wlzl_return_type' => 'Z10000',
		], [
			'wlzl_zobject_zid' => 'Z481',
			'wlzl_type' => 'Z8',
			'wlzl_language' => self::EN,
			'wlzl_label' => 'Return anything',
			'wlzl_label_normalised' => 'return anything',
			'wlzl_label_primary' => 1,
			'wlzl_return_type' => 'Z1',
		], [
			'wlzl_zobject_zid' => 'Z482',
			'wlzl_type' => 'Z10001',
			'wlzl_language' => self::EN,
			'wlzl_label' => 'Anything',
			'wlzl_label_normalised' => 'anything',
			'wlzl_label_primary' => 1,
			'wlzl_return_type' => null,
		], [
			'wlzl_zobject_zid' => 'Z483',
			'wlzl_type' => 'Z7',
			'wlzl_language' => self::EN,
			'wlzl_label' => 'Wikidata Enumeration',
			'wlzl_label_normalised' => 'wikidata enumeration',
			'wlzl_label_primary' => 1,
			'wlzl_return_type' => null,
		], [
			'wlzl_zobject_zid' => 'Z900',
			'wlzl_type' => 'Z8',
			'wlzl_language' => self::EN,
			'wlzl_label' => 'append element to Typed list',
			'wlzl_label_normalised' => 'append element to typed list',
			'wlzl_label_primary' => 1,
			'wlzl_return_type' => 'Z881(Z1)',
		],
	];

	/**
	 * @var array
	 */
	private $joinData = [
		[
			'wlzo_main_zid' => 'Z491',
			'wlzo_main_type' => 'Z8',
			'wlzo_key' => 'Z8K2',
			'wlzo_related_zobject' => 'Z4',
			'wlzo_related_type' => 'Z4'
		], [
			'wlzo_main_zid' => 'Z480',
			'wlzo_main_type' => 'Z8',
			'wlzo_key' => 'Z8K2',
			'wlzo_related_zobject' => 'Z10000',
			'wlzo_related_type' => 'Z4'
		], [
			'wlzo_main_zid' => 'Z481',
			'wlzo_main_type' => 'Z8',
			'wlzo_key' => 'Z8K2',
			'wlzo_related_zobject' => 'Z1',
			'wlzo_related_type' => 'Z4'
		], [
			'wlzo_main_zid' => 'Z483',
			'wlzo_main_type' => 'Z7',
			'wlzo_key' => 'Z7K1',
			'wlzo_related_zobject' => 'Z6884',
			'wlzo_related_type' => 'Z8'
		], [
			'wlzo_main_zid' => 'Z6884',
			'wlzo_main_type' => 'Z8',
			'wlzo_key' => 'Z8K2',
			'wlzo_related_zobject' => 'Z4',
			'wlzo_related_type' => 'Z4'
		], [
			'wlzo_main_zid' => 'Z900',
			'wlzo_main_type' => 'Z8',
			'wlzo_key' => 'Z8K2',
			'wlzo_related_zobject' => 'Z881(Z1)',
			'wlzo_related_type' => 'Z4'
		]
	];

	public function addDBDataOnce(): void {
		$langs = ZLangRegistry::singleton();
		$langs->register( self::EN, 'en' );
		$langs->register( self::ES, 'es' );

		// Add label data
		$this->getDb()->newInsertQueryBuilder()
			->insertInto( 'wikilambda_zobject_labels' )
			->rows( $this->labelData )
			->caller( __METHOD__ )
			->execute();

		// Add join data
		$this->getDb()->newInsertQueryBuilder()
			->insertInto( 'wikilambda_zobject_join' )
			->rows( $this->joinData )
			->caller( __METHOD__ )
			->execute();
	}

	private function resultFor( $zid, $resultTerm, $matchTerm = null, $matchRate = 0.0 ) {
		$resultRow = null;
		$matchRow = null;

		foreach ( $this->labelData as $row ) {
			if ( $row[ 'wlzl_zobject_zid' ] === $zid ) {
				if ( ( $row[ 'wlzl_label' ] === $matchTerm ) || ( $row[ 'wlzl_zobject_zid' ] === $matchTerm ) ) {
					$matchRow = $row;
				}
				if ( $row[ 'wlzl_label' ] === $resultTerm ) {
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
			'page_type' => $resultRow['wlzl_type'],
			'match_label' => ( $matchRow !== null ) ? $matchTerm : null,
			'match_is_primary' => ( $matchRow !== null ) ? strval( $matchRow[ 'wlzl_label_primary' ] ) : null,
			'match_lang' => ( $matchRow !== null ) ? $matchRow[ 'wlzl_language' ] : null,
			'match_rate' => $matchRate,
			'label' => $resultRow[ 'wlzl_label' ],
			'type_label' => null
		];
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

		// Build expected response:
		$expectedResponse = [ 'batchcomplete' => true ];
		if ( count( $expectedResults ) > 0 ) {
			$results = array_map( function ( $result ) {
				$zid = $result[0];
				$label = $result[1];
				$matchLabel = count( $result ) > 2 ? $result[2] : null;
				$matchRate = count( $result ) > 3 ? $result[3] : null;
				return $this->resultFor( $zid, $label, $matchLabel, $matchRate );
			}, $expectedResults );
			$expectedResponse[ 'query' ] = [ 'wikilambdasearch_labels' => $results ];
			if ( $expectedContinue ) {
				$expectedResponse[ 'continue' ] = $expectedContinue;
			}
		}

		$this->assertEquals( $expectedResponse, $actualResponse[0] );
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
			[
				'wikilambdasearch_language' => 'es',
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
				[ 'Z490', 'Text', 'Text', 1 ],
				[ 'Z492', 'Word', 'Textitos', 0.5 ],
				[ 'Z491', 'Text of a given length', 'Generic text', 0.3333333333333333 ],
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
				[ 'Z480', 'Make pangolin', 'Z480', 0.75 ],
				[ 'Z481', 'Return anything', 'Z481', 0.75 ],
				[ 'Z482', 'Anything', 'Z482', 0.75 ],
				[ 'Z483', 'Wikidata Enumeration', 'Z483', 0.75 ],
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
				[ 'Z482', 'Anything', 'Anything', 0.375 ],
				[ 'Z481', 'Return anything', 'Return anything', 0.2 ],
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
				[ 'Z490', 'Text', 'Text', 1 ],
				[ 'Z492', 'Word', 'Textitos', 0.5 ],
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
				[ 'Z490', 'Text', 'Text', 1 ],
				[ 'Z492', 'Word', 'Textitos', 0.5 ],
				[ 'Z491', 'Text of a given length', 'Generic text', 0.3333333333333333 ],
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
	}
}
