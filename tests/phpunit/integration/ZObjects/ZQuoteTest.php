<?php

/**
 * WikiLambda integration test suite for the ZKey class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ZObjects;

use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\ZObjects\ZQuote;
use MediaWiki\Json\FormatJson;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZQuote
 *
 * @group Database
 */
class ZQuoteTest extends WikiLambdaIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsRepoMode();
	}

	public function testConstructor() {
		$testObject = new ZQuote( 'this is a quote' );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'this is a quote', $testObject->getZValue() );
	}

	public function testGetSerialized() {
		$testObject = new ZQuote( 'this is a quote' );
		$this->assertSame(
			FormatJson::encode( FormatJson::decode( $testObject ) ),
			FormatJson::encode( $testObject->getSerialized() )
		 );
	}

	public function testGetZType() {
		$testObject = new ZQuote( 'this is a quote' );

		$this->assertSame( 'Z99', $testObject->getZType() );
	}
}
