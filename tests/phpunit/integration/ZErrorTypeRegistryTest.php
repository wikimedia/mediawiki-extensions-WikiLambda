<?php

/**
 * WikiLambda integration test suite for the ZErrorTypeRegistry class
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorTypeRegistry;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZErrorTypeRegistry
 * @group Database
 */
class ZErrorTypeRegistryTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers ::singleton
	 */
	public function testSingleton() {
		$registry = ZErrorTypeRegistry::singleton();
		$this->assertEquals( get_class( $registry ), ZErrorTypeRegistry::class );
		$this->assertEquals( $registry, ZErrorTypeRegistry::singleton() );
	}

	/**
	 * @covers ::register
	 * @covers ::isZErrorTypeKnown
	 * @covers ::isZErrorTypeCached
	 * @covers ::unregister
	 */
	public function testCacheZErrorType() {
		$errorType = 'Z501';
		$registry = ZErrorTypeRegistry::singleton();

		$this->runPrivateMethod( $registry, 'register', [ $errorType, 'error type' ] );
		$this->assertTrue( $registry->isZErrorTypeKnown( $errorType ) );

		$registry->unregister( 'Z505' );
		$this->assertTrue(
			$registry->isZErrorTypeKnown( $errorType ),
			'Unregistering a non-cached error type does throw errors.'
		);

		$registry->unregister( $errorType );
		$this->assertFalse( $registry->isZErrorTypeKnown( $errorType ) );
	}

	/**
	 * @covers ::isZErrorTypeKnown
	 * @covers ::isZErrorTypeCached
	 */
	public function testIsZErrorTypeKnown_typeNotFound() {
		$errorType = 'Z501';
		$registry = ZErrorTypeRegistry::singleton();

		$this->assertFalse(
			$registry->isZErrorTypeKnown( $errorType ),
			"No ZObject with Zid $errorType was found in the database"
		);
	}

	/**
	 * @covers ::isZErrorTypeKnown
	 * @covers ::isZErrorTypeCached
	 */
	public function testIsZErrorTypeKnown_typeNotValid() {
		$invalidErrorType = 'Z6';
		$expectedErrorType = 'Z506';
		$registry = ZErrorTypeRegistry::singleton();

		$this->insertZErrorTypes( [ $expectedErrorType ] );
		$this->insertZids( [ $invalidErrorType ] );

		$errorType = null;
		try {
			$registry->isZErrorTypeKnown( $invalidErrorType );
		} catch ( ZErrorException $e ) {
			$errorType = $e->getZErrorType();
		}
		$this->assertSame( $expectedErrorType, $errorType );
	}

	/**
	 * @covers ::isZErrorTypeKnown
	 * @covers ::isZErrorTypeCached
	 * @covers ::register
	 * @covers ::unregister
	 */
	public function testIsZErrorTypeKnown_valid() {
		$errorType = 'Z501';
		$registry = ZErrorTypeRegistry::singleton();
		$this->insertZErrorTypes( [ $errorType ] );

		$this->assertFalse(
			$this->runPrivateMethod( $registry, 'isZErrorTypeCached', [ $errorType ] ),
			'The valid ZErrorType Zid is not yet cached.'
		);

		$this->assertTrue(
			$registry->isZErrorTypeKnown( $errorType ),
			'The valid ZErrorType is found in the database and cached.'
		);

		$this->assertTrue(
			$this->runPrivateMethod( $registry, 'isZErrorTypeCached', [ $errorType ] ),
			'The valid ZErrorType Zid is now cached.'
		);

		$registry->unregister( $errorType );
		$this->assertFalse(
			$this->runPrivateMethod( $registry, 'isZErrorTypeCached', [ $errorType ] ),
			'The valid ZErrorType Zid is not cached after unregistering it.'
		);
	}
}
