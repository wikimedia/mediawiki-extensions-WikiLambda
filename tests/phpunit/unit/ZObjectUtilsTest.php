<?php

namespace MediaWiki\Extension\WikiLambda\Tests;

use FormatJson;

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

	/**
	 * @dataProvider provideCanonicalize
	 * @covers ::canonicalize
	 * @covers ::canonicalizeZRecord
	 */
	public function testCanonicalize( $input, $expected ) {
		$this->assertSame(
			FormatJson::encode(
			  ZObjectUtils::canonicalize( FormatJson::parse( $input )->value )
			),
			FormatJson::encode( FormatJson::parse( $expected )->value )
		);
	}

	public function provideCanonicalize() {
		return [
			'empty list' => [ '[]', '[]' ],
			'list with empty string' => [ '[""]', '[""]' ],
			'list with two empty strings' => [ '["", ""]', '["", ""]' ],
			'list with ordered strings' => [ '["a", "b"]', '["a", "b"]' ],
			'list with unordered strings' => [ '["b", "a"]', '["b", "a"]' ],
			'list with lists' => [ '[[],[[]], []]', '[[],[[]],[]]' ],

			'empty string' => [ '""', '""' ],
			'string' => [ '"ab"', '"ab"' ],
			'string unordered' => [ '"ba"', '"ba"' ],
			'untrimmed string left' => [ '" a"', '" a"' ],
			'untrimmed string right' => [ '"a "', '"a "' ],
			'untrimmed string left two' => [ '"  a"', '"  a"' ],
			'untrimmed string both' => [ '" a "', '" a "' ],

			'empty record' => [ '{ "Z1K1": "Z1" }', '{ "Z1K1": "Z1" }' ],
			'simple record' => [
				'{ "Z1K1": "Z60", "Z60K1": "a" }',
				'{ "Z1K1": "Z60", "Z60K1": "a" }'
			],
			'simple record with left untrimmed key' => [
				'{ "Z1K1": "Z60", " Z60K1": "a" }',
				'{ "Z1K1": "Z60", "Z60K1": "a" }'
			],
			'simple record with right untrimmed key' => [
				'{ "Z1K1": "Z60", "Z60K1 ": "a" }',
				'{ "Z1K1": "Z60", "Z60K1": "a" }'
			],
			'simple record with both untrimmed key' => [
				'{ "Z1K1": "Z60", " Z60K1 ": "a" }',
				'{ "Z1K1": "Z60", "Z60K1": "a" }'
			],
			'simple record with left double untrimmed key' => [
				'{ "Z1K1": "Z60", "  Z60K1": "a" }',
				'{ "Z1K1": "Z60", "Z60K1": "a" }'
			],
			'simple record with both keys untrimmed' => [
				'{ " Z1K1 ": "Z60", "Z60K1 ": "a" }',
				'{ "Z1K1": "Z60", "Z60K1": "a" }'
			],
			'simple record with left local untrimmed key' => [
				'{ "Z1K1": "Z60", " K1": "a" }',
				'{ "Z1K1": "Z60", "K1": "a" }'
			],

			'record with embedded record with key untrimmed' => [
				'{ "Z1K1 ": "Z10", "K1 ": { "Z1K1": "Z60", "Z60K1 ": "a" } }',
				'{ "Z1K1": "Z10", "K1": { "Z1K1": "Z60", "Z60K1": "a" } }',
			],
			'list with record with key untrimmed' => [
				'[{ " Z1K1 ": "Z60", "Z60K1 ": "a" }]',
				'[{ "Z1K1": "Z60", "Z60K1": "a" }]'
			],
			'simple record with unsorted keys' => [
				'{ "Z60K1": "a", "Z1K1 ": "Z60" }',
				'{ "Z1K1": "Z60", "Z60K1": "a" }'
			],
			'simple record with unsorted local keys' => [
				'{ "K1 ": "a", "Z1K1 ": "Z60" }',
				'{ "Z1K1": "Z60", "K1": "a" }'
			],
		];
	}

	/**
	 * @dataProvider provideOrderZKeyIDs
	 * @covers ::orderZKeyIDs
	 */
	public function testOrderZKeyIDs( $left, $right, $expected ) {
		$this->assertSame(
			ZObjectUtils::orderZKeyIDs( $left, $right ), $expected
		);
		$this->assertSame(
			ZObjectUtils::orderZKeyIDs( $right, $left ), -1 * $expected
		);
	}

	public function provideOrderZKeyIDs() {
		return [
			'same local' => [ 'K1', 'K1', 0 ],
			'same global' => [ 'Z1K1', 'Z1K1', 0 ],
			'global and local' => [ 'Z1K1', 'K1', -1 ],
			'same zid' => [ 'Z1K1', 'Z1K2', -1 ],
			'same zid, high key' => [ 'Z1K10', 'Z1K2', 1 ],
			'high zid' => [ 'Z2K1', 'Z10K1', -1 ],
			'different zid' => [ 'Z1K2', 'Z2K1', -1 ],
			'same zid, high key' => [ 'Z1K10', 'Z1K2', 1 ],
			'high zid, high key' => [ 'Z10K20', 'Z1K2', 1 ],
			'different locals' => [ 'K1', 'K2', -1 ],
			'high locals' => [ 'K10', 'K2', 1 ],
		];
	}
}
