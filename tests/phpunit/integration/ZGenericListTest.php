<?php

/**
 * WikiLambda integration test suite for the ZGenericList class
 *
 * @copyright 2020– WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use FormatJson;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZGenericList;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZGenericList
 */
class ZGenericListTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::isValid
	 * @covers ::getElementType
	 * @covers ::getSerialized
	 */
	public function testCreate_emptyList() {
		$genericList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" } }';
		$testObject = ZObjectFactory::create( json_decode( $genericList ) );

		$this->assertInstanceOf( ZGenericList::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( "Z6", $testObject->getElementType() );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::isValid
	 * @covers ::getElementType
	 * @covers ::getSerialized
	 */
	public function testCreate_listOfStrings() {
		$genericList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" },'
			. '"K1": "first string",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" } } }';
		$testObject = ZObjectFactory::create( json_decode( $genericList ) );

		$this->assertInstanceOf( ZGenericList::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( "Z6", $testObject->getElementType() );
		$this->assertSame(
			FormatJson::encode( FormatJson::decode( $genericList ) ),
			FormatJson::encode( $testObject->getSerialized() )
		);
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::isValid
	 * @covers ::getElementType
	 * @covers ::getSerialized
	 */
	public function testCreate_largerListOfStrings() {
		$genericList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" },'
			. '"K1": "first string",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" },'
			. '"K1": "second string",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" } } } }';
		$testObject = ZObjectFactory::create( json_decode( $genericList ) );

		$this->assertInstanceOf( ZGenericList::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( "Z6", $testObject->getElementType() );
		$this->assertSame(
			FormatJson::encode( FormatJson::decode( $genericList ) ),
			FormatJson::encode( $testObject->getSerialized() )
		);
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::isValid
	 */
	public function testCreate_invalidListOfStrings() {
		$genericList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" },'
			. '"K1": "first string",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" },'
			. '"K1": "Z111",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" } } } }';
		$testObject = ZObjectFactory::create( json_decode( $genericList ) );

		$this->assertInstanceOf( ZGenericList::class, $testObject );
		$this->assertFalse( $testObject->isValid() );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::isValid
	 * @covers ::getSerialized
	 */
	public function testCreate_listOfMixed() {
		$genericList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" },'
			. '"K1": "first string",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" },'
			. '"K1": "Z111",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" } } } }';
		$testObject = ZObjectFactory::create( json_decode( $genericList ) );

		$this->assertInstanceOf( ZGenericList::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( "Z1", $testObject->getElementType() );
		$this->assertSame(
			FormatJson::encode( FormatJson::decode( $genericList ) ),
			FormatJson::encode( $testObject->getSerialized() )
		);
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::getZGenericListAsArray
	 * @covers ::getZValue
	 */
	public function test_genericListToArray() {
		$genericList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" },'
			. '"K1": "first string",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" },'
			. '"K1": "Z111",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" } } } }';
		$testObject = ZObjectFactory::create( json_decode( $genericList ) );
		$array = $testObject->getZGenericListAsArray();

		$this->assertIsArray( $array );
		$this->assertCount( 2,  $array );
		$this->assertInstanceOf( ZString::class, $array[0] );
		$this->assertInstanceOf( ZReference::class, $array[1] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::getZGenericListAsArray
	 * @covers ::getZValue
	 */
	public function test_emptyGenericListToArray() {
		$genericList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" } }';
		$testObject = ZObjectFactory::create( json_decode( $genericList ) );
		$array = $testObject->getZGenericListAsArray();

		$this->assertIsArray( $array );
		$this->assertCount( 0,  $array );
	}

	/**
	 * @dataProvider provideSerializedForms
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::getSerialized
	 */
	public function test_serialize( $canonical, $normal ) {
		$testObject = ZObjectFactory::create( json_decode( $canonical ) );
		$this->assertInstanceOf( ZGenericList::class, $testObject );

		$this->assertSame(
			FormatJson::encode( FormatJson::decode( $canonical ) ),
			FormatJson::encode( $testObject->getSerialized() )
		);
		$this->assertSame(
			FormatJson::encode( FormatJson::decode( $normal ) ),
			FormatJson::encode( $testObject->getSerialized( $testObject::FORM_NORMAL ) )
		);
	}

	public function provideSerializedForms() {
		return [
			'empty list' => [
				'{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" } }',
				'{"Z1K1":{"Z1K1":"Z7","Z7K1":{"Z1K1":"Z9","Z9K1":"Z881"},"Z881K1":{"Z1K1":"Z9","Z9K1":"Z1"}}}'
			],
			'list with one string' => [
				'{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" },'
					. '"K1": "first string",'
					. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" } } }',
				'{ "Z1K1":{"Z1K1":"Z7","Z7K1":{"Z1K1":"Z9","Z9K1":"Z881"},"Z881K1":{"Z1K1":"Z9","Z9K1":"Z6"}},'
					. '"K1":{"Z1K1":"Z6","Z6K1":"first string"},'
					. '"K2":{"Z1K1":{"Z1K1":"Z7","Z7K1":{"Z1K1":"Z9","Z9K1":"Z881"},'
					. '"Z881K1":{"Z1K1":"Z9","Z9K1":"Z6"}}}}'
			],
			'list with two mixed items' => [
				'{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" },'
					. '"K1": "first string",'
					. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" },'
					. '"K1": "Z111",'
					. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" } } } }',
				'{"Z1K1":{"Z1K1":"Z7","Z7K1":{"Z1K1":"Z9","Z9K1":"Z881"},"Z881K1":{"Z1K1":"Z9","Z9K1":"Z1"}},'
					. '"K1":{"Z1K1":"Z6","Z6K1":"first string"},'
					. '"K2":{"Z1K1":{"Z1K1":"Z7","Z7K1":{"Z1K1":"Z9","Z9K1":"Z881"},'
					. '"Z881K1":{"Z1K1":"Z9","Z9K1":"Z1"}},'
					. '"K1":{"Z1K1":"Z9","Z9K1":"Z111"},'
					. '"K2":{"Z1K1":{"Z1K1":"Z7","Z7K1":{"Z1K1":"Z9","Z9K1":"Z881"},'
					. '"Z881K1":{"Z1K1":"Z9","Z9K1":"Z1"}}}}}'
			]
		];
	}
}
