<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZTypeRegistry;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZTypeRegistry
 */
class ZTypeRegistryTest extends \MediaWikiIntegrationTestCase {

	/**
	 * @covers ::singleton
	 */
	public function testSingleton() {
		$registry = ZTypeRegistry::singleton();
		$this->assertEquals( get_class( $registry ), ZTypeRegistry::class );
		$this->assertEquals( $registry, ZTypeRegistry::singleton() );
	}

	/**
	 * @covers ::getCachedZObjectKeys
	 */
	public function testGetCachedZObjectKeys() {
		$registry = ZTypeRegistry::singleton();

		$objectKeys = $registry->getCachedZObjectKeys();

		$this->assertNotContains( 'Z0', $objectKeys, "'Z0' is not defined as a built-in." );
		$this->assertContains( 'Z1', $objectKeys, "'Z1' defined as a built-in." );
	}

	/**
	 * @covers ::isZObjectKeyCached
	 */
	public function testIsZObjectKeyCached() {
		$registry = ZTypeRegistry::singleton();

		$this->assertFalse( $registry->isZObjectKeyCached( 'Z0' ), "'Z0' is not defined as a built-in." );
		$this->assertTrue( $registry->isZObjectKeyCached( 'Z1' ), "'Z1' is defined as a built-in." );
	}

	/**
	 * @covers ::getCachedZObjectTypes
	 */
	public function testGetCachedZObjectTypes() {
		$registry = ZTypeRegistry::singleton();

		$objectTypes = $registry->getCachedZObjectTypes();

		$this->assertNotContains( 'Zero', $objectTypes, "'Zero' is not defined as a built-in." );
		$this->assertContains( 'ZObject', $objectTypes, "'ZObject' defined as a built-in." );
	}

	/**
	 * @covers ::isZObjectTypeCached
	 */
	public function testIsZObjectTypeCached() {
		$registry = ZTypeRegistry::singleton();

		$this->assertFalse( $registry->isZObjectTypeCached( 'Zero' ), "'Zero' is not defined as a built-in." );
		$this->assertTrue( $registry->isZObjectTypeCached( 'ZObject' ), "'ZObject' is defined as a built-in." );
	}

	/**
	 * @covers ::getZObjectKeyFromType
	 */
	public function testGetZObjectKeyFromType() {
		$registry = ZTypeRegistry::singleton();

		$this->expectException( \InvalidArgumentException::class );
		$this->assertEquals( $registry->getZObjectKeyFromType( 'Zero' ), 'Undefined', "'Zero' lookup fails as undefined." );
		$this->assertEquals( $registry->getZObjectKeyFromType( 'ZObject' ), 'Z1', "'ZObject' lookup works." );
	}

	/**
	 * @covers ::getZObjectTypeFromKey
	 */
	public function testGetZObjectTypeFromKey() {
		$registry = ZTypeRegistry::singleton();

		$this->expectException( \InvalidArgumentException::class );
		$this->assertEquals( $registry->getZObjectTypeFromKey( 'Z0' ), 'Undefined', "'Z0' lookup fails as undefined." );
		$this->assertEquals( $registry->getZObjectTypeFromKey( 'Z1' ), 'ZObject', "'Z1' lookup works." );
	}

	/**
	 * @covers ::registerType
	 */
	public function testRegisterType() {
		$registry = ZTypeRegistry::singleton();

		$this->expectException( \InvalidArgumentException::class );
		$this->assertEquals( $registry->registerType( 'ZObject' ), 'Undefined', "'ZObject' registration fails as already registered." );

		$this->expectException( \InvalidArgumentException::class );
		$this->assertEquals( $registry->registerType( 'Zero' ), 'Undefined', "'Zero' registration fails as no class of that name." );

		$this->assertFalse( $registry->isZObjectTypeCached( 'ZTypeRegistry' ), "'ZTypeRegistry' is not defined as a built-in." );

		$newValue = $registry->registerType( 'ZTypeRegistry' );

		$this->assertTrue( $registry->isZObjectTypeCached( 'ZTypeRegistry' ), "'ZTypeRegistry' is defined once registered." );

		$this->assertEquals( $registry->getZObjectKeyFromType( 'ZTypeRegistry' ), $newValue, "'ZTypeRegistry' lookup works once registered." );
	}
}
