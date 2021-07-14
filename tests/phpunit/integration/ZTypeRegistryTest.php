<?php

/**
 * WikiLambda integration test suite for the ZTypeRegistry class
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZTypeRegistry;
use Title;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZTypeRegistry
 * @group Database
 */
class ZTypeRegistryTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectRegistry::singleton
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectRegistry::__construct
	 * @covers ::initialize
	 */
	public function testSingleton() {
		$registry = ZTypeRegistry::singleton();
		$this->assertEquals( get_class( $registry ), ZTypeRegistry::class );
		$this->assertEquals( $registry, ZTypeRegistry::singleton() );
	}

	/**
	 * @covers ::isZTypeBuiltIn
	 */
	public function testIsZTypeBuiltIn() {
		$registry = ZTypeRegistry::singleton();

		$this->assertFalse( $registry->isZTypeBuiltIn( 'Z0' ), "'Z0' is not defined as a built-in." );
		$this->assertTrue( $registry->isZTypeBuiltIn( ZTypeRegistry::Z_OBJECT ), "'Z1' is defined as a built-in." );
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
	 * @covers ::isZObjectKeyKnown
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContentHandler::makeContent
	 */
	public function testIsZObjectKeyKnown() {
		$this->registerLangs( ZTestType::TEST_LANGS );

		$registry = ZTypeRegistry::singleton();

		// NOTE: Hopefully this won't clash with real content on a test DB.
		$this->assertFalse(
			$registry->isZObjectKeyKnown( ZTestType::TEST_ZID ),
			"'" . ZTestType::TEST_ZID . "' is not defined as a built-in, and not found in the DB before it's written."
		);

		$title = Title::newFromText( ZTestType::TEST_ZID, NS_ZOBJECT );
		$this->editPage( $title, ZTestType::TEST_ENCODING, "Test creation object", NS_ZOBJECT );

		$this->assertTrue(
			$registry->isZObjectKeyKnown( ZTestType::TEST_ZID ),
			"'TestingType' is not defined as a built-in, but is read from the DB as key '" . ZTestType::TEST_ZID . "'."
		);
		$this->assertEquals(
			$registry->getZObjectTypeFromKey( ZTestType::TEST_ZID ),
			'Demonstration type',
			"'" . ZTestType::TEST_ZID . "' lookup works to find 'Demonstration type'."
		);
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
	 * TODO: Once this method tests the database, these tests should be expanded to cover DB reads.
	 *
	 * @covers ::isZObjectTypeKnown
	 */
	public function testIsZObjectTypeKnown() {
		$registry = ZTypeRegistry::singleton();

		$this->assertFalse(
			$registry->isZObjectTypeKnown( 'Zero' ),
			"'Zero' is not defined as a built-in, nor is read from the DB."
		);
		$this->assertTrue(
			$registry->isZObjectTypeKnown( 'ZObject' ),
			"'ZObject' is defined as a built-in, so isn't read from the DB."
		);
	}

	/**
	 * @covers ::getZObjectKeyFromType
	 */
	public function testGetZObjectKeyFromType() {
		$registry = ZTypeRegistry::singleton();

		$this->assertEquals(
			$registry->getZObjectKeyFromType( 'ZObject' ),
			'Z1',
			"'ZObject' lookup works."
		);

		$this->expectException( ZErrorException::class );
		$this->assertEquals(
			$registry->getZObjectKeyFromType( 'Zero' ),
			'Undefined',
			"'Zero' lookup fails as undefined."
		);
	}

	/**
	 * @covers ::getZObjectTypeFromKey
	 */
	public function testGetZObjectTypeFromKey() {
		$registry = ZTypeRegistry::singleton();

		$this->assertEquals( $registry->getZObjectTypeFromKey( 'Z1' ), 'ZObject', "'Z1' lookup works." );

		$this->expectException( ZErrorException::class );
		$this->assertEquals(
			$registry->getZObjectTypeFromKey( 'Z0' ),
			'Undefined',
			"'Z0' lookup fails as undefined."
		);
	}

	/**
	 * @covers ::register
	 */
	public function testRegisterTypeFailed_keyRegistered() {
		$registry = ZTypeRegistry::singleton();

		$registeredZid = 'Z1';
		$type = 'ZUnregisteredType';

		// Expect ZErrorException when the key has already been added with a different type
		// e.g. register( Z1, UnregisteredType )
		$this->expectException( ZErrorException::class );
		$this->assertEquals(
			$registry->register( $registeredZid, $type ),
			'Undefined',
			"'$type' registration fails as the ZID 'Z1' is already registered."
		);
	}

	/**
	 * @covers ::register
	 */
	public function testRegisterTypeFailed_typeRegistered() {
		$registry = ZTypeRegistry::singleton();

		$zid = 'Z222';
		$registeredType = 'ZObject';

		// Expect ZErrorException when the type has already been added with a different key
		// e.g. register( Z34, ZObject )
		$this->expectException( ZErrorException::class );
		$this->assertEquals(
			$registry->register( $zid, $registeredType ),
			'Undefined',
			"'ZObject' registration fails as it's already registered under ZID 'Z1'."
		);
	}

	/**
	 * @covers ::register
	 */
	public function testRegisterType() {
		$registry = ZTypeRegistry::singleton();

		$zid = 'Z222';
		$type = 'ZUnregisteredType';

		// Register successfully Z222 => ZUnregisteredType
		$registry->register( $zid, $type );

		$this->assertTrue(
			$registry->isZObjectTypeCached( $type ),
			"The type '$type' is cached once registered."
		);

		$this->assertTrue(
			$registry->isZObjectKeyCached( $zid ),
			"The key '$zid' is cached once registered."
		);

		$this->assertEquals(
			$registry->getZObjectKeyFromType( $type ),
			$zid,
			"'$type' lookup works once registered."
		);

		$registry->unregister( $zid );
	}

	/**
	 * @covers ::unregister
	 */
	public function testUnregister() {
		$registry = ZTypeRegistry::singleton();

		$zid = 'Z222';
		$type = 'ZUnregisteredType';

		$this->assertFalse(
			$registry->isZObjectKeyCached( $zid ),
			"The key '$zid' is not cached before registering."
		);

		// Register successfully the type
		$registry->register( $zid, $type );

		$this->assertTrue(
			$registry->isZObjectKeyCached( $zid ),
			"The key '$zid' is cached after registering."
		);

		// Unregister the type
		$registry->unregister( $zid );

		$this->assertFalse(
			$registry->isZObjectKeyCached( $zid ),
			"The key '$zid' is not cached after unregistering."
		);
	}
}
