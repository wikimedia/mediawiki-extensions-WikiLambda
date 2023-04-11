<?php

/**
 * WikiLambda integration test suite for the ZObject validation
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Validation\SchemataUtils;
use MediaWiki\Extension\WikiLambda\Validation\ZObjectStructureValidator;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZErrorFactory
 * @group Database
 */
class ZErrorFactoryTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @var array
	 */
	private $genericErrors = [ 'Z500', 'Z524', 'Z526', 'Z502', 'Z509' ];

	/**
	 * @dataProvider provideNormalTestObjects
	 */
	public function testNormalFormErrors( $object, $errors, $phpErrors ) {
		$validator = ZObjectStructureValidator::createNormalValidator( 'Z2' );
		$status = $validator->validate( $object );

		$this->assertFalse( $status->isValid() );

		// TODO: It would be ideal to have a more elaborate testing mechanism that can assert
		// things like "there's a Z526 error in the key sequence [Z2K2, Z6K1]".
		// To accomplish this we would have to define a different way to represent
		// the error data in the schemata (function-schemata/test-data/errors/Z2.json)
		$matches = [];
		$pattern = '/\"Z5K1\"\:\s?\"(Z[1-9]\d*)\"/';
		$errors = $status->getErrors();
		preg_match_all( $pattern, $errors, $matches, PREG_PATTERN_ORDER );
		$zids = $matches[1];

		foreach ( $errors as $expectedErr ) {
			$this->assertContains(
				$expectedErr, $zids,
				'Basic error types are correctly identified'
			);
		}

		foreach ( $phpErrors as $expectedErr ) {
			$this->assertContains(
				$expectedErr, $zids,
				'Complex php-specific error types are correctly identified'
			);
		}
	}

	/**
	 * Reads the error data file normal_Z2.yaml from function-schemata and collects the testing data
	 */
	public function provideNormalTestObjects() {
		$file = SchemataUtils::joinPath( SchemataUtils::testDataDirectory(), "errors", "normal_Z2.yaml" );
		$testDescriptor = json_decode( SchemataUtils::readYamlAsSecretJson( $file ) );

		$provide = [];
		foreach ( $testDescriptor->test_objects as $test ) {
			$provide[ $test->name ] = [
				$test->object, $test->errors ?? [], $test->php_errors ?? []
			];
		}
		return $provide;
	}

	/**
	 * @dataProvider provideCanonicalTestObjects
	 */
	public function testCanonicalFormErrors( $object, $errors, $phpErrors = [] ) {
		$validator = ZObjectStructureValidator::createCanonicalValidator( 'Z2' );
		$status = $validator->validate( $object );

		$this->assertFalse( $status->isValid() );

		// TODO: It would be ideal to have a more elaborate testing mechanism that can assert
		// things like "there's a Z526 error in the key sequence [Z2K2, Z6K1]".
		// To accomplish this we would have to define a different way to represent
		// the error data in the schemata (function-schemata/test-data/errrs/Z2.json)
		$matches = [];
		$pattern = '/\"Z5K1\"\:\s?\"(Z[1-9]\d*)\"/';
		$errors = $status->getErrors();
		preg_match_all( $pattern, $errors, $matches, PREG_PATTERN_ORDER );
		$zids = $matches[1];

		foreach ( $errors as $expectedErr ) {
			$this->assertContains(
				$expectedErr, $zids,
				'Basic error types are correctly identified'
			);
		}

		foreach ( $phpErrors as $expectedErr ) {
			$this->assertContains(
				$expectedErr, $zids,
				'Complex php-specific error types are correctly identified'
			);
		}
	}

	/**
	 * Reads the error data file canonical_Z2.yaml from function-schemata and collects the testing data
	 */
	public function provideCanonicalTestObjects() {
		$file = SchemataUtils::joinPath( SchemataUtils::testDataDirectory(), "errors", "canonical_Z2.yaml" );
		$testDescriptor = json_decode( SchemataUtils::readYamlAsSecretJson( $file ) );

		$provide = [];
		foreach ( $testDescriptor->test_objects->failure ?? [] as $test ) {
			$provide[ $test->name ] = [
				$test->object, $test->errors ?? [], $test->php_errors ?? []
			];
		}
		return $provide;
	}
}
