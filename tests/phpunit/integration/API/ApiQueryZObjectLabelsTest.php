<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Api;

use ApiTestCase;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjectLabels
 * @group Database
 * @group API
 * @group WikiLambda
 * @group medium
 */
class ApiQueryZObjectLabelsTest extends ApiTestCase {

	private const EN = 'Z1002';
	private const IT = 'Z1787';
	private const EGL = 'Z1726';

	private $testData = [
	// TODO: Expand this test data to cover aliases
	// (wlzl_label_primary set to 0 and more than one result per language)
		'Z90' => [
			'wlzl_zobject_zid' => 'Z90',
			'wlzl_type' => 'birdtype',
			'wlzl_language' => self::IT,
			'wlzl_label' => 'CHEEP',
			'wlzl_label_normalised' => 'cheep',
			'wlzl_label_primary' => 1,
		],
		'Z92' => [
			'wlzl_zobject_zid' => 'Z92',
			'wlzl_type' => 'fruittype',
			'wlzl_language' => self::EGL,
			'wlzl_label' => 'CHOP',
			'wlzl_label_normalised' => 'chop',
			'wlzl_label_primary' => 1,
		],
		'Z93' => [
			'wlzl_zobject_zid' => 'Z93',
			'wlzl_type' => 'badtype',
			'wlzl_language' => self::EN,
			'wlzl_label' => 'CHAP',
			'wlzl_label_normalised' => 'chap',
			'wlzl_label_primary' => 1,
		],
		'Z91' => [
			'wlzl_zobject_zid' => 'Z91',
			'wlzl_type' => 'birdtype',
			'wlzl_language' => self::IT,
			'wlzl_label' => 'CHORP',
			'wlzl_label_normalised' => 'cheep',
			'wlzl_label_primary' => 1,
		],
	];

	public function addDBDataOnce(): void {
		$langs = ZLangRegistry::singleton();
		$langs->register( self::EN, 'en' );
		$langs->register( self::IT, 'it' );
		$langs->register( self::EGL, 'egl' );

		foreach ( $this->testData as $key => $testdatum ) {
			$this->db->insert( 'wikilambda_zobject_labels', $testdatum );
		}
	}

	private function resultFor( $zid ) {
		$db_item = $this->testData[ $zid ];
		return [
			'page_namespace' => NS_MAIN,
			'page_title' => $db_item['wlzl_zobject_zid'],
			'page_type' => $db_item['wlzl_type'],
			'label' => $db_item['wlzl_label'],
			'page_id' => 0,
			'page_is_redirect' => false,
			'page_content_model' => CONTENT_MODEL_ZOBJECT,
			'page_lang' => $db_item['wlzl_language'],
			'is_primary' => $db_item['wlzl_label_primary']
		];
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjectLabels::execute
	 */
	public function testNoResults() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_labels',
			'wikilambdasearch_search' => 'chip',
			'wikilambdasearch_language' => 'en',
			'wikilambdasearch_type' => 'theforbiddentype',
		] );
		$this->assertEquals( [ 'batchcomplete' => true ], $result[0] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjectLabels::execute
	 */
	public function testSearchByType() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_labels',
			'wikilambdasearch_language' => 'it',
			'wikilambdasearch_type' => 'birdtype',
		] );
		$expected = [
			'batchcomplete' => true,
			'query' => [
				'wikilambdasearch_labels' => [
					$this->resultFor( 'Z90' ),
					$this->resultFor( 'Z91' ),
				]
			]
		];
		$this->assertEquals( $expected, $result[0] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjectLabels::execute
	 * // TODO: Test setContinueEnumParameter when numRows() > limit.
	 */
	public function testLimit() {
		$precondition_result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_labels',
			'wikilambdasearch_language' => 'it',
			'wikilambdasearch_type' => 'birdtype',
		] );
		$this->assertCount( 2, $precondition_result[0]['query']['wikilambdasearch_labels'] );

		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_labels',
			'wikilambdasearch_language' => 'it',
			'wikilambdasearch_type' => 'birdtype',
			'wikilambdasearch_limit' => 1,  // Limit is off by one?
		] );
		$expected = [
			'batchcomplete' => true,
			'continue' => [
				'wikilambdasearch_continue' => '1',
				'continue' => '-||',
			],
			'query' => [
				'wikilambdasearch_labels' => [
					$this->resultFor( 'Z90' ),
				]
			]
		];
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjectLabels::execute
	 */
	public function testSearchByLanguageNoFallback() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_labels',
			'wikilambdasearch_language' => 'it',
			// 'wikilambdasearch_nofallback' => true,  // default
		] );
		$expected = [
			'batchcomplete' => true,
			'query' => [
				'wikilambdasearch_labels' => [
					$this->resultFor( 'Z90' ),
					$this->resultFor( 'Z93' ),  // en is always included because of History
					$this->resultFor( 'Z91' ),
				]
			]
		];
		$this->assertEquals( $expected, $result[0] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjectLabels::execute
	 * @group Broken
	 */
	public function testSearchByLanguageNotNoFallback() {
		// TODO: Remove Broken annotation once Boolean parameters can be false.
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_labels',
			'wikilambdasearch_language' => 'egl',
			'wikilambdasearch_nofallback' => false,
		] );
		$expected = [
			'batchcomplete' => true,
			'query' => [
				'wikilambdasearch_labels' => [
					$this->resultFor( 'Z90' ),  // egl falls back to it
					$this->resultFor( 'Z91' ),  // egl falls back to it
					$this->resultFor( 'Z92' ),
					$this->resultFor( 'Z93' ),  // all languages fall back to en
				]
			]
		];
		$this->assertEquals( $expected, $result[0] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjectLabels::execute
	 * @group Broken
	 */
	public function testSearchByLabelInexact() {
		// TODO: Remove Broken annotation once Boolean parameters can be false.
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_labels',
			'wikilambdasearch_language' => 'it',
			'wikilambdasearch_search' => 'CHEEP',
			// 'wikilambdasearch_exact' => false,  // default
		] );
		$expected = [
			'batchcomplete' => true,
			'query' => [
				'wikilambdasearch_labels' => [
					[
						$this->resultFor( 'Z90' ),
						$this->resultFor( 'Z91' ),
					]
				]
			]
		];
		$this->assertEquals( $expected, $result[0] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjectLabels::execute
	 */
	public function testSearchByLabelExact() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_labels',
			'wikilambdasearch_exact' => true,
			'wikilambdasearch_language' => 'it',
			'wikilambdasearch_search' => 'CHORP',
		] );
		$expected = [
			'batchcomplete' => true,
			'query' => [
				'wikilambdasearch_labels' => [
					$this->resultFor( 'Z91' ),
				]
			]
		];
		$this->assertEquals( $expected, $result[0] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjectLabels::execute
	 */
	public function testContinue() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_labels',
			'wikilambdasearch_language' => 'it',
			'wikilambdasearch_nofallback' => false,
			'wikilambdasearch_continue' => 2,
		] );
		$expected = [
			'batchcomplete' => true,
			'query' => [
				'wikilambdasearch_labels' => [
					$this->resultFor( 'Z91' ),
				]
			]
		];
		$this->assertEquals( $expected, $result[0] );
	}

}
