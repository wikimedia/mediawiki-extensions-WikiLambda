<?php

/**
 * WikiLambda integration test suite for the ZObjectContent class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils
 * @group Database
 */
class ZObjectFactoryTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @dataProvider provideCreateValidInput
	 */
	public function testCreate_valid( $input, $zObjectClass ) {
		$zobject = ZObjectFactory::create( $input );
		$this->assertInstanceOf( ZObject::class, $zobject );
		$this->assertInstanceOf( $zObjectClass, $zobject );
	}

	public static function provideCreateValidInput() {
		return [
			'string' => [ 'string object', ZString::class ],
			'reference' => [ 'Z6', ZReference::class ],
			'array' => [ [ 'Z6', 'one string', 'another string' ], ZTypedList::class ],
			'monolingual' => [
				(object)[ 'Z1K1' => 'Z11', 'Z11K1' => 'Z1003', 'Z11K2' => 'string' ],
				ZMonoLingualString::class
			]
		];
	}

	/**
	 * @dataProvider provideCreateInvalidInput
	 */
	public function testCreate_invalid( $input, $zErrorType ) {
		$this->expectException( ZErrorException::class );
		$this->expectExceptionMessage( $zErrorType );
		ZObjectFactory::create( $input );
	}

	public static function provideCreateInvalidInput() {
		return [
			'number' => [ 3, ZErrorTypeRegistry::Z_ERROR_INVALID_FORMAT ],
			'invalid item' => [
				[ 'Z1', 'good item', 4 ],
				ZErrorTypeRegistry::Z_ERROR_ARRAY_ELEMENT_NOT_WELLFORMED
			],
			'undefined list type' => [
				[],
				ZErrorTypeRegistry::Z_ERROR_UNDEFINED_LIST_TYPE
			],
			'wrong list type' => [
				[ 'wrong type' ],
				ZErrorTypeRegistry::Z_ERROR_WRONG_LIST_TYPE
			],
			'object wrong reference' => [
				json_decode( '{ "Z1K1": "bad" }' ),
				ZErrorTypeRegistry::Z_ERROR_REFERENCE_VALUE_INVALID
			],
			'object unknown reference' => [
				json_decode( '{ "Z1K1": "Z61" }' ),
				ZErrorTypeRegistry::Z_ERROR_UNKNOWN_REFERENCE
			],
			'no type' => [
				(object)[ 'Z11K1' => 'Z1003', 'Z11K2' => 'invalid monolingual string' ],
				ZErrorTypeRegistry::Z_ERROR_MISSING_TYPE
			],
			'invalid type' => [
				(object)[ 'Z1K1' => 'invalid' ],
				ZErrorTypeRegistry::Z_ERROR_REFERENCE_VALUE_INVALID
			],
			'custom' => [
				(object)[ 'Z1K1' => 'Z999', 'Z999K1' => 'custom' ],
				ZErrorTypeRegistry::Z_ERROR_UNKNOWN_REFERENCE
			],
			'invalid' => [
				(object)[ 'Z1K1' => 'Z11', 'Z11K2' => 'invalid monolingual string' ],
				ZErrorTypeRegistry::Z_ERROR_MISSING_KEY
			],
		];
	}

	/**
	 * @dataProvider provideCreatePersistentValidInput
	 */
	public function testCreatePersistent_valid( $input, $zObjectInnerClass, $dependencies = null ) {
		if ( $dependencies !== null ) {
			$this->insertZids( $dependencies );
		}
		$zobject = ZObjectFactory::createPersistentContent( $input );
		$this->assertInstanceOf( ZObject::class, $zobject );
		$this->assertInstanceOf( ZPersistentObject::class, $zobject );
		$this->assertInstanceOf( $zObjectInnerClass, $zobject->getInnerZObject() );
	}

	public static function provideCreatePersistentValidInput() {
		return [
			'string' => [ 'string object', ZString::class ],
			'array' => [ [ 'Z6', 'one string', 'another string' ], ZTypedList::class ],
			'monolingual' => [
				json_decode( '{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "monolingual string" }' ),
				ZMonoLingualString::class
			],
			'wrapped string' => [
				json_decode(
					' { "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
					. ' "Z2K2": "wrapped string",'
					. ' "Z2K3": { "Z1K1": "Z12",  "Z12K1": [ "Z11",'
					. ' { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "wrapped string label" } ] } }'
				),
				ZString::class
			],
			'wrapped array' => [
				json_decode(
					' { "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
					. ' "Z2K2": [ "Z6", "wrapped", "array", "of strings" ],'
					. ' "Z2K3": { "Z1K1": "Z12",  "Z12K1": [ "Z11",'
					. ' { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "wrapped array label" } ] } }'
				),
				ZTypedList::class
			],
			'wrapped monolingual' => [
				json_decode(
					' { "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
					. ' "Z2K2": { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "wrapped monolingual" },'
					. ' "Z2K3": { "Z1K1": "Z12",  "Z12K1": [ "Z11",'
					. ' { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "wrapped monolingual label" } ] } }'
				),
				ZMonoLingualString::class
			],
			'wrapped self-referenced language' => [
				json_decode(
					' { "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z401" },'
					. ' "Z2K2": { "Z1K1": "Z60", "Z60K1": "invent" },'
					. ' "Z2K3": { "Z1K1": "Z12",  "Z12K1": [ "Z11",'
					. ' { "Z1K1": "Z11", "Z11K1": "Z401", "Z11K2": "invent" } ] } }'
				),
				ZObject::class,
				[ 'Z60' ]
			]
		];
	}

	/**
	 * @dataProvider provideCreatePersistentInvalidInput
	 */
	public function testCreatePersistent_invalid( $input, $zErrorType ) {
		$this->expectException( ZErrorException::class );
		$this->expectExceptionMessage( $zErrorType );
		ZObjectFactory::createPersistentContent( $input );
	}

	public static function provideCreatePersistentInvalidInput() {
		return [
			'number' => [ 3, ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED ],
			'disallowed root' => [ 'Z6', ZErrorTypeRegistry::Z_ERROR_DISALLOWED_ROOT_ZOBJECT ],
			'no type' => [
				(object)[ 'Z11K1' => 'Z1003', 'Z11K2' => 'invalid monolingual string' ],
				ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED
			],
			'invalid type' => [
				(object)[ 'Z1K1' => 'invalid' ],
				ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED
			],
			'custom' => [
				(object)[ 'Z1K1' => 'Z999', 'Z999K1' => 'custom' ],
				ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED
			],
			'invalid' => [
				(object)[ 'Z1K1' => 'Z11', 'Z11K2' => 'invalid monolingual string' ],
				ZErrorTypeRegistry::Z_ERROR_MISSING_KEY
			],
			'unknown inner type' => [
				json_decode(
					' { "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
					. ' "Z2K2": { "Z11K1": "Z1002", "Z11K2": "wrapped monolingual" },'
					. ' "Z2K3": { "Z1K1": "Z12",  "Z12K1": [ "Z11",'
					. ' { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "wrapped monolingual label" } ] } }'
				),
				ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED
			],
			'invalid inner type' => [
				json_decode(
					' { "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
					. ' "Z2K2": { "Z1K1": "Z11", "Z11K2": "wrapped monolingual" },'
					. ' "Z2K3": { "Z1K1": "Z12",  "Z12K1": [ "Z11",'
					. ' { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "wrapped monolingual label" } ] } }'
				),
				ZErrorTypeRegistry::Z_ERROR_MISSING_KEY
			],
			'invalid persistent keys' => [
				json_decode(
					' { "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
					. ' "Z2K2": { "Z1K1": "Z11", "Z11K2": "wrapped monolingual" } }'
				),
				ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED
			],
		];
	}

	/**
	 * @dataProvider provideCreateChildValidInput
	 */
	public function testCreateChild_valid( $input, $zObjectClass, $dependencies = null ) {
		if ( $dependencies !== null ) {
			$this->insertZids( $dependencies );
		}
		$zobject = ZObjectFactory::create( $input );
		$this->assertInstanceOf( ZObject::class, $zobject );
		$this->assertInstanceOf( $zObjectClass, $zobject );
	}

	public static function provideCreateChildValidInput() {
		return [
			'zobject' => [ new ZObject( 'Z1' ), ZObject::class ],
			'zstring' => [ new ZString( 'holi' ), ZString::class ],
			'string' => [ 'string', ZString::class ],
			'reference' => [ 'Z6', ZReference::class ],
			'array' => [ [ 'Z6', 'array' ], ZTypedList::class ],
			'object' => [ json_decode( '{ "Z1K1": "Z6" }' ), ZString::class ],
			'custom type' => [ json_decode( '{ "Z1K1": "Z60" }' ), ZObject::class, [ 'Z60' ] ],
			'function call type: typed list built-in' => [
				json_decode( '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" } }' ),
				ZTypedList::class
			],
			'function call type: error type builtin' => [
				json_decode( '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z885", "Z885K1": "Z500" } }' ),
				ZTypedError::class
			],
			'function call type: user defined' => [
				json_decode( '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z883" } }' ),
				ZObject::class,
				[ 'Z8', 'Z17', 'Z883' ]
			],
		];
	}

	/**
	 * @dataProvider provideErrorQuotedData
	 */
	public function testCreate_errorWithQuote( $quotedData ) {
		// Create instance directly is successful, any Quoted value is valid:
		$error = ZErrorFactory::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_NOT_NUMBER_BOOLEAN_NULL,
			[ 'data' => $quotedData ]
		);
		$this->assertTrue( $error->isValid() );

		// Create instance with ZObjectFactory is successful,
		// any Quoted value should not be recursively created
		// with ZObjectFactory::create but directly assigned:
		$errorJson = $error->getSerialized();
		$createError = ZObjectFactory::create( $errorJson );
		$this->assertTrue( $error->isValid() );
	}

	public static function provideErrorQuotedData() {
		return [
			'quote can be number' => [ 34 ],
			'quote can be null' => [ null ],
			'quote can be valid zobject' => [ json_decode( '{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "text" }' ) ],
			'quote can be invalid zobject' => [ json_decode( '{ "Z1K1": "Z11" }' ) ],
			'quote can be benjamin array' => [ json_decode( '[ "Z8", "Z801", "Z802" ]' ) ],
			'quote can be boolean' => [ true ],
			'quote can be string' => [ "quoted string" ],
			'quote can be object' => [ json_decode( '{ "foo": "bar" }' ) ],
			'quote can be array' => [ json_decode( '[ "foo", "bar" ]' ) ],
			'quote can be empty object' => [ json_decode( '{}' ) ],
			'quote can be empty array' => [ json_decode( '[]' ) ],
		];
	}
}
