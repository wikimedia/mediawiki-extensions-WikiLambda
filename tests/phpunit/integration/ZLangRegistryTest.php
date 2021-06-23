<?php

/**
 * WikiLambda integration test suite for the ZErrorTypeRegistry class
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use Title;
use WikiPage;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZLangRegistry
 * @group Database
 */
class ZLangRegistryTest extends \MediaWikiIntegrationTestCase {

	private const EN = 'Z1002';
	private const ES = 'Z1003';
	private const RU = 'Z1005';
	private const ZH = 'Z1006';

	private const FR = 'Z1004';
	private const DE = 'Z1430';

	/** @var ZLangRegistry */
	protected $langRegistry = null;

	/** @var string[] */
	protected $titlesTouched = [];

	protected function setUp() : void {
		parent::setUp();

		$this->registry = ZLangRegistry::singleton();

		$this->tablesUsed[] = 'wikilambda_zobject_labels';
		$this->tablesUsed[] = 'wikilambda_zobject_label_conflicts';
	}

	protected function insertZids( $zids ) : void {
		$dataPath = dirname( __DIR__, 3 ) . '/data';
		$sysopUser = $this->getTestSysop()->getUser();
		foreach ( $zids as $zid ) {
			$data = file_get_contents( "$dataPath/$zid.json" );
			$this->editPage( $zid, $data, 'Test creation', NS_ZOBJECT, $sysopUser );
			$this->titlesTouched[] = $zid;
		}
	}

	protected function tearDown() : void {
		$sysopUser = $this->getTestSysop()->getUser();

		foreach ( $this->titlesTouched as $titleString ) {
			$title = Title::newFromText( $titleString, NS_ZOBJECT );
			$page = WikiPage::factory( $title );
			if ( $page->exists() ) {
				$page->doDeleteArticleReal( "clean slate for testing", $sysopUser );
			}
		}

		parent::tearDown();
	}

	private function runPrivateMethod( $object, $methodName, $args ) {
		$reflector = new \ReflectionClass( get_class( $object ) );
		$method = $reflector->getMethod( $methodName );
		$method->setAccessible( true );
		return $method->invokeArgs( $object, $args );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectRegistry::singleton
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectRegistry::__construct
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
		$code = $this->registry->getLanguageCodeFromZid( self::EN );
		$this->assertSame( 'en', $code );
	}

	/**
	 * @covers ::getLanguageCodeFromZid
	 * @covers ::fetchLanguageCodeFromZid
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectRegistry::register
	 */
	public function testGetLanguageCodeFromZid_unregistered() {
		// We make sure that the language is saved in the database but not cached
		$this->registry->register( self::ES, 'es' );
		$this->insertZids( [ 'Z60', self::ES ] );
		$this->registry->unregister( self::ES );

		$code = $this->registry->getLanguageCodeFromZid( self::ES );
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
	 * @covers ::getLanguageZidFromCode
	 */
	public function testGetLanguageZidFromCode_registered() {
		$zid = $this->registry->getLanguageZidFromCode( 'en' );
		$this->assertSame( $zid, self::EN );
	}

	/**
	 * @covers ::getLanguageZidFromCode
	 * @covers ::fetchLanguageZidFromCode
	 * @covers ::getLanguageCodeFromContent
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectRegistry::register
	 */
	public function testGetLanguageZidFromCode_unregistered() {
		// We make sure that the language is saved in the database but not cached
		$this->registry->register( self::ZH, 'zh' );
		$this->insertZids( [ 'Z60', self::ZH ] );
		$this->registry->unregister( self::ZH );

		$zid = $this->registry->getLanguageZidFromCode( 'zh' );
		$this->assertSame( $zid, self::ZH );
	}

	/**
	 * @covers ::getLanguageZidFromCode
	 * @covers ::fetchLanguageZidFromCode
	 */
	public function testGetLanguageZidFromCode_notFound() {
		$notFoundCode = 'foo';
		$this->expectException( ZErrorException::class );
		$this->registry->getLanguageZidFromCode( $notFoundCode );
	}

	/**
	 * @covers ::getLanguageCodeFromContent
	 */
	public function testGetLanguageCodeFromContent_found() {
		$zid = self::FR;
		$dataPath = dirname( __DIR__, 3 ) . '/data';
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
		$dataPath = dirname( __DIR__, 3 ) . '/data';
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
		$this->registry->register( self::ES, 'es' );
		$this->registry->register( self::FR, 'fr' );

		$zids = $this->registry->getLanguageZids( [ 'en', 'es', 'fr' ] );
		wfDebugLog( "api", var_export( $zids, true ) );
		$this->assertSame( $zids, [ self::EN, self::ES, self::FR ] );
	}

	/**
	 * @covers ::getLanguageZids
	 * @covers ::getLanguageZidFromCode
	 */
	public function testGetLanguageZids_incomplete() {
		$this->registry->register( self::ES, 'es' );
		$this->registry->register( self::FR, 'fr' );

		$zids = $this->registry->getLanguageZids( [ 'bar', 'es', 'fr', 'foo' ] );
		wfDebugLog( "api", var_export( $zids, true ) );
		$this->assertSame( $zids, [ self::ES, self::FR ] );
	}

}
