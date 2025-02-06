<?php

/**
 * WikiLambda integration test suite for the ZReference class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZReference
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent
 * @group Database
 */
class ZReferenceTest extends WikiLambdaIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsRepoMode();
	}

	public function testPersistentCreation_disallowed() {
		$testObject = new ZObjectContent( '"Z9"' );
		$this->assertFalse( $testObject->isValid() );
		$this->assertStringContainsString(
			ZErrorTypeRegistry::Z_ERROR_DISALLOWED_ROOT_ZOBJECT,
			(string)$testObject->getErrors()
		);

		$testObject = new ZObjectContent(
			'{ '
				. '"Z1K1": "Z2", '
				. '"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" }, '
				. '"Z2K2": "Z401", '
				. '"Z2K3": { "Z1K1":"Z12", "Z12K1":[] }, '
				. '"Z2K4": { "Z1K1":"Z32", "Z32K1":[] } '
			. '}'
		);
		$this->assertFalse( $testObject->isValid() );

		$this->assertStringContainsString(
			ZErrorTypeRegistry::Z_ERROR_DISALLOWED_ROOT_ZOBJECT,
			(string)$testObject->getErrors()
		);
	}

	public function testGetZType() {
		$testObject = new ZReference( 'Z1' );
		$this->assertSame( 'Z9', $testObject->getZType(), 'ZType of directly-created ZReference' );
		$testObject = ZObjectFactory::create( "Z1" );
		$this->assertSame( 'Z9', $testObject->getZType(), 'ZType of indirectly-created ZReference' );
	}

	public function testGetZValue() {
		$testObject = new ZReference( 'Z1' );
		$this->assertSame( 'Z1', $testObject->getZValue(), 'Value of directly-created ZReference' );
		$testObject = ZObjectFactory::create( "Z1" );
		$this->assertSame( 'Z1', $testObject->getZValue(), 'Value of indirectly-created ZReference' );
	}

	public function testIsValid() {
		$testObject = new ZReference( null );
		$this->assertFalse( $testObject->isValid(), 'Null ZReferences are invalid' );

		$testObject = new ZReference( '' );
		$this->assertFalse( $testObject->isValid(), 'Empty ZReferences are invalid' );

		$testObject = new ZReference( 'Z0' );
		$this->assertFalse( $testObject->isValid(), 'Z0 as a ZReference is invalid' );

		$testObject = new ZReference( 'Z123' );
		$this->assertTrue( $testObject->isValid(), 'Positive ZIDs as ZReferences are valid' );

		$testObject = new ZReference( 'Z1K1' );
		$this->assertFalse( $testObject->isValid(), 'Z1K1 as a ZReference is invalid' );
	}

	public function testGetSerialized() {
		$testObject = new ZReference( 'Z1' );
		$this->assertSame( 'Z1', $testObject->getSerialized(), 'Serialised form of directly-created ZReference' );
		$this->assertArrayEquals(
			[ 'Z1K1' => 'Z9', 'Z9K1' => 'Z1' ],
			(array)$testObject->getSerialized( ZObject::FORM_NORMAL ),
			'Serialised normal form of directly-created ZReference'
		);

		$testObject = ZObjectFactory::create( "Z1" );
		$this->assertSame( 'Z1', $testObject->getSerialized(), 'Serialised form of indirectly-created ZReference' );
		$this->assertArrayEquals(
			[ 'Z1K1' => 'Z9', 'Z9K1' => 'Z1' ],
			(array)$testObject->getSerialized( ZObject::FORM_NORMAL ),
			'Serialised normal form of indirectly-created ZReference'
		);
	}
}
