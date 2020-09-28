<?php

/**
 * WikiLambda integration test suite for the ZObjectContentHandler class
 *
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use Title;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjectContentHandler
 * @group Database
 */
class ZObjectContentHandlerTest extends \MediaWikiIntegrationTestCase {

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
		$this->editPage( ZTestType::TEST_ZID, ZTestType::TEST_ENCODING, 'Test creation', NS_ZOBJECT );

		$title = \Title::newFromText( ZTestType::TEST_ZID, NS_ZOBJECT );
		$page = \WikiPage::factory( $title );

		$externalRepresentation = ZObjectContentHandler::getExternalRepresentation( $title );

		$this->assertFalse( strpos( $externalRepresentation, '"Z2K1": "Z0"' ), "ZPO key is not set to Z0" );
		$this->assertTrue( (bool)strpos( $externalRepresentation, '"Z2K1": "Z111"' ), "ZPO key is set to the title" );

		// Cleanup the page we touched.
		$page->doDeleteArticleReal( $title, $this->getTestSysop()->getUser() );
	}

}
