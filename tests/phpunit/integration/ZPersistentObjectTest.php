<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
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
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContentHandler::getExternalRepresentation
	 */
	public function testGetExternalRepresentation() {
		$this->editPage( ZTestType::TEST_ZID, ZTestType::TEST_ENCODING, 'Test creation', NS_ZOBJECT );

		$title = \Title::newFromText( ZTestType::TEST_ZID, NS_ZOBJECT );
		$page = \WikiPage::factory( $title );

		$externalRepresentation = ZObjectContentHandler::getExternalRepresentation( $title );

		$this->assertFalse( strpos( $externalRepresentation, '"Z2K1": "Z0"' ), "ZPO key is not set to Z0" );
		$this->assertTrue( (bool)strpos( $externalRepresentation, '"Z2K1": "Z111"' ), "ZPO key is set to the title" );

		// Cleanup the page we touched.
		$page->doDeleteArticleReal( $title, $this->getTestSysop()->getUser() );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_contentHandlerEmptyContentIsValid() {
		$contentHandler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
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
	public function testCreation_invalidThrows_invalidkey() {
		$testObject = new ZPersistentObject( '{ "Z1K1": "This is not a valid key!", "Z5K1": "" }' );
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
