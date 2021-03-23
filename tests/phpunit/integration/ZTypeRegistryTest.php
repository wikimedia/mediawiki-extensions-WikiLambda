<?php

/**
 * WikiLambda integration test suite for the ZTypeRegistry class
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use InvalidArgumentException;
use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use MediaWiki\Extension\WikiLambda\ZTypeRegistry;
use Title;
use WikiPage;

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
		$registry = ZTypeRegistry::singleton();

		// NOTE: Hopefully this won't clash with real content on a test DB.
		$this->assertFalse(
			$registry->isZObjectKeyKnown( ZTestType::TEST_ZID ),
			"'" . ZTestType::TEST_ZID . "' is not defined as a built-in, and not found in the DB before it's written."
		);

		$title = Title::newFromText( ZTestType::TEST_ZID, NS_ZOBJECT );
		$baseObject = ZTestType::TEST_ENCODING;

		$page = WikiPage::factory( $title );
		$this->hideDeprecated( '::create' );
		$content = ZObjectContentHandler::makeContent( $baseObject, $title );
		$page->doEditContent( $content, "Test creation object" );
		$page->clear();

		$this->assertTrue(
			$registry->isZObjectKeyKnown( ZTestType::TEST_ZID ),
			"'TestingType' is not defined as a built-in, but is read from the DB as key '" . ZTestType::TEST_ZID . "'."
		);
		$this->assertEquals(
			$registry->getZObjectTypeFromKey( ZTestType::TEST_ZID ),
			'Demonstration type',
			"'" . ZTestType::TEST_ZID . "' lookup works to find 'Demonstration type'."
		);

		// Cleanup the page we touched.
		$page->doDeleteArticleReal( $title, $this->getTestSysop()->getUser() );
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

		$this->expectException( InvalidArgumentException::class );
		$this->assertEquals(
			$registry->getZObjectKeyFromType( 'Zero' ),
			'Undefined',
			"'Zero' lookup fails as undefined."
		);
		$this->assertEquals(
			$registry->getZObjectKeyFromType( 'ZObject' ),
			'Z1',
			"'ZObject' lookup works."
		);
	}

	/**
	 * @covers ::getZObjectTypeFromKey
	 */
	public function testGetZObjectTypeFromKey() {
		$registry = ZTypeRegistry::singleton();

		$this->expectException( InvalidArgumentException::class );
		$this->assertEquals( $registry->getZObjectTypeFromKey( 'Z0' ), 'Undefined', "'Z0' lookup fails as undefined." );
		$this->assertEquals( $registry->getZObjectTypeFromKey( 'Z1' ), 'ZObject', "'Z1' lookup works." );
	}

	/**
	 * @covers ::registerType
	 * @covers ::internalRegisterType
	 */
	public function testRegisterType() {
		$registry = ZTypeRegistry::singleton();

		$this->expectException( InvalidArgumentException::class );
		$this->assertEquals(
			$registry->registerType( 'ZObject' ),
			'Undefined',
			"'ZObject' registration fails as already registered."
		);

		$this->expectException( InvalidArgumentException::class );
		$this->assertEquals(
			$registry->registerType( 'Zero' ),
			'Undefined',
			"'Zero' registration fails as no class of that name."
		);

		$this->assertFalse(
			$registry->isZObjectTypeCached( 'ZTypeRegistry' ),
			"'ZTypeRegistry' is not defined as a built-in."
		);

		$newValue = $registry->registerType( 'ZTypeRegistry' );

		$this->assertTrue(
			$registry->isZObjectTypeCached( 'ZTypeRegistry' ),
			"'ZTypeRegistry' is defined once registered."
		);

		$this->assertEquals(
			$registry->getZObjectKeyFromType( 'ZTypeRegistry' ),
			$newValue,
			"'ZTypeRegistry' lookup works once registered."
		);
	}

	/**
	 * @covers ::unregisterType
	 */
	public function testUnregisterType() {
		$registry = ZTypeRegistry::singleton();

		$key = $registry->registerType( 'ZTypeRegistry' );

		$this->assertTrue(
			$registry->isZObjectTypeCached( 'ZTypeRegistry' ),
			"'ZTypeRegistry' is registered."
		);

		$this->assertEquals(
			$registry->getZObjectKeyFromType( 'ZTypeRegistry' ),
			$key,
			"'ZTypeRegistry' lookup works once registered."
		);

		$registry->unregisterType( $key );

		$this->assertFalse(
			$registry->isZObjectTypeCached( 'ZTypeRegistry' ),
			"'ZTypeRegistry' is not chached after unregistering."
		);

		// We unregister a type that wasn't there. Should not fail.
		$registry->unregisterType( 'Undefined Type' );
	}
}
