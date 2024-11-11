<?php

/**
 * WikiLambda integration test suite for the ZErrorTypeRegistry class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use MediaWiki\MediaWikiServices;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry
 * @covers \MediaWiki\Extension\WikiLambda\Registry\ZObjectRegistry
 * @group Database
 */
class ZLangRegistryTest extends WikiLambdaIntegrationTestCase {

	private ZLangRegistry $registry;

	protected function setUp(): void {
		parent::setUp();
		$this->registry = ZLangRegistry::singleton();
	}

	public function testSingleton() {
		$this->assertEquals( ZLangRegistry::class, get_class( $this->registry ) );
		$this->assertEquals( $this->registry, ZLangRegistry::singleton() );
	}

	public function testGetLanguageCodeFromZid_registered() {
		$code = $this->registry->getLanguageCodeFromZid( self::ZLANG['en'] );
		$this->assertSame( 'en', $code );
	}

	public function testGetLanguageCodeFromZid_unregistered() {
		// We make sure that the language is saved in the database but not cached
		$this->registry->register( self::ZLANG['es'], 'es' );
		$this->insertZids( [ 'Z60', self::ZLANG['es'] ] );
		$this->registry->unregister( self::ZLANG['es'] );

		$code = $this->registry->getLanguageCodeFromZid( self::ZLANG['es'] );
		$this->assertSame( 'es', $code );
	}

	public function testGetLanguageCodeFromZid_notFound() {
		$notFoundZid = 'Z999';
		$this->expectException( ZErrorException::class );
		$this->registry->getLanguageCodeFromZid( $notFoundZid );
	}

	public function testGetLanguageCodeFromZid_notValid() {
		// We make sure that the invalid zid is saved in the database
		$this->insertZids( [ 'Z60' ] );

		$notValidZid = 'Z60';
		$this->expectException( ZErrorException::class );
		$this->registry->getLanguageCodeFromZid( $notValidZid );
	}

	public function testGetLanguageZidFromCode_registered() {
		$zid = $this->registry->getLanguageZidFromCode( 'en' );
		$this->assertTrue( $this->registry->isLanguageKnownGivenCode( 'en' ) );
		$this->assertSame( self::ZLANG['en'], $zid );
	}

	public function testGetLanguageZidFromCode_unregistered() {
		// We make sure that the language is saved in the database but not cached
		$this->registry->register( self::ZLANG['zh'], 'zh' );
		$this->insertZids( [ 'Z60', self::ZLANG['zh'] ] );
		$this->assertTrue( $this->registry->isZidCached( self::ZLANG['zh'] ) );
		$this->registry->unregister( self::ZLANG['zh'] );

		$this->assertFalse( $this->registry->isZidCached( self::ZLANG['zh'] ) );

		// Test the isLanguageKnownGivenCode() path that caches the result
		$this->assertTrue( $this->registry->isLanguageKnownGivenCode( 'zh' ) );
		$this->registry->unregister( self::ZLANG['zh'] );
		// Also drop from the DB cache layer
		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$zObjectStore->deleteZLanguageFromLanguagesCache( self::ZLANG['zh'] );

		$this->expectException( ZErrorException::class );
		$zid = $this->registry->getLanguageZidFromCode( 'zh' );
		$this->assertTrue( $this->registry->isLanguageKnownGivenCode( 'zh' ) );
		$this->assertTrue( $this->registry->isZidCached( self::ZLANG['zh'] ) );
		$this->assertSame( self::ZLANG['zh'], $zid );
	}

	public function testGetLanguageZidFromCode_notFound() {
		$notFoundCode = 'foo';
		$this->assertFalse( $this->registry->isLanguageKnownGivenCode( $notFoundCode ) );

		// We should get the ZID for English if we said a fallback was OK.
		$this->assertSame( 'Z1002', $this->registry->getLanguageZidFromCode( $notFoundCode, true ) );

		// Otherwise, we should get an error.
		$this->expectException( ZErrorException::class );
		$this->registry->getLanguageZidFromCode( $notFoundCode );
	}

	public function testGetLanguageCodeFromContent_found() {
		$zid = self::ZLANG['fr'];
		$dataPath = dirname( __DIR__, 3 ) . '/function-schemata/data/definitions';
		$data = file_get_contents( "$dataPath/$zid.json" );
		$title = Title::newFromText( $zid, NS_MAIN );
		$content = ZObjectContentHandler::makeContent( $data, $title );

		$code = $this->runPrivateMethod( $this->registry, 'getLanguageCodeFromContent', [ $content ] );
		$this->assertSame( 'fr', $code );
	}

	public function testGetLanguageCodeFromContent_notFound() {
		$zid = 'Z60';
		$dataPath = dirname( __DIR__, 3 ) . '/function-schemata/data/definitions';
		$data = file_get_contents( "$dataPath/$zid.json" );
		$title = Title::newFromText( $zid, NS_MAIN );
		$content = ZObjectContentHandler::makeContent( $data, $title );

		$found = $this->runPrivateMethod( $this->registry, 'getLanguageCodeFromContent', [ $content ] );
		$this->assertFalse( $found );
	}

	public function testIsValidLanguageZid() {
		$isValid = $this->registry->isValidLanguageZid( 'Z1002' );
		$this->assertTrue( $isValid );
	}

	public function testIsValidLanguageZid_notValidRef() {
		$isValid = $this->registry->isValidLanguageZid( 'invalidString' );
		$this->assertFalse( $isValid );
	}

	public function testIsValidLanguageZid_notValidLang() {
		$unknownZid = 'Z888';
		$isValid = $this->registry->isValidLanguageZid( $unknownZid );
		$this->assertFalse( $isValid );
	}

	public function testGetLanguageZids() {
		$this->registry->register( self::ZLANG['es'], 'es' );
		$this->registry->register( self::ZLANG['fr'], 'fr' );

		$zids = $this->registry->getLanguageZids( [ 'en', 'es', 'fr' ] );
		$this->assertSame( [ self::ZLANG['en'], self::ZLANG['es'], self::ZLANG['fr'] ], $zids );
	}

	public function testGetLanguageZids_incomplete() {
		$this->registry->register( self::ZLANG['es'], 'es' );
		$this->registry->register( self::ZLANG['fr'], 'fr' );

		$zids = $this->registry->getLanguageZids( [ 'bar', 'es', 'fr', 'foo' ] );
		$this->assertSame( [ self::ZLANG['es'], self::ZLANG['fr'] ], $zids );
	}

	public function testGetListOfFallbacks() {
		$this->registry->register( 'Z1732', 'ast' );
		$this->registry->register( 'Z1003', 'es' );
		$this->registry->register( 'Z1002', 'en' );

		$languageFallback = MediaWikiServices::getInstance()->getLanguageFallback();
		$fallbackZids = $this->registry->getListOfFallbackLanguageZids( $languageFallback, 'ast' );
		$this->assertSame( [ 'Z1732', 'Z1003', 'Z1002' ], $fallbackZids );
	}
}
