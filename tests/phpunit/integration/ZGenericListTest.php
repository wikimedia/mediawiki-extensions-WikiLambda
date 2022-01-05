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

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZGenericList
 */
class ZGenericListTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::isValid
	 */
	public function testCreate_emptyList() {
		$genericList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" } }';
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
	public function testCreate_invalidList() {
		$genericList = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" },'
			. '"K1": "first string",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" },'
			. '"K1": "Z111",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" } } } }';
		$testObject = ZObjectFactory::create( json_decode( $genericList ) );

		$this->assertInstanceOf( ZGenericList::class, $testObject );
		$this->assertFalse( $testObject->isValid() );
	}

}
