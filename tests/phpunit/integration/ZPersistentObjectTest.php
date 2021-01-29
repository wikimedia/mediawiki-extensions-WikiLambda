<?php

/**
 * WikiLambda integration test suite for the ZPersistentObject class
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use InvalidArgumentException;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject
 * @group Database
 */
class ZPersistentObjectTest extends \MediaWikiIntegrationTestCase {

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 * @covers ::getZValue
	 */
	public function testCreation_basicObject() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZPersistentObject(
			'{ "Z1K1": "Z1" }'
		);
		$this->assertSame( 'ZObject', $testObject->getZType() );
		$this->assertSame( [ 'Z1K1' => 'ZObject' ], $testObject->getZValue() );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_contentHandlerEmptyContentIsValid() {
		$contentHandler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$this->hideDeprecated( '::create' );
		$testObject = $contentHandler->makeEmptyContent();
		$this->assertInstanceOf( ZPersistentObject::class, $testObject );
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( '', $testObject->getZValue() );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_nokey() {
		$testObject = new ZPersistentObject(
			'{}'
		);
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( InvalidArgumentException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_invalidkey() {
		$testObject = new ZPersistentObject(
			'{ "Z1K1": "This is not a valid key!" }'
		);
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( InvalidArgumentException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_unrecognisedkey() {
		$testObject = new ZPersistentObject(
			'{ "Z1K1": "Z1234" }'
		);
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( InvalidArgumentException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_nestedrecordhasinvalidkey() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZPersistentObject(
			'{"Z1K1":"Z2","Z2K1":"Z0","Z2K2":{"Z1K1":"Foo"},"Z2K3": { "Z1K1":"Z12", "Z12K1":[] }}'
		);
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( InvalidArgumentException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_nestedrecordhasnovalue() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZPersistentObject(
			'{ "Z1K1": "Z2", "Z2K2": { "Z1K1": "Z1", "Z2K3": { "Z1K1":"Z12", "Z12K1":[] } } }'
		);
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( InvalidArgumentException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_nestedrecordhasnolabel() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZPersistentObject(
			'{ "Z1K1": "Z2", "Z2K2": { "Z1K1": "Z1", "Z2K2": "Foo" } }'
		);
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( InvalidArgumentException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}
}
