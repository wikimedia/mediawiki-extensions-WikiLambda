<?php

/**
 * WikiLambda integration test suite for the ZFunction class
 *
 * @copyright 2020– WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ZObjects;

use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunction;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZFunction
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZReference
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory
 * @group Database
 */
class ZFunctionTest extends WikiLambdaIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsRepoMode();
	}

	public function testCreation() {
		$strFunction = '{"Z1K1":"Z8", "Z8K1":["Z17"], "Z8K2":"Z6", "Z8K3":["Z20"], "Z8K4":["Z14"], "Z8K5":"Z88888"}';
		$zobject = ZObjectFactory::create( json_decode( $strFunction ) );
		$this->assertInstanceOf( ZFunction::class, $zobject );
		$this->assertTrue( $zobject->isValid() );

		$createdObject = $zobject->getZValue();

		$this->assertInstanceOf( ZTypedList::class, $createdObject['Z8K1'] );
		$this->assertInstanceOf( ZReference::class, $createdObject['Z8K2'] );
		$this->assertInstanceOf( ZTypedList::class, $createdObject['Z8K3'] );
		$this->assertInstanceOf( ZTypedList::class, $createdObject['Z8K4'] );
		$this->assertInstanceOf( ZReference::class, $createdObject['Z8K5'] );
	}

	public function testPersistentCreation() {
		$strFunction = '{"Z1K1":"Z8", "Z8K1":["Z17"], "Z8K2":"Z6", "Z8K3":["Z20"], "Z8K4":["Z14"], "Z8K5":"Z88888"}';
		$zobject = ZObjectFactory::createPersistentContent( json_decode( $strFunction ) );
		$this->assertInstanceOf( ZPersistentObject::class, $zobject );
		$this->assertInstanceOf( ZFunction::class, $zobject->getInnerZObject() );
		$this->assertTrue( $zobject->isValid() );
	}

	/**
	 * @dataProvider provideTestNotValid
	 */
	public function testNotValid( $input ) {
		$zobject = ZObjectFactory::create( json_decode( $input ) );
		$this->assertFalse( $zobject->isValid() );
	}

	public static function provideTestNotValid() {
		return [
			'list of args wrong type' => [
				'{"Z1K1": "Z8", "Z8K1": "wrong type", "Z8K2": "Z6", "Z8K3": [ "Z20" ], "Z8K4": [ "Z14" ],'
					. '"Z8K5": "Z88888" }'
			],
			'list of args wrong item type' => [
				'{"Z1K1": "Z8", "Z8K1": [ "Z6", "wrong item type" ], "Z8K2": "Z6", "Z8K3": [ "Z20" ],'
					. '"Z8K4": [ "Z14" ], "Z8K5": "Z88888" }'
			],
			'return type wrong type' => [
				'{"Z1K1": "Z8", "Z8K1": [ "Z17" ], "Z8K2": [ "Z6" ], "Z8K3": [ "Z20" ], "Z8K4": [ "Z14" ],'
					. '"Z8K5": "Z88888" }'
			],
			'return type not valid' => [
				'{"Z1K1": "Z8", "Z8K1": [ "Z17" ], "Z8K2": {"Z1K1":"Z9", "Z9K1": "foo"},'
					. ' "Z8K3": [ "Z20" ], "Z8K4": [ "Z14" ], "Z8K5": "Z88888" }'
			],
			'list of testers wrong type' => [
				'{"Z1K1": "Z8", "Z8K1": [ "Z17" ], "Z8K2": "Z6", "Z8K3": "wrong type", "Z8K4": [ "Z14" ],'
					. ' "Z8K5": "Z88888" }'
			],
			'list of testers wrong item type' => [
				'{"Z1K1": "Z8", "Z8K1": [ "Z17" ], "Z8K2": "Z6", "Z8K3": [ "Z6", "wrong item type" ],'
					. ' "Z8K4": [ "Z14" ], "Z8K5": "Z88888" }'
			],
			'list of implementations wrong type' => [
				'{"Z1K1": "Z8", "Z8K1": [ "Z17" ], "Z8K2": "Z6", "Z8K3": [ "Z20" ], "Z8K4": "wrong type",'
					. '"Z8K5": "Z88888" }'
			],
			'list of implementations wrong item type' => [
				'{"Z1K1": "Z8", "Z8K1": [ "Z17" ], "Z8K2": "Z6", "Z8K3": [ "Z20" ],'
					. ' "Z8K4": [ "Z6", "wrong item type" ], "Z8K5": "Z88888" }'
			],
			'function id wrong type' => [
				'{"Z1K1": "Z8", "Z8K1": [ "Z17" ], "Z8K2": "Z6", "Z8K3": [ "Z20" ],'
					. ' "Z8K4": [ "Z14" ], "Z8K5": "stronk strink" }'
			],
			'function id not valid' => [
				'{"Z1K1": "Z8", "Z8K1": [ "Z17" ], "Z8K2": "Z6", "Z8K3": [ "Z20" ], "Z8K4": [ "Z14" ],'
					. ' "Z8K5": {"Z1K1": "Z9", "Z9K1": "bar"} }'
			],
		];
	}

	/**
	 * @dataProvider provideTestReturnType
	 */
	public function testReturnType( $input, $returnType, $dependencies = [] ) {
		$this->insertZids( $dependencies );
		$zobject = ZObjectFactory::create( json_decode( $input ) );
		$this->assertSame( $zobject->getReturnType(), $returnType );
	}

	public static function provideTestReturnType() {
		return [
			'return type is reference' => [
				'{"Z1K1": "Z8", "Z8K1": [ "Z17" ], "Z8K2": "Z6", "Z8K3": [ "Z20" ], "Z8K4": [ "Z14" ],'
					. '"Z8K5": "Z88888" }',
				'Z6'
			],
			'return type is normal reference' => [
				'{"Z1K1": "Z8", "Z8K1": [ "Z17" ], "Z8K2": { "Z1K1": "Z9", "Z9K1": "Z6"},'
					. ' "Z8K3": [ "Z20" ], "Z8K4": [ "Z14" ], "Z8K5": "Z88888" }',
				'Z6'
			],
			'return type is empty reference' => [
				'{"Z1K1": "Z8", "Z8K1": [ "Z17" ], "Z8K2": { "Z1K1": "Z9"}, "Z8K3": [ "Z20" ],'
					. '"Z8K4": [ "Z14" ], "Z8K5": "Z88888" }',
				null
			],
			'return type is function call of persisted function' => [
				'{"Z1K1": "Z8", "Z8K1": [ "Z17" ], '
					. ' "Z8K2": { "Z1K1": "Z7", "Z7K1": "Z881" },'
					. ' "Z8K3": [ "Z20" ], "Z8K4": [ "Z14" ], "Z8K5": "Z88888" }',
				'Z4', [ 'Z17', 'Z881' ]
			],
			'return type is function call of literal function' => [
				'{"Z1K1": "Z8", "Z8K1": [ "Z17" ], '
					. ' "Z8K2": { "Z1K1": "Z7", "Z7K1": {'
					. ' "Z1K1": "Z8", "Z8K1": [ "Z17" ], "Z8K2": "Z9",'
					. ' "Z8K3": [ "Z20" ], "Z8K4": [ "Z14" ], "Z8K5": "Z88889"'
					. ' } },'
					. ' "Z8K3": [ "Z20" ], "Z8K4": [ "Z14" ], "Z8K5": "Z88888" }',
				'Z9'
			]
		];
	}

	/**
	 * @dataProvider provideTestGetIdentity
	 */
	public function testGetIdentity( $input, $identity ) {
		$zobject = ZObjectFactory::create( json_decode( $input ) );
		$this->assertSame( $zobject->getIdentity(), $identity );
	}

	public static function provideTestGetIdentity() {
		return [
			'identity is reference' => [
				'{"Z1K1": "Z8", "Z8K1": [ "Z17" ], "Z8K2": "Z6", "Z8K3": [ "Z20" ],'
					. '"Z8K4": [ "Z14" ], "Z8K5": "Z88888" }',
				'Z88888'
			],
			'identity is not reference' => [
				'{"Z1K1": "Z8", "Z8K1": [ "Z17" ], "Z8K2": "Z6", "Z8K3": [ "Z20" ],'
					. '"Z8K4": [ "Z14" ], "Z8K5": "tasty soup" }',
				null
			]
		];
	}
}
