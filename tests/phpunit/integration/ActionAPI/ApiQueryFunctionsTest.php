<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI;

use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectSecondaryDataUpdate;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\ApiQueryFunctions
 * @group Database
 * @group API
 */
class ApiQueryFunctionsTest extends WikiLambdaApiTestCase {

	// Insert functions:
	// * labels in wikilambda_zobject_labels
	// * relations in wikilambda_zobject_join
	// Insert types:
	// * relations in wikilambda_zobject_join

	// Renderable functions:
	// 1. inputs and outputs are Z6
	// 2. output types have renderer function
	// 3. input types have a parser function
	// 4. input types are enums

	/**
	 * Content of wikilambda_zlanguages table
	 * @var array [zid, code]
	 */
	private $langData = [
		[ 'Z1002', 'en' ],
		[ 'Z1003', 'es' ],
	];

	/**
	 * Content of wikilambda_zobject_labels table
	 * @var array [zid, type, returnType, language, label, primary]
	 */
	private $labelData = [
		// Renderable
		// Input: Z6; Output: Z6
		[ 'Z10001', 'Z8', 'Z6', 'Z1002', 'English plural', 1 ],
		[ 'Z10001', 'Z8', 'Z6', 'Z1003', 'Plural en inglés', 1 ],
		// Input: Z6, Z6; Output: Z6
		[ 'Z10002', 'Z8', 'Z6', 'Z1002', 'English possesive phrase', 1 ],
		[ 'Z10002', 'Z8', 'Z6', 'Z1003', 'Frase posesiva en inglés', 1 ],
		// Input: Z6, Z40; Output: Z6
		[ 'Z10003', 'Z8', 'Z6', 'Z1002', 'English gendered phrase', 1 ],

		// Not renderable
		// Input: Z6; Output: Z40
		[ 'Z10004', 'Z8', 'Z40', 'Z1002', 'English is plural', 1 ],
		[ 'Z10004', 'Z8', 'Z40', 'Z1003', 'Es plural en inglés', 1 ],
		// Input: Z20000, Output: Z6
		[ 'Z10005', 'Z8', 'Z6', 'Z1002', 'Entity to English word', 1 ],
		// Input: Z6, Output: Z20000
		[ 'Z10006', 'Z8', 'Z20000', 'Z1002', 'English word to entity', 1 ],

		// Renderable
		// Input: Z20002; Output: Z20001
		[ 'Z10007', 'Z8', 'Z20001', 'Z1002', 'Renderable English entity', 1 ],
		// Input: Z20003; Output: Z20003
		[ 'Z10008', 'Z8', 'Z20003', 'Z1002', 'Renderable English lexeme', 1 ],
		// Input: Z6, Z40, Z20002; Output: Z20003
		[ 'Z10009', 'Z8', 'Z20003', 'Z1002', 'Renderable flagged English lexeme', 1 ],

		// Renderable but not running
		// Input: Z6, Output: Z6
		[ 'Z10010', 'Z8', 'Z6', 'Z1002', 'Renderable but not runnable English function', 1 ],

		// Wikidata Entities (T398728)
		// Input: Z6001; Output: Z6
		[ 'Z10011', 'Z8', 'Z6', 'Z1002', 'Wikidata item to English string', 1 ],
		// Input: Z6005; Output: Z6
		[ 'Z10012', 'Z8', 'Z6', 'Z1002', 'Wikidata lexeme to English string', 1 ],

		// Natural Language (T400165)
		// Input: Z60; Output: Z6
		[ 'Z10013', 'Z8', 'Z6', 'Z1002', 'Renderable English label', 1 ],
		// Input: Z6, Output: Z60
		[ 'Z10014', 'Z8', 'Z60', 'Z1002', 'Not Renderable English label', 1 ],
	];

	/**
	 * Content of wikilambda_zobject_join table
	 * @var array [zid, type, key, related zid, related type]
	 */
	private $joinData = [
		// Functions:
		// Z10001 input Z6; output Z6
		[ 'Z10001', 'Z8', 'Z8K1', 'Z6', 'Z4' ],
		[ 'Z10001', 'Z8', 'Z8K2', 'Z6', 'Z4' ],

		// Z10002 input Z6, Z6; output Z6
		[ 'Z10002', 'Z8', 'Z8K1', 'Z6', 'Z4' ],
		[ 'Z10002', 'Z8', 'Z8K1', 'Z6', 'Z4' ],
		[ 'Z10002', 'Z8', 'Z8K2', 'Z6', 'Z4' ],

		// Z10003 input Z6, Z40; output Z6
		[ 'Z10003', 'Z8', 'Z8K1', 'Z6', 'Z4' ],
		[ 'Z10003', 'Z8', 'Z8K1', 'Z40', 'Z4' ],
		[ 'Z10003', 'Z8', 'Z8K2', 'Z6', 'Z4' ],

		// Z10004 input Z6; output Z40
		[ 'Z10004', 'Z8', 'Z8K1', 'Z6', 'Z4' ],
		[ 'Z10004', 'Z8', 'Z8K2', 'Z40', 'Z4' ],

		// Z10005 input: Z20000, Output: Z6
		[ 'Z10005', 'Z8', 'Z8K1', 'Z20000', 'Z4' ],
		[ 'Z10005', 'Z8', 'Z8K2', 'Z6', 'Z4' ],

		// Z10006 input: Z6, Output: Z20000
		[ 'Z10006', 'Z8', 'Z8K1', 'Z6', 'Z4' ],
		[ 'Z10006', 'Z8', 'Z8K2', 'Z20000', 'Z4' ],

		// Z10007 input: Z20002; Output: Z20001
		[ 'Z10007', 'Z8', 'Z8K1', 'Z20002', 'Z4' ],
		[ 'Z10007', 'Z8', 'Z8K2', 'Z20001', 'Z4' ],

		// Z10008 input: Z20003; Output: Z20003
		[ 'Z10008', 'Z8', 'Z8K1', 'Z20003', 'Z4' ],
		[ 'Z10008', 'Z8', 'Z8K2', 'Z20003', 'Z4' ],

		// Z10009 input: Z6, Z6, Z40, Z20002; Output: Z20003
		[ 'Z10009', 'Z8', 'Z8K1', 'Z6', 'Z4' ],
		[ 'Z10009', 'Z8', 'Z8K1', 'Z6', 'Z4' ],
		[ 'Z10009', 'Z8', 'Z8K1', 'Z40', 'Z4' ],
		[ 'Z10009', 'Z8', 'Z8K1', 'Z20002', 'Z4' ],
		[ 'Z10009', 'Z8', 'Z8K2', 'Z20003', 'Z4' ],

		// Z10010 input Z6; output Z6
		[ 'Z10010', 'Z8', 'Z8K1', 'Z6', 'Z4' ],
		[ 'Z10010', 'Z8', 'Z8K2', 'Z6', 'Z4' ],

		// Z10011: input Z6001 (Wikidata Item), output Z6
		[ 'Z10011', 'Z8', 'Z8K1', 'Z6001', 'Z4' ],
		[ 'Z10011', 'Z8', 'Z8K2', 'Z6', 'Z4' ],

		// Z10012: input Z6005 (Wikidata Lexeme), output Z6
		[ 'Z10012', 'Z8', 'Z8K1', 'Z6005', 'Z4' ],
		[ 'Z10012', 'Z8', 'Z8K2', 'Z6', 'Z4' ],

		// Z10013: input Z60; output Z6
		[ 'Z10013', 'Z8', 'Z8K1', 'Z60', 'Z4' ],
		[ 'Z10013', 'Z8', 'Z8K2', 'Z6', 'Z4' ],

		// Z10014: input Z6; output Z60
		[ 'Z10014', 'Z8', 'Z8K1', 'Z6', 'Z4' ],
		[ 'Z10014', 'Z8', 'Z8K2', 'Z60', 'Z4' ],

		// Types:
		// Z40 is enum:
		[ 'Z41', 'Z40', ZObjectSecondaryDataUpdate::INSTANCEOFENUM_DB_KEY, 'Z40', 'Z4' ],
		[ 'Z42', 'Z40', ZObjectSecondaryDataUpdate::INSTANCEOFENUM_DB_KEY, 'Z40', 'Z4' ],
		// Z20000: no renderer, no parser
		// Z20001: has renderer, no parser
		[ 'Z20001', 'Z4', 'Z4K5', 'Z10101', 'Z8' ],
		// Z20002: has parser, no renderer
		[ 'Z20002', 'Z4', 'Z4K6', 'Z10102', 'Z8' ],
		// Z20003: has renderer and parser
		[ 'Z20003', 'Z4', 'Z4K5', 'Z10103', 'Z8' ],
		[ 'Z20003', 'Z4', 'Z4K6', 'Z10104', 'Z8' ],

		// Implementations:
		[ 'Z10001', 'Z8', 'Z8K4', 'Z14', 'Z30001' ],
		[ 'Z10002', 'Z8', 'Z8K4', 'Z14', 'Z30002' ],
		[ 'Z10003', 'Z8', 'Z8K4', 'Z14', 'Z30003' ],
		[ 'Z10004', 'Z8', 'Z8K4', 'Z14', 'Z30004' ],
		[ 'Z10005', 'Z8', 'Z8K4', 'Z14', 'Z30005' ],
		[ 'Z10006', 'Z8', 'Z8K4', 'Z14', 'Z30006' ],
		[ 'Z10007', 'Z8', 'Z8K4', 'Z14', 'Z30007' ],
		[ 'Z10008', 'Z8', 'Z8K4', 'Z14', 'Z30008' ],
		// Z10009 has two implementations
		[ 'Z10009', 'Z8', 'Z8K4', 'Z14', 'Z30009' ],
		[ 'Z10009', 'Z8', 'Z8K4', 'Z14', 'Z30010' ],
		// Z10010 has no implementation
		[ 'Z10011', 'Z8', 'Z8K4', 'Z14', 'Z30011' ],
		[ 'Z10012', 'Z8', 'Z8K4', 'Z14', 'Z30012' ],
		[ 'Z10013', 'Z8', 'Z8K4', 'Z14', 'Z30013' ],
		[ 'Z10014', 'Z8', 'Z8K4', 'Z14', 'Z30014' ],
	];

	public function addDBDataOnce(): void {
		// Add language data:
		$langs = ZLangRegistry::singleton();
		$rows = [];
		foreach ( $this->langData as $data ) {
			$langs->register( $data[0], $data[1] );
			$rows[] = [
				'wlzlangs_zid' => $data[0],
				'wlzlangs_language' => $data[1]
			];
		}
		$this->getDb()->newInsertQueryBuilder()
			->insertInto( 'wikilambda_zlanguages' )
			->rows( $rows )
			->caller( __METHOD__ )
			->execute();

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

		// Add zobject join data:
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

	/**
	 * Returns the list of returned zids
	 *
	 * @param array $results
	 * @return array
	 */
	private function getReturnedZids( $results ) {
		$zids = array_map( static function ( $result ) {
			return $result[ 'page_title' ];
		}, $results );
		return $zids;
	}

	public function testNoResults() {
		$response = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_functions',
			'wikilambdasearch_functions_search' => 'foo',
			'wikilambdasearch_functions_language' => 'en'
		] );

		$this->assertEquals( [ 'batchcomplete' => true ], $response[0] );
	}

	public function testStringMatch() {
		$response = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_functions',
			'wikilambdasearch_functions_search' => 'Rend',
			'wikilambdasearch_functions_language' => 'en'
		] );

		$results = $response[0][ 'query' ][ 'wikilambdasearch_functions' ];
		$this->assertCount( 6, $results );
	}

	public function testStringMatch_userLang() {
		$response = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_functions',
			'wikilambdasearch_functions_search' => 'Eng',
			'wikilambdasearch_functions_language' => 'en'
		] );

		// Assert total result count
		$results = $response[0][ 'query' ][ 'wikilambdasearch_functions' ];
		$this->assertCount( 10, $results );

		// Assert selected labels are in user language
		$this->assertEquals( 'English plural', $results[0][ 'label' ] );
		$this->assertEquals( 'Z1002', $results[0][ 'language' ] );

		$this->assertEquals( 'English is plural', $results[1][ 'label' ] );
		$this->assertEquals( 'Z1002', $results[1][ 'language' ] );

		$this->assertEquals( 'English word to entity', $results[2][ 'label' ] );
		$this->assertEquals( 'Z1002', $results[2][ 'language' ] );
	}

	public function testStringMatch_fallbackLang() {
		$response = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_functions',
			'wikilambdasearch_functions_search' => 'Eng',
			'wikilambdasearch_functions_language' => 'es'
		] );

		// Assert total result count
		$results = $response[0][ 'query' ][ 'wikilambdasearch_functions' ];
		$this->assertCount( 10, $results );

		// Assert selected labels are in user language or fallback
		$this->assertEquals( 'Plural en inglés', $results[0][ 'label' ] );
		$this->assertEquals( 'Z1003', $results[0][ 'language' ] );

		$this->assertEquals( 'Es plural en inglés', $results[1][ 'label' ] );
		$this->assertEquals( 'Z1003', $results[1][ 'language' ] );

		$this->assertEquals( 'English word to entity', $results[2][ 'label' ] );
		$this->assertEquals( 'Z1002', $results[2][ 'language' ] );
	}

	public function testRenderable() {
		$this->overrideConfigValue( 'WikifunctionsEnableHTMLOutput', true );
		$this->overrideConfigValue( 'WikifunctionsEnableWikidataInputTypes', true );
		$response = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_functions',
			'wikilambdasearch_functions_search' => 'Eng',
			'wikilambdasearch_functions_language' => 'en',
			'wikilambdasearch_functions_renderable' => true
		] );

		$expectedZids = [
			'Z10001',
			'Z10002',
			'Z10003',
			'Z10007',
			'Z10008',
			'Z10009',
			'Z10011',
			'Z10012',
			'Z10013'
		];

		// Assert total result count
		$results = $response[0][ 'query' ][ 'wikilambdasearch_functions' ];
		$this->assertSameSize( $expectedZids, $results );

		// Assert correct zids are returned
		$returnedZids = $this->getReturnedZids( $results );
		$this->assertEqualsCanonicalizing( $expectedZids, $returnedZids );
	}

	public function testRenderableWithoutFeatureFlags() {
		$this->overrideConfigValue( 'WikifunctionsEnableHTMLOutput', false );
		$this->overrideConfigValue( 'WikifunctionsEnableWikidataInputTypes', false );
		$response = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_functions',
			'wikilambdasearch_functions_search' => 'Eng',
			'wikilambdasearch_functions_language' => 'en',
			'wikilambdasearch_functions_renderable' => true
		] );

		$expectedZids = [ 'Z10001', 'Z10002', 'Z10003', 'Z10007', 'Z10008', 'Z10009', 'Z10013' ];

		// Assert total result count
		$results = $response[0][ 'query' ][ 'wikilambdasearch_functions' ];
		$this->assertSameSize( $expectedZids, $results );

		// Assert correct zids are returned
		$returnedZids = $this->getReturnedZids( $results );
		$this->assertEqualsCanonicalizing( $expectedZids, $returnedZids );
	}

	public function testRenderable_stringMatch() {
		$response = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_functions',
			'wikilambdasearch_functions_search' => 'Rend',
			'wikilambdasearch_functions_language' => 'en',
			'wikilambdasearch_functions_renderable' => true
		] );

		$expectedZids = [ 'Z10007', 'Z10008', 'Z10009', 'Z10013' ];

		// Assert total result count
		$results = $response[0][ 'query' ][ 'wikilambdasearch_functions' ];
		$this->assertSameSize( $expectedZids, $results );

		// Assert correct zids are returned
		$returnedZids = $this->getReturnedZids( $results );
		$this->assertEqualsCanonicalizing( $expectedZids, $returnedZids );
	}

	public function testIO_inputString() {
		$response = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_functions',
			'wikilambdasearch_functions_search' => 'Eng',
			'wikilambdasearch_functions_language' => 'en',
			'wikilambdasearch_functions_input_types' => 'Z6',
		] );

		$expectedZids = [ 'Z10001', 'Z10002', 'Z10003', 'Z10004', 'Z10006', 'Z10009', 'Z10010', 'Z10014' ];

		// Assert total result count
		$results = $response[0][ 'query' ][ 'wikilambdasearch_functions' ];
		$this->assertSameSize( $expectedZids, $results );

		// Assert correct zids are returned
		$returnedZids = $this->getReturnedZids( $results );
		$this->assertEqualsCanonicalizing( $expectedZids, $returnedZids );
	}

	public function testIO_inputStringString() {
		$response = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_functions',
			'wikilambdasearch_functions_search' => 'Eng',
			'wikilambdasearch_functions_language' => 'en',
			'wikilambdasearch_functions_input_types' => 'Z6|Z6',
		] );

		$expectedZids = [ 'Z10002', 'Z10009' ];

		// Assert total result count
		$results = $response[0][ 'query' ][ 'wikilambdasearch_functions' ];
		$this->assertSameSize( $expectedZids, $results );

		// Assert correct zids are returned
		$returnedZids = $this->getReturnedZids( $results );
		$this->assertEqualsCanonicalizing( $expectedZids, $returnedZids );
	}

	public function testIO_inputStringBool() {
		$response = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_functions',
			'wikilambdasearch_functions_search' => 'Eng',
			'wikilambdasearch_functions_language' => 'en',
			'wikilambdasearch_functions_input_types' => 'Z6|Z40',
		] );

		$expectedZids = [ 'Z10003', 'Z10009' ];

		// Assert total result count
		$results = $response[0][ 'query' ][ 'wikilambdasearch_functions' ];
		$this->assertSameSize( $expectedZids, $results );

		// Assert correct zids are returned
		$returnedZids = $this->getReturnedZids( $results );
		$this->assertEqualsCanonicalizing( $expectedZids, $returnedZids );
	}

	public function testIO_outputString() {
		$response = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_functions',
			'wikilambdasearch_functions_search' => 'Eng',
			'wikilambdasearch_functions_language' => 'en',
			'wikilambdasearch_functions_output_type' => 'Z6',
		] );

		$expectedZids = [ 'Z10001', 'Z10002', 'Z10003', 'Z10005', 'Z10010', 'Z10011', 'Z10012', 'Z10013' ];

		// Assert total result count
		$results = $response[0][ 'query' ][ 'wikilambdasearch_functions' ];
		$this->assertSameSize( $expectedZids, $results );

		// Assert correct zids are returned
		$returnedZids = $this->getReturnedZids( $results );
		$this->assertEqualsCanonicalizing( $expectedZids, $returnedZids );
	}

	public function testIO_inputString_outputType() {
		$response = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdasearch_functions',
			'wikilambdasearch_functions_search' => 'Eng',
			'wikilambdasearch_functions_language' => 'en',
			'wikilambdasearch_functions_input_types' => 'Z6',
			'wikilambdasearch_functions_output_type' => 'Z20003',
		] );

		$expectedZids = [ 'Z10009' ];

		// Assert total result count
		$results = $response[0][ 'query' ][ 'wikilambdasearch_functions' ];
		$this->assertSameSize( $expectedZids, $results );

		// Assert correct zids are returned
		$returnedZids = $this->getReturnedZids( $results );
		$this->assertEqualsCanonicalizing( $expectedZids, $returnedZids );
	}
}
