<?php

/**
 * WikiLambda integration test suite for the ZMonoLingualString class
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use InvalidArgumentException;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZTypeRegistry;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualString
 */
class ZMonoLingualStringTest extends \MediaWikiIntegrationTestCase {

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 * @covers ::getLanguage
	 * @covers ::getString
	 * @covers ::getZValue
	 * @covers ::isValid
	 */
	public function testCreation() {
		$testObject = new ZMonoLingualString( 'en', 'Demonstration item' );
		$this->assertSame( 'Z11', $testObject->getZType() );
		$this->assertSame( 'en', $testObject->getLanguage() );
		$this->assertSame( 'Demonstration item', $testObject->getString() );
		$this->assertSame( [ 'en' => 'Demonstration item' ], $testObject->getZValue() );
		$this->assertTrue( $testObject->isValid() );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 */
	public function testStaticCreation() {
		$testObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MONOLINGUALSTRING,
			ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE => 'en',
			ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE => 'Demonstration item'
		] );
		$this->assertSame( 'Z11', $testObject->getZType() );
		$this->assertSame( 'en', $testObject->getLanguage() );
		$this->assertSame( 'Demonstration item', $testObject->getString() );
		$this->assertSame( [ 'en' => 'Demonstration item' ], $testObject->getZValue() );
		$this->assertTrue( $testObject->isValid() );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 */
	public function testStaticCreation_invalidNoLanguageKey() {
		$this->expectException( InvalidArgumentException::class );
		$invalidObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MONOLINGUALSTRING,
			ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE => 'Demonstration item'
		] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 */
	public function testStaticCreation_invalidNoValueKey() {
		$this->expectException( InvalidArgumentException::class );
		$invalidObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MONOLINGUALSTRING,
			ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE => 'en'
		] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::__construct
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::isValid
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::getZType
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::getZValue
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::getInnerZObject
	 */
	public function testPersistentCreation() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZPersistentObject( '{ "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "Demonstration item" }' );

		$this->assertSame( 'Z11', $testObject->getZType() );
		$this->assertSame( [ 'en' => 'Demonstration item' ], $testObject->getZValue() );

		$testObject = new ZPersistentObject(
			<<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": "Z0",
	"Z2K2": {
		"Z1K1": "Z11",
		"Z11K1": "en",
		"Z11K2": "Demonstration item"
	},
	"Z2K3": {
		"Z1K1": "Z12",
		"Z12K1": []
	}
}
EOT
		);
		$this->assertSame( 'Z11', $testObject->getZType() );
		$this->assertSame( [ 'en' => 'Demonstration item' ], $testObject->getZValue() );
		$this->assertSame( 'en', $testObject->getInnerZObject()->getLanguage() );
		$this->assertSame( 'Demonstration item', $testObject->getInnerZObject()->getString() );
		$this->assertTrue( $testObject->isValid() );
	}
}
