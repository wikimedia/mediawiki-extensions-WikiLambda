<?php

/**
 * WikiLambda integration test suite for the ZObjectContent class
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use InvalidArgumentException;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjectContent
 * @group Database
 */
class ZObjectContentTest extends \MediaWikiIntegrationTestCase {

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 * @covers ::getZValue
	 */
	public function testCreation_basicObject() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZObjectContent(
			'{ "Z1K1": "Z1" }'
		);
		$this->assertSame( 'ZObject', $testObject->getZType() );
		$this->assertSame( [ 'Z1K1' => 'ZObject' ], $testObject->getZValue() );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_contentHandlerEmptyContentIsValid() {
		$contentHandler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$this->hideDeprecated( '::create' );
		$testObject = $contentHandler->makeEmptyContent();
		$this->assertInstanceOf( ZObjectContent::class, $testObject );
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( '', $testObject->getZValue() );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_nokey() {
		$this->expectException( InvalidArgumentException::class );
		$testObject = new ZObjectContent( '{}' );
		$this->assertFalse( $testObject->isValid() );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_invalidkey() {
		$testObject = new ZObjectContent(
			'{ "Z1K1": "This is not a valid key!" }'
		);
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( InvalidArgumentException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_unrecognisedkey() {
		$testObject = new ZObjectContent(
			'{ "Z1K1": "Z1234" }'
		);
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( InvalidArgumentException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_nestedrecordhasinvalidkey() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZObjectContent(
			'{ "Z1K1":"Z2", "Z2K1":"Z0", "Z2K2": { "Z1K1": "Foo" }, "Z2K3": { "Z1K1": "Z12", "Z12K1": [] } }'
		);
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( InvalidArgumentException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_nestedrecordhasnovalue() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZObjectContent(
			'{ "Z1K1": "Z2", "Z2K2": { "Z1K1": "Z1" }, "Z2K3": { "Z1K1": "Z12", "Z12K1": [] } }'
		);
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( InvalidArgumentException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_nestedrecordhasnolabel() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZObjectContent(
			'{ "Z1K1": "Z2", "Z2K2": { "Z1K1": "Z1", "Z2K2": "Foo" } }'
		);
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( InvalidArgumentException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}
}
