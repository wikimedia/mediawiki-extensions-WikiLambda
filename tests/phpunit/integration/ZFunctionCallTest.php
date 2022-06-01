<?php

/**
 * WikiLambda integration test suite for the ZFunctionCall class
 *
 * @copyright 2020– WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall
 * @group Database
 */
class ZFunctionCallTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::isValid
	 * @covers ::getZValue
	 * @covers ::getReturnType
	 * @covers ::getDefinition
	 */
	public function testPersistentCreation_oneArg() {
		$this->insertZids( [ 'Z17', 'Z881' ] );
		$strFunctionCall = '{"Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z3"}';
		$zobject = ZObjectFactory::create( json_decode( $strFunctionCall ) );
		$this->assertTrue( $zobject->isValid() );
		$this->assertSame( "Z881", $zobject->getZValue() );
		$this->assertSame( "Z4", $zobject->getReturnType() );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::isValid
	 * @covers ::getZValue
	 * @covers ::getReturnType
	 * @covers ::getDefinition
	 */
	public function testPersistentCreation_twoArgs() {
		$this->insertZids( [ 'Z17', 'Z882' ] );
		$strFunctionCall = '{"Z1K1": "Z7", "Z7K1": "Z882", "Z882K1": "Z6", "Z882K2": "Z1"}';

		$zobject = ZObjectFactory::create( json_decode( $strFunctionCall ) );
		$this->assertTrue( $zobject->isValid() );
		$this->assertSame( "Z882", $zobject->getZValue() );
		$this->assertSame( "Z4", $zobject->getReturnType() );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::isValid
	 */
	public function testTypedList() {
		// Z881 must be persisted to successfully return its type.
		// Z881 requires Z8 and Z17 to be present as well.
		$this->insertZids( [ 'Z17', 'Z881' ] );
		$type = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": "Z0",
	"Z2K2": {
		"Z1K1": "Z4",
		"Z4K1": "Z0",
		"Z4K2": {
			"Z1K1": {
				"Z1K1": "Z7",
				"Z7K1": "Z881",
				"Z881K1": "Z3"
			},
			"K1": {
				"Z1K1": "Z3",
				"Z3K1": "Z6",
				"Z3K2": "Z0K1",
				"Z3K3": {
					"Z1K1": "Z12",
					"Z12K1": [
						"Z11",
						{
							"Z1K1": "Z11",
							"Z11K1": "Z1002",
							"Z11K2": "Test key"
						}
					]
				}
			},
			"K2": {
				"Z1K1": {
					"Z1K1": "Z7",
					"Z7K1": "Z881",
					"Z881K1": "Z3"
				}
			}
		},
		"Z4K3": "Z101"
	},
	"Z2K3": {
		"Z1K1": "Z12",
		"Z12K1": [
			"Z11",
			{
				"Z1K1": "Z11",
				"Z11K1": "Z1002",
				"Z11K2": "Test type"
			}
		]
	},
	"Z2K4": {
		"Z1K1": "Z32",
		"Z32K1": [
			"Z31",
			{
				"Z1K1": "Z31",
				"Z31K1": "Z1002",
				"Z31K2": [ "Z6" ]
			}
		]
	}
}
EOT;

		$zobject = ZObjectFactory::create( json_decode( $type ) );
		$this->assertTrue( $zobject->isValid() );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::isValid
	 */
	public function testTypedListInner() {
		// Z881 must be persisted to successfully return its type.
		// Z881 requires Z8 and Z17 to be present as well.
		$this->insertZids( [ 'Z17', 'Z881' ] );
		$type = <<<EOT
{
	"Z1K1": "Z4",
	"Z4K1": "Z111",
	"Z4K2": [
		"Z3",
		{
			"Z1K1": "Z3",
			"Z3K1": "Z6",
			"Z3K2": "Z111K1",
			"Z3K3": {
				"Z1K1": "Z12",
				"Z12K1": [
					"Z11",
					{
						"Z1K1": "Z11",
						"Z11K1": "Z1002",
						"Z11K2": "Test key"
					}
				]
			}
		}
	],
	"Z4K3": "Z101"
}
EOT;

		$zobject = ZObjectFactory::create( json_decode( $type ) );
		$this->assertTrue( $zobject->isValid() );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::getReturnType
	 */
	public function testReturnType() {
		$this->insertZids( [ 'Z17', 'Z881', 'Z813' ] );

		$strFunctionCall = '{"Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z3"}';
		$zobject = ZObjectFactory::create( json_decode( $strFunctionCall ) );
		$this->assertInstanceOf( ZFunctionCall::class, $zobject );
		$this->assertSame( 'Z4', $zobject->getReturnType() );

		$strFunctionCall = '{"Z1K1": "Z7", "Z7K1": "Z813", "Z813K1": [ "Z6", "list" ]}';
		$zobject = ZObjectFactory::create( json_decode( $strFunctionCall ) );
		$this->assertInstanceOf( ZFunctionCall::class, $zobject );
		$this->assertSame( 'Z40', $zobject->getReturnType() );

		$strFunctionCall = '{"Z1K1": "Z7", "Z7K1": "Z80008"}';
		$zobject = ZObjectFactory::create( json_decode( $strFunctionCall ) );
		$this->assertInstanceOf( ZFunctionCall::class, $zobject );
		$this->assertNull( $zobject->getReturnType() );
	}
}
