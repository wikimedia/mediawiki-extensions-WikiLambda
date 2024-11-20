<?php

/**
 * WikiLambda integration test suite for the ZObjectContent class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Status\Status;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent
 * @group Database
 */
class ZObjectContentTest extends WikiLambdaIntegrationTestCase {

	public function testCreation_invalidString() {
		$this->hideDeprecated( '::create' );
		$this->expectException( ZErrorException::class );
		$this->expectExceptionMessage( ZErrorTypeRegistry::Z_ERROR_INVALID_FORMAT );
		$testObject = new ZObjectContent( true );
	}

	public function testCreation_invalidJson() {
		$this->hideDeprecated( '::create' );
		$this->expectException( ZErrorException::class );
		$this->expectExceptionMessage( ZErrorTypeRegistry::Z_ERROR_INVALID_JSON );
		$testObject = new ZObjectContent( "{'invalid': JSON]" );
	}

	public function testCreation_basicObject() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZObjectContent(
			'"basic object"'
		);
		$this->assertTrue( $testObject->isValid() );
		$this->assertInstanceOf( ZPersistentObject::class, $testObject->getZObject() );
		$this->assertInstanceOf( ZString::class, $testObject->getInnerZObject() );
		$this->assertSame( 'basic object', $testObject->getZValue() );
	}

	public function testCreation_basicPersistentObject() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZObjectContent(
			'{ "Z1K1": "Z2", "Z2K1": "Z401",'
			. ' "Z2K2": "persistent object",'
			. ' "Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }'
		);
		$this->assertTrue( $testObject->isValid() );
		$this->assertInstanceOf( ZPersistentObject::class, $testObject->getZObject() );
		$this->assertInstanceOf( ZString::class, $testObject->getInnerZObject() );
		$this->assertSame( 'persistent object', $testObject->getZValue() );
	}

	public function testCreation_invalidThrows_invalidkey() {
		$testObject = new ZObjectContent(
			'{ "Z1K1": "This is not a valid key!" }'
		);
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( ZErrorException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	public function testCreation_invalidThrows_unrecognisedkey() {
		$testObject = new ZObjectContent(
			'{ "Z1K1": "Z1234" }'
		);
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( ZErrorException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	public function testCreation_invalidThrows_nestedrecordhasinvalidkey() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZObjectContent(
			'{ "Z1K1": "Z2",'
			. ' "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z401" },'
			. ' "Z2K2": { "Z1K1": "Foo" },'
			. ' "Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }'
		);
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( ZErrorException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	public function testCreation_invalidThrows_nestedrecordhasnovalue() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZObjectContent(
			'{ "Z1K1": "Z2",'
			. ' "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z401" },'
			. ' "Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }'
		);
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( ZErrorException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	public function testCreation_invalidThrows_nestedrecordhasnolabel() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZObjectContent(
			'{ "Z1K1": "Z2",'
			. ' "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z401" },'
			. ' "Z2K2": { "Z1K1": "Z1", "Z2K2": "Foo" } }'
		);
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( ZErrorException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	public function testGetStatus_null() {
		$zObject = '{ "Z1K1": "Z2",'
			. '"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z401" },'
			. '"Z2K2": { "Z1K1": "Z6", "Z6K1": "string value" },'
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';
		$testObject = new ZObjectContent( $zObject );
		$status = $testObject->getStatus();
		$this->assertNull( $testObject->getStatus() );
	}

	public function testGetStatus() {
		$zObject = '{ "Z1K1": "Z2",'
			. '"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z401" },'
			. '"Z2K2": { "Z1K1": "Z6", "Z6K1": "string value" },'
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';
		$testObject = new ZObjectContent( $zObject );
		$testObject->isValid();
		$status = $testObject->getStatus();
		$this->assertInstanceOf( Status::class, $status );
	}

	public function testContentGetters() {
		$zobjectText = '{ "Z1K1": "Z2",'
			. '"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z401" },'
			. '"Z2K2": "string value",'
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';
		$testObject = new ZObjectContent( $zobjectText );

		$this->assertSame( $testObject->getText(), $zobjectText );
		$this->assertTrue( $testObject->getObject() instanceof \stdClass );
		$this->assertSame( 'Z2', $testObject->getObject()->{ ZTypeRegistry::Z_OBJECT_TYPE } );
		$this->assertNull( $testObject->getZObject() );

		$testObject->isValid();
		$this->assertInstanceOf( ZPersistentObject::class, $testObject->getZObject() );
		$this->assertInstanceOf( ZObject::class, $testObject->getInnerZObject() );
	}

	public function testPersistentGetterWrappers() {
		$this->registerLangs( [ 'es' ] );
		$zobjectText = '{ "Z1K1": "Z2",'
			. '"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z401" },'
			. '"Z2K2": "string value",'
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11", '
			. '{ "Z1K1": "Z11", "Z11K1":"Z1003", "Z11K2": "etiqueta en castellano" },'
			. '{ "Z1K1": "Z11", "Z11K1":"Z1002", "Z11K2": "english label" }'
			. '] } }';
		$testObject = new ZObjectContent( $zobjectText );
		$testObject->isValid();

		$english = $this->makeLanguage( 'en' );

		$this->assertInstanceOf( ZObject::class, $testObject->getInnerZObject() );
		$this->assertInstanceOf( ZString::class, $testObject->getInnerZObject() );
		$this->assertSame( 'Z401', $testObject->getZid() );
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( 'string value', $testObject->getZValue() );
		$this->assertInstanceOf( ZMultiLingualString::class, $testObject->getLabels() );
		$this->assertSame( 'english label', $testObject->getLabel( $english ) );
	}

	public function testPersistentGetterWrappers_invalid() {
		$testObject = new ZObjectContent( '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z401" } }' );
		$exceptions = [];
		$english = $this->makeLanguage( 'en' );

		try {
			$testObject->getInnerZObject();
		} catch ( ZErrorException $e ) {
			$exceptions[] = $e->getMessage();
		}

		try {
			$testObject->getZid();
		} catch ( ZErrorException $e ) {
			$exceptions[] = $e->getMessage();
		}

		try {
			$testObject->getZType();
		} catch ( ZErrorException $e ) {
			$exceptions[] = $e->getMessage();
		}

		try {
			$testObject->getZValue();
		} catch ( ZErrorException $e ) {
			$exceptions[] = $e->getMessage();
		}

		try {
			$testObject->getLabels();
		} catch ( ZErrorException $e ) {
			$exceptions[] = $e->getMessage();
		}

		try {
			$testObject->getLabel( $english );
		} catch ( ZErrorException $e ) {
			$exceptions[] = $e->getMessage();
		}

		$this->assertCount(
			6,
			$exceptions,
			'All ZPersistentObject wrapper methods raise exception when the ZObject created was invalid.'
		);
	}

	public function testGetTypeString() {
		$this->registerLangs( ZTestType::TEST_LANGS );
		$registry = ZTypeRegistry::singleton();

		$title = Title::newFromText( ZTestType::TEST_ZID, NS_MAIN );
		$this->editPage( $title, ZTestType::TEST_ENCODING, "Test creation object", NS_MAIN );

		$this->assertTrue(
			$registry->isZObjectKeyKnown( ZTestType::TEST_ZID ),
			"'TestingType' found in DB"
		);

		$this->registerLangs( [ 'es' ] );
		$zobjectText = '{ "Z1K1": "Z2",'
			. '"Z2K1": "Z0",'
			. '"Z2K2": { "Z1K1": "' . ZTestType::TEST_ZID
			. '", "Z111K1": "string value", "Z111K2": "Other string" },'
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11", '
			. '{ "Z1K1": "Z11", "Z11K1":"Z1003", "Z11K2": "etiqueta en castellano" },'
			. '{ "Z1K1": "Z11", "Z11K1":"Z1002", "Z11K2": "english label" }'
			. '] } }';
		$testObject = new ZObjectContent( $zobjectText );

		$this->assertTrue( $testObject->isValid() );
		$english = $this->makeLanguage( 'en' );
		$this->assertSame( 'Demonstration type (Z111)',
			$testObject->getTypeString( $english ) );
		$this->assertSame(
			[
				'title' => 'Demonstration type',
				'type' => 'Demonstration type (Z111)',
				'languageCode' => 'en'
			],
			$testObject->getTypeStringAndLanguage( $english ) );
	}
}
