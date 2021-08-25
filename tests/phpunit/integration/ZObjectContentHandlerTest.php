<?php

/**
 * WikiLambda integration test suite for the ZObjectContentHandler class
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use FormatJson;
use Language;
use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use MediaWiki\Extension\WikiLambda\ZObjectEditAction;
use MediaWiki\Extension\WikiLambda\ZObjectSecondaryDataRemoval;
use MediaWiki\Extension\WikiLambda\ZObjectSecondaryDataUpdate;
use MediaWiki\MediaWikiServices;
use MediaWiki\Revision\SlotRecord;
use MediaWiki\Revision\SlotRenderingProvider;
use Title;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjectContentHandler
 * @group Database
 */
class ZObjectContentHandlerTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers ::__construct
	 */
	public function testWrongContentModel() {
		$this->expectException( \MWException::class );
		new ZObjectContentHandler( CONTENT_MODEL_WIKITEXT );
	}

	/**
	 * @dataProvider provideCanBeUsedOn
	 * @covers ::canBeUsedOn
	 */
	public function testCanBeUsedOn( $input, $expected ) {
		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$this->assertSame( $expected, $handler->canBeUsedOn( Title::newFromText( $input ) ) );
	}

	public function provideCanBeUsedOn() {
		return [
			'Main NS ZObject page' => [ 'Z1', true ],
			'Main talk page' => [ 'Talk:Z1', false ],
			'User NS page' => [ 'User:Foo', false ],
			'User talk NS page' => [ 'User talk:Foo', false ],
		];
	}

	/**
	 * @covers ::makeEmptyContent
	 * @covers ::getContentClass
	 */
	public function testMakeEmptyContent() {
		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$testObject = $handler->makeEmptyContent();
		$this->assertInstanceOf( ZObjectContent::class, $testObject );
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( '', $testObject->getZValue() );
	}

	/**
	 * @covers ::makeContent
	 * @covers ::serializeContent
	 */
	public function testSerializeContent() {
		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$content = $handler->makeEmptyContent();
		$serialized = $handler->serializeContent( $content );
		$expected = '{"Z1K1":"Z2",'
			. '"Z2K1":"Z0",'
			. '"Z2K2":"",'
			. '"Z2K3":{"Z1K1":"Z12","Z12K1":[]},'
			. '"Z2K4":{"Z1K1":"Z32","Z32K1":[]}}';

		$this->assertTrue( is_string( $serialized ) );
		$this->assertSame(
			FormatJson::encode( FormatJson::parse( $serialized )->value ),
			$expected
		);
	}

	/**
	 * @covers ::getContentClass
	 * @covers ::unserializeContent
	 */
	public function testUnserializeContent() {
		$serialized = '{"Z1K1":"Z2","Z2K1":"Z0","Z2K2":"","Z2K3":{"Z1K1":"Z12","Z12K1":[]}}';
		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$testObject = $handler->unserializeContent( $serialized );
		$this->assertInstanceOf( ZObjectContent::class, $testObject );
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( '', $testObject->getZValue() );
	}

	/**
	 * @covers ::getExternalRepresentation
	 */
	public function testGetExternalRepresentation_badNamespace() {
		$pageTitleText = 'User:Z333';
		$title = Title::newFromText( $pageTitleText );

		$this->expectException( ZErrorException::class );
		$this->expectExceptionMessage( "Provided page '$pageTitleText' is not in the main namespace." );

		ZObjectContentHandler::getExternalRepresentation( $title );
	}

	/**
	 * @covers ::getExternalRepresentation
	 */
	public function testGetExternalRepresentation_notFound() {
		$unavailableZid = 'Z333';
		$title = Title::newFromText( $unavailableZid, NS_MAIN );

		try {
			ZObjectContentHandler::getExternalRepresentation( $title );
		} catch ( ZErrorException $e ) {
			$errorType = $e->getZErrorType();
			$errorMessage = $e->getZErrorMessage()->getZValue();
		}

		$this->assertSame( 'Z504', $errorType );
		$this->assertSame( "Provided page '$unavailableZid' could not be fetched from the DB.", $errorMessage );
	}

	/**
	 * @covers ::getExternalRepresentation
	 */
	public function testGetExternalRepresentation() {
		$this->registerLangs( [ 'fr', 'de' ] );
		$this->editPage( ZTestType::TEST_ZID, ZTestType::TEST_ENCODING, 'Test creation', NS_MAIN );

		$title = Title::newFromText( ZTestType::TEST_ZID, NS_MAIN );
		$externalRepresentation = ZObjectContentHandler::getExternalRepresentation( $title );

		$this->assertStringNotContainsString( '"Z2K1": "Z0"', $externalRepresentation, "ZPO key is not set to Z0" );
		$this->assertStringContainsString( '"Z2K1": "Z111"', $externalRepresentation, "ZPO key is set to the title" );

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
			'', $externalRepresentationLabels->getStringForLanguageCode( 'en' ),
			'ZPO label in English is absent when asked for in German.'
		);
		$this->assertSame(
			'', $externalRepresentationLabels->getStringForLanguageCode( 'fr' ),
			'ZPO label in French is absent when asked for in German.'
		);

		$services = MediaWikiServices::getInstance();
		$language = new Language(
			'de',
			$services->getLocalisationCache(),
			$services->getLanguageNameUtils(),
			$services->getLanguageFallback(),
			$services->getLanguageConverterFactory(),
			$services->getHookContainer()
		);

		$this->assertSame(
			wfMessage( 'wikilambda-multilingualstring-nofallback' )->inLanguage( $language )->text(),
			$externalRepresentationLabels->getStringForLanguageCode( 'de' ),
			'ZPO fallback label in German is present when asked for in German.'
		);
	}

	/**
	 * @covers ::getSecondaryDataUpdates
	 */
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

	/**
	 * @covers ::getDeletionUpdates
	 */
	public function testGetDeletionUpdates() {
		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$title = Title::newFromText( ZTestType::TEST_ZID, NS_MAIN );

		$updates = $handler->getDeletionUpdates( $title, SlotRecord::MAIN );
		$zobjectUpdates = array_filter( $updates, static function ( $u ) {
			return $u instanceof ZObjectSecondaryDataRemoval;
		} );
		$this->assertCount( 1, $zobjectUpdates );
	}

	/**
	 * @covers ::supportsDirectEditing
	 */
	public function testSupportsDirectEditing() {
		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$this->assertFalse( $handler->supportsDirectEditing() );
	}

	/**
	 * @covers ::getActionOverrides
	 */
	public function testGetActionOverrides() {
		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$overrides = $handler->getActionOverrides();
		$this->assertSame( $overrides[ 'edit' ], ZObjectEditAction::class );
	}
}
