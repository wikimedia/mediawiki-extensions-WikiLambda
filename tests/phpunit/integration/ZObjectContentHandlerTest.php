<?php

/**
 * WikiLambda integration test suite for the ZObjectContentHandler class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use FormatJson;
use MediaWiki\Content\Renderer\ContentParseParams;
use MediaWiki\Content\Transform\PreSaveTransformParamsValue;
use MediaWiki\Content\ValidationParams;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use MediaWiki\Extension\WikiLambda\ZObjectEditAction;
use MediaWiki\Extension\WikiLambda\ZObjectSecondaryDataRemoval;
use MediaWiki\Extension\WikiLambda\ZObjectSecondaryDataUpdate;
use MediaWiki\MainConfigNames;
use MediaWiki\MediaWikiServices;
use MediaWiki\Revision\SlotRecord;
use MediaWiki\Revision\SlotRenderingProvider;
use MediaWiki\Title\Title;
use ParserOptions;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContentHandler
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectSecondaryDataUpdate
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectSecondaryDataRemoval
 * @group Database
 */
class ZObjectContentHandlerTest extends WikiLambdaIntegrationTestCase {

	public function testWrongContentModel() {
		$this->expectException( \InvalidArgumentException::class );
		new ZObjectContentHandler( CONTENT_MODEL_WIKITEXT );
	}

	/**
	 * @dataProvider provideCanBeUsedOn
	 */
	public function testCanBeUsedOn( $input, $expected ) {
		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$this->assertSame( $expected, $handler->canBeUsedOn( Title::newFromText( $input ) ) );
	}

	public static function provideCanBeUsedOn() {
		return [
			'Main NS ZObject page' => [ 'Z1', true ],
			'Main talk page' => [ 'Talk:Z1', false ],
			'User NS page' => [ 'User:Foo', false ],
			'User talk NS page' => [ 'User talk:Foo', false ],
		];
	}

	public function testMakeEmptyContent() {
		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$testObject = $handler->makeEmptyContent();
		$this->assertInstanceOf( ZObjectContent::class, $testObject );
	}

	public function testSerializeContent() {
		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$content = $handler->makeEmptyContent();
		$serialized = $handler->serializeContent( $content );
		$expected = '{"Z1K1":"Z2",'
			. '"Z2K1":"Z0",'
			. '"Z2K2":"",'
			. '"Z2K3":{"Z1K1":"Z12","Z12K1":["Z11"]},'
			. '"Z2K4":{"Z1K1":"Z32","Z32K1":["Z31"]},'
			. '"Z2K5":{"Z1K1":"Z12","Z12K1":["Z11"]}}';

		$this->assertTrue( is_string( $serialized ) );
		$this->assertSame(
			$expected,
			FormatJson::encode( FormatJson::parse( $serialized )->value )
		);
	}

	public function testUnserializeContent() {
		$serialized = '{"Z1K1":"Z2","Z2K1":"Z401","Z2K2":"","Z2K3":{"Z1K1":"Z12","Z12K1":["Z11"]}}';
		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$testObject = $handler->unserializeContent( $serialized );
		$this->assertInstanceOf( ZObjectContent::class, $testObject );
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( '', $testObject->getZValue() );
	}

	public function testGetExternalRepresentation_badNamespace() {
		$pageTitleText = 'User:Z333';
		$title = Title::newFromText( $pageTitleText );

		$this->expectException( ZErrorException::class );
		$this->expectExceptionMessage( ZErrorTypeRegistry::Z_ERROR_WRONG_NAMESPACE );
		ZObjectContentHandler::getExternalRepresentation( $title );
	}

	public function testGetExternalRepresentation_notFound() {
		$unavailableZid = 'Z333';
		$title = Title::newFromText( $unavailableZid, NS_MAIN );

		$this->expectException( ZErrorException::class );
		$this->expectExceptionMessage( ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND );
		ZObjectContentHandler::getExternalRepresentation( $title );
	}

	public function testGetExternalRepresentation_languageNotFound() {
		$this->editPage( ZTestType::TEST_ZID, ZTestType::TEST_ENCODING, 'Test creation', NS_MAIN );

		$title = Title::newFromText( ZTestType::TEST_ZID, NS_MAIN );

		$this->expectException( ZErrorException::class );
		$this->expectExceptionMessage( ZErrorTypeRegistry::Z_ERROR_LANG_NOT_FOUND );
		ZObjectContentHandler::getExternalRepresentation( $title, 'thisisnotalanguage' );
	}

	public function testGetExternalRepresentation_badLanguage() {
		$this->editPage( ZTestType::TEST_ZID, ZTestType::TEST_ENCODING, 'Test creation', NS_MAIN );

		$title = Title::newFromText( ZTestType::TEST_ZID, NS_MAIN );

		$this->expectException( ZErrorException::class );
		$this->expectExceptionMessage( ZErrorTypeRegistry::Z_ERROR_INVALID_LANG_CODE );
		ZObjectContentHandler::getExternalRepresentation( $title, '//notvalidlanguagecode//' );
	}

	public function testGetExternalRepresentation() {
		$this->registerLangs( [ 'fr', 'de' ] );
		$this->editPage( ZTestType::TEST_ZID, ZTestType::TEST_ENCODING, 'Test creation', NS_MAIN );

		$title = Title::newFromText( ZTestType::TEST_ZID, NS_MAIN );
		$externalRepresentation = ZObjectContentHandler::getExternalRepresentation( $title );

		$this->assertStringNotContainsString( '"Z6K1": "Z0"', $externalRepresentation, "ZPO key is not set to Z0" );
		$this->assertStringContainsString( '"Z6K1": "Z111"', $externalRepresentation, "ZPO key is set to the title" );

		$externalRepresentation = ZObjectContentHandler::getExternalRepresentation( $title, 'fr' );
		$externalRepresentationLabels = ( new ZObjectContent( $externalRepresentation ) )->getLabels();

		$this->assertCount(
			1, $externalRepresentationLabels->getZValue(),
			'Only one label comes back when asked for in a specific language.'
		);
		$this->assertSame(
			'', $externalRepresentationLabels->getStringForLanguageCode( 'en' ),
			'ZPO label in English is absent when asked for in French.'
		);
		$this->assertSame(
			'Type pour démonstration', $externalRepresentationLabels->getStringForLanguageCode( 'fr' ),
			'ZPO label in French is present when asked for in French.'
		);

		$externalRepresentation = ZObjectContentHandler::getExternalRepresentation( $title, 'de' );
		$externalRepresentationLabels = ( new ZObjectContent( $externalRepresentation ) )->getLabels();

		$this->assertCount(
			1, $externalRepresentationLabels->getZValue(),
			'Only one label comes back when asked for in a specific language.'
		);
		$this->assertSame(
			'Demonstration type', $externalRepresentationLabels->getStringForLanguageCode( 'en' ),
			'ZPO label in English is present as fallback from German.'
		);
		$this->assertSame(
			'', $externalRepresentationLabels->getStringForLanguageCode( 'fr' ),
			'ZPO label in French is absent when asked for in German.'
		);
	}

	public function testGetSecondaryDataUpdates() {
		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$title = Title::newFromText( ZTestType::TEST_ZID, NS_MAIN );
		$content = ZObjectContentHandler::makeContent( ZTestType::TEST_ENCODING, $title );
		$slotOutput = $this->createMock( SlotRenderingProvider::class );

		$updates = $handler->getSecondaryDataUpdates( $title, $content, SlotRecord::MAIN, $slotOutput );
		$zobjectUpdates = array_filter( $updates, static function ( $u ) {
			return $u instanceof ZObjectSecondaryDataUpdate;
		} );
		$this->assertCount( 1, $zobjectUpdates );
	}

	public function testGetDeletionUpdates() {
		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$title = Title::newFromText( ZTestType::TEST_ZID, NS_MAIN );

		$updates = $handler->getDeletionUpdates( $title, SlotRecord::MAIN );
		$zobjectUpdates = array_filter( $updates, static function ( $u ) {
			return $u instanceof ZObjectSecondaryDataRemoval;
		} );
		$this->assertCount( 1, $zobjectUpdates );
	}

	public function testSupportsDirectEditing() {
		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$this->assertFalse( $handler->supportsDirectEditing() );
	}

	public function testGetActionOverrides() {
		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$overrides = $handler->getActionOverrides();
		$this->assertSame( ZObjectEditAction::class, $overrides[ 'edit' ] );
	}

	public function testPrepareSaveTransform_invalid() {
		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );

		$sysopUser = $this->getTestSysop()->getUser();
		$popts = $this->createMock( ParserOptions::class );
		$testZid = 'Z333';
		$testTitle = Title::newFromText( $testZid, NS_MAIN );

		// Invalid content because it doesn't have Z2K3 key
		$testObject = new ZObjectContent(
			'{ "Z1K1": "Z2",'
				. '"Z2K1": { "Z1K1": "Z9", "Z9K1": "Z333" },'
				. '"Z2K2": { "Z1K1": "Z6", "Z6K1": "string value" } }'
		);
		$pstParams = new PreSaveTransformParamsValue( $testTitle, $sysopUser, $popts );
		$transformedObject = $handler->preSaveTransform( $testObject, $pstParams );

		$this->assertInstanceOf( ZObjectContent::class, $transformedObject );
		$this->assertSame(
			$transformedObject->getText(),
			$testObject->getText(),
			'The ZObject is not transformed as it was found not valid'
		);
	}

	public function testPrepareSaveTransform_valid() {
		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );

		$sysopUser = $this->getTestSysop()->getUser();
		$popts = $this->createMock( ParserOptions::class );
		$testZid = 'Z333';
		$testTitle = Title::newFromText( $testZid, NS_MAIN );

		// Valid content with string and reference in normal form
		$testObject = new ZObjectContent( '{ "Z1K1": "Z2",'
			. '"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z333" },'
			. '"Z2K2": "string value",'
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }' );

		// Expected result: canonical, UTF8, trimmed and standard EOL characters
		$zObjectTransform = FormatJson::encode( [
			"Z1K1" => "Z2",
			"Z2K1" => [
				"Z1K1" => "Z6",
				"Z6K1" => "Z333"
			],
			"Z2K2" => "string value",
			"Z2K3" => [
				"Z1K1" => "Z12",
				"Z12K1" => [ "Z11" ]
			]
		], true, FormatJson::UTF8_OK );
		$zObjectTransform = str_replace( [ "\r\n", "\r" ], "\n", rtrim( $zObjectTransform ) );

		$pstParams = new PreSaveTransformParamsValue( $testTitle, $sysopUser, $popts );
		$transformedObject = $handler->preSaveTransform( $testObject, $pstParams );
		$this->assertInstanceOf( ZObjectContent::class, $transformedObject );
		$this->assertSame( $transformedObject->getText(), $zObjectTransform );
		$this->assertNotSame(
			$transformedObject->getText(),
			$testObject->getText(),
			'The ZObject is transformed as it is valid and in normal form'
		);
	}

	public function testValidateSave_valid() {
		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );

		$testZid = 'Z401';
		$testTitle = Title::newFromText( $testZid, NS_MAIN );
		$testPage = $this->getServiceContainer()->getWikiPageFactory()->newFromTitle( $testTitle );
		$validateParams = new ValidationParams( $testPage, 0 );

		$content = new ZObjectContent(
			'{ "Z1K1": "Z2",'
			. '"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z401"},'
			. '"Z2K2": "valid",'
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }'
		);

		$status = $handler->validateSave( $content, $validateParams );
		$this->assertTrue( $status->isOK() );
	}

	public function testValidateSave_invalid() {
		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );

		$testZid = 'Z401';
		$testTitle = Title::newFromText( $testZid, NS_MAIN );
		$testPage = $this->getServiceContainer()->getWikiPageFactory()->newFromTitle( $testTitle );
		$validateParams = new ValidationParams( $testPage, 0 );

		$content = new ZObjectContent(
			'{ "Z1K1": "Z2", "Z2K1": "Z401", "Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }'
		);

		$status = $handler->validateSave( $content, $validateParams );
		$this->assertTrue( $status->hasMessage( 'wikilambda-invalidzobject' ) );
	}

	public function testGenerateHTMLOnEdit() {
		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$this->assertFalse( $handler->generateHTMLOnEdit() );
	}

	public function testGetParserOutput_links() {
		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );

		$this->registerLangs( [ 'en' ] );
		$this->insertZids( [ 'Z2', 'Z6', 'Z9', 'Z11', 'Z12', 'Z40' ] );

		$testTitle = Title::newFromText( ZTestType::TEST_ZID, NS_MAIN );

		$content = new ZObjectContent( ZTestType::TEST_ENCODING );

		$cpoParamsWithHTML = new ContentParseParams( $testTitle, null, ParserOptions::newFromAnon(), true );
		$parserOutputWithHTML = $handler->getParserOutput( $content, $cpoParamsWithHTML );
		$parserOutputLinks = $parserOutputWithHTML->getLinks();

		$this->assertCount( 1, $parserOutputLinks, 'Should have links only in one namespace' );
		$this->assertArrayHasKey( 0, $parserOutputLinks, 'Should have links in NS_MAIN' );

		$this->assertArrayEquals(
			[ 'Z111', 'Z881', 'Z3', 'Z6', 'Z1002', 'Z1004', 'Z46', 'Z64' ],
			array_keys( $parserOutputLinks[0] ),
			'Should have the expected 8 links in NS_MAIN'
		);

		// Also check that this happens when the 'generate HTML' flag is false, e.g. LinksUpdate jobs
		$cpoParamsWithoutHTML = new ContentParseParams( $testTitle, null, ParserOptions::newFromAnon(), false );
		$parserOutputWithoutHTML = $handler->getParserOutput( $content, $cpoParamsWithoutHTML );
		$parserOutputLinks = $parserOutputWithoutHTML->getLinks();

		$this->assertCount( 1, $parserOutputLinks, 'Should have links only in one namespace' );
		$this->assertArrayHasKey( 0, $parserOutputLinks, 'Should have links in NS_MAIN' );
		$this->assertArrayEquals(
			[ 'Z111', 'Z881', 'Z3', 'Z6', 'Z1002', 'Z1004', 'Z46', 'Z64' ],
			array_keys( $parserOutputLinks[0] ),
			'Should have the expected 8 links in NS_MAIN'
		);
	}

	public function testCreateZObjectViewHeader() {
		$this->registerLangs( [ 'en', 'fr', 'pcd' ] );
		$this->insertZids( [ 'Z6' ] );

		$testZid = 'Z401';
		$testTitle = Title::newFromText( $testZid, NS_MAIN );

		$content = new ZObjectContent(
			'{"Z1K1":"Z2","Z2K1":"Z401","Z2K2":"",' .
				'"Z2K3":{"Z1K1":"Z12","Z12K1":["Z11",{"Z1K1":"Z11","Z11K1":"Z1004","Z11K2":"Éxample"}]}}'
		);

		$this->assertTrue( $content->isValid() );

		// In English, we see 'Untitled' in en and the Type sub-title in en (with no BCP47 chip)
		$enHeader = ZObjectContentHandler::createZObjectViewHeader( $content, $testTitle, self::makeLanguage( 'en' ) );
		$this->assertStringStartsWith( '<span lang="en" class="ext-wikilambda-viewpage-header">', $enHeader );
		$this->assertStringContainsString( '<span class="ext-wikilambda-viewpage-header-zid">Z401</span>', $enHeader );
		// @phpcs:ignore Generic.Files.LineLength.TooLong
		$this->assertStringContainsString( '<span class="ext-wikilambda-viewpage-header-title ext-wikilambda-viewpage-header-title--function-name ext-wikilambda-viewpage-header--title-untitled">Untitled</span>', $enHeader );
		// @phpcs:ignore Generic.Files.LineLength.TooLong
		$this->assertStringContainsString( '<div class="ext-wikilambda-viewpage-header-type"> <span class="ext-wikilambda-viewpage-header-type-label">String</span></div>', $enHeader );

		// In French, we see the label and not 'Untitled', but the Type sub-title is in en with a BCP47 chip
		$frHeader = ZObjectContentHandler::createZObjectViewHeader( $content, $testTitle, self::makeLanguage( 'fr' ) );
		$this->assertStringStartsWith( '<span lang="fr" class="ext-wikilambda-viewpage-header">', $frHeader );
		// @phpcs:ignore Generic.Files.LineLength.TooLong
		$this->assertStringContainsString( '><span class="ext-wikilambda-viewpage-header-title ext-wikilambda-viewpage-header-title--function-name">Éxample</span>', $frHeader );
		// @phpcs:ignore Generic.Files.LineLength.TooLong
		$this->assertStringContainsString( '<div class="ext-wikilambda-viewpage-header-type"><span data-title="English" class="ext-wikilambda-viewpage-header--bcp47-code">en</span>', $frHeader );
		$this->assertStringNotContainsString( 'ext-wikilambda-viewpage-header--title-untitled', $frHeader );

		// In Picard, we see the fr label with a BCP47 chip, and the Type sub-title is in en with a different chip
		$frHeader = ZObjectContentHandler::createZObjectViewHeader( $content, $testTitle, self::makeLanguage( 'pcd' ) );
		$this->assertStringStartsWith( '<span lang="pcd" class="ext-wikilambda-viewpage-header">', $frHeader );
		// @phpcs:ignore Generic.Files.LineLength.TooLong
		$this->assertStringContainsString( '<span data-title="français" class="ext-wikilambda-viewpage-header--bcp47-code">fr</span> <span class="ext-wikilambda-viewpage-header-title ext-wikilambda-viewpage-header-title--function-name">Éxample</span>', $frHeader );
		// @phpcs:ignore Generic.Files.LineLength.TooLong
		$this->assertStringContainsString( '<div class="ext-wikilambda-viewpage-header-type"><span data-title="English" class="ext-wikilambda-viewpage-header--bcp47-code">en</span>', $frHeader );
		$this->assertStringNotContainsString( 'ext-wikilambda-viewpage-header--title-untitled', $frHeader );
	}

	public function testCreateZObjectViewTitle() {
		$sitename = MediaWikiServices::getInstance()->getMainConfig()->get( MainConfigNames::Sitename );

		$this->registerLangs( [ 'en', 'fr', 'pcd' ] );
		$this->insertZids( [ 'Z6' ] );

		$testZid = 'Z401';
		$testTitle = Title::newFromText( $testZid, NS_MAIN );

		$content = new ZObjectContent(
			'{"Z1K1":"Z2","Z2K1":"Z401","Z2K2":"",' .
				'"Z2K3":{"Z1K1":"Z12","Z12K1":["Z11",{"Z1K1":"Z11","Z11K1":"Z1004","Z11K2":"Éxample"}]}}'
		);

		$this->assertTrue( $content->isValid() );

		// In English, we see Zid - Sitename
		$enTitle = ZObjectContentHandler::createZObjectViewTitle( $content, $testTitle, self::makeLanguage( 'en' ) );
		$this->assertSame( "$testZid - $sitename", $enTitle );

		// In French, we see Label - Sitename
		$frTitle = ZObjectContentHandler::createZObjectViewTitle( $content, $testTitle, self::makeLanguage( 'fr' ) );
		$this->assertSame( "Éxample - $sitename", $frTitle );

		// In Picard, we see the fr Label - Sitename
		$pcdTitle = ZObjectContentHandler::createZObjectViewTitle( $content, $testTitle, self::makeLanguage( 'pcd' ) );
		$this->assertSame( "Éxample - $sitename", $pcdTitle );
	}
}
