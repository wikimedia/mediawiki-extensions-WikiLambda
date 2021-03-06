<?php

/**
 * WikiLambda integration test suite for the ZMultiLingualString class
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString;
use MediaWiki\Extension\WikiLambda\ZTypeRegistry;
use MediaWiki\MediaWikiServices;

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
	 * @covers ::isValid
	 */
	public function testCreation() {
		$this->registerLangs( [ 'es', 'de', 'fr' ] );

		$testObject = new ZMultiLingualString( [] );
		$this->assertTrue( $testObject->isValid() );

		$testObject = new ZMultiLingualString( [
			new ZMonoLingualString( self::ZLANG['en'], 'Demonstration item' ),
			new ZMonoLingualString( self::ZLANG['es'], 'Elemento para demostración' ),
			new ZMonoLingualString( self::ZLANG['de'], 'Gegenstand zur Demonstration' ),
			new ZMonoLingualString( self::ZLANG['fr'], 'Article pour démonstration' )
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

		$testObject = new ZMultiLingualString( [] );
		$this->assertTrue( $testObject->isValid() );

		$french = $this->makeLanguage( 'fr' );
		$this->assertFalse( $testObject->isLanguageProvidedValue( 'fr' ) );
		$testObject->setMonoLingualString( new ZMonoLingualString( self::ZLANG['fr'], 'Bonjour' ) );
		$this->assertTrue( $testObject->isValid() );
		$this->assertTrue( $testObject->isLanguageProvidedValue( 'fr' ) );
		$this->assertSame(
			'Bonjour',
			$testObject->getStringForLanguage( $french )
		);

		$testObject->setMonoLingualString( new ZMonoLingualString( self::ZLANG['fr'], 'Bonjour' ) );
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
		$testObject->setMonoLingualString( new ZMonoLingualString( '&&&', 'Invalid item' ) );
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

		$testObject = new ZObjectContent(
			<<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": "Z0",
	"Z2K2": {
		"Z1K1": "Z12",
		"Z12K1": [
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
		"Z12K1": []
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
