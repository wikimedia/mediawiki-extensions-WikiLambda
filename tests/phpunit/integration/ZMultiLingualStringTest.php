<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZMonoLingualString;
use MediaWiki\Extension\WikiLambda\ZMultiLingualString;
use MediaWiki\Extension\WikiLambda\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZTypeRegistry;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZMultiLingualString
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

		$this->assertSame( 'ZMultiLingualString', $testObject->getZType() );
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
	 * @covers ::create
	 */
	public function testStaticCreation() {
		$testObject = ZMultiLingualString::create( [
			ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE => [ new ZMonoLingualString( 'en', 'Demonstration item' ) ]
		] );
		$this->assertSame( $testObject->getZType(), 'ZMultiLingualString' );
	}

	/**
	 * @covers ::create
	 */
	public function testStaticCreation_invalidNoValueKey() {
		$this->expectException( \InvalidArgumentException::class );
		$invalidObject = ZMultiLingualString::create( [
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
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::__construct
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::isValid
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::getZType
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::getZValue
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::getInnerZObject
	 */
	public function testPersistentCreation() {
		$english = $this->makeLanguage( 'en' );
		$french = $this->makeLanguage( 'fr' );

		$testObject = new ZPersistentObject( '{ "Z1K1": "Z12", "Z12K1": [] }' );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'ZMultiLingualString', $testObject->getZType() );
		$this->assertSame( [], $testObject->getZValue() );

		$testObject = new ZPersistentObject( '{ "Z1K1": "Z2", "Z2K1": "Z0", "Z2K2": { "Z1K1": "Z12", "Z12K1": [] }, "Z2K3": [] }' );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'ZMultiLingualString', $testObject->getZType() );
		$this->assertSame( [], $testObject->getZValue() );

		$testObject = new ZPersistentObject( '{ "Z1K1": "Z2", "Z2K1": "Z0", "Z2K2": { "Z1K1": "Z12", "Z12K1": [ { "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "Demonstration item" }, { "Z1K1": "Z11", "Z11K1": "fr", "Z11K2": "article pour démonstration" } ] }, "Z2K3": [] }' );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'ZMultiLingualString', $testObject->getZType() );

		$this->assertSame( 'Demonstration item', $testObject->getInnerZObject()->getStringForLanguage( $english ) );
		$this->assertSame( 'article pour démonstration', $testObject->getInnerZObject()->getStringForLanguage( $french ) );
	}

	private function makeLanguage( string $code ) {
		$services = \MediaWiki\MediaWikiServices::getInstance();

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
