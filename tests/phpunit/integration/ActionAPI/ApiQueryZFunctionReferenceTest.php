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
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\ApiQueryZFunctionReference
 * @group Database
 * @group API
 */
class ApiQueryZFunctionReferenceTest extends WikiLambdaApiTestCase {

	private const EN = 'Z1002';
	private const IT = 'Z1787';
	private const EGL = 'Z1726';

	/**
	 * @var array
	 */
	private $testData = [
		'Z10030' => [
			'wlzf_ref_zid' => 'Z10030',
			'wlzf_zfunction_zid' => 'Z10029',
			'wlzf_type' => 'Z14'
		],
		'Z10031' => [
			'wlzf_ref_zid' => 'Z10031',
			'wlzf_zfunction_zid' => 'Z10029',
			'wlzf_type' => 'Z14'
		],
		'Z10032' => [
			'wlzf_ref_zid' => 'Z10032',
			'wlzf_zfunction_zid' => 'Z10028',
			'wlzf_type' => 'Z14'
		]
	];

	public function addDBDataOnce(): void {
		$langs = ZLangRegistry::singleton();
		$langs->register( self::EN, 'en' );
		$langs->register( self::IT, 'it' );
		$langs->register( self::EGL, 'egl' );

		$this->getDb()->newInsertQueryBuilder()
			->insertInto( 'wikilambda_zobject_function_join' )
			->rows( array_values( $this->testData ) )
			->caller( __METHOD__ )
			->execute();
	}

	public function testNoResults() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdafn_search',
			'wikilambdafn_zfunction_id' => 'Z0',
			'wikilambdafn_type' => 'Z14'
		] );
		$this->assertEquals(
			[
				'batchcomplete' => true,
				'query' => [
					'wikilambdafn_search' => []
				]
			], $result[0] );
	}

	public function testLimit() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdafn_search',
			'wikilambdafn_zfunction_id' => 'Z10029',
			'wikilambdafn_type' => 'Z14',
			'wikilambdafn_limit' => 1,
		] );

		$expected = [
			'batchcomplete' => true,
			'query' => [
				'wikilambdafn_search' => [
					[
						'page_namespace' => NS_MAIN,
						'zid' => 'Z10030'
					]
				]
			],
			'continue' => [
				'wikilambdafn_continue' => '2',
				'continue' => '-||',
			],
		];
		$this->assertEquals( $expected, $result[0] );
	}

	public function testSearch() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdafn_search',
			'wikilambdafn_zfunction_id' => 'Z10029',
			'wikilambdafn_type' => 'Z14'
		] );
		$expected = [
			'batchcomplete' => true,
			'query' => [
				'wikilambdafn_search' => [
					[
						'page_namespace' => NS_MAIN,
						'zid' => 'Z10030'
					],
					[
						'page_namespace' => NS_MAIN,
						'zid' => 'Z10031'
					]
				]
			]
		];

		// On postgres the api result may not in order
		sort( $result[0]['query']['wikilambdafn_search'] );

		$this->assertEquals( $expected, $result[0] );
	}
}
