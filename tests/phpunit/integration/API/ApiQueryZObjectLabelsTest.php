<?php

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjectLabels
 * @group Database
 * @group API
 * @group WikiLambda
 * @group medium
 */
class ApiQueryZObjectLabelsTest extends ApiTestCase {

	private $testData = [
		'Z90' => [
			'wlzl_zobject_zid' => 'Z90',
			'wlzl_type' => 'birdtype',
			'wlzl_language' => 'it',
			'wlzl_label' => 'CHEEP',
			'wlzl_label_normalised' => 'cheep',
		],
		'Z92' => [
			'wlzl_zobject_zid' => 'Z92',
			'wlzl_type' => 'fruittype',
			'wlzl_language' => 'egl',
			'wlzl_label' => 'CHOP',
			'wlzl_label_normalised' => 'chop',
		],
		'Z93' => [
			'wlzl_zobject_zid' => 'Z93',
			'wlzl_type' => 'badtype',
			'wlzl_language' => 'en',
			'wlzl_label' => 'CHAP',
			'wlzl_label_normalised' => 'chap',
		],
		'Z91' => [
			'wlzl_zobject_zid' => 'Z91',
			'wlzl_type' => 'birdtype',
			'wlzl_language' => 'it',
			'wlzl_label' => 'CHORP',
			'wlzl_label_normalised' => 'cheep',
		],
	];

	public function addDBDataOnce() : void {
		foreach ( $this->testData as $key => $testdatum ) {
			$this->db->insert( 'wikilambda_zobject_labels', $testdatum );
		}
	}

	private function resultFor( $zid ) {
		$db_item = $this->testData[ $zid ];
		return [
			'page_namespace' => NS_ZOBJECT,
			'page_title' => $db_item['wlzl_zobject_zid'],
			'page_type' => $db_item['wlzl_type'],
			'label' => $db_item['wlzl_label'],
			'page_id' => 0,
			'page_is_redirect' => false,
			'page_content_model' => CONTENT_MODEL_ZOBJECT,
			'page_lang' => $db_item['wlzl_language'],
		];
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjectLabels::execute
	 */
	public function testNoResults() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambda_searchlabels',
			'wikilambda_search' => 'chip',
			'wikilambda_language' => 'en',
			'wikilambda_type' => 'theforbiddentype',
		] );
		$this->assertEquals( [ 'batchcomplete' => true ], $result[0] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjectLabels::execute
	 */
	public function testSearchByType() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambda_searchlabels',
			'wikilambda_language' => 'it',
			'wikilambda_type' => 'birdtype',
		] );
		$expected = [
			'batchcomplete' => true,
			'query' => [
				'wikilambda_searchlabels' => [
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
			'list' => 'wikilambda_searchlabels',
			'wikilambda_language' => 'it',
			'wikilambda_type' => 'birdtype',
		] );
		$this->assertCount( 2, $precondition_result[0]['query']['wikilambda_searchlabels'] );

		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambda_searchlabels',
			'wikilambda_language' => 'it',
			'wikilambda_type' => 'birdtype',
			'wikilambda_limit' => 1,  // Limit is off by one?
		] );
		$expected = [
			'batchcomplete' => true,
			'continue' => [
				'wikilambda_continue' => '1',
				'continue' => '-||',
			],
			'query' => [
				'wikilambda_searchlabels' => [
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
			'list' => 'wikilambda_searchlabels',
			'wikilambda_language' => 'it',
			// 'wikilambda_nofallback' => true,  // default
		] );
		$expected = [
			'batchcomplete' => true,
			'query' => [
				'wikilambda_searchlabels' => [
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
			'list' => 'wikilambda_searchlabels',
			'wikilambda_language' => 'egl',
			'wikilambda_nofallback' => false,
		] );
		$expected = [
			'batchcomplete' => true,
			'query' => [
				'wikilambda_searchlabels' => [
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
			'list' => 'wikilambda_searchlabels',
			'wikilambda_language' => 'it',
			'wikilambda_search' => 'CHEEP',
			// 'wikilambda_exact' => false,  // default
		] );
		$expected = [
			'batchcomplete' => true,
			'query' => [
				'wikilambda_searchlabels' => [
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
			'list' => 'wikilambda_searchlabels',
			'wikilambda_exact' => true,
			'wikilambda_language' => 'it',
			'wikilambda_search' => 'CHORP',
		] );
		$expected = [
			'batchcomplete' => true,
			'query' => [
				'wikilambda_searchlabels' => [
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
			'list' => 'wikilambda_searchlabels',
			'wikilambda_language' => 'it',
			'wikilambda_nofallback' => false,
			'wikilambda_continue' => 2,
		] );
		$expected = [
			'batchcomplete' => true,
			'query' => [
				'wikilambda_searchlabels' => [
					$this->resultFor( 'Z91' ),
				]
			]
		];
		$this->assertEquals( $expected, $result[0] );
	}

}
