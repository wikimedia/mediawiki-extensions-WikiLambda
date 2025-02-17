<?php

/**
 * WikiLambda integration test suite for the ZString class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZString
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent
 */
class ZStringTest extends WikiLambdaIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsRepoMode();
	}

	public function testPersistentCreation() {
		$testObject = new ZObjectContent( '""' );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( '', $testObject->getZValue() );

		$testObject = new ZObjectContent( '"Test"' );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( 'Test', $testObject->getZValue() );

		$testObject = new ZObjectContent( '{ "Z1K1": "Z6", "Z6K1": "Z400" }' );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( 'Z400', $testObject->getZValue() );

		$this->hideDeprecated( '::create' );
		$testObject = new ZObjectContent(
			'{ '
				. '"Z1K1": "Z2", '
				. '"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" }, '
				. '"Z2K2": "Test", '
				. '"Z2K3": { "Z1K1":"Z12", "Z12K1":["Z11"] } '
			. '}'
		);
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( 'Test', $testObject->getZValue() );

		// Try the constructor with an array of strings and other things
		$testObject = new ZString( [ 'Tests', $testObject, 'hello' ] );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( 'Tests', $testObject->getZValue() );

		// Try the constructor with an array of a ZString
		$testObject = new ZString( [ $testObject ] );
		$this->assertFalse( $testObject->isValid() );
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( 'Tests', $testObject->getZValue()->getZValue() );

		// Try the constructor with a ZString
		$innerTestObject = new ZString( 'Test-tacular!' );
		$outerTestObject = new ZString( $innerTestObject );
		$this->assertTrue( $outerTestObject->isValid() );
		$this->assertSame( 'Z6', $outerTestObject->getZType() );
		$this->assertSame( 'Test-tacular!', $outerTestObject->getZValue() );
		$this->assertSame( $innerTestObject->getZValue(), $outerTestObject->getZValue() );
	}

	/** @dataProvider provideCreation_constructors */
	public function testCreation_constructors( $value, $expected ) {
		$testObject = new ZString( $value );
		$this->assertSame( $expected, $testObject->getZValue() );
		if ( is_string( $expected ) ) {
			$this->assertTrue( $testObject->isValid() );
		} else {
			$this->assertFalse( $testObject->isValid() );
		}
	}

	public static function provideCreation_constructors() {
		// Parameters are the constructor input, and the expected value
		// An object is valid if the expected value is a string
		yield 'null' => [ null, null ];
		yield 'empty string' => [ '', '' ];
		yield 'non-empty string' => [ 'Test', 'Test' ];
		yield 'ZString of non-empty string' => [ new ZString( 'Test' ), 'Test' ];
		yield 'Array of empty string' => [ [ '' ], '' ];
		yield 'stdClass' => [ new \stdClass( [ 1 ] ), null ];
		yield 'Unserialized ZString' => [
			unserialize( serialize( new ZString( 'Test' ) ) ),
			'Test'
		];
		yield 'Unserialized json' => [
			unserialize( serialize( json_decode( '{"Foo": "bar"}' ) ) ),
			null
		];
		yield 'ZReference' => [ new ZReference( 'Z1' ), null ];
	}

	public function testGetZType() {
		$testObject = new ZString( 'Test' );
		$this->assertSame( 'Z6', $testObject->getZType(), 'ZType of directly-created ZStrings' );

		$testObject = new ZObjectContent( '"Test"' );
		$this->assertSame( 'Z6', $testObject->getZType(), 'ZType of indirectly-created ZStrings' );
	}

	public function testGetZValue() {
		$testObject = new ZString();
		$this->assertSame( '', $testObject->getZValue(), 'ZValue of implicit null is the empty string' );

		$testObjectAsObject = $testObject->getSerialized( ZObject::FORM_NORMAL );
		$this->assertObjectHasProperty( ZTypeRegistry::Z_OBJECT_TYPE, $testObjectAsObject );
		$this->assertObjectHasProperty( ZTypeRegistry::Z_STRING_VALUE, $testObjectAsObject );
		$this->assertSame( ZTypeRegistry::Z_STRING, $testObjectAsObject->{ ZTypeRegistry::Z_OBJECT_TYPE } );
		$this->assertSame(
			'',
			$testObjectAsObject->{ ZTypeRegistry::Z_STRING_VALUE },
			'ZValue of implicit null is the empty string'
		);

		$testObject = new ZString( null );
		$this->assertSame( null, $testObject->getZValue(), 'ZValue of explicit null is null' );
		$this->assertSame( null, $testObject->getSerialized(), 'ZValue of explicit null is null' );

		$testObjectAsObject = $testObject->getSerialized( ZObject::FORM_NORMAL );
		$this->assertObjectHasProperty( ZTypeRegistry::Z_OBJECT_TYPE, $testObjectAsObject );
		$this->assertSame( ZTypeRegistry::Z_STRING, $testObjectAsObject->{ ZTypeRegistry::Z_OBJECT_TYPE } );
		$this->assertFalse(
			property_exists( $testObjectAsObject, ZTypeRegistry::Z_STRING_VALUE ),
			'ZValue of a null string is not expressed in normal form'
		);

		$testObject = new ZString( '' );
		$this->assertSame( '', $testObject->getZValue(), 'ZValue of an empty string is identical' );

		$testObjectAsObject = $testObject->getSerialized( ZObject::FORM_NORMAL );
		$this->assertObjectHasProperty( ZTypeRegistry::Z_OBJECT_TYPE, $testObjectAsObject );
		$this->assertObjectHasProperty( ZTypeRegistry::Z_STRING_VALUE, $testObjectAsObject );
		$this->assertSame( ZTypeRegistry::Z_STRING, $testObjectAsObject->{ ZTypeRegistry::Z_OBJECT_TYPE } );
		$this->assertSame(
			'',
			$testObjectAsObject->{ ZTypeRegistry::Z_STRING_VALUE },
			'ZValue of an empty string is identical'
		);

		$testObject = new ZString( 'Test' );
		$this->assertSame( 'Test', $testObject->getZValue(), 'ZValue of a non-empty string is identical' );

		$testObjectAsObject = $testObject->getSerialized( ZObject::FORM_NORMAL );
		$this->assertObjectHasProperty( ZTypeRegistry::Z_OBJECT_TYPE, $testObjectAsObject );
		$this->assertObjectHasProperty( ZTypeRegistry::Z_STRING_VALUE, $testObjectAsObject );
		$this->assertSame( ZTypeRegistry::Z_STRING, $testObjectAsObject->{ ZTypeRegistry::Z_OBJECT_TYPE } );
		$this->assertSame(
			'Test',
			$testObjectAsObject->{ ZTypeRegistry::Z_STRING_VALUE },
			'ZValue of a non-empty string is identical'
		);
	}

	public function testIsValid() {
		$testObject = new ZString();
		$this->assertTrue( $testObject->isValid(), 'Blank ZStrings are valid' );

		$testObject = new ZString( '' );
		$this->assertTrue( $testObject->isValid(), 'Empty ZStrings are valid' );

		$testObject = new ZString( 'Test!' );
		$this->assertTrue( $testObject->isValid(), 'Non-empty ZStrings are valid' );

		$testObject = new ZString( null );
		$this->assertFalse( $testObject->isValid(), 'Null ZStrings are not valid' );

		$testObject = new ZString( true );
		$this->assertFalse( $testObject->isValid(), 'ZStrings of non-strings are not valid' );
	}

}
