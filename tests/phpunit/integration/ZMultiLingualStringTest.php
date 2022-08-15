<?php

/**
 * WikiLambda integration test suite for the ZMultiLingualString class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString
 */
class ZMultiLingualStringTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 * @covers ::getZValue
	 * @covers ::isLanguageProvidedValue
	 * @covers ::getStringForLanguage
	 * @covers ::getStringForLanguageCode
	 * @covers ::getStringForLanguageOrEnglish
	 * @covers ::isValid
	 * @covers ::getDefinition
	 */
	public function testCreation() {
		$this->registerLangs( [ 'es', 'de', 'fr' ] );

		$testObject = new ZMultiLingualString( [] );
		$this->assertTrue( $testObject->isValid() );

		$testObject = new ZMultiLingualString( [
			new ZMonoLingualString(
				new ZReference( self::ZLANG['en'] ), new ZString( 'Demonstration item' )
			),
			new ZMonoLingualString(
				new ZReference( self::ZLANG['es'] ), new ZString( 'Elemento para demostración' )
			),
			new ZMonoLingualString(
				new ZReference( self::ZLANG['de'] ), new ZString( 'Gegenstand zur Demonstration' )
			),
			new ZMonoLingualString(
				new ZReference( self::ZLANG['fr'] ), new ZString( 'Article pour démonstration' )
			),
		] );

		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z12', $testObject->getZType() );
		$this->assertArrayHasKey( self::ZLANG['en'], $testObject->getZValue() );
		$this->assertArrayNotHasKey( self::ZLANG['ru'], $testObject->getZValue() );

		$this->assertTrue(
			$testObject->isLanguageProvidedValue( 'en' )
		);
		$this->assertFalse(
			$testObject->isLanguageProvidedValue( 'nonsense' )
		);

		$this->assertSame(
			'Demonstration item',
			$testObject->getStringForLanguage( $this->makeLanguage( 'en' ) )
		);
		$this->assertSame(
			'Demonstration item',
			$testObject->getStringForLanguageCode( 'en' )
		);
		$this->assertSame(
			'',
			$testObject->getStringForLanguageCode( '123' )
		);

		$this->assertSame(
			'Elemento para demostración',
			$testObject->getStringForLanguage( $this->makeLanguage( 'es' ) )
		);
		$this->assertSame(
			'Gegenstand zur Demonstration',
			$testObject->getStringForLanguage( $this->makeLanguage( 'de' ) )
		);
		$this->assertSame(
			'Article pour démonstration',
			$testObject->getStringForLanguage( $this->makeLanguage( 'fr' ) )
		);

		// Test direct fall-back.
		$this->assertSame(
			'Article pour démonstration',
			$testObject->getStringForLanguage( $this->makeLanguage( 'atj' ) )
		);

		// Test indirect fall-back.
		$this->assertSame(
			'Gegenstand zur Demonstration',
			$testObject->getStringForLanguage( $this->makeLanguage( 'dsb' ) )
		);

		// Test non-fall-back when not title.
		$chineseLang = $this->makeLanguage( 'zh' );
		$this->assertSame(
			wfMessage( 'wikilambda-multilingualstring-nofallback' )->inLanguage( $chineseLang )->text(),
			$testObject->getStringForLanguage( $chineseLang )
		);

		// Test english fallback
		$this->assertSame(
			'Demonstration item',
			$testObject->getStringForLanguageOrEnglish( $chineseLang, false, true, true )
		);
	}

	/**
	 * @covers ::getStringAndLanguageCode
	 * @covers ::internalGetStringForLanguage
	 */
	public function testGetStringAndLanguageCode() {
		$this->registerLangs( [ 'en' ] );
		$germanLang = $this->makeLanguage( 'de' );
		$englishLang = $this->makeLanguage( 'en' );

		$testObject = new ZMultiLingualString( [] );
		$this->assertTrue( $testObject->isValid() );

		$testObject = new ZMultiLingualString( [
			new ZMonoLingualString(
				new ZReference( self::ZLANG['en'] ), new ZString( 'Demonstration item' )
			)
		] );

		$this->assertTrue( $testObject->isValid() );

		// returns given language when there is no fallback needed
		$this->assertSame(
			[
				'title' => 'Demonstration item',
				'languageCode' => 'en'
			],
			$testObject->getStringAndLanguageCode( $englishLang )
		);

		// do not only return the title
		$this->assertNotSame(
			'Demonstration item',
			$testObject->getStringAndLanguageCode( $germanLang )
		);

		$testObject = new ZMultiLingualString( [
			new ZMonoLingualString(
				new ZReference( self::ZLANG['en'] ), new ZString( 'Demonstration item' )
			)
		] );

		// returns given language if no fallback is used
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame(
			[
				'title' => 'Demonstration item',
				'languageCode' => 'en'
			],
			$testObject->getStringAndLanguageCode( $englishLang )
		);
	}

	/**
	 * @covers ::getStringForLanguage
	 * @covers ::internalGetStringForLanguage
	 */
	public function testTitleCreation() {
		$englishLang = $this->makeLanguage( 'en' );
		// test title comes back correctly when it exists
		$testObject = new ZMultiLingualString( [] );
		$this->assertTrue( $testObject->isValid() );

		$testObject = new ZMultiLingualString( [
			new ZMonoLingualString(
				new ZReference( self::ZLANG['en'] ), new ZString( 'English Title' )
			),
		] );

		$this->assertSame(
			'English Title',
			$testObject->getStringForLanguage( $englishLang, false, true, true )
		);

		// test 'wikilambda-editor-default-name' comes back when title does not exist
		$testObject = new ZMultiLingualString( [] );
		$this->assertTrue( $testObject->isValid() );

		$this->assertSame(
			wfMessage( 'wikilambda-editor-default-name' )->inLanguage( $englishLang )->text(),
			$testObject->getStringForLanguage( $englishLang, true, true, true )
		);

		// test returns 'null' if no placeholder is requested
		$this->assertSame(
			null,
			$testObject->getStringForLanguage( $englishLang, false, false, false )
		);
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 */
	public function testStaticCreation() {
		$testObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MULTILINGUALSTRING,
			ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE => [
				ZTypeRegistry::Z_MONOLINGUALSTRING,
				(object)[
					ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MONOLINGUALSTRING,
					ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE => 'Z1002',
					ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE => 'Demonstration item'
				]
			]
		] );
		$this->assertSame( 'Z12', $testObject->getZType() );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 */
	public function testStaticCreation_invalidNoValueKey() {
		$this->expectException( ZErrorException::class );
		$invalidObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MULTILINGUALSTRING
		] );
	}

	/**
	 * @covers ::setMonoLingualString
	 * @covers ::setStringForLanguage
	 * @covers ::isLanguageProvidedValue
	 * @covers ::removeValue
	 * @covers ::isValid
	 */
	public function testModification() {
		$this->registerLangs( [ 'fr', 'es' ] );

		$testMono = new ZMonoLingualString( new ZReference( self::ZLANG['fr'] ), new ZString( 'Bonjour' ) );
		$testObject = new ZMultiLingualString( [] );
		$this->assertTrue( $testObject->isValid() );

		$french = $this->makeLanguage( 'fr' );
		$this->assertFalse( $testObject->isLanguageProvidedValue( 'fr' ) );
		$testObject->setMonoLingualString( $testMono );
		$this->assertTrue( $testObject->isValid() );
		$this->assertTrue( $testObject->isLanguageProvidedValue( 'fr' ) );
		$this->assertSame(
			'Bonjour',
			$testObject->getStringForLanguage( $french )
		);

		$testObject->setMonoLingualString( $testMono );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame(
			'Bonjour',
			$testObject->getStringForLanguage( $french )
		);

		$testObject->setStringForLanguage( $french, 'Allo!' );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame(
			'Allo!',
			$testObject->getStringForLanguage( $french )
		);

		$spanish = $this->makeLanguage( 'es' );
		$testObject->removeValue( $spanish );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame(
			wfMessage( 'wikilambda-multilingualstring-nofallback' )->text(),
			$testObject->getStringForLanguage( $spanish )
		);

		$invalidLang = $this->makeLanguage( '&&&' );
		$invalidMono = new ZMonoLingualString( new ZReference( '&&&' ), new ZString( 'Invalid item' ) );
		$testObject->setMonoLingualString( $invalidMono );
		$this->assertFalse( $testObject->isValid() );
		$this->assertSame(
			wfMessage( 'wikilambda-multilingualstring-nofallback' )->text(),
			$testObject->getStringForLanguage( $invalidLang )
		);

		$this->expectException( ZErrorException::class );
		$testObject->removeValue( $invalidLang );
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
		"Z1K1": "Z12",
		"Z12K1": [ "Z11" ]
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
		$this->assertSame( 'Z12', $testObject->getZType() );
		$this->assertSame( [], $testObject->getZValue() );

		$testObject = new ZObjectContent(
			<<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": "Z0",
	"Z2K2": {
		"Z1K1": "Z12",
		"Z12K1": [
			"Z11",
			{
				"Z1K1": "Z11",
				"Z11K1": "Z1002",
				"Z11K2": "Demonstration item"
			},
			{
				"Z1K1": "Z11",
				"Z11K1": "Z1004",
				"Z11K2": "Article pour démonstration"
			}
		]
	},
	"Z2K3": {
		"Z1K1": "Z12",
		"Z12K1": [ "Z11" ]
	},
	"Z2K4": {
		"Z1K1": "Z32",
		"Z32K1": [ "Z11" ]
	}
}
EOT
		);

		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z12', $testObject->getZType() );

		$this->assertSame(
			'Demonstration item',
			$testObject->getInnerZObject()->getStringForLanguage( $english )
		);
		$this->assertSame(
			'Article pour démonstration',
			$testObject->getInnerZObject()->getStringForLanguage( $french )
		);
	}
}
