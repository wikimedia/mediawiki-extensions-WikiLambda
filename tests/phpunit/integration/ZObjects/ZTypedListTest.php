<?php

/**
 * WikiLambda integration test suite for the ZTypedList class
 *
 * @copyright 2020– WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;
use MediaWiki\Json\FormatJson;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils
 * @group Database
 */
class ZTypedListTest extends WikiLambdaIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsRepoMode();
	}

	public function testCreate_emptyList() {
		$typedList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" } }';
		$testObject = ZObjectFactory::create( json_decode( $typedList ) );

		$this->assertInstanceOf( ZTypedList::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertTrue( $testObject->isEmpty() );
		$this->assertInstanceOf( ZReference::class, $testObject->getElementType() );
		$this->assertSame( "Z6", $testObject->getElementType()->getZValue() );
	}

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

	public function testAppendArray_emptyList() {
		$typedList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" } }';
		$testObject = ZObjectFactory::create( json_decode( $typedList ) );
		$newElements = [ new ZString( "New string" ) ];
		$testObject->appendArray( $newElements );

		$this->assertInstanceOf( ZTypedList::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertFalse( $testObject->isEmpty() );
		$this->assertInstanceOf( ZReference::class, $testObject->getElementType() );
		$this->assertSame( "Z6", $testObject->getElementType()->getZValue() );

		$array = $testObject->getAsArray();
		$this->assertCount( 1, $array );
		$firstListItem = $array[0];
		$this->assertInstanceOf( ZString::class, $firstListItem );
		$this->assertSame( 'New string', $firstListItem->getZValue() );
	}

	public function testAppendArray_listOfStrings() {
		$typedList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" },'
			. '"K1": "first string",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" } } }';
		$testObject = ZObjectFactory::create( json_decode( $typedList ) );
		$newElements = [ new ZString( "New string" ) ];
		$testObject->appendArray( $newElements );

		$this->assertInstanceOf( ZTypedList::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertInstanceOf( ZReference::class, $testObject->getElementType() );
		$this->assertSame( "Z6", $testObject->getElementType()->getZValue() );

		$array = $testObject->getAsArray();
		$this->assertCount( 2, $array );
		$firstListItem = $array[0];
		$this->assertInstanceOf( ZString::class, $firstListItem );
		$this->assertSame( 'first string', $firstListItem->getZValue() );
		$secondListItem = $array[1];
		$this->assertInstanceOf( ZString::class, $secondListItem );
		$this->assertSame( 'New string', $secondListItem->getZValue() );
	}

	public function testAppendArray_listOfMixed() {
		$typedList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" },'
			. '"K1": "first string",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" },'
			. '"K1": "Z111",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" } } } }';
		$testObject = ZObjectFactory::create( json_decode( $typedList ) );

		$newElements = [ new ZString( "New string" ), new ZReference( 'Z41' ) ];
		$testObject->appendArray( $newElements );

		$this->assertInstanceOf( ZTypedList::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertInstanceOf( ZReference::class, $testObject->getElementType() );
		$this->assertSame( "Z1", $testObject->getElementType()->getZValue() );

		$array = $testObject->getAsArray();
		$this->assertCount( 4, $array );
		$firstListItem = $array[0];
		$this->assertInstanceOf( ZString::class, $firstListItem );
		$this->assertSame( 'first string', $firstListItem->getZValue() );
		$secondListItem = $array[1];
		$this->assertInstanceOf( ZReference::class, $secondListItem );
		$this->assertSame( 'Z111', $secondListItem->getZValue() );
		$thirdListItem = $array[2];
		$this->assertInstanceOf( ZString::class, $thirdListItem );
		$this->assertSame( 'New string', $thirdListItem->getZValue() );
		$fourthListItem = $array[3];
		$this->assertInstanceOf( ZReference::class, $fourthListItem );
		$this->assertSame( 'Z41', $fourthListItem->getZValue() );
	}

	public function testAppendEmptyArray_listOfMixed() {
		$typedList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" },'
			. '"K1": "first string",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" },'
			. '"K1": "Z111",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" } } } }';
		$testObject = ZObjectFactory::create( json_decode( $typedList ) );
		$testObject->appendArray( [] );

		$this->assertInstanceOf( ZTypedList::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertInstanceOf( ZReference::class, $testObject->getElementType() );
		$this->assertSame( "Z1", $testObject->getElementType()->getZValue() );

		$array = $testObject->getAsArray();
		$this->assertCount( 2, $array );
		$firstListItem = $array[0];
		$this->assertInstanceOf( ZString::class, $firstListItem );
		$this->assertSame( 'first string', $firstListItem->getZValue() );
		$secondListItem = $array[1];
		$this->assertInstanceOf( ZReference::class, $secondListItem );
		$this->assertSame( 'Z111', $secondListItem->getZValue() );
	}

	public function testAppendArray_badElementType() {
		$typedList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" },'
			. '"K1": "first string",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" } } }';
		$testObject = ZObjectFactory::create( json_decode( $typedList ) );

		$this->assertInstanceOf( ZTypedList::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertInstanceOf( ZReference::class, $testObject->getElementType() );
		$this->assertSame( "Z6", $testObject->getElementType()->getZValue() );

		// List type is Z6; new element type is Z5; exception should be raised
		$newElements = [ new ZError( new ZReference( 'Z501' ), new ZString( 'error message' ) ) ];
		$this->expectException( ZErrorException::class );
		$testObject->appendArray( $newElements );
	}

	public function testAppendArray_uncheckedElementTypes() {
		$typedList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" },'
			. '"K1": "first string",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" } } }';
		$testObject = ZObjectFactory::create( json_decode( $typedList ) );

		// The type mismatch here should be ignored because checkTypes = false
		$newElements = [ new ZError( new ZReference( 'Z501' ), new ZString( 'error message' ) ) ];
		$testObject->appendArray( $newElements, false );

		// This case ideally should cause an exception but does not because
		// ZObjectUtils::isCompatibleType currently passes on any ZReference.
		$newElements = [ new ZReference( 'Z41' ) ];
		$testObject->appendArray( $newElements );

		// This case ideally should cause an exception but does not because
		// ZObjectUtils::isCompatibleType currently passes on any ZFunctionCall.
		$newElements = [
			new ZFunctionCall( new ZReference( ZTypeRegistry::Z_FUNCTION_TYPED_LIST ),
				[ ZTypeRegistry::Z_FUNCTION_TYPED_LIST_TYPE => ZTypeRegistry::Z_OBJECT_TYPE ] ),
		];
		$testObject->appendArray( $newElements );

		$this->assertInstanceOf( ZTypedList::class, $testObject );
		$this->assertInstanceOf( ZReference::class, $testObject->getElementType() );
		$this->assertSame( "Z6", $testObject->getElementType()->getZValue() );

		$array = $testObject->getAsArray();
		$this->assertCount( 4, $array );
		$this->assertFalse( $testObject->isValid() );
	}

	public function testAppendZTypedList_listOfMixed() {
		$typedList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" },'
			. '"K1": "first string",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" },'
			. '"K1": "Z111",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" } } } }';
		$testObject = ZObjectFactory::create( json_decode( $typedList ) );

		$newElements = new ZTypedList(
			ZTypedList::buildType( new ZReference( ZTypeRegistry::Z_OBJECT ) ),
			[ new ZString( "New string" ), new ZReference( 'Z41' ) ] );
		$testObject->appendZTypedList( $newElements );

		$this->assertInstanceOf( ZTypedList::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertInstanceOf( ZReference::class, $testObject->getElementType() );
		$this->assertSame( "Z1", $testObject->getElementType()->getZValue() );

		$array = $testObject->getAsArray();
		$this->assertCount( 4, $array );
		$firstListItem = $array[0];
		$this->assertInstanceOf( ZString::class, $firstListItem );
		$this->assertSame( 'first string', $firstListItem->getZValue() );
		$secondListItem = $array[1];
		$this->assertInstanceOf( ZReference::class, $secondListItem );
		$this->assertSame( 'Z111', $secondListItem->getZValue() );
		$thirdListItem = $array[2];
		$this->assertInstanceOf( ZString::class, $thirdListItem );
		$this->assertSame( 'New string', $thirdListItem->getZValue() );
		$fourthListItem = $array[3];
		$this->assertInstanceOf( ZReference::class, $fourthListItem );
		$this->assertSame( 'Z41', $fourthListItem->getZValue() );
	}

	public function testAppendZTypedList_badElementType() {
		$typedList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" },'
			. '"K1": "first string",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" } } }';
		$testObject = ZObjectFactory::create( json_decode( $typedList ) );

		$this->assertInstanceOf( ZTypedList::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertInstanceOf( ZReference::class, $testObject->getElementType() );
		$this->assertSame( "Z6", $testObject->getElementType()->getZValue() );

		// List type is Z6; new element type is Z5; exception should be raised
		$newElements = new ZTypedList(
			ZTypedList::buildType( new ZReference( ZTypeRegistry::Z_OBJECT ) ),
			[ new ZError( new ZReference( 'Z501' ), new ZString( 'error message' ) ) ] );
		$this->expectException( ZErrorException::class );
		$testObject->appendZTypedList( $newElements );
	}

	public function test_typedListToArray() {
		$typedList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" },'
			. '"K1": "first string",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" },'
			. '"K1": "Z111",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" } } } }';
		$testObject = ZObjectFactory::create( json_decode( $typedList ) );
		$array = $testObject->getAsArray();

		$this->assertIsArray( $array );
		$this->assertCount( 2, $array );
		$this->assertInstanceOf( ZString::class, $array[0] );
		$this->assertInstanceOf( ZReference::class, $array[1] );
	}

	/**
	 * @dataProvider provideListsInCanonicalForm
	 */
	public function test_createCanonicalForm( $canonicalFormArray, $type, $isEmpty, $canonical, $normal ) {
		$testObject = ZObjectFactory::create( json_decode( $canonicalFormArray ) );
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

	public static function provideListsInCanonicalForm() {
		return [
			'Canonical form empty array of Z1s' => [
				'[ "Z1" ]',
				'"Z1"', true,
				'[ "Z1" ]',
				'{ "Z1K1": {'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1":"Z1" }'
					. '} }'
			],
			'Canonical form array of Z6s with one string' => [
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
			'Canonical form array of Z1s with one string' => [
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
			'Canonical form array of Z1s with two items' => [
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
			'Canonical form empty array of lists' => [
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

	public function test_emptyTypedListToArray() {
		$typedList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" } }';
		$testObject = ZObjectFactory::create( json_decode( $typedList ) );
		$array = $testObject->getAsArray();

		$this->assertTrue( $testObject->isEmpty() );
		$this->assertIsArray( $array );
		$this->assertCount( 0, $array );
	}

	public function test_getZType() {
		$typedList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" } }';
		$testObject = ZObjectFactory::create( json_decode( $typedList ) );

		$this->assertSame( 'Z881', $testObject->getZType() );
	}

	/**
	 * @dataProvider provideSerializedForms
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

	public static function provideSerializedForms() {
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
