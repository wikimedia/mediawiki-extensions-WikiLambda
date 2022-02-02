<?php

/**
 * WikiLambda integration test suite for the ZReference class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZReference
 */
class ZReferenceTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::__construct
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::isValid
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::getErrors
	 */
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
				. '"Z2K1": "Z0", '
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

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 * @covers ::getDefinition
	 * @covers ::isBuiltin
	 */
	public function testGetZType() {
		$testObject = new ZReference( 'Z1' );
		$this->assertSame( 'Z9', $testObject->getZType(), 'ZType of directly-created ZReference' );
		$testObject = ZObjectFactory::create( "Z1" );
		$this->assertSame( 'Z9', $testObject->getZType(), 'ZType of indirectly-created ZReference' );
	}

	/**
	 * @covers ::__construct
	 * @covers ::getZValue
	 */
	public function testGetZValue() {
		$testObject = new ZReference( 'Z1' );
		$this->assertSame( 'Z1', $testObject->getZValue(), 'Value of directly-created ZReference' );
		$testObject = ZObjectFactory::create( "Z1" );
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
