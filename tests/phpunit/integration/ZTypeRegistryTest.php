<?php

/**
 * WikiLambda integration test suite for the ZTypeRegistry class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use Title;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry
 * @group Database
 */
class ZTypeRegistryTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\Registry\ZObjectRegistry::singleton
	 * @covers \MediaWiki\Extension\WikiLambda\Registry\ZObjectRegistry::__construct
	 * @covers ::initialize
	 * @covers ::register
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
	 * @covers \MediaWiki\Extension\WikiLambda\Registry\ZObjectRegistry::isZidCached
	 */
	public function testIsZObjectKeyCached() {
		$registry = ZTypeRegistry::singleton();

		$this->assertFalse( $registry->isZObjectKeyCached( 'Z0' ), "'Z0' is not defined as a built-in." );
		$this->assertFalse( $registry->isZidCached( 'Z0' ), "'Z0' is not defined as a built-in (upstream method)." );
		$this->assertTrue( $registry->isZObjectKeyCached( 'Z1' ), "'Z1' is defined as a built-in." );
		$this->assertTrue( $registry->isZidCached( 'Z1' ), "'Z1' is defined as a built-in (upstream method)." );
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

		$title = Title::newFromText( ZTestType::TEST_ZID, NS_MAIN );
		$this->editPage( $title, ZTestType::TEST_ENCODING, "Test creation object", NS_MAIN );

		$this->assertTrue(
			$registry->isZObjectKeyKnown( ZTestType::TEST_ZID ),
			"'TestingType' is not defined as a built-in, but is read from the DB as key '" . ZTestType::TEST_ZID . "'."
		);
		$this->assertEquals(
			'Demonstration type',
			$registry->getZObjectTypeFromKey( ZTestType::TEST_ZID ),
			"'" . ZTestType::TEST_ZID . "' lookup works to find 'Demonstration type'."
		);
	}

	/**
	 * @covers ::isZObjectKeyKnown
	 */
	public function testIsZObjectKeyKnown_rejectNonTypes() {
		$this->registerLangs( ZTestType::TEST_LANGS );

		// Ensure that Z40 (Boolean type) and Z41 (True instance of Boolean)
		$this->insertZids( [ 'Z40', 'Z41' ] );

		$registry = ZTypeRegistry::singleton();

		$this->assertTrue(
			$registry->isZObjectKeyKnown( 'Z40' ),
			"'Z40' is a known ZType."
		);

		$this->assertFalse(
			$registry->isZObjectKeyKnown( 'Z41' ),
			"'Z41' is not a known ZType."
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
			'Z1',
			$registry->getZObjectKeyFromType( 'ZObject' ),
			"'ZObject' lookup works."
		);

		$this->expectException( ZErrorException::class );
		$this->assertEquals(
			'Undefined',
			$registry->getZObjectKeyFromType( 'Zero' ),
			"'Zero' lookup fails as undefined."
		);
	}

	/**
	 * @covers ::getZObjectTypeFromKey
	 */
	public function testGetZObjectTypeFromKey() {
		$registry = ZTypeRegistry::singleton();

		$this->assertEquals( 'ZObject', $registry->getZObjectTypeFromKey( 'Z1' ), "'Z1' lookup works." );

		$this->expectException( ZErrorException::class );
		$this->assertEquals(
			'Undefined',
			$registry->getZObjectTypeFromKey( 'Z0' ),
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
			'Undefined',
			$registry->register( $registeredZid, $type ),
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
			'Undefined',
			$registry->register( $zid, $registeredType ),
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
	 * @covers \MediaWiki\Extension\WikiLambda\Registry\ZObjectRegistry::clear
	 * @covers \MediaWiki\Extension\WikiLambda\Registry\ZObjectRegistry::clearAll
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

		// Re-register successfully the type
		$registry->register( $zid, $type );

		$this->assertTrue(
			$registry->isZObjectKeyCached( $zid ),
			"The key '$zid' is cached after re-registering."
		);

		// Clear the whole registry
		$registry->clear();

		$this->assertFalse(
			$registry->isZObjectKeyCached( $zid ),
			"The key '$zid' is not cached after clearing the registry."
		);

		// Re-re-register successfully the type
		$registry->register( $zid, $type );

		$this->assertTrue(
			$registry->isZObjectKeyCached( $zid ),
			"The key '$zid' is cached after re-re-registering."
		);

		// Clear all registries
		$registry->clearAll();

		$this->assertFalse(
			$registry->isZObjectKeyCached( $zid ),
			"The key '$zid' is not cached after clearing all registries."
		);
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\Registry\ZObjectRegistry::unregisterZid
	 * @covers ::unregister
	 */
	public function testUnregisterZid() {
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

		// Unregister the type from all registries
		$registry->unregisterZid( $zid );

		$this->assertFalse(
			$registry->isZObjectKeyCached( $zid ),
			"The key '$zid' is not cached after unregistering."
		);
	}

	/**
	 * @covers ::isZObjectInstanceOfType
	 */
	public function testIsZObjectInstanceOfType() {
		// Ensure that Z4/Type, Z6/String, Z40/Boolean, and Z41/True instance of Boolean are all available
		$this->insertZids( [ 'Z4', 'Z6', 'Z40', 'Z41' ] );

		$registry = ZTypeRegistry::singleton();

		$typeZObjectReference = ZObjectFactory::create( "Z4" );
		$stringZObjectReference = ZObjectFactory::create( "Z6" );

		$this->assertTrue(
			$registry->isZObjectInstanceOfType( $typeZObjectReference, $typeZObjectReference->getZValue() ),
			"A reference to the type type is itself a type."
		);

		$this->assertTrue(
			$registry->isZObjectInstanceOfType( $typeZObjectReference, ZTypeRegistry::Z_OBJECT ),
			"A reference to the type type is itself a ZObject."
		);

		$this->assertTrue(
			$registry->isZObjectInstanceOfType( $stringZObjectReference, ZTypeRegistry::Z_OBJECT ),
			"A reference to the string type is itself a ZObject."
		);

		$this->assertTrue(
			$registry->isZObjectInstanceOfType( $stringZObjectReference, $typeZObjectReference->getZValue() ),
			"A reference to the string type is itself a type."
		);

		$this->assertFalse(
			$registry->isZObjectInstanceOfType( $typeZObjectReference, $stringZObjectReference->getZValue() ),
			"A reference to the type type is not a string type."
		);

		$workingZObject = ZObjectFactory::create( "direct string" );
		$this->assertTrue(
			$registry->isZObjectInstanceOfType( $workingZObject, $stringZObjectReference->getZValue() ),
			"A direct string is a string."
		);

		$booleanZObjectReference = ZObjectFactory::create( "Z40" );
		$booleanTrueZObjectReference = ZObjectFactory::create( "Z41" );

		$this->assertTrue(
			$registry->isZObjectInstanceOfType( $booleanTrueZObjectReference, $booleanZObjectReference->getZValue() ),
			"A reference to Z41/True is a boolean."
		);

		$this->assertFalse(
			$registry->isZObjectInstanceOfType( $booleanTrueZObjectReference, $stringZObjectReference->getZValue() ),
			"A reference to Z41/True is not a string."
		);

		$this->assertFalse(
			$registry->isZObjectInstanceOfType( new ZString( 'Hello' ), $booleanZObjectReference->getZValue() ),
			"A non-reference ZObject which is not of the right type is seen as such."
		);
	}

	/**
	 * @covers ::isZObjectInstanceOfType
	 */
	public function testIsZObjectInstanceOfTyp_throws() {
		// Ensure that Z4/Type, Z6/String, Z40/Boolean, and Z41/True instance of Boolean are all available
		$this->insertZids( [ 'Z4' ] );

		$registry = ZTypeRegistry::singleton();

		$typeZObjectReference = ZObjectFactory::create( "Z4" );

		$this->expectException( ZErrorException::class );
		$this->assertFalse(
			$registry->isZObjectInstanceOfType( $typeZObjectReference, 'Z0' ),
			"Asking if an item is a reference to an unknown ZID throws."
		);
	}
}
