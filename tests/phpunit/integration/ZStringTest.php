<?php

/**
 * WikiLambda integration test suite for the ZString class
 *
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZString
 */
class ZStringTest extends \MediaWikiIntegrationTestCase {

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::__construct
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::isValid
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::getZType
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::getZValue
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::getInnerZObject
	 */
	public function testPersistentCreation() {
		$testObject = new ZPersistentObject( '' );
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( '', $testObject->getZValue() );

		$testObject = new ZPersistentObject( 'Test' );
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( 'Test', $testObject->getZValue() );

		$testObject = new ZPersistentObject( '{ "Z1K1": "Z6", "Z6K1": "Test" }' );
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( 'Test', $testObject->getZValue() );

		$this->hideDeprecated( '::create' );
		$testObject = new ZPersistentObject(
			'{ '
				. '"Z1K1": "Z2", '
				. '"Z2K1": "Z0", '
				. '"Z2K2": { "Z1K1": "Z6", "Z6K1": "Test" }, '
				. '"Z2K3": { "Z1K1":"Z12", "Z12K1":[] } '
			. '}'
		);
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( 'Test', $testObject->getZValue() );
	}

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 */
	public function testGetZType() {
		$testObject = new ZString( 'Test' );
		$this->assertSame( 'Z6', $testObject->getZType(), 'ZType of directly-created ZStrings' );

		$testObject = new ZPersistentObject( 'Test' );
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
