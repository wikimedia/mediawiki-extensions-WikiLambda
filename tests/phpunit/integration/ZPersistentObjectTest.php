<?php

/**
 * WikiLambda integration test suite for the ZPersistentObject class
 *
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use InvalidArgumentException;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use MediaWiki\Extension\WikiLambda\ZPersistentObject;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZPersistentObject
 * @group Database
 */
class ZPersistentObjectTest extends \MediaWikiIntegrationTestCase {

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 * @covers ::getZValue
	 */
	public function testCreation_record() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZPersistentObject( '{ "Z1K1": "Z1", "Z5K1": "" }' );
		$this->assertSame( 'ZObject', $testObject->getZType() );
		$this->assertSame( '', $testObject->getZValue()->getZValue() );

		$testObject = new ZPersistentObject( '{ "Z1K1": "Z1", "Z5K1": "Test" }' );
		$this->assertSame( 'ZObject', $testObject->getZType() );
		$this->assertSame( "Test", $testObject->getZValue()->getZValue() );

		$testObject = new ZPersistentObject( '{ "Z1K1": "Z1", "Z5K1": [ "Test" ] }' );
		$this->assertSame( 'ZObject', $testObject->getZType() );
		$this->assertSame( [ "Test", [] ], $testObject->getZValue()->getZValue() );

		$testObject = new ZPersistentObject( '{ "Z1K1": "Z1", "Z5K1": { "Z1K1": "Z1", "Z5K1": [ "Test", "Test2", "Test3" ] } }' );
		$this->assertSame( 'ZObject', $testObject->getZType() );
		$this->assertSame( 'ZObject', $testObject->getZValue()->getZType() );
		$this->assertSame( [ "Test", [ "Test2", "Test3" ] ], $testObject->getZValue()->getZValue()->getZValue() );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_contentHandlerEmptyContentIsValid() {
		$contentHandler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$this->hideDeprecated( '::create' );
		$testObject = $contentHandler->makeEmptyContent();
		$this->assertTrue( is_a( $testObject, ZPersistentObject::class ) );
		$this->assertSame( 'ZString', $testObject->getZType() );
		$this->assertSame( '', $testObject->getZValue() );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_nokey() {
		$testObject = new ZPersistentObject( '{ "Z5K1": "Test" }' );
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( InvalidArgumentException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_novalue() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZPersistentObject( '{ "Z1K1": "Z1" }' );
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( InvalidArgumentException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_invalidkey() {
		$testObject = new ZPersistentObject( '{ "Z1K1": "This is not a valid key!", "Z5K1": "" }' );
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( InvalidArgumentException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_unrecognisedkey() {
		$testObject = new ZPersistentObject( '{ "Z1K1": "Z1234", "Z5K1": "" }' );
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( InvalidArgumentException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_nestedrecordhasinvalidkey() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZPersistentObject( '{"Z1K1":"Z2","Z2K1":"Z0","Z2K2":{"Z1K1":"Foo"},"Z2K3": []}' );
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( InvalidArgumentException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_nestedrecordhasnovalue() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZPersistentObject( '{ "Z1K1": "Z5", "Z5K1": { "Z1K1": "Z1", "Z2K3": [] } }' );
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( InvalidArgumentException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_nestedrecordhasnolabel() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZPersistentObject( '{ "Z1K1": "Z5", "Z5K1": { "Z1K1": "Z1", "Z2K2": "Foo" } }' );
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( InvalidArgumentException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}
}
