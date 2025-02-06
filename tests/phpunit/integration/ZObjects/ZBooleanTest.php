<?php

/**
 * WikiLambda integration test suite for the ZBoolean class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjects\ZBoolean;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZBoolean
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent
 */
class ZBooleanTest extends WikiLambdaIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsRepoMode();
	}

	public function testPersistentCreation() {
		$testObject = new ZObjectContent( '{ "Z1K1": "Z40", "Z40K1": "Z41" }' );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z40', $testObject->getZType() );
		$this->assertSame( 'Z41', $testObject->getZValue()->getZValue() );

		$testObject = new ZObjectContent( '{ "Z1K1": "Z40", "Z40K1": "Z42" }' );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z40', $testObject->getZType() );
		$this->assertSame( 'Z42', $testObject->getZValue()->getZValue() );

		$registry = ZErrorTypeRegistry::singleton();
		$registry->register( 'Z502', 'Not wellformed' );

		$testObject = new ZObjectContent( '{ "Z1K1": "Z40", "Z40K1": "Z400" }' );
		$this->assertTrue( $testObject->isValid() );

		$this->hideDeprecated( '::create' );
		$testObject = new ZObjectContent(
			'{ '
				. '"Z1K1": "Z2", '
				. '"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" }, '
				. '"Z2K2": "Test", '
				. '"Z2K3": { "Z1K1":"Z12", "Z12K1":["Z11"] } '
			. '}'
		);
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( 'Test', $testObject->getZValue() );
	}

	public function testGetZType() {
		$testObject = new ZBoolean( 'Z41' );
		$this->assertSame( 'Z40', $testObject->getZType(), 'ZType of directly-created ZBooleans' );

		$testObject = new ZObjectContent( '{ "Z1K1": "Z40", "Z40K1": "Z41" }' );
		$this->assertSame( 'Z40', $testObject->getZType(), 'ZType of indirectly-created ZBooleans' );
	}

	public function testGetZValue() {
		$testObject = new ZBoolean();
		$this->assertSame( null, $testObject->getZValue(), 'ZValue of null is null' );

		$testObject = new ZBoolean( true );
		$this->assertSame( 'Z41', $testObject->getZValue()->getZValue(), 'ZValue of boolean true is Z41' );

		$testObject = new ZBoolean( new ZReference( 'Z41' ) );
		$this->assertSame( 'Z41', $testObject->getZValue()->getZValue(), 'ZValue of reference true is Z41' );

		$testObject = new ZBoolean( false );
		$this->assertSame( 'Z42', $testObject->getZValue()->getZValue(), 'ZValue of boolean false is Z42' );

		$testObject = new ZBoolean( new ZReference( 'Z42' ) );
		$this->assertSame( 'Z42', $testObject->getZValue()->getZValue(), 'ZValue of reference false is Z42' );
	}

	public function testIsValid() {
		$testObject = new ZBoolean();
		$this->assertFalse( $testObject->isValid(), 'Null ZBooleans are invalid' );

		$testObject = new ZBoolean( true );
		$this->assertTrue( $testObject->isValid(), 'True ZBooleans are valid' );

		$testObject = new ZBoolean( false );
		$this->assertTrue( $testObject->isValid(), 'False ZBooleans are valid' );

		$testObject = new ZBoolean( new ZReference( 'Z41' ) );
		$this->assertTrue( $testObject->isValid(), 'True reference ZBooleans are valid' );

		$testObject = new ZBoolean( new ZReference( 'Z42' ) );
		$this->assertTrue( $testObject->isValid(), 'False reference ZBooleans are valid' );

		$testObject = new ZBoolean( new ZReference( 'Z0' ) );
		$this->assertFalse( $testObject->isValid(), 'Other reference ZBooleans are invalid' );

		$testObject = new ZBoolean( new ZReference( 'Z43' ) );
		$this->assertFalse( $testObject->isValid(), 'Other reference ZBooleans are invalid' );
	}

}
