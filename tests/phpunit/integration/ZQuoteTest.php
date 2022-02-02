<?php

/**
 * WikiLambda integration test suite for the ZKey class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use FormatJson;
use MediaWiki\Extension\WikiLambda\ZObjects\ZQuote;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZQuote
 */
class ZQuoteTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers ::__construct
	 * @covers ::getZValue
	 * @covers ::isValid
	 */
	public function testConstructor() {
		$testObject = new ZQuote( 'this is a quote' );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'this is a quote', $testObject->getZValue() );
	}

	/**
	 * @covers ::getSerialized
	 */
	public function testGetSerialized() {
		$testObject = new ZQuote( 'this is a quote' );
		$this->assertSame(
			FormatJson::encode( FormatJson::decode( $testObject ) ),
			FormatJson::encode( $testObject->getSerialized() )
		 );
	}

	/**
	 * @covers ::getZType
	 * @covers ::isBuiltIn
	 * @covers ::getDefinition
	 */
	public function testGetZType() {
		$testObject = new ZQuote( 'this is a quote' );

		$this->assertSame( 'Z99', $testObject->getZType() );
	}
}
