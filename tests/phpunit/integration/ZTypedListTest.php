<?php

/**
 * WikiLambda integration test suite for the ZTypedList class
 *
 * @copyright 2020– WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use FormatJson;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList
 */
class ZTypedListTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::isValid
	 * @covers ::isEmpty
	 * @covers ::getElementType
	 */
	public function testCreate_emptyList() {
		$typedList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" } }';
		$testObject = ZObjectFactory::create( json_decode( $typedList ) );

		$this->assertInstanceOf( ZTypedList::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertTrue( $testObject->isEmpty() );
		$this->assertInstanceOf( ZReference::class, $testObject->getElementType() );
		$this->assertSame( "Z6", $testObject->getElementType()->getZValue() );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::isValid
	 * @covers ::getElementType
	 */
	public function testCreate_listOfStrings() {
		$typedList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" },'
			. '"K1": "first string",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" } } }';
		$testObject = ZObjectFactory::create( json_decode( $typedList ) );

		$this->assertInstanceOf( ZTypedList::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertInstanceOf( ZReference::class, $testObject->getElementType() );
		$this->assertSame( "Z6", $testObject->getElementType()->getZValue() );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::isValid
	 * @covers ::getElementType
	 */
	public function testCreate_largerListOfStrings() {
		$typedList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" },'
			. '"K1": "first string",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" },'
			. '"K1": "second string",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" } } } }';
		$testObject = ZObjectFactory::create( json_decode( $typedList ) );

		$this->assertInstanceOf( ZTypedList::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertInstanceOf( ZReference::class, $testObject->getElementType() );
		$this->assertSame( "Z6", $testObject->getElementType()->getZValue() );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::isValid
	 */
	public function testCreate_invalidListOfStrings() {
		$typedList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" },'
			. '"K1": "first string",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" },'
			. '"K1": "Z111",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" } } } }';
		$testObject = ZObjectFactory::create( json_decode( $typedList ) );

		$this->assertInstanceOf( ZTypedList::class, $testObject );
		$this->assertFalse( $testObject->isValid() );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::isValid
	 */
	public function testCreate_listOfMixed() {
		$typedList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" },'
			. '"K1": "first string",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" },'
			. '"K1": "Z111",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" } } } }';
		$testObject = ZObjectFactory::create( json_decode( $typedList ) );

		$this->assertInstanceOf( ZTypedList::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertInstanceOf( ZReference::class, $testObject->getElementType() );
		$this->assertSame( "Z1", $testObject->getElementType()->getZValue() );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::getAsArray
	 * @covers ::getZValue
	 */
	public function test_typedListToArray() {
		$typedList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" },'
			. '"K1": "first string",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" },'
			. '"K1": "Z111",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" } } } }';
		$testObject = ZObjectFactory::create( json_decode( $typedList ) );
		$array = $testObject->getAsArray();

		$this->assertIsArray( $array );
		$this->assertCount( 2,  $array );
		$this->assertInstanceOf( ZString::class, $array[0] );
		$this->assertInstanceOf( ZReference::class, $array[1] );
	}

	/**
	 * @dataProvider provideBenjaminForms
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::getAsArray
	 * @covers ::getZValue
	 */
	public function test_createBenjamin( $benjamin, $type, $isEmpty, $canonical, $normal ) {
		$testObject = ZObjectFactory::create( json_decode( $benjamin ) );
		$this->assertInstanceOf( ZTypedList::class, $testObject );

		$this->assertSame(
			FormatJson::encode( FormatJson::decode( $type ) ),
		  FormatJson::encode( $testObject->getElementType()->getSerialized() )
		);

		$this->assertSame( $isEmpty, $testObject->isEmpty() );

		$this->assertSame(
			FormatJson::encode( FormatJson::decode( $canonical ) ),
			FormatJson::encode( $testObject->getSerialized() )
		);
		$this->assertSame(
			FormatJson::encode( FormatJson::decode( $normal ) ),
			FormatJson::encode( $testObject->getSerialized( $testObject::FORM_NORMAL ) )
		);
	}

	public function provideBenjaminForms() {
		return [
			'benjamin empty array of Z1s' => [
				'[ "Z1" ]',
				'"Z1"', true,
				'[ "Z1" ]',
				'{ "Z1K1": {'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1":"Z1" }'
					. '} }'
			],
			'benjamin array of Z6s with one string' => [
				'[ "Z6", "first string"]',
				'"Z6"', false,
				'[ "Z6", "first string"]',
				'{ "Z1K1": {'
					. '"Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. '"Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. '"Z881K1": { "Z1K1": "Z9", "Z9K1": "Z6" }'
					. '},'
					. ' "K1": { "Z1K1": "Z6", "Z6K1": "first string" },'
					. ' "K2": { "Z1K1": {'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z6" }'
					. '} } }'
			],
			'benjamin array of Z1s with one string' => [
				'[ "Z1", "first string"]',
				'"Z1"', false,
				'[ "Z1", "first string"]',
				'{ "Z1K1": {'
					. '"Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. '"Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. '"Z881K1": { "Z1K1": "Z9", "Z9K1": "Z1" }'
					. '},'
					. ' "K1": { "Z1K1": "Z6", "Z6K1": "first string" },'
					. ' "K2": { "Z1K1": {'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z1" }'
					. '} } }'
			],
			'benjamin array of Z1s with two items' => [
				'[ "Z1", "first string", "Z111"]',
				'"Z1"', false,
				'[ "Z1", "first string", "Z111"]',
				'{ "Z1K1": {'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9","Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9","Z9K1": "Z1" }'
					. '},'
					. '"K1": { "Z1K1":"Z6", "Z6K1": "first string" },'
					. '"K2": { "Z1K1": {'
					. ' "Z1K1": {"Z1K1": "Z9", "Z9K1": "Z7"},'
					. ' "Z7K1": { "Z1K1":"Z9","Z9K1":"Z881"},'
					. ' "Z881K1": {"Z1K1":"Z9","Z9K1":"Z1"}'
					. '},'
					. '"K1": { "Z1K1":"Z9", "Z9K1":"Z111" },'
					. '"K2": { "Z1K1":{'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z1" }'
					. '} } } }'
			],
			'benjamin empty array of lists' => [
				'[ { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" } ]',
				'{ "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" }', true,
				'[ { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" } ]',
				'{ "Z1K1": {'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": {'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z1" }'
					. ' } } }'
			]
		];
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::isEmpty
	 * @covers ::getAsArray
	 * @covers ::getZValue
	 */
	public function test_emptyTypedListToArray() {
		$typedList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" } }';
		$testObject = ZObjectFactory::create( json_decode( $typedList ) );
		$array = $testObject->getAsArray();

		$this->assertTrue( $testObject->isEmpty() );
		$this->assertIsArray( $array );
		$this->assertCount( 0,  $array );
	}

	/**
	 * @covers ::getZType
	 * @covers ::isBuiltin
	 * @covers ::getDefinition
	 */
	public function test_getZType() {
		$typedList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" } }';
		$testObject = ZObjectFactory::create( json_decode( $typedList ) );

		$this->assertSame( 'Z881', $testObject->getZType() );
	}

	/**
	 * @dataProvider provideSerializedForms
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::getSerialized
	 */
	public function test_serialize( $typed, $canonical, $normal ) {
		$testObject = ZObjectFactory::create( json_decode( $typed ) );
		$this->assertInstanceOf( ZTypedList::class, $testObject );

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
				'[ "Z1" ]',
				'{ "Z1K1": {'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1":"Z1" }'
					. '} }'
			],
			'list with one string' => [
				'{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" },'
					. '"K1": "first string",'
					. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" } } }',
				'[ "Z6", "first string"]',
				'{ "Z1K1": {'
					. '"Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. '"Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. '"Z881K1": { "Z1K1": "Z9", "Z9K1": "Z6" }'
					. '},'
					. ' "K1": { "Z1K1": "Z6", "Z6K1": "first string" },'
					. ' "K2": { "Z1K1": {'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z6" }'
					. '} } }'
			],
			'list with two mixed items' => [
				'{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" },'
					. '"K1": "first string",'
					. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" },'
					. '"K1": "Z111",'
					. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" } } } }',
				'[ "Z1", "first string", "Z111"]',
				'{ "Z1K1": {'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9","Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9","Z9K1": "Z1" }'
					. '},'
					. '"K1": { "Z1K1":"Z6", "Z6K1": "first string" },'
					. '"K2": { "Z1K1": {'
					. ' "Z1K1": {"Z1K1": "Z9", "Z9K1": "Z7"},'
					. ' "Z7K1": { "Z1K1":"Z9","Z9K1":"Z881"},'
					. ' "Z881K1": {"Z1K1":"Z9","Z9K1":"Z1"}'
					. '},'
					. '"K1": { "Z1K1":"Z9", "Z9K1":"Z111" },'
					. '"K2": { "Z1K1":{'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z1" }'
					. '} } } }'
			]
		];
	}
}
