<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZKey;
use MediaWiki\Extension\WikiLambda\ZMonoLingualString;
use MediaWiki\Extension\WikiLambda\ZMultiLingualString;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZKey
 */
class ZKeyTest extends \MediaWikiIntegrationTestCase {

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
	 * @dataProvider provideIsValidId
	 * @covers ::isValidId
	 */
	public function testIsValidId( $input, $expected ) {
		$this->assertSame( $expected, ZKey::isValidId( $input ) );
	}

	public function provideIsValidId() {
		return [
			'empty string' => [ '', false ],

			'Simple ZID' => [ 'Z1', true ],
			'Big ZID' => [ 'Z1234567890', true ],

			'Simple QID' => [ 'Q1', true ],
			'Big QID' => [ 'Q1234567890', true ],

			'Whitespace-beset ZID' => [ "Z1 ", false ],

			'Invalid ZID' => [ 'ZK1', false ],
			'Key' => [ 'Z1K1', false ],
			'Invalid 0-padded ZID' => [ 'Z01', false ],
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
