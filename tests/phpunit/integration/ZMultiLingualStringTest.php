<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZMonoLingualString;
use MediaWiki\Extension\WikiLambda\ZMultiLingualString;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZMultiLingualString
 */
class ZMultiLingualStringTest extends \MediaWikiIntegrationTestCase {

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 * @covers ::getZValue
	 * @covers ::getStringForLanguage
	 */
	public function testCreation() {
		$testObject = new ZMultiLingualString( [
			new ZMonoLingualString( 'en', 'Demonstration item' ),
			new ZMonoLingualString( 'it', 'oggetto per dimostrazione' ),
			new ZMonoLingualString( 'de', 'Gegenstand zur Demonstration' ),
			new ZMonoLingualString( 'fr', 'article pour démonstration' )
		] );

		$this->assertSame( $testObject->getZType(), 'ZMultiLingualString' );
		$this->assertArrayHasKey( 'en', $testObject->getZValue() );
		$this->assertArrayNotHasKey( 'ru', $testObject->getZValue() );

		$this->assertSame(
			'Demonstration item',
			$testObject->getStringForLanguage( $this->makeLanguage( 'en' ) )
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
