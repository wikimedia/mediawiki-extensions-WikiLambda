<?php

/**
 * WikiLambda integration test suite for the ZKey class
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZObjects\ZKey;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZKey
 */
class ZKeyTest extends \MediaWikiIntegrationTestCase {

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 * @covers ::getKeyType
	 * @covers ::getKeyId
	 * @covers ::getKeyLabel
	 * @covers ::getZValue
	 * @covers ::isValid
	 */
	public function testCreation() {
		$testString = new ZMonoLingualString( 'en', 'Demonstration item' );
		$testLabelSet = new ZMultiLingualString( [ $testString ] );
		$testObject = new ZKey( 'Z6', 'Z6K1', $testLabelSet );

		$this->assertSame( 'Z3', $testObject->getZType() );
		$this->assertSame( 'Z6', $testObject->getKeyType() );
		$this->assertSame( 'Z6K1', $testObject->getKeyId() );
		$this->assertSame( $testString->getString(), $testObject->getKeyLabel()->getStringForLanguageCode( 'en' ) );
		$this->assertSame( [ 'Z3K1' => 'Z6', 'Z3K2' => 'Z6K1', 'Z3K3' => $testLabelSet ], $testObject->getZValue() );
		$this->assertTrue( $testObject->isValid() );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::__construct
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::isValid
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::getZType
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::getInnerZObject
	 * @covers ::isValid
	 * @covers ::getKeyType
	 * @covers ::getKeyId
	 * @covers ::getKeyLabel
	 */
	public function testPersistentCreation() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZPersistentObject( <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": "Z0",
	"Z2K2": {
		"Z1K1": "Z3",
		"Z3K1": "Z6",
		"Z3K2": "Z6K1",
		"Z3K3": {
			"Z1K1": "Z12",
			"Z12K1": [
				{
					"Z1K1": "Z11",
					"Z11K1": "en",
					"Z11K2": "Key label"
				}
			]
		}
	},
	"Z2K3": {
		"Z1K1": "Z12",
		"Z12K1": [
			{
				"Z1K1": "Z11",
				"Z11K1": "en",
				"Z11K2": "Key object label"
			}
		]
	}
}
EOT
		);
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z3', $testObject->getZType() );

		$innerKey = $testObject->getInnerZObject();

		$this->assertSame( 'Z6', $innerKey->getKeyType() );
		$this->assertSame( 'Z6K1', $innerKey->getKeyId() );
		$this->assertSame( 'Key label', $innerKey->getKeyLabel()->getStringForLanguageCode( 'en' ) );
	}

	/**
	 * @dataProvider provideIsValidZObjectKey
	 * @covers ::isValidZObjectKey
	 */
	public function testIsValidZObjectKey( $input, $expected ) {
		$this->assertSame( $expected, ZKey::isValidZObjectKey( $input ) );
	}

	public function provideIsValidZObjectKey() {
		return [
			'empty string' => [ '', false ],

			'Simple global key' => [ 'Z1K1', true ],
			'Big global key' => [ 'Z1234567890K1234567890', true ],

			'Simple local key' => [ 'K1', true ],
			'Big local key' => [ 'K1234567890', true ],

			'Whitespace-beset key' => [ " \tZ1K1  \n ", true ],

			'Invalid global key' => [ 'ZK1', false ],
			'Invalid global-only key' => [ 'Z123', false ],
			'Invalid 0-padded global key' => [ 'Z01K1', false ],

			'Invalid local key' => [ 'ZK1', false ],
		];
	}

	/**
	 * @dataProvider provideIsValidZObjectReference
	 * @dataProvider provideIsValidZObjectReferenceWithWhitespace
	 * @covers ::isValidZObjectReference
	 */
	public function testIsValidZObjectReference( $input, $expected ) {
		$this->assertSame( $expected, ZKey::isValidZObjectReference( $input ) );
	}

	public function provideIsValidZObjectReference() {
		return [
			'empty string' => [ '', false ],

			'Simple ZID' => [ 'Z1', true ],
			'Big ZID' => [ 'Z1234567890', true ],

			'Invalid ZID' => [ 'ZK1', false ],
			'Key' => [ 'Z1K1', false ],
			'Invalid 0-padded ZID' => [ 'Z01', false ],
		];
	}

	public function provideIsValidZObjectReferenceWithWhitespace() {
		return [
			'Whitespace-suffixed ZID' => [ "Z1 ", true ],
			'Whitespace-prefixed ZID' => [ " Z1", true ],
			'Whitespace-beset ZID' => [ "\n\t\rZ1\t \t", true ],
		];
	}

	/**
	 * @dataProvider provideIsValidZObjectReference
	 * @dataProvider provideIsValidNonZObjectId
	 * @covers ::isValidId
	 */
	public function testIsValidId( $input, $expected ) {
		$this->assertSame( $expected, ZKey::isValidId( $input ) );
	}

	public function provideIsValidNonZObjectId() {
		return [
			'Simple QID' => [ 'Q1', true ],
			'Big QID' => [ 'Q1234567890', true ],
			'Whitespace-beset ZID' => [ " Z1 ", false ],
		];
	}

	/**
	 * @dataProvider provideIsValidZObjectGlobalKey
	 * @covers ::isValidZObjectGlobalKey
	 */
	public function testIsValidZObjectGlobalKey( $input, $expected ) {
		$this->assertSame( $expected, ZKey::isValidZObjectGlobalKey( $input ) );
	}

	public function provideIsValidZObjectGlobalKey() {
		return [
			'empty string' => [ '', false ],

			'Simple ZID' => [ 'Z1', false ],
			'Big ZID' => [ 'Z1234567890', false ],

			'Simple local key' => [ 'K1', false ],
			'Big local key' => [ 'K1234567890', false ],

			'Invalid ZID global key - blank' => [ 'ZK1', false ],
			'Invalid ZID global key - zero-padded' => [ 'Z01K1', false ],

			'Simple global key' => [ 'Z1K1', true ],
			'Big global key' => [ 'Z1234567890K1234567890', true ],

			'Whitespace-trailing global key' => [ "Z1K1 ", true ],
			'Whitespace-leading global key' => [ " Z1K1", true ],
		];
	}

	/**
	 * @dataProvider provideGetZObjectReferenceFromKey
	 * @covers ::getZObjectReferenceFromKey
	 */
	public function testGetZObjectReferenceFromKey( $input, $expected ) {
		$this->assertSame( $expected, ZKey::getZObjectReferenceFromKey( $input ) );
	}

	public function provideGetZObjectReferenceFromKey() {
		return [
			'local key' => [ 'K1', '' ],

			'Simple global key' => [ 'Z1K1', 'Z1' ],
			'Big global key' => [ 'Z1234567890K1234567890', 'Z1234567890' ],

			'Whitespace-trailing global key' => [ "Z1K1 ", 'Z1' ],
			'Whitespace-leading global key' => [ " Z1K1", 'Z1' ],
		];
	}

	/**
	 * @dataProvider provideIsValid
	 * @covers ::isValid
	 */
	public function testIsValid( $inputType, $inputIdentity, $inputLabel, $expected ) {
		$testObject = new ZKey( $inputType, $inputIdentity, $inputLabel );
		$this->assertSame( $expected, $testObject->isValid() );
	}

	public function provideIsValid() {
		$testString1 = new ZMonoLingualString( 'en', 'Demonstration item' );
		$testString2 = new ZMonoLingualString( 'fr', 'Demonstration item' );

		$emptyLabelSet = new ZMultiLingualString( [] );

		$testLabelSet = new ZMultiLingualString( [
			new ZMonoLingualString( 'en', 'Demonstration item' ),
			new ZMonoLingualString( 'it', 'oggetto per dimostrazione' ),
			new ZMonoLingualString( 'de', 'Gegenstand zur Demonstration' ),
			new ZMonoLingualString( 'fr', 'article pour démonstration' )
		] );

		return [
			'wholly null' => [ null, null, null, false ],

			'null type' => [ null, 'Z0K1', [], false ],
			'unknown type' => [ 'Z0', 'Z0K1', [], false ],
			'invalid type' => [ 'Test value?', 'Z0K1', [], false ],
			'known type' => [ 'Z6', 'Z4K1', [], true ],

			'null identity' => [ 'Z6', null, [], false ],
			'invalid identity' => [ 'Z6', 'Test value!', [], false ],
			'local identity' => [ 'Z6', 'K1', [], false ],
			'unknown identity' => [ 'Z6', 'Z0K1', [], false ],

			'null label' => [ 'Z6', 'Z6K1', null, false ],
			'empty label' => [ 'Z6', 'Z6K1', [], true ],
			'invalid label' => [ 'Z6', 'Z6K1', [ 'Test value:' ], false ],
			'singleton label' => [ 'Z6', 'Z6K1', [ $testString1 ], true ],
			'multiple label' => [ 'Z6', 'Z6K1', [ $testString1, $testString2 ], true ],

			'singleton labelset' => [ 'Z6', 'Z6K1', $emptyLabelSet, true ],
			'multiple labelset' => [ 'Z6', 'Z6K1', $testLabelSet, true ],
		];
	}

}
