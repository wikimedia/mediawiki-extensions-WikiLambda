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
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject
 * @covers \MediaWiki\Extension\WikiLambda\StringForLanguageBuilder
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent
 * @group Database
 */
class ZMultiLingualStringTest extends WikiLambdaIntegrationTestCase {

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
			$testObject->getStringForLanguage( self::makeLanguage( 'en' ) )
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
			$testObject->getStringForLanguage( self::makeLanguage( 'es' ) )
		);
		$this->assertSame(
			'Gegenstand zur Demonstration',
			$testObject->getStringForLanguage( self::makeLanguage( 'de' ) )
		);
		$this->assertSame(
			'Article pour démonstration',
			$testObject->getStringForLanguage( self::makeLanguage( 'fr' ) )
		);

		// Test direct fall-back.
		$this->assertSame(
			'Article pour démonstration',
			$testObject->getStringForLanguage( self::makeLanguage( 'atj' ) )
		);

		// Test indirect fall-back.
		$this->assertSame(
			'Gegenstand zur Demonstration',
			$testObject->getStringForLanguage( self::makeLanguage( 'dsb' ) )
		);

		// Test non-fall-back when not title.
		$chineseLang = self::makeLanguage( 'zh' );
		$this->assertSame(
			wfMessage( 'wikilambda-multilingualstring-nofallback' )->inLanguage( $chineseLang )->text(),
			$testObject->getStringForLanguage( $chineseLang )
		);

		// Test english fallback
		$this->assertSame(
			'Demonstration item',
			$testObject->buildStringForLanguage( $chineseLang )->fallbackWithEnglish()->getString()
		);
	}

	public function testGetStringAndLanguageCode() {
		$this->registerLangs( [ 'en' ] );
		$germanLang = self::makeLanguage( 'de' );
		$englishLang = self::makeLanguage( 'en' );

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
			$testObject->buildStringForLanguage( $englishLang )
				->fallbackWithEnglish()
				->placeholderNoFallback()
				->getStringAndLanguageCode()
		);

		// do not only return the title
		$this->assertNotSame(
			'Demonstration item',
			$testObject->buildStringForLanguage( $germanLang )
			  ->fallbackWithEnglish()
			  ->placeholderNoFallback()
			  ->getStringAndLanguageCode()
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
			$testObject->buildStringForLanguage( $englishLang )
				->fallbackWithEnglish()
				->placeholderNoFallback()
				->getStringAndLanguageCode()
		);
	}

	public function testTitleCreation() {
		$englishLang = self::makeLanguage( 'en' );
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
			$testObject->buildStringForLanguage( $englishLang )->getString()
		);

		// test 'wikilambda-editor-default-name' comes back when title does not exist
		$testObject = new ZMultiLingualString( [] );
		$this->assertTrue( $testObject->isValid() );

		$this->assertSame(
			wfMessage( 'wikilambda-editor-default-name' )->inLanguage( $englishLang )->text(),
			$testObject->buildStringForLanguage( $englishLang )->placeholderForTitle()->getString()
		);

		// test returns null if no placeholder is requested
		$this->assertSame(
			null,
			$testObject->buildStringForLanguage( $englishLang )->getString()
		);
	}

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

	public function testStaticCreation_invalidNoValueKey() {
		$this->expectException( ZErrorException::class );
		$invalidObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MULTILINGUALSTRING
		] );
	}

	public function testModification() {
		$this->registerLangs( [ 'fr', 'es' ] );

		$testMono = new ZMonoLingualString( new ZReference( self::ZLANG['fr'] ), new ZString( 'Bonjour' ) );
		$testObject = new ZMultiLingualString( [] );
		$this->assertTrue( $testObject->isValid() );

		$french = self::makeLanguage( 'fr' );
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

		$spanish = self::makeLanguage( 'es' );
		$testObject->removeValue( $spanish );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame(
			wfMessage( 'wikilambda-multilingualstring-nofallback' )->inLanguage( 'es' )->text(),
			$testObject->getStringForLanguage( $spanish )
		);

		$invalidLang = self::makeLanguage( 'blargh' );
		$invalidMono = new ZMonoLingualString( new ZReference( 'blargh' ), new ZString( 'Invalid item' ) );
		$testObject->setMonoLingualString( $invalidMono );
		$this->assertFalse( $testObject->isValid() );
		$this->assertSame(
			wfMessage( 'wikilambda-multilingualstring-nofallback' )->text(),
			$testObject->getStringForLanguage( $invalidLang )
		);

		$this->expectException( ZErrorException::class );
		$testObject->removeValue( $invalidLang );
	}

	public function testPersistentCreation() {
		$this->registerLangs( [ 'fr' ] );

		$english = self::makeLanguage( 'en' );
		$french = self::makeLanguage( 'fr' );

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
