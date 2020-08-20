<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZPersistentObject;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZPersistentObject
 */
class ZPersistentObjectTest extends \MediaWikiIntegrationTestCase {

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 * @covers ::getZValue
	 */
	public function testCreation_record() {
		$testObject = new ZPersistentObject( '{ "Z1K1": "Z1", "Z5K1": "" }' );
		$this->assertSame( $testObject->getZType(), 'ZObject' );
		$this->assertSame( $testObject->getZValue()->getZValue(), '' );

		$testObject = new ZPersistentObject( '{ "Z1K1": "Z1", "Z5K1": "Test" }' );
		$this->assertSame( $testObject->getZType(), 'ZObject' );
		$this->assertSame( $testObject->getZValue()->getZValue(), "Test" );

		$testObject = new ZPersistentObject( '{ "Z1K1": "Z1", "Z5K1": [ "Test" ] }' );
		$this->assertSame( $testObject->getZType(), 'ZObject' );
		$this->assertSame( $testObject->getZValue()->getZValue(), [ "Test", [] ] );

		$testObject = new ZPersistentObject( '{ "Z1K1": "Z1", "Z5K1": { "Z1K1": "Z1", "Z5K1": [ "Test", "Test2", "Test3" ] } }' );
		$this->assertSame( $testObject->getZType(), 'ZObject' );
		$this->assertSame( $testObject->getZValue()->getZType(), 'ZObject' );
		$this->assertSame( $testObject->getZValue()->getZValue()->getZValue(), [ "Test", [ "Test2", "Test3" ] ] );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_contentHandlerEmptyContentIsValid() {
		$contentHandler = new \MediaWiki\Extension\WikiLambda\ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$testObject = $contentHandler->makeEmptyContent();
		$this->assertTrue( is_a( $testObject, ZPersistentObject::class ) );
		$this->assertSame( $testObject->getZType(), 'ZString' );
		$this->assertSame( $testObject->getZValue(), '' );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_nokey() {
		$testObject = new ZPersistentObject( '{ "Z5K1": "Test" }' );
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( \Error::class );
		$this->assertSame( $testObject->getZType(), 'InvalidObjectWillNotHaveAType' );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_novalue() {
		$testObject = new ZPersistentObject( '{ "Z1K1": "Z1" }' );
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( \Error::class );
		$this->assertSame( $testObject->getZType(), 'InvalidObjectWillNotHaveAType' );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_unrecognisedkey() {
		$testObject = new ZPersistentObject( '{ "Z1K1": "Z1234", "Z5K1": "" }' );
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( \Error::class );
		$this->assertSame( $testObject->getZType(), 'InvalidObjectWillNotHaveAType' );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_nestedrecordhasinvalidkey() {
		$testObject = new ZPersistentObject( '{"Z1K1":"Z2","Z2K1":"Z0","Z2K2":{"Z1K1":"Foo"},"Z2K3": []}' );
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( \Error::class );
		$this->assertSame( $testObject->getZType(), 'InvalidObjectWillNotHaveAType' );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_nestedrecordhasnovalue() {
		$testObject = new ZPersistentObject( '{ "Z1K1": "Z5", "Z5K1": { "Z1K1": "Z1", "Z2K3": [] } }' );
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( \Error::class );
		$this->assertSame( $testObject->getZType(), 'InvalidObjectWillNotHaveAType' );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_nestedrecordhasnolabel() {
		$testObject = new ZPersistentObject( '{ "Z1K1": "Z5", "Z5K1": { "Z1K1": "Z1", "Z2K2": "Foo" } }' );
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( \Error::class );
		$this->assertSame( $testObject->getZType(), 'InvalidObjectWillNotHaveAType' );
	}
}
