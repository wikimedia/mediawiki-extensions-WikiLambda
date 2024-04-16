<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI;

use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Tests\Api\ApiTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\ApiQueryZObjectLabels
 * @group Database
 * @group API
 */
class ApiQueryZObjectLabelsTest extends ApiTestCase {

	private const EN = 'Z1002';
	private const ES = 'Z1003';
	private const IT = 'Z1787';
	private const EGL = 'Z1726';

	/**
	 * @var array
	 */
	private $testData = [
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
		]
	];

	public function addDBDataOnce(): void {
		$langs = ZLangRegistry::singleton();
		$langs->register( self::EN, 'en' );
		$langs->register( self::ES, 'es' );

		$this->db->newInsertQueryBuilder()
			->insertInto( 'wikilambda_zobject_labels' )
			->rows( $this->testData )
			->caller( __METHOD__ )
			->execute();
	}

	private function resultFor( $zid, $resultTerm, $matchTerm = null ) {
		$resultRow = null;
		$matchRow = null;

		foreach ( $this->testData as $row ) {
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
			'return_type' => $resultRow['wlzl_return_type'],
			'match_label' => ( $matchRow !== null ) ? $matchTerm : null,
			'match_is_primary' => ( $matchRow !== null ) ? strval( $matchRow[ 'wlzl_label_primary' ] ) : null,
			'match_lang' => ( $matchRow !== null ) ? $matchRow[ 'wlzl_language' ] : null,
			'match_rate' => 0,
			'label' => $resultRow[ 'wlzl_label' ],
			'type_label' => null
		];
	}

	public function testNoResults() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_labels',
			'wikilambdasearch_search' => 'boolean',
			'wikilambdasearch_language' => 'en',
			'wikilambdasearch_type' => 'Z1',
		] );
		$this->assertEquals( [ 'batchcomplete' => true ], $result[0] );
	}

	public function testSearchByType() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_labels',
			'wikilambdasearch_language' => 'en',
			'wikilambdasearch_type' => 'Z8',
		] );
		$expected = [
			'batchcomplete' => true,
			'query' => [
				'wikilambdasearch_labels' => [
					$this->resultFor( 'Z491', 'Text of a given length' ),
					$this->resultFor( 'Z480', 'Make pangolin' ),
					$this->resultFor( 'Z481', 'Return anything' ),
				]
			]
		];
		$this->assertEquals( $expected, $result[0] );
	}

	public function testSearchByReturnType() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_labels',
			'wikilambdasearch_language' => 'en',
			'wikilambdasearch_return_type' => 'Z4',
		] );
		$expected = [
			'batchcomplete' => true,
			'query' => [
				'wikilambdasearch_labels' => [
					$this->resultFor( 'Z491', 'Text of a given length' ),
					$this->resultFor( 'Z481', 'Return anything' ),
				]
			]
		];
		$this->assertEquals( $expected, $result[0] );
	}

	public function testSearchByStrictReturnType() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_labels',
			'wikilambdasearch_language' => 'en',
			'wikilambdasearch_return_type' => 'Z4',
			'wikilambdasearch_strict_return_type' => true,
		] );
		$expected = [
			'batchcomplete' => true,
			'query' => [
				'wikilambdasearch_labels' => [
					$this->resultFor( 'Z491', 'Text of a given length' ),
				]
			]
		];
		$this->assertEquals( $expected, $result[0] );
	}

	public function testSearchByTypeAndReturnType() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_labels',
			'wikilambdasearch_language' => 'en',
			'wikilambdasearch_type' => 'Z10000',
			'wikilambdasearch_return_type' => 'Z10000',
		] );
		$expected = [
			'batchcomplete' => true,
			'query' => [
				'wikilambdasearch_labels' => [
					$this->resultFor( 'Z480', 'Make pangolin' ),
					$this->resultFor( 'Z481', 'Return anything' ),
				]
			]
		];
		$this->assertEquals( $expected, $result[0] );
	}

	public function testSearchByTypeAndStrictReturnType() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_labels',
			'wikilambdasearch_language' => 'en',
			'wikilambdasearch_type' => 'Z10000',
			'wikilambdasearch_return_type' => 'Z10000',
			'wikilambdasearch_strict_return_type' => true,
		] );
		$expected = [
			'batchcomplete' => true,
			'query' => [
				'wikilambdasearch_labels' => [
					$this->resultFor( 'Z480', 'Make pangolin' )
				]
			]
		];
		$this->assertEquals( $expected, $result[0] );
	}

	public function testLimit() {
		$precondition_result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_labels',
			'wikilambdasearch_language' => 'es',
			'wikilambdasearch_type' => 'Z4'
		] );
		$precondition_expected = [
			'batchcomplete' => true,
			'query' => [
				'wikilambdasearch_labels' => [
					$this->resultFor( 'Z490', 'Texto' ),
					$this->resultFor( 'Z492', 'Palabra' )
				]
			]
		];
		$this->assertEquals( $precondition_expected, $precondition_result[0] );

		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_labels',
			'wikilambdasearch_language' => 'es',
			'wikilambdasearch_type' => 'Z4',
			'wikilambdasearch_limit' => 1
		] );
		$expected = [
			'batchcomplete' => true,
			'continue' => [
				'wikilambdasearch_continue' => '1',
				'continue' => '-||',
			],
			'query' => [
				'wikilambdasearch_labels' => [
					$this->resultFor( 'Z490', 'Texto' ),
				]
			]
		];
		$this->assertEquals( $expected, $result[0] );
	}

	public function testContinue() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_labels',
			'wikilambdasearch_language' => 'es',
			'wikilambdasearch_type' => 'Z4',
			'wikilambdasearch_limit' => 1,
			'wikilambdasearch_continue' => 1,
		] );
		$expected = [
			'batchcomplete' => true,
			'query' => [
				'wikilambdasearch_labels' => [
					$this->resultFor( 'Z492', 'Palabra' ),
				]
			]
		];
		$this->assertEquals( $expected, $result[0] );
	}

	public function testSearchByLanguageWithFallback() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_labels',
			'wikilambdasearch_language' => 'es'
		] );
		$expected = [
			'batchcomplete' => true,
			'query' => [
				'wikilambdasearch_labels' => [
					$this->resultFor( 'Z490', 'Texto' ),
					$this->resultFor( 'Z492', 'Palabra' ),
					$this->resultFor( 'Z491', 'Text of a given length' ),
					$this->resultFor( 'Z480', 'Make pangolin' ),
					$this->resultFor( 'Z481', 'Return anything' ),
					$this->resultFor( 'Z482', 'Anything' )
				]
			]
		];
		$this->assertEquals( $expected, $result[0] );
	}

	public function testSearchByLabelExact() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_labels',
			'wikilambdasearch_language' => 'en',
			'wikilambdasearch_search' => 'TEXT',
			'wikilambdasearch_exact' => true
		] );
		$expected = [
			'batchcomplete' => true
		];
		$this->assertEquals( $expected, $result[0] );
	}

	public function testSearchByZid() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_labels',
			'wikilambdasearch_language' => 'en',
			'wikilambdasearch_search' => 'Z48'
		] );

		$matches = [];
		foreach ( $result[0][ 'query' ][ 'wikilambdasearch_labels' ] as &$item ) {
			$matches[] = $item[ 'match_rate' ];
			$item[ 'match_rate' ] = 0.0;
		}

		$expected = [
			'batchcomplete' => true,
			'query' => [
				'wikilambdasearch_labels' => [
					$this->resultFor( 'Z480', 'Make pangolin', 'Z480' ),
					$this->resultFor( 'Z481', 'Return anything', 'Z481' ),
					$this->resultFor( 'Z482', 'Anything', 'Z482' ),
				]
			]
		];

		$this->assertEquals( $expected, $result[0] );
		$this->assertEquals( [ 0.75, 0.75, 0.75 ], $matches );
	}

	public function testSearchByLabel_order() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_labels',
			'wikilambdasearch_language' => 'en',
			'wikilambdasearch_search' => 'Any'
		] );

		$matches = [];
		foreach ( $result[0][ 'query' ][ 'wikilambdasearch_labels' ] as &$item ) {
			$matches[] = $item[ 'match_rate' ];
			$item[ 'match_rate' ] = 0.0;
		}

		$expected = [
			'batchcomplete' => true,
			'query' => [
				'wikilambdasearch_labels' => [
					$this->resultFor( 'Z482', 'Anything', 'Anything' ),
					$this->resultFor( 'Z481', 'Return anything', 'Return anything' )
				]
			]
		];

		$this->assertEquals( $expected, $result[0] );
		$this->assertEquals( [ 0.375, 0.13333333333333333 ], $matches );
	}

	public function testSearchByLabel() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_labels',
			'wikilambdasearch_language' => 'en',
			'wikilambdasearch_search' => 'Text'
		] );

		$matches = [];
		foreach ( $result[0][ 'query' ][ 'wikilambdasearch_labels' ] as &$item ) {
			$matches[] = $item[ 'match_rate' ];
			$item[ 'match_rate' ] = 0.0;
		}

		$expected = [
			'batchcomplete' => true,
			'query' => [
				'wikilambdasearch_labels' => [
					$this->resultFor( 'Z490', 'Text', 'Text' ),
					$this->resultFor( 'Z492', 'Word', 'Textitos' ),
					$this->resultFor( 'Z491', 'Text of a given length', 'Generic text' ),
				]
			]
		];

		$this->assertEquals( $expected, $result[0] );
		$this->assertEquals( [ 1, 0.5, 0.25 ], $matches );
	}
}
