<?php

/**
 * WikiLambda integration test suite for the ZReference class
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZObjects\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZReference
 */
class ZReferenceTest extends \MediaWikiIntegrationTestCase {

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZObjectContent::__construct
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZObjectContent::isValid
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZObjectContent::getZType
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZObjectContent::getZValue
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZObjectContent::getInnerZObject
	 */
	public function testPersistentCreation() {
		$testObject = new ZObjectContent( '{ "Z1K1": "Z9", "Z9K1": "Z1" }' );
		$this->assertSame( 'Z9', $testObject->getZType() );
		$this->assertSame( 'Z1', $testObject->getZValue() );

		$testObject = new ZObjectContent(
			'{ '
				. '"Z1K1": "Z2", '
				. '"Z2K1": "Z0", '
				. '"Z2K2": { "Z1K1": "Z9", "Z9K1": "Z1" }, '
				. '"Z2K3": { "Z1K1":"Z12", "Z12K1":[] } '
			. '}'
		);
		$this->assertSame( 'Z9', $testObject->getZType() );
		$this->assertSame( 'Z1', $testObject->getZValue() );
	}

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 */
	public function testGetZType() {
		$testObject = new ZReference( 'Z1' );
		$this->assertSame( 'Z9', $testObject->getZType(), 'ZType of directly-created ZReference' );

		$testObject = new ZObjectContent( '{ "Z1K1": "Z9", "Z9K1": "Z1" }' );
		$this->assertSame( 'Z9', $testObject->getZType(), 'ZType of indirectly-created ZReference' );
	}

	/**
	 * @covers ::__construct
	 * @covers ::getZValue
	 */
	public function testGetZValue() {
		$testObject = new ZReference( 'Z1' );
		$this->assertSame( 'Z1', $testObject->getZValue(), 'Value of directly-created ZReference' );

		$testObject = new ZObjectContent( '{ "Z1K1": "Z9", "Z9K1": "Z1" }' );
		$this->assertSame( 'Z1', $testObject->getZValue(), 'Value of indirectly-created ZReference' );
	}

	/**
	 * @covers ::__construct
	 * @covers ::isValid
	 */
	public function testIsValid() {
		$testObject = new ZReference( '' );
		$this->assertFalse( $testObject->isValid(), 'Empty ZReferences are invalid' );

		$testObject = new ZReference( 'Z0' );
		$this->assertFalse( $testObject->isValid(), 'Z0 as a ZReference is invalid' );

		$testObject = new ZReference( 'Z123' );
		$this->assertTrue( $testObject->isValid(), 'Positive ZIDs as ZReferences are valid' );

		$testObject = new ZReference( 'Z1K1' );
		$this->assertFalse( $testObject->isValid(), 'Z1K1 as a ZReference is invalid' );
	}

}
