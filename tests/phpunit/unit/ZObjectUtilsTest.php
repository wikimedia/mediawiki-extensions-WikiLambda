<?php

namespace MediaWiki\Extension\WikiLambda\Tests;

use MediaWiki\Extension\WikiLambda\ZObjectUtils;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjectUtils
 */
class ZObjectUtilsTest extends \MediaWikiUnitTestCase {

	/**
	 * @dataProvider provideIsValidSerialisedZObject
	 * @covers ::isValidSerialisedZObject
	 * @covers ::isValidZObject
	 * @covers ::isValidZObjectList
	 * @covers ::isValidZObjectRecord
	 */
	public function testIsValidSerialisedZObject( $input, $expected ) {
		$this->assertSame( ZObjectUtils::isValidSerialisedZObject( $input ), $expected );
	}

	public function provideIsValidSerialisedZObject() {
		return [
			'empty string' => [ '', true ],
			'short string' => [ 'Test', true ],
			'messy string' => [ "This is a [basic] \tcomplicated\ntest {string}!", true ],

			'empty list' => [ '[]', true ],
			'string singleton list' => [ '["Test"]', true ],
			'string multiple list' => [ '["Test1", "Test2" , "Test3"]', true ],

			'empty record' => [ '{}', false ],
			'singleton string record' => [ '{ "Z1K1": "Test" }', true ],
			'singleton string record, no Z1K1 key' => [ '{ "Z2K1": "Test" }', false ],
			'singleton string record, invalid key' => [ '{ "Z1K ": "Test" }', false ],
			'string record' => [ '{ "Z1K1": "Test", "Z2K1": "Test" }', true ],
			'string record with a short key' => [ '{ "Z1K1": "Test", "K1": "Test" }', true ],

			'record with list and sub-record' => [ '{ "Z1K1": ["Test", "Second test"], "Z2K1": { "Z1K1": "Test", "K2": "Test"} }', true ],
			'record with list and invalid sub-record' => [ '{ "Z1K1": ["Test", "Second test"], "Z2K1": { "K2": "Test"} }', false ],
		];
	}

	/**
	 * @dataProvider provideIsValidZObjectKey
	 * @covers ::isValidZObjectKey
	 */
	public function testIsValidZObjectKey( $input, $expected ) {
		$this->assertSame( ZObjectUtils::isValidZObjectKey( $input ), $expected );
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
}
