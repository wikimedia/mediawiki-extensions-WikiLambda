<?php

/**
 * WikiLambda integration test suite for the ZError class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZError
 * @group Database
 */
class ZErrorTest extends WikiLambdaIntegrationTestCase {

	public function testCreate_invalidErrorType() {
		$testObject = new ZError( 'invalid', new ZString( 'error message' ) );
		$this->assertFalse( $testObject->isValid() );
	}

	public function testCreate_unknownErrorType() {
		$testObject = new ZError( 'Z999', new ZString( 'error message' ) );
		$this->assertFalse( $testObject->isValid() );
	}

	public function testCreate_wrongValue() {
		$testObject = new ZError( 'Z501', 'error message' );
		$this->assertFalse( $testObject->isValid() );
	}

	public function testCreate_invalidValue() {
		$testObject = new ZError( 'Z501', new ZReference( '' ) );
		$this->assertFalse( $testObject->isValid() );
	}

	public function testCreate_valid() {
		$testObject = new ZError( 'Z501', new ZString( 'error message' ) );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z501', $testObject->getZErrorType() );
		$this->assertInstanceOf( ZObject::class, $testObject->getZValue() );
	}
}
