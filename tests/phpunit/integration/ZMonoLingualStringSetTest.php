<?php

/**
 * WikiLambda integration test suite for the ZMonoLingualStringSet class
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualStringSet;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualStringSet
 */
class ZMonoLingualStringSetTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 * @covers ::getLanguage
	 * @covers ::getStringSet
	 * @covers ::getZValue
	 * @covers ::isValid
	 */
	public function testCreation() {
		$testObject = new ZMonoLingualStringSet( 'Z1002', [ 'Demonstration item', 'Demonstration second item' ] );
		$this->assertSame( 'Z31', $testObject->getZType() );
		$this->assertSame( 'Z1002', $testObject->getLanguage() );
		$this->assertSame( [ 'Demonstration item', 'Demonstration second item' ], $testObject->getStringSet() );
		$this->assertSame(
			[ 'Z1002' => [ 'Demonstration item', 'Demonstration second item' ] ],
			$testObject->getZValue()
		);
		$this->assertTrue( $testObject->isValid() );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 */
	public function testStaticCreation() {
		$testObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MONOLINGUALSTRINGSET,
			ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE => 'Z1002',
			ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE => [ 'Demonstration item', 'Demonstration second item' ]
		] );
		$this->assertSame( 'Z31', $testObject->getZType() );
		$this->assertSame( 'Z1002', $testObject->getLanguage() );
		$this->assertSame( [ 'Demonstration item', 'Demonstration second item' ], $testObject->getStringSet() );
		$this->assertSame(
			[ 'Z1002' => [ 'Demonstration item', 'Demonstration second item' ] ],
			$testObject->getZValue()
		);
		$this->assertTrue( $testObject->isValid() );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 */
	public function testStaticCreation_invalidNoLanguageKey() {
		$this->expectException( ZErrorException::class );
		$invalidObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MONOLINGUALSTRINGSET,
			ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE => [ 'Demonstration item', 'Demonstration second item' ]
		] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 */
	public function testStaticCreation_invalidNoValueKey() {
		$this->expectException( ZErrorException::class );
		$invalidObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MONOLINGUALSTRINGSET,
			ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE => 'Z1002'
		] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 */
	public function testStaticCreation_invalidLanguageReference() {
		$this->expectException( ZErrorException::class );
		$invalidObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MONOLINGUALSTRINGSET,
			ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE => 'en',
			ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE => [ 'Demonstration item', 'Demonstration second item' ]
		] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::isValid
	 */
	public function testStaticCreation_invalidLanguageCode() {
		$this->expectException( ZErrorException::class );
		$invalidObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MONOLINGUALSTRINGSET,
			ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE => 'Z999',
			ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE => [ 'Demonstration item', 'Demonstration second item' ]
		] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::isValid
	 */
	public function testStaticCreation_invalidValue() {
		$this->expectException( ZErrorException::class );
		$invalidObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MONOLINGUALSTRINGSET,
			ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE => 'Z1002',
			ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE => 'Demonstration item'
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
		$testObject = new ZObjectContent(
			'{ "Z1K1": "Z31", "Z31K1": "Z1002", "Z31K2": ["Demonstration item", "Demonstration second item"] }'
		);
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z31', $testObject->getZType() );
		$this->assertSame(
			[ 'Z1002' => [ 'Demonstration item', 'Demonstration second item' ] ],
			$testObject->getZValue()
		);

		$testObject = new ZObjectContent(
			<<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": "Z0",
	"Z2K2": {
		"Z1K1": "Z31",
		"Z31K1": "Z1002",
		"Z31K2": [ "Demonstration item", "Demonstration second item" ]
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
		$this->assertSame( 'Z31', $testObject->getZType() );
		$this->assertSame(
			[ 'Z1002' => [ 'Demonstration item', 'Demonstration second item' ] ],
			$testObject->getZValue()
		);
		$this->assertSame( 'Z1002', $testObject->getInnerZObject()->getLanguage() );
		$this->assertSame(
			[ 'Demonstration item', 'Demonstration second item' ],
			$testObject->getInnerZObject()->getStringSet()
		);
	}
}
