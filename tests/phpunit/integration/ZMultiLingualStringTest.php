<?php

/**
 * WikiLambda integration test suite for the ZMultiLingualString class
 *
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use InvalidArgumentException;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZTypeRegistry;
use MediaWiki\MediaWikiServices;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString
 */
class ZMultiLingualStringTest extends \MediaWikiIntegrationTestCase {

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 * @covers ::getZValue
	 * @covers ::isLanguageProvidedValue
	 * @covers ::getStringForLanguage
	 * @covers ::getStringForLanguageCode
	 * @covers ::isValid
	 */
	public function testCreation() {
		$testObject = new ZMultiLingualString( [] );
		$this->assertTrue( $testObject->isValid() );

		$testObject = new ZMultiLingualString( [
			new ZMonoLingualString( 'en', 'Demonstration item' ),
			new ZMonoLingualString( 'it', 'oggetto per dimostrazione' ),
			new ZMonoLingualString( 'de', 'Gegenstand zur Demonstration' ),
			new ZMonoLingualString( 'fr', 'article pour démonstration' )
		] );
		$this->assertTrue( $testObject->isValid() );

		$this->assertSame( 'Z12', $testObject->getZType() );
		$this->assertArrayHasKey( 'en', $testObject->getZValue() );
		$this->assertArrayNotHasKey( 'ru', $testObject->getZValue() );

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
			'oggetto per dimostrazione',
			$testObject->getStringForLanguage( $this->makeLanguage( 'it' ) )
		);
		$this->assertSame(
			'Gegenstand zur Demonstration',
			$testObject->getStringForLanguage( $this->makeLanguage( 'de' ) )
		);
		$this->assertSame(
			'article pour démonstration',
			$testObject->getStringForLanguage( $this->makeLanguage( 'fr' ) )
		);

		// Test direct fall-back.
		$this->assertSame(
			'article pour démonstration',
			$testObject->getStringForLanguage( $this->makeLanguage( 'atj' ) )
		);

		// Test indirect fall-back.
		$this->assertSame(
			'Gegenstand zur Demonstration',
			$testObject->getStringForLanguage( $this->makeLanguage( 'dsb' ) )
		);

		// Test non-fall-back.
		$chineseLang = $this->makeLanguage( 'zh' );
		$this->assertSame(
			wfMessage( 'wikilambda-multilingualstring-nofallback' )->inLanguage( $chineseLang )->text(),
			$testObject->getStringForLanguage( $chineseLang )
		);
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 */
	public function testStaticCreation() {
		$testObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MULTILINGUALSTRING,
			ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE => [ new ZMonoLingualString( 'en', 'Demonstration item' ) ]
		] );
		$this->assertSame( $testObject->getZType(), 'Z12' );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 */
	public function testStaticCreation_invalidNoValueKey() {
		$this->expectException( InvalidArgumentException::class );
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
		$testObject = new ZMultiLingualString( [] );
		$this->assertTrue( $testObject->isValid() );

		$french = $this->makeLanguage( 'fr' );
		$this->assertFalse( $testObject->isLanguageProvidedValue( 'fr' ) );
		$testObject->setMonoLingualString( new ZMonoLingualString( 'fr', 'Bonjour' ) );
		$this->assertTrue( $testObject->isValid() );
		$this->assertTrue( $testObject->isLanguageProvidedValue( 'fr' ) );
		$this->assertSame(
			'Bonjour',
			$testObject->getStringForLanguage( $french )
		);

		$testObject->setMonoLingualString( new ZMonoLingualString( 'fr', 'Bonjour' ) );
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

		$invalidLang = $this->makeLanguage( '&&&' );
		$testObject->setMonoLingualString( new ZMonoLingualString( '&&&', 'Invalid item' ) );
		$this->assertFalse( $testObject->isValid() );
		$this->assertSame(
			'Invalid item',
			$testObject->getStringForLanguage( $invalidLang )
		);

		$testObject->removeValue( $invalidLang );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame(
			wfMessage( 'wikilambda-multilingualstring-nofallback' )->inLanguage( $invalidLang )->text(),
			$testObject->getStringForLanguage( $invalidLang )
		);
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::__construct
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::isValid
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::getZType
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::getZValue
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::getInnerZObject
	 */
	public function testPersistentCreation() {
		$english = $this->makeLanguage( 'en' );
		$french = $this->makeLanguage( 'fr' );

		$testObject = new ZPersistentObject(
			<<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": "Z0",
	"Z2K2": {
		"Z1K1": "Z12",
		"Z12K1": []
	},
	"Z2K3": {
		"Z1K1": "Z12",
		"Z12K1": []
	}
}
EOT
		 );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z12', $testObject->getZType() );
		$this->assertSame( [], $testObject->getZValue() );

		$testObject = new ZPersistentObject(
			<<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": "Z0",
	"Z2K2": {
		"Z1K1": "Z12",
		"Z12K1": [
			{
				"Z1K1": "Z11",
				"Z11K1": "en",
				"Z11K2": "Demonstration item"
			},
			{
				"Z1K1": "Z11",
				"Z11K1": "fr",
				"Z11K2": "article pour démonstration"
			}
		]
	},
	"Z2K3": {
		"Z1K1": "Z12",
		"Z12K1": []
	}
}
EOT
		);
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z12', $testObject->getZType() );

		$this->assertSame( 'Demonstration item', $testObject->getInnerZObject()->getStringForLanguage( $english ) );
		$this->assertSame(
			'article pour démonstration',
			$testObject->getInnerZObject()->getStringForLanguage( $french )
		);
	}

	private function makeLanguage( string $code ) {
		$services = MediaWikiServices::getInstance();

		return new \Language(
			$code,
			$services->getLocalisationCache(),
			$services->getLanguageNameUtils(),
			$services->getLanguageFallback(),
			$services->getLanguageConverterFactory(),
			$services->getHookContainer()
		);
	}
}
