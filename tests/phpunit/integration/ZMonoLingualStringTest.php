<?php

/**
 * WikiLambda integration test suite for the ZMonoLingualString class
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualString
 */
class ZMonoLingualStringTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 * @covers ::getLanguage
	 * @covers ::getString
	 * @covers ::getZValue
	 * @covers ::isValid
	 */
	public function testCreation() {
		$testObject = new ZMonoLingualString(
			new ZReference( 'Z1002' ),
			new ZString( 'Demonstration item' )
		);
		$this->assertSame( 'Z11', $testObject->getZType() );
		$this->assertSame( 'Z1002', $testObject->getLanguage() );
		$this->assertSame( 'Demonstration item', $testObject->getString() );
		$this->assertSame( [ 'Z1002' => 'Demonstration item' ], $testObject->getZValue() );
		$this->assertTrue( $testObject->isValid() );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 */
	public function testStaticCreation() {
		$testObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MONOLINGUALSTRING,
			ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE => 'Z1002',
			ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE => 'Demonstration item'
		] );
		$this->assertSame( 'Z11', $testObject->getZType() );
		$this->assertSame( 'Z1002', $testObject->getLanguage() );
		$this->assertSame( 'Demonstration item', $testObject->getString() );
		$this->assertSame( [ 'Z1002' => 'Demonstration item' ], $testObject->getZValue() );
		$this->assertTrue( $testObject->isValid() );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 */
	public function testStaticCreation_invalidNoLanguageKey() {
		$this->expectException( ZErrorException::class );

		$invalidObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MONOLINGUALSTRING,
			ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE => 'Demonstration item'
		] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 */
	public function testStaticCreation_invalidNoValueKey() {
		$this->expectException( ZErrorException::class );
		$invalidObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MONOLINGUALSTRING,
			ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE => 'Z1002'
		] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 */
	public function testStaticCreation_invalidLanguageReference() {
		$this->expectException( ZErrorException::class );
		$invalidObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MONOLINGUALSTRING,
			ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE => 'en',
			ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE => 'Demonstration item'
		] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::__construct
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::isValid
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::getZType
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::getZValue
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::getInnerZObject
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::getZType
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::getZValue
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::getInnerZObject
	 */
	public function testPersistentCreation() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZObjectContent( '{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "Demonstration item" }' );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z11', $testObject->getZType() );
		$this->assertSame( [ 'Z1002' => 'Demonstration item' ], $testObject->getZValue() );

		$testObject = new ZObjectContent(
			<<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": "Z0",
	"Z2K2": {
		"Z1K1": "Z11",
		"Z11K1": "Z1002",
		"Z11K2": "Demonstration item"
	},
	"Z2K3": {
		"Z1K1": "Z12",
		"Z12K1": []
	},
	"Z2K4": {
		"Z1K1": "Z32",
		"Z32K1": []
	}
}
EOT
		);

		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z11', $testObject->getZType() );
		$this->assertSame( [ 'Z1002' => 'Demonstration item' ], $testObject->getZValue() );
		$this->assertSame( 'Z1002', $testObject->getInnerZObject()->getLanguage() );
		$this->assertSame( 'Demonstration item', $testObject->getInnerZObject()->getString() );
	}
}
