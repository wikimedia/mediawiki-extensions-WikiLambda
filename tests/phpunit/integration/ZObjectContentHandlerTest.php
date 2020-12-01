<?php

/**
 * WikiLambda integration test suite for the ZObjectContentHandler class
 *
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use Language;
use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\MediaWikiServices;
use Title;
use WikiPage;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjectContentHandler
 * @group Database
 */
class ZObjectContentHandlerTest extends \MediaWikiIntegrationTestCase {

	private $titlesTouched = [];

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
			'main NS page' => [ 'Foo', false ],
			'talk NS page' => [ 'Talk:Foo', false ],

			'valid ZObject page' => [ 'ZObject:Z1', true ],
			'ZObject talk page' => [ 'ZObject talk:Z1', false ],
		];
	}

	/**
	 * @covers ::getExternalRepresentation
	 */
	public function testGetExternalRepresentation() {
		$this->hideDeprecated( '::create' );
		$this->editPage( ZTestType::TEST_ZID, ZTestType::TEST_ENCODING, 'Test creation', NS_ZOBJECT );

		$title = Title::newFromText( ZTestType::TEST_ZID, NS_ZOBJECT );
		$page = WikiPage::factory( $title );
		$this->titlesTouched[] = ZTestType::TEST_ZID;

		$externalRepresentation = ZObjectContentHandler::getExternalRepresentation( $title );

		$this->assertFalse( strpos( $externalRepresentation, '"Z2K1": "Z0"' ), "ZPO key is not set to Z0" );
		$this->assertTrue( (bool)strpos( $externalRepresentation, '"Z2K1": "Z111"' ), "ZPO key is set to the title" );

		$externalRepresentation = ZObjectContentHandler::getExternalRepresentation( $title, 'fr' );
		$externalRepresentationLabels = ( new ZPersistentObject( $externalRepresentation ) )->getLabels();

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
		$externalRepresentationLabels = ( new ZPersistentObject( $externalRepresentation ) )->getLabels();

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

	protected function tearDown() : void {
		// Cleanup the pages we touched.
		$sysopUser = $this->getTestSysop()->getUser();

		foreach ( $this->titlesTouched as $titleString ) {
			$title = Title::newFromText( $titleString, NS_ZOBJECT );
			$page = WikiPage::factory( $title );
			$page->doDeleteArticleReal( $title, $sysopUser );
		}

		parent::tearDown();
	}

}
