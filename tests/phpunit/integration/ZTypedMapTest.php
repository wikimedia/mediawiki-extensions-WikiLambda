<?php

/**
 * WikiLambda integration test suite for the ZTypedMap class
 *
 * @copyright 2020– WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedMap;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedPair;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedMap
 * @group Database
 */
class ZTypedMapTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers ::__construct
	 * @covers ::buildType
	 * @covers ::getKeyType
	 * @covers ::getValueType
	 * @covers ::getList
	 * @covers ::isValid
	 * @covers ::getValueGivenKey
	 */
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

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::getDefinition
	 * @covers ::getKeyType
	 * @covers ::getValueType
	 * @covers ::getList
	 * @covers ::isValid
	 * @covers ::getValueGivenKey
	 */
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

	/**
	 * @covers ::__construct
	 * @covers ::buildType
	 * @covers ::getKeyType
	 * @covers ::getValueType
	 * @covers ::getList
	 * @covers ::isValid
	 * @covers ::getValueGivenKey
	 */
	public function testCreate_filledMap_constructor() {
		// Ensure that Z6/String, Z40/Boolean, and Z41/True instance of Boolean are all available
		$this->insertZids( [ 'Z6', 'Z40', 'Z41' ] );

		$testObject = new ZTypedMap(
			ZTypedMap::buildType( 'Z6', 'Z40' ),
			new ZTypedList(
				ZTypedPair::buildType( 'Z6', 'Z40' ),
				[
					new ZTypedPair(
						ZTypedPair::buildType( 'Z6', 'Z40' ),
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

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::getDefinition
	 * @covers ::getKeyType
	 * @covers ::getValueType
	 * @covers ::getList
	 * @covers ::isValid
	 * @covers ::getValueGivenKey
	 */
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
					'Z882K1' => (object)[ 'Z1K1' => 'Z6', 'Z6K1' => 'Testing' ],
					'Z882K2' => (object)[ 'Z1K1' => 'Z9', 'Z9K1' => 'Z41' ],
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
	 *
	 * @covers ::__construct
	 * @covers ::buildType
	 * @covers ::getKeyType
	 * @covers ::getValueType
	 * @covers ::getList
	 * @covers ::isValid
	 * @covers ::getValueGivenKey
	 */
	public function testCreate_filledMapTwoEntries_constructor() {
		// Ensure that Z6/String, Z40/Boolean, and Z41/True and Z/42 False instances of Boolean are all available
		$this->insertZids( [ 'Z6', 'Z40', 'Z41', 'Z42' ] );

		$testObject = new ZTypedMap(
			ZTypedMap::buildType( 'Z6', 'Z40' ),
			new ZTypedList(
				ZTypedPair::buildType( 'Z6', 'Z40' ),
				[
					new ZTypedPair(
						ZTypedPair::buildType( 'Z6', 'Z40' ),
						new ZString( 'Testing' ),
						new ZReference( 'Z41' )
					),
					new ZTypedPair(
						ZTypedPair::buildType( 'Z6', 'Z40' ),
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

	/**
	 * @covers ::__construct
	 * @covers ::buildType
	 * @covers ::getKeyType
	 * @covers ::getValueType
	 * @covers ::getList
	 * @covers ::isValid
	 * @covers ::getValueGivenKey
	 */
	public function testCreate_mismatchedMap_constructor() {
		// Ensure that Z6/String, Z40/Boolean, and Z41/True instance of Boolean are all available
		$this->insertZids( [ 'Z6', 'Z40', 'Z41' ] );

		$testObject = new ZTypedMap(
			ZTypedMap::buildType( 'Z6', 'Z40' ),
			new ZTypedList(
				ZTypedPair::buildType( 'Z6', 'Z40' ),
				[
					new ZTypedPair(
						ZTypedPair::buildType( 'Z6', 'Z40' ),
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

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::getDefinition
	 * @covers ::getKeyType
	 * @covers ::getValueType
	 * @covers ::getList
	 * @covers ::isValid
	 * @covers ::getValueGivenKey
	 */
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
					'Z882K1' => (object)[ 'Z1K1' => 'Z9', 'Z9K1' => '400' ],
					'Z882K2' => (object)[ 'Z1K1' => 'Z6', 'Z6K1' => 'Failing' ],
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
}
