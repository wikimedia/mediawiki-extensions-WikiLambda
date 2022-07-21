<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Api;

use ApiTestCase;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\API\ApiQueryZFunctionReference
 * @group Database
 * @group API
 * @group WikiLambda
 * @group medium
 */
class ApiQueryZFunctionReferenceTest extends ApiTestCase {

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

		foreach ( $this->testData as $key => $testdatum ) {
			$this->db->insert( 'wikilambda_zobject_function_join', $testdatum );
		}
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZFunctionReference::execute
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZFunctionReference::run
	 */
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
					'wikilambdafn_search' => [
						false
					]
				]
			], $result[0] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZFunctionReference::execute
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZFunctionReference::run
	 */
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

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZFunctionReference::execute
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZFunctionReference::run
	 */
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
