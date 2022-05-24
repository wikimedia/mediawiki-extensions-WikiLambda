<?php

/**
 * WikiLambda integration test suite for the ZString class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZString
 */
class ZStringTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::__construct
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::isValid
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::getZType
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::getZValue
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::getInnerZObject
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::getZType
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::getZValue
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::getInnerZObject
	 */
	public function testPersistentCreation() {
		$testObject = new ZObjectContent( '""' );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( '', $testObject->getZValue() );

		$testObject = new ZObjectContent( '"Test"' );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( 'Test', $testObject->getZValue() );

		$testObject = new ZObjectContent( '{ "Z1K1": "Z6", "Z6K1": "Z400" }' );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( 'Z400', $testObject->getZValue() );

		$this->hideDeprecated( '::create' );
		$testObject = new ZObjectContent(
			'{ '
				. '"Z1K1": "Z2", '
				. '"Z2K1": "Z0", '
				. '"Z2K2": "Test", '
				. '"Z2K3": { "Z1K1":"Z12", "Z12K1":["Z11"] } '
			. '}'
		);
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( 'Test', $testObject->getZValue() );

		// Try the constructor with an array of strings and other things
		$testObject = new ZString( [ 'Tests', $testObject, 'hello' ] );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( 'Tests', $testObject->getZValue() );

		// Try the constructor with an array of a ZString
		$testObject = new ZString( [ $testObject ] );
		$this->assertFalse( $testObject->isValid() );
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( 'Tests', $testObject->getZValue()->getZValue() );
	}

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 * @covers ::getDefinition
	 * @covers ::isBuiltin
	 */
	public function testGetZType() {
		$testObject = new ZString( 'Test' );
		$this->assertSame( 'Z6', $testObject->getZType(), 'ZType of directly-created ZStrings' );

		$testObject = new ZObjectContent( '"Test"' );
		$this->assertSame( 'Z6', $testObject->getZType(), 'ZType of indirectly-created ZStrings' );
	}

	/**
	 * @covers ::__construct
	 * @covers ::getZValue
	 */
	public function testGetZValue() {
		$testObject = new ZString();
		$this->assertSame( '', $testObject->getZValue(), 'ZValue of implicit null is the empty string' );

		$testObject = new ZString( null );
		$this->assertSame( null, $testObject->getZValue(), 'ZValue of explicit null is null' );

		$testObject = new ZString( '' );
		$this->assertSame( '', $testObject->getZValue(), 'ZValue of an empty string is identical' );

		$testObject = new ZString( 'Test' );
		$this->assertSame( 'Test', $testObject->getZValue(), 'ZValue of a non-empty string is identical' );
	}

	/**
	 * @covers ::__construct
	 * @covers ::isValid
	 */
	public function testIsValid() {
		$testObject = new ZString();
		$this->assertTrue( $testObject->isValid(), 'Null ZStrings are valid' );

		$testObject = new ZString( '' );
		$this->assertTrue( $testObject->isValid(), 'Empty ZStrings are valid' );

		$testObject = new ZString( 'Test!' );
		$this->assertTrue( $testObject->isValid(), 'Non-empty ZStrings are valid' );
	}

}
