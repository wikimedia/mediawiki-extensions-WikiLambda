<?php

/**
 * WikiLambda integration test suite for the ZTypedMap class
 *
 * @copyright 2020– WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ZObjects;

use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZQuote;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedMap;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedPair;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedMap
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory
 * @group Database
 */
class ZTypedMapTest extends WikiLambdaIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsRepoMode();
	}

	public function testCreate_emptyMap_constructor() {
		$testObject = new ZTypedMap(
			ZTypedMap::buildType( 'Z6', 'Z40' )
		);

		$this->assertInstanceOf( ZTypedMap::class, $testObject );

		$this->assertFalse( $testObject->isValid() );

		$firstType = $testObject->getKeyType();
		$this->assertInstanceOf( ZReference::class, $firstType );
		$this->assertSame( "Z6", $firstType->getZValue() );

		$secondType = $testObject->getValueType();
		$this->assertInstanceOf( ZReference::class, $secondType );
		$this->assertSame( "Z40", $secondType->getZValue() );

		$this->assertNull( $testObject->getList() );

		$this->assertSame( null, $testObject->getValueGivenKey( new ZString( 'Unknown key' ) ) );
	}

	public function testCreate_emptyMap() {
		$typedMapStdObject = (object)[
			'Z1K1' => (object)[ 'Z1K1' => 'Z7', 'Z7K1' => 'Z883', 'Z883K1' => 'Z6', 'Z883K2' => 'Z40' ],
		];
		$testObject = ZObjectFactory::create( $typedMapStdObject );

		$this->assertInstanceOf( ZTypedMap::class, $testObject );

		$this->assertFalse( $testObject->isValid() );

		$firstType = $testObject->getKeyType();
		$this->assertInstanceOf( ZReference::class, $firstType );
		$this->assertSame( "Z6", $firstType->getZValue() );

		$secondType = $testObject->getValueType();
		$this->assertInstanceOf( ZReference::class, $secondType );
		$this->assertSame( "Z40", $secondType->getZValue() );

		$this->assertNull( $testObject->getList() );

		$this->assertSame( null, $testObject->getValueGivenKey( new ZString( 'Unknown key' ) ) );
	}

	public function testCreate_filledMap_constructor() {
		// Ensure that Z6/String, Z40/Boolean, and Z41/True instance of Boolean are all available
		$this->insertZids( [ 'Z6', 'Z40', 'Z41' ] );

		$pairType = ZTypedPair::buildType( 'Z6', 'Z40' );
		$testObject = new ZTypedMap(
			ZTypedMap::buildType( 'Z6', 'Z40' ),
			new ZTypedList(
				ZTypedList::buildType( $pairType ),
				[
					new ZTypedPair(
						$pairType,
						new ZString( 'Testing' ),
						new ZReference( 'Z41' )
					),
				]
			)
		);

		$this->assertInstanceOf( ZTypedMap::class, $testObject );

		$this->assertTrue( $testObject->isValid() );

		$firstType = $testObject->getKeyType();
		$this->assertInstanceOf( ZReference::class, $firstType );
		$this->assertSame( "Z6", $firstType->getZValue() );

		$secondType = $testObject->getValueType();
		$this->assertInstanceOf( ZReference::class, $secondType );
		$this->assertSame( "Z40", $secondType->getZValue() );

		$list = $testObject->getList();
		$this->assertInstanceOf( ZTypedList::class, $list );

		$firstListItem = $list->getAsArray()[0];
		$this->assertInstanceOf( ZTypedPair::class, $firstListItem );

		$key = $firstListItem->getFirstElement();
		$this->assertInstanceOf( ZString::class, $key );
		$this->assertSame( 'Testing', $key->getZValue() );

		$value = $firstListItem->getSecondElement();
		$this->assertInstanceOf( ZReference::class, $value );
		$this->assertSame( 'Z41', $value->getZValue() );

		$this->assertSame( 'Z41', $testObject->getValueGivenKey( new ZString( 'Testing' ) )->getZValue() );

		$this->assertSame( null, $testObject->getValueGivenKey( new ZString( 'Unknown key' ) ) );
	}

	public function testCreate_filledMap() {
		// Ensure that Z6/String, Z40/Boolean, and Z41/True instance of Boolean are all available
		$this->insertZids( [ 'Z6', 'Z40', 'Z41' ] );

		$typedMapStdObject = (object)[
			'Z1K1' => (object)[ 'Z1K1' => 'Z7', 'Z7K1' => 'Z883', 'Z883K1' => 'Z6', 'Z883K2' => 'Z40' ],
			'K1' => (object)[
				'Z1K1' => (object)[
					'Z1K1' => 'Z7',
					'Z7K1' => 'Z881',
					'Z881K1' => (object)[ 'Z1K1' => 'Z7', 'Z7K1' => 'Z882', 'Z882K1' => 'Z6', 'Z882K2' => 'Z40' ]
				],
				'K1' => (object)[
					'Z1K1' => (object)[ 'Z1K1' => 'Z7', 'Z7K1' => 'Z882', 'Z882K1' => 'Z6', 'Z882K2' => 'Z40' ],
					'K1' => (object)[ 'Z1K1' => 'Z6', 'Z6K1' => 'Testing' ],
					'K2' => (object)[ 'Z1K1' => 'Z9', 'Z9K1' => 'Z41' ],
				],
				'K2' => (object)[
					'Z1K1' => (object)[
						'Z1K1' => 'Z7',
						'Z7K1' => 'Z881',
						'Z881K1' => (object)[ 'Z1K1' => 'Z7', 'Z7K1' => 'Z882', 'Z882K1' => 'Z6', 'Z882K2' => 'Z40' ]
					]
				],
			]
		];

		$testObject = ZObjectFactory::create( $typedMapStdObject );

		$this->assertInstanceOf( ZTypedMap::class, $testObject );

		$this->assertTrue( $testObject->isValid() );

		$firstType = $testObject->getKeyType();
		$this->assertInstanceOf( ZReference::class, $firstType );
		$this->assertSame( "Z6", $firstType->getZValue() );

		$secondType = $testObject->getValueType();
		$this->assertInstanceOf( ZReference::class, $secondType );
		$this->assertSame( "Z40", $secondType->getZValue() );

		$list = $testObject->getList();
		$this->assertInstanceOf( ZTypedList::class, $list );

		$firstListItem = $list->getAsArray()[0];
		$this->assertInstanceOf( ZTypedPair::class, $firstListItem );

		$key = $firstListItem->getFirstElement();
		$this->assertInstanceOf( ZString::class, $key );
		$this->assertSame( "Testing", $key->getZValue() );

		$value = $firstListItem->getSecondElement();
		$this->assertInstanceOf( ZReference::class, $value );
		$this->assertSame( "Z41", $value->getZValue() );

		$this->assertSame( 'Z41', $testObject->getValueGivenKey( new ZString( 'Testing' ) )->getZValue() );

		$this->assertSame( null, $testObject->getValueGivenKey( new ZString( 'Unknown key' ) ) );
	}

	/**
	 * Note that we're only doing a constructor-based version of this test, because the manual
	 * ZObject notation is such a pain to write out.
	 */
	public function testCreate_filledMapTwoEntries_constructor() {
		// Ensure that Z6/String, Z40/Boolean, and Z41/True and Z/42 False instances of Boolean are all available
		$this->insertZids( [ 'Z6', 'Z40', 'Z41', 'Z42' ] );

		$pairType = ZTypedPair::buildType( 'Z6', 'Z40' );
		$testObject = new ZTypedMap(
			ZTypedMap::buildType( 'Z6', 'Z40' ),
			new ZTypedList(
				ZTypedList::buildType( $pairType ),
				[
					new ZTypedPair(
						$pairType,
						new ZString( 'Testing' ),
						new ZReference( 'Z41' )
					),
					new ZTypedPair(
						$pairType,
						new ZString( 'Testification' ),
						new ZReference( 'Z42' )
					),
				]
			)
		);

		$this->assertInstanceOf( ZTypedMap::class, $testObject );

		$this->assertTrue( $testObject->isValid() );

		$firstType = $testObject->getKeyType();
		$this->assertInstanceOf( ZReference::class, $firstType );
		$this->assertSame( "Z6", $firstType->getZValue() );

		$secondType = $testObject->getValueType();
		$this->assertInstanceOf( ZReference::class, $secondType );
		$this->assertSame( "Z40", $secondType->getZValue() );

		$list = $testObject->getList();
		$this->assertInstanceOf( ZTypedList::class, $list );

		$firstListItem = $list->getAsArray()[0];
		$this->assertInstanceOf( ZTypedPair::class, $firstListItem );

		$key = $firstListItem->getFirstElement();
		$this->assertInstanceOf( ZString::class, $key );
		$this->assertSame( "Testing", $key->getZValue() );

		$value = $firstListItem->getSecondElement();
		$this->assertInstanceOf( ZReference::class, $value );
		$this->assertSame( "Z41", $value->getZValue() );

		$secondListItem = $list->getAsArray()[1];
		$this->assertInstanceOf( ZTypedPair::class, $secondListItem );

		$key = $secondListItem->getFirstElement();
		$this->assertInstanceOf( ZString::class, $key );
		$this->assertSame( "Testification", $key->getZValue() );

		$value = $secondListItem->getSecondElement();
		$this->assertInstanceOf( ZReference::class, $value );
		$this->assertSame( "Z42", $value->getZValue() );

		$this->assertSame( 'Z41', $testObject->getValueGivenKey( new ZString( 'Testing' ) )->getZValue() );

		$this->assertSame( 'Z42', $testObject->getValueGivenKey( new ZString( 'Testification' ) )->getZValue() );

		$this->assertSame( null, $testObject->getValueGivenKey( new ZString( 'Unknown key' ) ) );
	}

	public function testCreate_mismatchedMap_constructor() {
		// Ensure that Z6/String, Z40/Boolean, and Z41/True instance of Boolean are all available
		$this->insertZids( [ 'Z6', 'Z40', 'Z41' ] );

		$pairType = ZTypedPair::buildType( 'Z6', 'Z40' );
		$testObject = new ZTypedMap(
			ZTypedMap::buildType( 'Z6', 'Z40' ),
			new ZTypedList(
				ZTypedList::buildType( $pairType ),
				[
					new ZTypedPair(
						$pairType,
						new ZReference( '400' ),
						new ZString( 'Failing' )
					),
				]
			)
		);

		$this->assertInstanceOf( ZTypedMap::class, $testObject );

		$this->assertFalse( $testObject->isValid() );

		$firstType = $testObject->getKeyType();
		$this->assertInstanceOf( ZReference::class, $firstType );
		$this->assertSame( "Z6", $firstType->getZValue() );

		$secondType = $testObject->getValueType();
		$this->assertInstanceOf( ZReference::class, $secondType );
		$this->assertSame( "Z40", $secondType->getZValue() );

		$list = $testObject->getList();
		$this->assertInstanceOf( ZTypedList::class, $list );

		$firstListItem = $list->getAsArray()[0];
		$this->assertInstanceOf( ZTypedPair::class, $firstListItem );

		$key = $firstListItem->getFirstElement();
		$this->assertInstanceOf( ZReference::class, $key );
		$this->assertSame( "400", $key->getZValue() );
		$this->assertFalse( $key->isValid() );

		$value = $firstListItem->getSecondElement();
		$this->assertInstanceOf( ZString::class, $value );
		$this->assertSame( "Failing", $value->getZValue() );

		$this->assertSame( null, $testObject->getValueGivenKey( new ZString( 'Unknown key' ) ) );
	}

	public function testCreate_mismatchedMap() {
		// Ensure that Z6/String, Z40/Boolean, and Z41/True instance of Boolean are all available
		$this->insertZids( [ 'Z6', 'Z40', 'Z41' ] );

		$typedMapStdObject = (object)[
			'Z1K1' => (object)[ 'Z1K1' => 'Z7', 'Z7K1' => 'Z883', 'Z883K1' => 'Z6', 'Z883K2' => 'Z40' ],
			'K1' => (object)[
				'Z1K1' => (object)[
					'Z1K1' => 'Z7',
					'Z7K1' => 'Z881',
					'Z881K1' => (object)[ 'Z1K1' => 'Z7', 'Z7K1' => 'Z882', 'Z882K1' => 'Z6', 'Z882K2' => 'Z40' ]
				],
				'K1' => (object)[
					'Z1K1' => (object)[ 'Z1K1' => 'Z7', 'Z7K1' => 'Z882', 'Z882K1' => 'Z6', 'Z882K2' => 'Z40' ],
					'K1' => (object)[ 'Z1K1' => 'Z9', 'Z9K1' => '400' ],
					'K2' => (object)[ 'Z1K1' => 'Z6', 'Z6K1' => 'Failing' ],
				],
				'K2' => (object)[
					'Z1K1' => (object)[
						'Z1K1' => 'Z7',
						'Z7K1' => 'Z881',
						'Z881K1' => (object)[ 'Z1K1' => 'Z7', 'Z7K1' => 'Z882', 'Z882K1' => 'Z6', 'Z882K2' => 'Z40' ]
					]
				],
			]
		];

		$testObject = ZObjectFactory::create( $typedMapStdObject );

		$this->assertInstanceOf( ZTypedMap::class, $testObject );

		$this->assertFalse( $testObject->isValid() );

		$firstType = $testObject->getKeyType();
		$this->assertInstanceOf( ZReference::class, $firstType );
		$this->assertSame( "Z6", $firstType->getZValue() );

		$secondType = $testObject->getValueType();
		$this->assertInstanceOf( ZReference::class, $secondType );
		$this->assertSame( "Z40", $secondType->getZValue() );

		$list = $testObject->getList();
		$this->assertInstanceOf( ZTypedList::class, $list );

		$firstListItem = $list->getAsArray()[0];
		$this->assertInstanceOf( ZTypedPair::class, $firstListItem );

		$key = $firstListItem->getFirstElement();
		$this->assertInstanceOf( ZReference::class, $key );
		$this->assertSame( "400", $key->getZValue() );
		$this->assertFalse( $key->isValid() );

		$value = $firstListItem->getSecondElement();
		$this->assertInstanceOf( ZString::class, $value );
		$this->assertSame( "Failing", $value->getZValue() );

		$this->assertSame( null, $testObject->getValueGivenKey( new ZString( 'Unknown key' ) ) );
	}

	/**
	 * This test adds the use of setValueForKey.
	 */
	public function testSetValueForKey_emptyMap() {
		// Ensure that Z6/String, Z40/Boolean, and Z41/True instance of Boolean are all available
		$this->insertZids( [ 'Z6', 'Z40', 'Z41' ] );
		$pairType = ZTypedPair::buildType( 'Z6', 'Z40' );
		$testObject = new ZTypedMap(
			ZTypedMap::buildType( 'Z6', 'Z40' ),
			// Explicitly create an empty list, so this is a valid ZTypedMap
			new ZTypedList( ZTypedList::buildType( $pairType ) )
		);

		// Check that the Map got created as expected
		$this->assertInstanceOf( ZTypedMap::class, $testObject );

		$this->assertTrue( $testObject->isValid() );

		$firstType = $testObject->getKeyType();
		$this->assertInstanceOf( ZReference::class, $firstType );
		$this->assertSame( "Z6", $firstType->getZValue() );

		$secondType = $testObject->getValueType();
		$this->assertInstanceOf( ZReference::class, $secondType );
		$this->assertSame( "Z40", $secondType->getZValue() );

		$list = $testObject->getList();
		$this->assertInstanceOf( ZTypedList::class, $list );

		$array = $list->getAsArray();
		$this->assertCount( 0, $array );

		// Check that setting null doesn't create a key
		$testObject->setValueForKey( new ZString( 'Testing1' ), null );

		$this->assertTrue( $testObject->isValid() );

		$list = $testObject->getList();
		$array = $list->getAsArray();
		$this->assertCount( 0, $array );

		// Check that setting a value creates a key with that value
		$testObject->setValueForKey( new ZString( 'Testing1' ), new ZReference( 'Z41' ) );

		$this->assertTrue( $testObject->isValid() );

		$list = $testObject->getList();
		$array = $list->getAsArray();
		$this->assertCount( 1, $array );

		$firstListItem = $array[0];
		$this->assertInstanceOf( ZTypedPair::class, $firstListItem );

		$key = $firstListItem->getFirstElement();
		$this->assertInstanceOf( ZString::class, $key );
		$this->assertSame( 'Testing1', $key->getZValue() );

		$value = $firstListItem->getSecondElement();
		$this->assertInstanceOf( ZReference::class, $value );
		$this->assertSame( 'Z41', $value->getZValue() );

		// Check that re-setting a key to null doesn't over-write that key
		$testObject->setValueForKey( new ZString( 'Testing1' ), null );

		$this->assertTrue( $testObject->isValid() );

		$list = $testObject->getList();
		$array = $list->getAsArray();
		$this->assertCount( 1, $array );

		$firstListItem = $array[0];
		$value = $firstListItem->getSecondElement();
		$this->assertInstanceOf( ZReference::class, $value );
		$this->assertSame( 'Z41', $value->getZValue() );

		$this->assertSame( null, $testObject->getValueGivenKey( new ZString( 'Unknown key' ) ) );
	}

	/**
	 * This test adds the use of setValueForKey, and also uses Z1 for valueType of the pair and map,
	 * with map values of 2 different types.
	 */
	public function testSetValueForKey_filledMap() {
		// Ensure that Z6/String, Z40/Boolean, and Z41/True instance of Boolean are all available
		$this->insertZids( [ 'Z1', 'Z6', 'Z40', 'Z41', 'Z42' ] );

		$pairType = ZTypedPair::buildType( 'Z6', 'Z1' );
		$testObject = new ZTypedMap(
			ZTypedMap::buildType( 'Z6', 'Z1' ),
			new ZTypedList(
				ZTypedList::buildType( $pairType ),
				[
					new ZTypedPair(
						$pairType,
						new ZString( 'Testing1' ),
						new ZReference( 'Z41' )
					),
				]
			)
		);

		$testObject->setValueForKey( new ZString( 'Testing1' ), new ZReference( 'Z42' ) );
		$testObject->setValueForKey( new ZString( 'Testing2' ), new ZString( 'arbitrary string' ) );

		$this->assertInstanceOf( ZTypedMap::class, $testObject );

		$this->assertTrue( $testObject->isValid() );

		$firstType = $testObject->getKeyType();
		$this->assertInstanceOf( ZReference::class, $firstType );
		$this->assertSame( "Z6", $firstType->getZValue() );

		$secondType = $testObject->getValueType();
		$this->assertInstanceOf( ZReference::class, $secondType );
		$this->assertSame( "Z1", $secondType->getZValue() );

		$list = $testObject->getList();
		$this->assertInstanceOf( ZTypedList::class, $list );

		$array = $list->getAsArray();
		$this->assertCount( 2, $array );

		$firstListItem = $array[0];
		$this->assertInstanceOf( ZTypedPair::class, $firstListItem );

		$key = $firstListItem->getFirstElement();
		$this->assertInstanceOf( ZString::class, $key );
		$this->assertSame( 'Testing1', $key->getZValue() );

		$value = $firstListItem->getSecondElement();
		$this->assertInstanceOf( ZReference::class, $value );
		$this->assertSame( 'Z42', $value->getZValue() );

		$secondListItem = $array[1];
		$this->assertInstanceOf( ZTypedPair::class, $secondListItem );

		$key = $secondListItem->getFirstElement();
		$this->assertInstanceOf( ZString::class, $key );
		$this->assertSame( 'Testing2', $key->getZValue() );

		$value = $secondListItem->getSecondElement();
		$this->assertInstanceOf( ZString::class, $value );
		$this->assertSame( 'arbitrary string', $value->getZValue() );

		$this->assertSame( 'Z42', $testObject->getValueGivenKey( new ZString( 'Testing1' ) )
			->getZValue() );

		$this->assertSame( 'arbitrary string', $testObject->getValueGivenKey( new ZString( 'Testing2' ) )
			->getZValue() );

		$this->assertSame( null, $testObject->getValueGivenKey( new ZString( 'Unknown key' ) ) );
	}

	public function testSetValueForKey_invalidMap() {
		$this->insertZids( [ 'Z1', 'Z6', 'Z40', 'Z41', 'Z42' ] );

		// $pairType = ZTypedPair::buildType( 'Z6', 'Z1' );
		$invalidObject = new ZTypedMap(
			'Z6',
			null
		);

		$this->expectException( ZErrorException::class );
		$invalidObject->setValueForKey( new ZString( 'Testing1' ), new ZReference( 'Z42' ) );
	}

	public function testSetValueForKey_invalidKey() {
		$this->insertZids( [ 'Z1', 'Z6', 'Z40', 'Z41', 'Z42' ] );

		$pairType = ZTypedPair::buildType( 'Z6', 'Z1' );
		$testObject = new ZTypedMap(
			ZTypedMap::buildType( 'Z6', 'Z1' ),
			new ZTypedList(
				ZTypedList::buildType( $pairType ),
				[]
			)
		);

		$falseRef = new ZReference( 'Z42' );

		$this->expectException( ZErrorException::class );
		$testObject->setValueForKey( new ZQuote( 'Invalid key type!' ), $falseRef );
	}

	public function testSetValueForKey_invalidKeyReferenceOrFunctionCallPassesAnyway() {
		$this->insertZids( [ 'Z1', 'Z6', 'Z40', 'Z41', 'Z42' ] );

		$pairType = ZTypedPair::buildType( 'Z6', 'Z1' );
		$testObject = new ZTypedMap(
			ZTypedMap::buildType( 'Z6', 'Z1' ),
			new ZTypedList(
				ZTypedList::buildType( $pairType ),
				[]
			)
		);

		$boolRef = new ZReference( 'Z40' );
		$falseRef = new ZReference( 'Z42' );

		$testObject->setValueForKey( $boolRef, $falseRef );
		$this->assertSame(
			$falseRef->getZValue(),
			$testObject->getValueGivenKey( $boolRef )->getZValue()
		);

		$testObject->setValueForKey( $pairType, $falseRef );
	}

	public function testSetValueForKey_invalidValue() {
		$this->insertZids( [ 'Z1', 'Z6', 'Z40', 'Z41', 'Z42' ] );

		$pairType = ZTypedPair::buildType( 'Z6', 'Z40' );
		$testObject = new ZTypedMap(
			ZTypedMap::buildType( 'Z6', 'Z40' ),
			new ZTypedList(
				ZTypedList::buildType( $pairType ),
				[]
			)
		);

		$this->expectException( ZErrorException::class );
		$testObject->setValueForKey( new ZString( 'TestingInvalidType' ), new ZString( 'Hello' ) );
	}
}
