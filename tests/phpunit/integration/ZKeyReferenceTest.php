<?php

/**
 * WikiLambda integration test suite for the ZKey class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZObjects\ZKeyReference;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZKeyReference
 */
class ZKeyReferenceTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers ::__construct
	 * @covers ::getZValue
	 * @covers ::isValid
	 */
	public function testConstructor() {
		$testObject = new ZKeyReference( 'K1' );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'K1', $testObject->getZValue() );
	}

	/**
	 * @covers ::isValid
	 */
	public function testIsValid() {
		$testObject = new ZKeyReference( 'K1' );
		$this->assertTrue( $testObject->isValid() );

		$testObject = new ZKeyReference( 100 );
		$this->assertFalse( $testObject->isValid() );

		$$testObject = new ZKeyReference( 'this is not a ZString' );
		$this->assertFalse( $testObject->isValid() );
	}

	/**
	 * @covers ::getZType
	 * @covers ::isBuiltIn
	 * @covers ::getDefinition
	 */
	public function testGetZType() {
		$testObject = new ZKeyReference( 'K1' );

		$this->assertSame( 'Z39', $testObject->getZType() );
	}
}
