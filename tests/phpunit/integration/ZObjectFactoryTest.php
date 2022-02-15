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
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZGenericError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZGenericList;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjectFactory
 * @group Database
 */
class ZObjectFactoryTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers ::create
	 * @covers ::extractObjectType
	 * @covers ::createChild
	 * @covers ::createKeyValues
	 * @dataProvider provideCreateValidInput
	 */
	public function testCreate_valid( $input, $zObjectClass ) {
		$zobject = ZObjectFactory::create( $input );
		$this->assertInstanceOf( ZObject::class, $zobject );
		$this->assertInstanceOf( $zObjectClass, $zobject );
	}

	public function provideCreateValidInput() {
		return [
			'string' => [ 'string object', ZString::class ],
			'reference' => [ 'Z6', ZReference::class ],
			'array' => [ [ 'one string', 'another string' ], ZGenericList::class ],
			'monolingual' => [
				(object)[ 'Z1K1' => 'Z11', 'Z11K1' => 'Z1003', 'Z11K2' => 'string' ],
				ZMonoLingualString::class
			]
		];
	}

	/**
	 * @covers ::create
	 * @covers ::extractObjectType
	 * @covers ::createChild
	 * @covers ::createKeyValues
	 * @dataProvider provideCreateInvalidInput
	 */
	public function testCreate_invalid( $input, $zErrorType ) {
		$this->expectException( ZErrorException::class );
		$this->expectExceptionMessage( $zErrorType );
		ZObjectFactory::create( $input );
	}

	public function provideCreateInvalidInput() {
		return [
			'number' => [ 3, ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED ],
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
				ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED
			],
		];
	}

	/**
	 * @covers ::createPersistentContent
	 * @covers ::extractObjectType
	 * @covers ::extractInnerObject
	 * @covers ::create
	 * @covers ::createChild
	 * @covers ::createKeyValues
	 * @covers ::trackSelfReference
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

	public function provideCreatePersistentValidInput() {
		return [
			'string' => [ 'string object', ZString::class ],
			'array' => [ [ 'one string', 'another string' ], ZGenericList::class ],
			'monolingual' => [
				json_decode( '{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "monolingual string" }' ),
				ZMonoLingualString::class
			],
			'wrapped string' => [
				json_decode(
					' { "Z1K1": "Z2", "Z2K1": "Z0",'
					. ' "Z2K2": "wrapped string",'
					. ' "Z2K3": { "Z1K1": "Z12",  "Z12K1": ['
					. ' { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "wrapped string label" } ] } }'
				),
				ZString::class
			],
			'wrapped array' => [
				json_decode(
					' { "Z1K1": "Z2", "Z2K1": "Z0",'
					. ' "Z2K2": [ "wrapped", "array", "of strings" ],'
					. ' "Z2K3": { "Z1K1": "Z12",  "Z12K1": ['
					. ' { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "wrapped array label" } ] } }'
				),
				ZGenericList::class
			],
			'wrapped monolingual' => [
				json_decode(
					' { "Z1K1": "Z2", "Z2K1": "Z0",'
					. ' "Z2K2": { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "wrapped monolingual" },'
					. ' "Z2K3": { "Z1K1": "Z12",  "Z12K1": ['
					. ' { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "wrapped monolingual label" } ] } }'
				),
				ZMonoLingualString::class
			],
			'wrapped self-referenced language' => [
				json_decode(
					' { "Z1K1": "Z2", "Z2K1": "Z401",'
					. ' "Z2K2": { "Z1K1": "Z60", "Z60K1": "invent" },'
					. ' "Z2K3": { "Z1K1": "Z12",  "Z12K1": ['
					. ' { "Z1K1": "Z11", "Z11K1": "Z401", "Z11K2": "invent" } ] } }'
				),
				ZObject::class,
				[ 'Z60' ]
			]
 ];
	}

	/**
	 * @covers ::createPersistentContent
	 * @covers ::extractObjectType
	 * @covers ::extractInnerObject
	 * @covers ::create
	 * @covers ::createChild
	 * @covers ::createKeyValues
	 * @covers ::trackSelfReference
	 * @dataProvider provideCreatePersistentInvalidInput
	 */
	public function testCreatePersistent_invalid( $input, $zErrorType ) {
		$this->expectException( ZErrorException::class );
		$this->expectExceptionMessage( $zErrorType );
		ZObjectFactory::createPersistentContent( $input );
	}

	public function provideCreatePersistentInvalidInput() {
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
				ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED
			],
			'unknown inner type' => [
				json_decode(
					' { "Z1K1": "Z2", "Z2K1": "Z0",'
					. ' "Z2K2": { "Z11K1": "Z1002", "Z11K2": "wrapped monolingual" },'
					. ' "Z2K3": { "Z1K1": "Z12",  "Z12K1": ['
					. ' { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "wrapped monolingual label" } ] } }'
				),
				ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED
			],
			'invalid inner type' => [
				json_decode(
					' { "Z1K1": "Z2", "Z2K1": "Z0",'
					. ' "Z2K2": { "Z1K1": "Z11", "Z11K2": "wrapped monolingual" },'
					. ' "Z2K3": { "Z1K1": "Z12",  "Z12K1": ['
					. ' { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "wrapped monolingual label" } ] } }'
				),
				ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED
			],
			'invalid persistent keys' => [
				json_decode(
					' { "Z1K1": "Z2", "Z2K1": "Z0",'
					. ' "Z2K2": { "Z1K1": "Z11", "Z11K2": "wrapped monolingual" } }'
				),
				ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED
			],
		];
	}

	/**
	 * @covers ::createChild
	 * @covers ::createKeyValues
	 * @dataProvider provideCreateChildValidInput
	 */
	public function testCreateChild_valid( $input, $zObjectClass, $dependencies = null ) {
		if ( $dependencies !== null ) {
			$this->insertZids( $dependencies );
		}
		$zobject = ZObjectFactory::createChild( $input );
		$this->assertInstanceOf( ZObject::class, $zobject );
		$this->assertInstanceOf( $zObjectClass, $zobject );
	}

	public function provideCreateChildValidInput() {
		return [
			'zobject' => [ new ZObject( 'Z1' ), ZObject::class ],
			'zstring' => [ new ZString( 'holi' ), ZString::class ],
			'string' => [ 'string', ZString::class ],
			'reference' => [ 'Z6', ZReference::class ],
			'array' => [ [ 'array' ], ZGenericList::class ],
			'object' => [ json_decode( '{ "Z1K1": "Z6" }' ), ZString::class ],
			'custom type' => [ json_decode( '{ "Z1K1": "Z60" }' ), ZObject::class, [ 'Z60' ] ],
			'function call type: generic list builtin' => [
				json_decode( '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" } }' ),
				ZGenericList::class
			],
			'function call type: error type builtin' => [
				json_decode( '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z885", "Z885K1": "Z500" } }' ),
				ZGenericError::class
			],
			'function call type: user defined' => [
				json_decode( '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z883" } }' ),
				ZObject::class,
				[ 'Z8', 'Z17', 'Z883' ]
			],
		];
	}

	/**
	 * @covers ::createChild
	 * @covers ::createKeyValues
	 * @dataProvider provideCreateChildInvalidInput
	 */
	public function testCreateChild_invalid( $input, $zErrorType ) {
		$this->expectException( ZErrorException::class );
		$this->expectExceptionMessage( $zErrorType );
		ZObjectFactory::createChild( $input );
	}

	public function provideCreateChildInvalidInput() {
		return [
			'number' => [ 3, ZErrorTypeRegistry::Z_ERROR_INVALID_FORMAT ],
			'invalid item' => [
				[ 'good item', 4 ],
				ZErrorTypeRegistry::Z_ERROR_ARRAY_ELEMENT_NOT_WELLFORMED
			],
			'object wrong reference' => [
				json_decode( '{ "Z1K1": "bad" }' ),
				ZErrorTypeRegistry::Z_ERROR_REFERENCE_VALUE_INVALID
			],
			'object unknown reference' => [
				json_decode( '{ "Z1K1": "Z61" }' ),
				ZErrorTypeRegistry::Z_ERROR_UNKNOWN_REFERENCE
			]
		];
	}

	/**
	 * @covers ::createCustom
	 * @covers ::createChild
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::isValidZObject
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::isValidZObjectList
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::isValidZObjectRecord
	 * @dataProvider provideCreateCustomValidInput
	 */
	public function testCreateCustom_valid( $input, $dependencies = null ) {
		if ( $dependencies !== null ) {
			$this->insertZids( $dependencies );
		}
		$zobject = ZObjectFactory::createCustom( $input );
		$this->assertInstanceOf( ZObject::class, $zobject );
	}

	public function provideCreateCustomValidInput() {
		return [
			'custom type' => [ json_decode( '{ "Z1K1": "Z60", "Z60K1": "invent" }' ), [ 'Z60' ] ],
		];
	}

	/**
	 * @covers ::createCustom
	 * @covers ::createChild
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::isValidZObject
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::isValidZObjectList
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::isValidZObjectRecord
	 * @dataProvider provideCreateCustomInvalidInput
	 */
	public function testCreateCustom_invalid( $input, $zErrorType ) {
		$this->expectException( ZErrorException::class );
		$this->expectExceptionMessage( $zErrorType );
		ZObjectFactory::createCustom( $input );
	}

	public function provideCreateCustomInvalidInput() {
		return [
			'invalid' => [
				3,
				ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED
			],
			'invalid array' => [
				[ 'good', 4 ],
				ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED
			],
			'invalid nested array' => [
				[ [ 'good' ], [ 'bad', 4 ] ],
				ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED
			],
			'invalid key' => [
				json_decode( '{ "Z1K1": "Z401", "bad": "key" }' ),
				ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED
			],
			'missing type' => [
				json_decode( '{ "Z401K1": "valid key" }' ),
				ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED
			],
			'invalid value' => [
				json_decode( '{ "Z1K1": "Z401", "Z401K1": 3 }' ),
				ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED
			],
			'invalid nested value' => [
				json_decode( '{ "Z1K1": "Z401", "Z401K1": { "Z402": "valid key" } }' ),
				ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED
			],
			'invalid object array' => [
				[
					json_decode( '{ "Z1K1": "Z401", "Z401K1": "key" }' ),
					json_decode( '{ "Z1K1": "Z401", "bad": "key" }' )
				],
				ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED
			]
		];
	}
}
