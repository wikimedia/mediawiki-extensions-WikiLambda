<?php

/**
 * WikiLambda integration test suite for the ZObject class
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use Title;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZObject
 * @group Database
 */
class ZObjectTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers ::getValueByKey
	 */
	public function testGetValueByKey_stringValue() {
		$testObject = ZObjectFactory::create( 'foo' );
		$testObject = $testObject->getValueByKey( 'Z6K1' );
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( 'foo', $testObject->getZValue() );
	}

	/**
	 * @covers ::getValueByKey
	 */
	public function testGetValueByKey_undefinedKey() {
		$testObject = ZObjectFactory::create( 'foo' );
		$testObject = $testObject->getValueByKey( 'Z1K999' );
		$this->assertNull( $testObject );
	}

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 */
	public function testConstruct_builtinType() {
		$testObject = (object)[
			"Z1K1" => "Z6",
			"Z6K1" => "builtin zobject"
		];
		$testZObject = ZObjectFactory::create( $testObject );
		$this->assertInstanceOf( ZObject::class, $testZObject );
		$this->assertInstanceOf( ZString::class, $testZObject );
		$this->assertSame( $testZObject->getZType(), 'Z6' );
	}

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 */
	public function testConstruct_customType() {
		// Create type Z111
		$this->registerLangs( ZTestType::TEST_LANGS );
		$title = Title::newFromText( ZTestType::TEST_ZID, NS_MAIN );
		$this->editPage( $title, ZTestType::TEST_ENCODING, "Test creation object", NS_MAIN );

		// Create instance of type Z111
		$testObject = (object)[
			"Z1K1" => "Z111",
			"Z111K1" => "first demonstration key",
			"Z111K2" => "second demonstration key"
		];
		$testZObject = ZObjectFactory::create( $testObject );
		$this->assertInstanceOf( ZObject::class, $testZObject );
		$this->assertSame( $testZObject->getZType(), 'Z111' );
	}

	/**
	 * @covers ::getLinkedZObjects()
	 */
	public function test_getLinkedZObjects() {
		// Create type Z111
		$this->registerLangs( ZTestType::TEST_LANGS );
		$title = Title::newFromText( ZTestType::TEST_ZID, NS_MAIN );
		$this->editPage( $title, ZTestType::TEST_ENCODING, "Test creation object", NS_MAIN );

		// Create instance of type Z111
		$testObject = (object)[
			"Z1K1" => "Z111",
			"Z111K1" => "first demonstration key",
			"Z111K2" => "second demonstration key"
		];
		$testZObject = ZObjectFactory::create( $testObject );
		$this->assertContains( "Z111", $testZObject->getLinkedZObjects() );
	}
}
