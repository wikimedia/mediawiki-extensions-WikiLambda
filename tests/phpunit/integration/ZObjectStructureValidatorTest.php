<?php

/**
 * WikiLambda integration test suite for the ZObject validation
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Validation\ZObjectStructureValidator;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\Validation\ZObjectStructureValidator
 */
class ZObjectStructureValidatorTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers ::createCanonicalValidator
	 */
	public function testCanonical_validatorNotFound() {
		$this->expectException( ZErrorException::class );
		$this->expectExceptionMessage( ZErrorTypeRegistry::Z_ERROR_ZTYPE_NOT_FOUND );
		$validator = ZObjectStructureValidator::createCanonicalValidator( "Z987654321" );
	}

	/**
	 * @covers ::createCanonicalValidator
	 * @covers ::validate
	 * @covers MediaWiki\Extension\WikiLambda\Validation\ValidationStatus::isValid
	 * @covers MediaWiki\Extension\WikiLambda\Validation\ValidationStatus::getErrors
	 */
	public function testCanonical_valid() {
		$canonicalZ2 = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z400" },'
			. ' "Z2K2": "valid content", "Z2K3": { "Z1K1": "Z12", "Z12K1": ["Z11"] } }';
		$validator = ZObjectStructureValidator::createCanonicalValidator( "Z2" );
		$this->assertInstanceOf( ZObjectStructureValidator::class, $validator );
		$status = $validator->validate( json_decode( $canonicalZ2 ) );
		$this->assertTrue( $status->isValid() );
		$this->assertNull( $status->getErrors() );
	}

	/**
	 * @covers ::createCanonicalValidator
	 * @covers ::validate
	 * @covers MediaWiki\Extension\WikiLambda\Validation\ValidationStatus::isValid
	 * @covers MediaWiki\Extension\WikiLambda\Validation\ValidationStatus::getErrors
	 */
	public function testCanonical_invalid() {
		$canonicalZ2 = '{ "Z1K1": "Z2", "Z2K1": "Z6", "Z2K2": "invalid content" }';
		$validator = ZObjectStructureValidator::createCanonicalValidator( "Z2" );
		$this->assertInstanceOf( ZObjectStructureValidator::class, $validator );
		$status = $validator->validate( json_decode( $canonicalZ2 ) );
		$this->assertFalse( $status->isValid() );
		$this->assertInstanceOf( ZError::class, $status->getErrors() );
	}

	/**
	 * @covers ::createNormalValidator
	 */
	public function testNormal_validatorNotFound() {
		$this->expectException( ZErrorException::class );
		$this->expectExceptionMessage( ZErrorTypeRegistry::Z_ERROR_ZTYPE_NOT_FOUND );
		$validator = ZObjectStructureValidator::createNormalValidator( "Z987654321" );
	}

	/**
	 * @covers ::createNormalValidator
	 * @covers ::validate
	 * @covers MediaWiki\Extension\WikiLambda\Validation\ValidationStatus::isValid
	 * @covers MediaWiki\Extension\WikiLambda\Validation\ValidationStatus::getErrors
	 */
	public function testNormal_valid() {
		$normalZ2 = '{ "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z2" },'
			. '"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0"},'
			. '"Z2K2": { "Z1K1": "Z6", "Z6K1": "valid content" },'
			. '"Z2K3": { "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z12" }, '
			. '"Z12K1": { "Z1K1": {'
			. '"Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
			. '"Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
			. '"Z881K1": { "Z1K1": "Z9", "Z9K1": "Z11" } } } } }';
		$validator = ZObjectStructureValidator::createNormalValidator( "Z2" );
		$this->assertInstanceOf( ZObjectStructureValidator::class, $validator );
		$status = $validator->validate( json_decode( $normalZ2 ) );
		$this->assertTrue( $status->isValid() );
		$this->assertNull( $status->getErrors() );
	}

	/**
	 * @covers ::createNormalValidator
	 * @covers ::validate
	 * @covers MediaWiki\Extension\WikiLambda\Validation\ValidationStatus::isValid
	 * @covers MediaWiki\Extension\WikiLambda\Validation\ValidationStatus::getErrors
	 */
	public function testNormal_invalid() {
		$normalZ2 = '{ "Z1K1": "Z2", "Z2K1": "Z6", "Z2K2": "invalid content" }';
		$validator = ZObjectStructureValidator::createNormalValidator( "Z2" );
		$this->assertInstanceOf( ZObjectStructureValidator::class, $validator );
		$status = $validator->validate( json_decode( $normalZ2 ) );
		$this->assertFalse( $status->isValid() );
		$this->assertInstanceOf( ZError::class, $status->getErrors() );
	}
}
