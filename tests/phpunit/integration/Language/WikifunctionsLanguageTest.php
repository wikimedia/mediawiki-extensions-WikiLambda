<?php

/**
 * WikiLambda test suite for the WikifunctionsLanguage object
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use InvalidArgumentException;
use MediaWiki\Extension\WikiLambda\Language\WikifunctionsLanguage;
use MediaWiki\Extension\WikiLambda\Language\WikifunctionsLanguageFactory;
use MediaWiki\Language\Language;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Language\WikifunctionsLanguage
 * @covers \MediaWiki\Extension\WikiLambda\Language\WikifunctionsLanguageFactory
 */
class WikifunctionsLanguageTest extends WikiLambdaRepoModeIntegrationTestCase {

	private WikifunctionsLanguageFactory $factory;

	protected function setUp(): void {
		parent::setUp();

		$this->factory = $this->getServiceContainer()->get( 'WikifunctionsLanguageFactory' );
	}

	public function testGetLanguageFromCode() {
		$language = $this->factory->getLanguage( 'en' );

		$this->assertInstanceOf( WikifunctionsLanguage::class, $language );
		$this->assertInstanceOf( Language::class, $language->getLanguage() );

		$this->assertSame( 'en', $language->getCode() );
		$this->assertSame( 'Z1002', $language->getZid() );
	}

	public function testGetLanguageFromZid(): void {
		$language = $this->factory->getLanguageFromZid( 'Z1003' );

		$this->assertInstanceOf( WikifunctionsLanguage::class, $language );
		$this->assertInstanceOf( Language::class, $language->getLanguage() );

		$this->assertSame( 'es', $language->getCode() );
		$this->assertSame( 'Z1003', $language->getZid() );
	}

	public function testIsKnownLanguageCode(): void {
		$this->assertTrue( $this->factory->isKnownLanguageCode( 'en' ) );
		$this->assertTrue( $this->factory->isKnownLanguageCode( 'ast' ) );
		$this->assertTrue( $this->factory->isKnownLanguageCode( 'zh-yue' ) );
		$this->assertFalse( $this->factory->isKnownLanguageCode( 'foo' ) );
		$this->assertFalse( $this->factory->isKnownLanguageCode( 'en-bar' ) );
	}

	public function testUnderlyingLanguageObject(): void {
		$language = $this->factory->getLanguage( 'ar' );

		$this->assertInstanceOf( Language::class, $language->getLanguage() );
		$this->assertTrue( $language->getLanguage()->isRTL() );
		$this->assertSame( $language->getLanguage()->getDir(), $language->getDir() );
	}

	public function testUnknownLanguageCodeThrows(): void {
		$this->expectException( InvalidArgumentException::class );
		$this->factory->getLanguage( 'invalid-language-code' );
	}

	public function testUnknownZidThrows(): void {
		$this->expectException( InvalidArgumentException::class );
		$this->factory->getLanguageFromZid( 'Z999999' );
	}
}
