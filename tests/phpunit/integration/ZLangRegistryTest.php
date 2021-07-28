<?php

/**
 * WikiLambda integration test suite for the ZErrorTypeRegistry class
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use Title;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry
 * @group Database
 */
class ZLangRegistryTest extends WikiLambdaIntegrationTestCase {

	/** @var ZLangRegistry */
	protected $registry = null;

	protected function setUp(): void {
		parent::setUp();
		$this->registry = ZLangRegistry::singleton();
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\Registry\ZObjectRegistry::singleton
	 * @covers \MediaWiki\Extension\WikiLambda\Registry\ZObjectRegistry::__construct
	 * @covers ::initialize
	 */
	public function testSingleton() {
		$this->assertEquals( get_class( $this->registry ), ZLangRegistry::class );
		$this->assertEquals( $this->registry, ZLangRegistry::singleton() );
	}

	/**
	 * @covers ::getLanguageCodeFromZid
	 */
	public function testGetLanguageCodeFromZid_registered() {
		$code = $this->registry->getLanguageCodeFromZid( self::ZLANG['en'] );
		$this->assertSame( 'en', $code );
	}

	/**
	 * @covers ::getLanguageCodeFromZid
	 * @covers ::fetchLanguageCodeFromZid
	 * @covers \MediaWiki\Extension\WikiLambda\Registry\ZObjectRegistry::register
	 */
	public function testGetLanguageCodeFromZid_unregistered() {
		// We make sure that the language is saved in the database but not cached
		$this->registry->register( self::ZLANG['es'], 'es' );
		$this->insertZids( [ 'Z60', self::ZLANG['es'] ] );
		$this->registry->unregister( self::ZLANG['es'] );

		$code = $this->registry->getLanguageCodeFromZid( self::ZLANG['es'] );
		$this->assertSame( 'es', $code );
	}

	/**
	 * @covers ::getLanguageCodeFromZid
	 * @covers ::fetchLanguageCodeFromZid
	 */
	public function testGetLanguageCodeFromZid_notFound() {
		$notFoundZid = 'Z999';
		$this->expectException( ZErrorException::class );
		$this->registry->getLanguageCodeFromZid( $notFoundZid );
	}

	/**
	 * @covers ::getLanguageCodeFromZid
	 * @covers ::fetchLanguageCodeFromZid
	 */
	public function testGetLanguageCodeFromZid_notValid() {
		// We make sure that the invalid zid is saved in the database
		$this->insertZids( [ 'Z60' ] );

		$notValidZid = 'Z60';
		$this->expectException( ZErrorException::class );
		$this->registry->getLanguageCodeFromZid( $notValidZid );
	}

	/**
	 * @covers ::isLanguageKnownGivenCode
	 * @covers ::getLanguageZidFromCode
	 */
	public function testGetLanguageZidFromCode_registered() {
		$zid = $this->registry->getLanguageZidFromCode( 'en' );
		$this->assertTrue( $this->registry->isLanguageKnownGivenCode( 'en' ) );
		$this->assertSame( $zid, self::ZLANG['en'] );
	}

	/**
	 * @covers ::getLanguageZidFromCode
	 * @covers ::fetchLanguageZidFromCode
	 * @covers ::getLanguageCodeFromContent
	 * @covers ::isLanguageKnownGivenCode
	 * @covers \MediaWiki\Extension\WikiLambda\Registry\ZObjectRegistry::register
	 */
	public function testGetLanguageZidFromCode_unregistered() {
		// We make sure that the language is saved in the database but not cached
		$this->registry->register( self::ZLANG['zh'], 'zh' );
		$this->insertZids( [ 'Z60', self::ZLANG['zh'] ] );
		$this->registry->unregister( self::ZLANG['zh'] );

		$zid = $this->registry->getLanguageZidFromCode( 'zh' );
		$this->assertTrue( $this->registry->isLanguageKnownGivenCode( 'zh' ) );
		$this->assertSame( $zid, self::ZLANG['zh'] );
	}

	/**
	 * @covers ::isLanguageKnownGivenCode
	 * @covers ::getLanguageZidFromCode
	 * @covers ::fetchLanguageZidFromCode
	 */
	public function testGetLanguageZidFromCode_notFound() {
		$notFoundCode = 'foo';
		$this->assertFalse( $this->registry->isLanguageKnownGivenCode( $notFoundCode ) );
		$this->expectException( ZErrorException::class );
		$this->registry->getLanguageZidFromCode( $notFoundCode );
	}

	/**
	 * @covers ::getLanguageCodeFromContent
	 */
	public function testGetLanguageCodeFromContent_found() {
		$zid = self::ZLANG['fr'];
		$dataPath = dirname( __DIR__, 3 ) . '/function-schemata/data/definitions';
		$data = file_get_contents( "$dataPath/$zid.json" );
		$title = Title::newFromText( $zid, NS_ZOBJECT );
		$content = ZObjectContentHandler::makeContent( $data, $title );

		$code = $this->runPrivateMethod( $this->registry, 'getLanguageCodeFromContent', [ $content ] );
		$this->assertSame( 'fr', $code );
	}

	/**
	 * @covers ::getLanguageCodeFromContent
	 */
	public function testGetLanguageCodeFromContent_notFound() {
		$zid = 'Z60';
		$dataPath = dirname( __DIR__, 3 ) . '/function-schemata/data/definitions';
		$data = file_get_contents( "$dataPath/$zid.json" );
		$title = Title::newFromText( $zid, NS_ZOBJECT );
		$content = ZObjectContentHandler::makeContent( $data, $title );

		$found = $this->runPrivateMethod( $this->registry, 'getLanguageCodeFromContent', [ $content ] );
		$this->assertFalse( $found );
	}

	/**
	 * @covers ::isValidLanguageZid
	 */
	public function testIsValidLanguageZid_notValidRef() {
		$isValid = $this->registry->isValidLanguageZid( 'invalidString' );
		$this->assertFalse( $isValid );
	}

	/**
	 * @covers ::isValidLanguageZid
	 * @covers ::getLanguageCodeFromZid
	 */
	public function testIsValidLanguageZid_notValidLang() {
		$unknownZid = 'Z888';
		$isValid = $this->registry->isValidLanguageZid( $unknownZid );
		$this->assertFalse( $isValid );
	}

	/**
	 * @covers ::getLanguageZids
	 * @covers ::getLanguageZidFromCode
	 */
	public function testGetLanguageZids() {
		$this->registry->register( self::ZLANG['es'], 'es' );
		$this->registry->register( self::ZLANG['fr'], 'fr' );

		$zids = $this->registry->getLanguageZids( [ 'en', 'es', 'fr' ] );
		$this->assertSame( $zids, [ self::ZLANG['en'], self::ZLANG['es'], self::ZLANG['fr'] ] );
	}

	/**
	 * @covers ::getLanguageZids
	 * @covers ::getLanguageZidFromCode
	 */
	public function testGetLanguageZids_incomplete() {
		$this->registry->register( self::ZLANG['es'], 'es' );
		$this->registry->register( self::ZLANG['fr'], 'fr' );

		$zids = $this->registry->getLanguageZids( [ 'bar', 'es', 'fr', 'foo' ] );
		$this->assertSame( $zids, [ self::ZLANG['es'], self::ZLANG['fr'] ] );
	}
}
