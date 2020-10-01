<?php

/**
 * WikiLambda integration test suite for the ZString class
 *
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZString;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZString
 */
class ZStringTest extends \MediaWikiIntegrationTestCase {

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::__construct
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::isValid
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::getZType
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::getZValue
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::getInnerZObject
	 */
	public function testPersistentCreation() {
		$testObject = new ZPersistentObject( '' );
		$this->assertSame( 'ZString', $testObject->getZType() );
		$this->assertSame( '', $testObject->getZValue() );

		$testObject = new ZPersistentObject( 'Test' );
		$this->assertSame( 'ZString', $testObject->getZType() );
		$this->assertSame( 'Test', $testObject->getZValue() );

		$testObject = new ZPersistentObject( '{ "Z1K1": "Z6", "Z6K1": "Test" }' );
		$this->assertSame( 'ZString', $testObject->getZType() );
		$this->assertSame( 'Test', $testObject->getZValue() );

		$testObject = new ZPersistentObject( '{ "Z1K1": "Z2", "Z2K1": "Z0", "Z2K2": { "Z1K1": "Z6", "Z6K1": "Test" }, "Z2K3": [] }' );
		$this->assertSame( 'ZString', $testObject->getZType() );
		$this->assertSame( 'Test', $testObject->getZValue() );
	}

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 */
	public function testGetZType() {
		$testObject = new ZString( 'Test' );
		$this->assertSame( 'ZString', $testObject->getZType(), 'ZType of directly-created ZStrings' );

		$testObject = new ZPersistentObject( 'Test' );
		$this->assertSame( 'ZString', $testObject->getZType(), 'ZType of indirectly-created ZStrings' );
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
