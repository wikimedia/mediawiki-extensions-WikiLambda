<?php

/**
 * WikiLambda integration test suite for the ZMultiLingualStringSet class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualStringSet;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualStringSet;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualStringSet
 */
class ZMultiLingualStringSetTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 * @covers ::getZValue
	 * @covers ::isLanguageProvidedValue
	 * @covers ::getAliasesForLanguage
	 * @covers ::getAliasesForLanguageCode
	 * @covers ::isValid
	 * @covers ::getDefinition
	 */
	public function testCreation() {
		$this->registerLangs( [ 'es', 'de', 'fr' ] );

		$testObject = new ZMultiLingualStringSet( [] );
		$this->assertTrue( $testObject->isValid() );

		$testObject = new ZMultiLingualStringSet( [
			new ZMonoLingualStringSet(
				new ZReference( self::ZLANG['en'] ),
				[ new ZString( 'Demonstration item' ), new ZString( 'Demonstration second item' ) ]
			),
			new ZMonoLingualStringSet(
				new ZReference( self::ZLANG['es'] ),
				[ new ZString( 'Elemento para demostración' ) ]
			),
			new ZMonoLingualStringSet(
				new ZReference( self::ZLANG['de'] ),
				[ new ZString( 'Gegenstand zur Demonstration' ) ]
			),
			new ZMonoLingualStringSet(
				new ZReference( self::ZLANG['fr'] ),
				[ new ZString( 'Article pour démonstration' ) ]
			)
		] );

		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z32', $testObject->getZType() );
		$this->assertArrayHasKey( self::ZLANG['en'], $testObject->getZValue() );
		$this->assertArrayNotHasKey( self::ZLANG['ru'], $testObject->getZValue() );

		$this->assertTrue(
			$testObject->isLanguageProvidedValue( 'en' )
		);
		$this->assertFalse(
			$testObject->isLanguageProvidedValue( 'nonsense' )
		);

		$this->assertSame(
			[ 'Demonstration item', 'Demonstration second item' ],
			$testObject->getAliasesForLanguage( $this->makeLanguage( 'en' ) )
		);
		$this->assertSame(
			[ 'Demonstration item', 'Demonstration second item' ],
			$testObject->getAliasesForLanguageCode( 'en' )
		);

		$this->assertSame(
			[ 'Elemento para demostración' ],
			$testObject->getAliasesForLanguage( $this->makeLanguage( 'es' ) )
		);
		$this->assertSame(
			[ 'Gegenstand zur Demonstration' ],
			$testObject->getAliasesForLanguage( $this->makeLanguage( 'de' ) )
		);
		$this->assertSame(
			[ 'Article pour démonstration' ],
			$testObject->getAliasesForLanguage( $this->makeLanguage( 'fr' ) )
		);

		// Test direct fall-back.
		$this->assertSame(
			[ 'Article pour démonstration' ],
			$testObject->getAliasesForLanguage( $this->makeLanguage( 'atj' ) )
		);

		// Test indirect fall-back.
		$this->assertSame(
			[ 'Gegenstand zur Demonstration' ],
			$testObject->getAliasesForLanguage( $this->makeLanguage( 'dsb' ) )
		);

		// Test non-fall-back.
		$chineseLang = $this->makeLanguage( 'zh' );
		$this->assertSame(
			[],
			$testObject->getAliasesForLanguage( $chineseLang )
		);
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 */
	public function testStaticCreation() {
		$testObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MULTILINGUALSTRINGSET,
			ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE => [
				ZTypeRegistry::Z_MONOLINGUALSTRINGSET,
				(object)[
					ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MONOLINGUALSTRINGSET,
					ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE => 'Z1002',
					ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE => [
						ZTypeRegistry::Z_STRING,
						'Demonstration item'
					]
				]
			]
		] );
		$this->assertSame( 'Z32', $testObject->getZType() );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 */
	public function testStaticCreation_invalidNoValueKey() {
		$this->expectException( ZErrorException::class );
		$invalidObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MULTILINGUALSTRINGSET
		] );
	}

	/**
	 * @covers ::setMonoLingualStringSet
	 * @covers ::isLanguageProvidedValue
	 * @covers ::isValid
	 */
	public function testModification() {
		$this->registerLangs( [ 'fr', 'es' ] );

		$testObject = new ZMultiLingualStringSet( [] );
		$this->assertTrue( $testObject->isValid() );

		$french = $this->makeLanguage( 'fr' );
		$this->assertFalse( $testObject->isLanguageProvidedValue( 'fr' ) );
		$testMono = new ZMonoLingualStringSet( new ZReference( self::ZLANG['fr'] ), [ new ZString( 'Bonjour' ) ] );
		$testObject->setMonoLingualStringSet( $testMono );
		$this->assertTrue( $testObject->isValid() );
		$this->assertTrue( $testObject->isLanguageProvidedValue( 'fr' ) );
		$this->assertSame(
			[ 'Bonjour' ],
			$testObject->getAliasesForLanguage( $french )
		);

		$testObject->setMonoLingualStringSet( $testMono );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame(
			[ 'Bonjour' ],
			$testObject->getAliasesForLanguage( $french )
		);

		$spanish = $this->makeLanguage( 'es' );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame(
			[],
			$testObject->getAliasesForLanguage( $spanish )
		);

		$invalidLang = $this->makeLanguage( '&&&' );
		$invalidMono = new ZMonoLingualStringSet( new ZReference( '&&&' ), [ new ZString( 'Invalid item' ) ] );
		$testObject->setMonoLingualStringSet( $invalidMono );
		$this->assertFalse( $testObject->isValid() );
		$this->assertSame(
			[],
			$testObject->getAliasesForLanguage( $invalidLang )
		);
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
		$this->registerLangs( [ 'fr' ] );

		$english = $this->makeLanguage( 'en' );
		$french = $this->makeLanguage( 'fr' );

		$testObject = new ZObjectContent(
			<<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": "Z0",
	"Z2K2": {
		"Z1K1": "Z32",
		"Z32K1": [ "Z31" ]
	},
	"Z2K3": {
		"Z1K1": "Z12",
		"Z12K1": [ "Z11" ]
	},
	"Z2K4": {
		"Z1K1": "Z32",
		"Z32K1": [ "Z31" ]
	}
}
EOT
		);

		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z32', $testObject->getZType() );
		$this->assertSame( [], $testObject->getZValue() );

		$testObject = new ZObjectContent(
			<<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": "Z0",
	"Z2K2": {
		"Z1K1": "Z32",
		"Z32K1": [
			"Z31",
			{
				"Z1K1": "Z31",
				"Z31K1": "Z1002",
				"Z31K2": [ "Z6", "Demonstration item"]
			},
			{
				"Z1K1": "Z31",
				"Z31K1": "Z1004",
				"Z31K2": [ "Z6", "Article pour démonstration"]
			}
		]
	},
	"Z2K3": {
		"Z1K1": "Z12",
		"Z12K1": [ "Z11" ]
	},
	"Z2K4": {
		"Z1K1": "Z32",
		"Z32K1": [ "Z31" ]
	}
}
EOT
		);

		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z32', $testObject->getZType() );

		$this->assertSame(
			[ 'Demonstration item' ],
			$testObject->getInnerZObject()->getAliasesForLanguage( $english )
		);
		$this->assertSame(
			[ 'Article pour démonstration' ],
			$testObject->getInnerZObject()->getAliasesForLanguage( $french )
		);
	}
}
