<?php

/**
 * WikiLambda integration test suite for the ZError class
 *
 * @copyright 2020-2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZError
 * @group Database
 */
class ZErrorTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers ::__construct
	 * @covers ::isValid
	 */
	public function testCreate_invalidErrorType() {
		$testObject = new ZError( 'invalid', new ZString( 'error message' ) );
		$this->assertFalse( $testObject->isValid() );
	}

	/**
	 * @covers ::__construct
	 * @covers ::isValid
	 */
	public function testCreate_unknownErrorType() {
		$testObject = new ZError( 'Z999', new ZString( 'error message' ) );
		$this->assertFalse( $testObject->isValid() );
	}

	/**
	 * @covers ::__construct
	 * @covers ::isValid
	 */
	public function testCreate_wrongValue() {
		$this->insertZErrorTypes( [ 'Z501' ] );
		$testObject = new ZError( 'Z501', 'error message' );
		$this->assertFalse( $testObject->isValid() );
	}

	/**
	 * @covers ::__construct
	 * @covers ::isValid
	 */
	public function testCreate_invalidValue() {
		$this->insertZErrorTypes( [ 'Z501' ] );
		$testObject = new ZError( 'Z501', new ZReference( '' ) );
		$this->assertFalse( $testObject->isValid() );
	}

	/**
	 * @covers ::__construct
	 * @covers ::isValid
	 * @covers ::getZValue
	 * @covers ::getMessage
	 */
	public function testCreate_valid() {
		$this->insertZErrorTypes( [ 'Z501' ] );
		$testObject = new ZError( 'Z501', new ZString( 'error message' ) );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z501', $testObject->getZErrorType() );
		$this->assertInstanceOf( ZObject::class, $testObject->getZValue() );
	}
}
