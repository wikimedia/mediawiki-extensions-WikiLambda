<?php

/**
 * WikiLambda unit test suite for the ZObjectUtils file
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

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
			'invalid JSON' => [ '{ bad JSON! Tut, tut.', false ],

			'empty string' => [ '', true ],
			'short string' => [ 'Test', true ],
			'messy string' => [ "This is a [basic] \tcomplicated\ntest {string}!", true ],

			'empty list' => [ '[]', true ],
			'string singleton list' => [ '["Test"]', true ],
			'string multiple list' => [ '["Test1", "Test2" , "Test3"]', true ],
			'record singleton list' => [ '[{ "Z1K1": "Test!", "Z2K1": "Test" }]', true ],
			'record multiple list' => [
				'[{ "Z1K1": "Test!", "Z2K1": "Test" },{ "Z1K1": "Test2!", "Z2K1": "Test2?" }]',
				true
			],
			'invalid record singleton list' => [ '[{ "Z2K1": "Test" }]', false ],

			'empty record' => [ '{}', false ],
			'singleton string record' => [ '{ "Z1K1": "Test" }', true ],
			'singleton string record, no Z1K1 key' => [ '{ "Z2K1": "Test" }', false ],
			'singleton string record, invalid key' => [ '{ "Z1K ": "Test" }', false ],
			'string record' => [ '{ "Z1K1": "Test", "Z2K1": "Test" }', true ],
			'string record with a short key' => [ '{ "Z1K1": "Test", "K1": "Test" }', true ],
			'string record with invalid key' => [ '{ "Z1K1": "Test", "ZK1": "Test" }', false ],

			'record with list and sub-record' => [
				'{ "Z1K1": ["Test", "Second test"], "Z2K1": { "Z1K1": "Test", "K2": "Test"} }',
				true
			],
			'record with list and invalid sub-record' => [
				'{ "Z1K1": ["Test", "Second test"], "Z2K1": { "K2": "Test"} }',
				false
			],

			'invalid zobject (int not string/list/record)' => [ '{ "Z1K1": "Test", "Z2K1": 2 }', false ],
			'invalid zobject (float not string/list/record)' => [ '{ "Z1K1": "Test", "Z2K1": 2.0 }', false ],
		];
	}

	/**
	 * @dataProvider provideCanonicalize
	 * @covers ::canonicalize
	 * @covers ::canonicalizeZRecord
	 */
	public function testCanonicalize( $input, $expected ) {
		$this->assertSame(
			FormatJson::encode( FormatJson::parse( $expected )->value ),
			FormatJson::encode(
				ZObjectUtils::canonicalize( FormatJson::parse( $input )->value )
			)
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
				'{ "Z1K1": "Z60", "Z60K1": "a" }'
			],

			'record with embedded record with key untrimmed' => [
				'{ "Z1K1 ": "Z60", "Z60K1 ": { "Z1K1": "Z60", "Z60K1 ": "a" } }',
				'{ "Z1K1": "Z60", "Z60K1": { "Z1K1": "Z60", "Z60K1": "a" } }',
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
				'{ "Z1K1": "Z60", "Z60K1": "a" }'
			],
			'escaped string' => [
				'{ "Z1K1": "Z6", "Z6K1": "Z6" }',
				'{ "Z1K1": "Z6", "Z6K1": "Z6" }'
			],
			'unneccessary escaped string' => [
				'{ "Z1K1": "Z6", "Z6K1": "Z" }',
				'"Z"'
			],
			'escaped string QID' => [
				'{ "Z1K1": "Z6", "Z6K1": "Q42" }',
				'{ "Z1K1": "Z6", "Z6K1": "Q42" }'
			],
			'unneccessary escaped string key' => [
				'{ "Z1K1": "Z6", "Z6K1": "Z1K1" }',
				'"Z1K1"'
			],
			'unneccessary escaped string with whitespace' => [
				'{ "Z1K1": "Z6", "Z6K1": " Z1" }',
				'" Z1"'
			],
			'unneccessary double escaped string' => [
				'{ "Z1K1": "Z6", "Z6K1": { "Z1K1": "Z6", "Z6K1": "Z" } }',
				'"Z"'
			],
			'string with wrong key' => [
				'{ "Z1K1": "Z6", "Z6K2": "Z" }',
				'{ "Z1K1": "Z6", "Z6K2": "Z" }'
			],
			'string with no type' => [
				'{ "Z6K1": "Z" }',
				'{ "Z6K1": "Z" }'
			],
			'array with escaped string' => [
				'[{ "Z1K1": "Z6", "Z6K1": "Z6" }, { "Z1K1": "Z6", "Z6K1": "Z" }]',
				'[{ "Z1K1": "Z6", "Z6K1": "Z6" }, "Z" ]'
			],
			'object with escaped string' => [
				'{ "Z1K1": "Z2", "Z2K2": { "Z1K1": "Z6", "Z6K1": "Z6" } }',
				'{ "Z1K1": "Z2", "Z2K2": { "Z1K1": "Z6", "Z6K1": "Z6" } }'
			],
			'object with unneccessarily escaped string' => [
				'{ "Z1K1": "Z2", "Z2K2": { "Z1K1": "Z6", "Z6K1": "Z" } }',
				'{ "Z1K1": "Z2", "Z2K2": "Z" }'
			],
			'explicit reference' => [
				'{ "Z1K1": "Z2", "Z2K2": { "Z1K1": "Z9", "Z9K1": "Z1" } }',
				'{ "Z1K1": "Z2", "Z2K2": "Z1" }'
			],
			'implicit reference' => [
				'{ "Z1K1": "Z2", "Z2K2": "Z1" }',
				'{ "Z1K1": "Z2", "Z2K2": "Z1" }'
			],
			'explicit QID reference' => [
				'{ "Z1K1": "Z2", "Z2K2": { "Z1K1": "Z9", "Z9K1": "Q96807071" } }',
				'{ "Z1K1": "Z2", "Z2K2": "Q96807071" }'
			],
			'invalid reference' => [
				'{ "Z1K1": "Z2", "Z2K2": { "Z1K1": "Z9", "Z9K1": "ZObject" } }',
				'{ "Z1K1": "Z2", "Z2K2": { "Z1K1": "Z9", "Z9K1": "ZObject" } }'
			],
			'empty list as array' => [
				'[]', '[]'
			],
			'empty list as ZObject' => [
				'{ "Z1K1": "Z10" }', '[]'
			],
			'single string in list as array' => [
				'["a"]', '["a"]'
			],
			'single string in list as ZObject' => [
				'{ "Z1K1": "Z10", "Z10K1": "a" }', '["a"]'
			],
			'single string in list as ZObject, tail empty array' => [
				'{ "Z1K1": "Z10", "Z10K1": "a", "Z10K2": [] }', '["a"]'
			],
			'single string in list as ZObject, tail ZObject' => [
				'{ "Z1K1": "Z10", "Z10K1": "a", "Z10K2": { "Z1K1": "Z10" } }',
				'["a"]'
			],
			'two strings in list as array' => [
				'["a", "b"]', '["a", "b"]'
			],
			'two strings in list as ZObject, tail as array' => [
				'{ "Z1K1": "Z10", "Z10K1": "a", "Z10K2": ["b"] }',
				'["a", "b"]'
			],
			'two strings in list as ZObject, all tails ZObject' => [
				'{ "Z1K1": "Z10", "Z10K1": "a", "Z10K2":' .
				'{ "Z1K1": "Z10", "Z10K1": "b", "Z10K2": { "Z1K1": "Z10" } } }',
				'["a", "b"]'
			],
			'two strings in list as ZObject, tails mixed' => [
				'{ "Z1K1": "Z10", "Z10K1": "a", "Z10K2":' .
				'{ "Z1K1": "Z10", "Z10K1": "b", "Z10K2": [] } }',
				'["a", "b"]'
			],
			'two strings in list as ZObject, no tail in tail' => [
				'{ "Z1K1": "Z10", "Z10K1": "a", "Z10K2":' .
				'{ "Z1K1": "Z10", "Z10K1": "b" } }',
				'["a", "b"]'
			],
			'list in list' => [
				'[[]]',
				'[[]]'
			],
			'lists in list' => [
				'[[], []]',
				'[[], []]'
			],
			'empty ZObject in list' => [
				'[{ "Z1K1": "Z10" }]',
				'[[]]'
			],
			'empty ZObjects in list' => [
				'[{ "Z1K1": "Z10" }, { "Z1K1": "Z10" }]',
				'[[], []]'
			],
			'empty ZObjects in list, all ZObjects' => [
				'{ "Z1K1": "Z10", "Z10K1": { "Z1K1": "Z10" }, "Z10K2":' .
				'{ "Z1K1": "Z10", "Z10K1": { "Z1K1": "Z10" }, "Z10K2":' .
				'{ "Z1K1": "Z10" } } }',
				'[[], []]'
			],
			'ZObject in list' => [
				'{ "Z1K1": "Z10", "Z10K1": { "Z1K1": "Z6", "Z6K1": "Z1" },' .
				'  "Z10K2": { "Z1K1": "Z10" } }',
				'[{ "Z1K1": "Z6", "Z6K1": "Z1" }]'
			],
			'ZObject with global keys' => [
				'{ "Z1K1": "Z60", "Z60K1": "test" }',
				'{ "Z1K1": "Z60", "Z60K1": "test" }',
			],
			'ZObject with local keys' => [
				'{ "Z1K1": "Z60", "K1": "test" }',
				'{ "Z1K1": "Z60", "Z60K1": "test" }',
			],
		];
	}

	/**
	 * @dataProvider provideOrderZKeyIDs
	 * @covers ::orderZKeyIDs
	 */
	public function testOrderZKeyIDs( $left, $right, $expected ) {
		$this->assertSame(
			$expected,
			ZObjectUtils::orderZKeyIDs( $left, $right )
		);
		$this->assertSame(
			-1 * $expected,
			ZObjectUtils::orderZKeyIDs( $right, $left )
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

	/**
	 * @dataProvider provideComparableString
	 * @covers ::comparableString
	 */
	public function testComparableString( $input, $output ) {
		$this->assertSame( $output, ZObjectUtils::comparableString( $input ) );
	}

	public function provideComparableString() {
		return [
			'identity blank match' => [ '', '' ],
			'identity match' => [ 'hello', 'hello' ],

			'Latin lowercasing' => [ 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz' ],
			'Greek lowercasing' => [ 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ', 'αβγδεζηθικλμνξοπρστυφχψω' ],
			'Cyrillic lowercasing' => [ 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ', 'абвгдеежзииклмнопрстуфхцчшщъыьэюя' ],

			'Sample Latin lowercasing' => [ 'I really love my iDevice!', 'i really love my idevice!' ],
			'Accented Latin' => [
				'"¡Let\'s keep coöperating in this rôle!", he exclaimed in his naïveté"',
				'"¡let\'s keep cooperating in this role!", he exclaimed in his naivete"'
			],

			'identity Hebrew match' => [ 'פריט להפגנה', 'פריט להפגנה' ],
			'identity Hangul match' => [ '데모항목', '데모항목' ],
		];
	}

	/**
	 * @dataProvider provideFilterZMultilingualStringsToLanguage
	 * @covers ::filterZMultilingualStringsToLanguage
	 */
	public function testFilterZMultilingualStringsToLanguage( $input, $languages, $expected ) {
		$this->assertSame(
			FormatJson::encode( FormatJson::decode( $expected ) ),
			FormatJson::encode( ZObjectUtils::filterZMultilingualStringsToLanguage(
				FormatJson::decode( $input ),
				FormatJson::decode( $languages )
			) )
		);
	}

	public function provideFilterZMultilingualStringsToLanguage() {
		return [
			'empty zobject' => [
				'{}',
				'[]',
				'{}'
			],
			'zobject with string values' => [
				'{ "Z1K1": "Z2", "Z2K2": "string value" }',
				'[]',
				'{ "Z1K1": "Z2", "Z2K2": "string value" }'
			],
			'zobject with array value' => [
				'{ "Z1K1": "Z2", "Z2K2": [{ "Z1K1": "Z111"}, {"Z1K1": "Z222"}] }',
				'[]',
				'{ "Z1K1": "Z2", "Z2K2": [{ "Z1K1": "Z111"}, {"Z1K1": "Z222"}] }'
			],
			'zobject with nested zobject' => [
				'{ "Z1K1": "Z2", "Z2K2": { "Z1K1": "Z3", "Z3K3": { "Z1K1": "Z6" } } }',
				'[]',
				'{ "Z1K1": "Z2", "Z2K2": { "Z1K1": "Z3", "Z3K3": { "Z1K1": "Z6" } } }'
			],

			'zobject with multilingual string and no languages' => [
				'{ "Z1K1": "Z12", "Z12K1": ['
				. '{ "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "type" },'
				. '{ "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "tipo" }'
				. '] }',
				'[]',
				'{ "Z1K1": "Z12", "Z12K1": [{ "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "type" }] }'
			],

			'zobject with multilingual string and language chain' => [
				'{ "Z1K1": "Z12", "Z12K1": ['
				. '{ "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "type" },'
				. '{ "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "tipo" }'
				. '] }',
				'["es", "en"]',
				'{ "Z1K1": "Z12", "Z12K1": [{ "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "tipo" }] }'
			],

			'zobject with nested multilingual strings' => [
				'{ "Z1K1": "Z2", "Z2K3": { "Z1K1": "Z12", "Z12K1": ['
				. '{ "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "label" },'
				. '{ "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "etiqueta" }'
				. '] }, "Z2K2": { "Z1K1": "Z2", "Z2K3": { "Z1K1": "Z12", "Z12K1": ['
				. '{ "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "nested label" },'
				. '{ "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "etiqueta anidada" }'
				. '] } } }',
				'["es", "en"]',
				'{ "Z1K1": "Z2", "Z2K3": {"Z1K1": "Z12", "Z12K1": ['
				. '{ "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "etiqueta" }'
				. '] }, "Z2K2": { "Z1K1": "Z2", "Z2K3": {"Z1K1": "Z12", "Z12K1": ['
				. '{ "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "etiqueta anidada" }'
				. '] } } }'
			],

			'zobject with array of multilingual strings and same languages' => [
				'{ "Z1K1": "Z2", "Z2K2": ['
				. '{ "Z1K1": "Z12", "Z12K1": ['
				. '{ "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "first text" },'
				. '{ "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "primer texto" }'
				. '] },'
				. '{ "Z1K1": "Z12", "Z12K1": ['
				. '{ "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "second text" },'
				. '{ "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "segundo texto" }'
				. '] }'
				. '] }',
				'["es", "en"]',
				'{ "Z1K1": "Z2", "Z2K2": ['
				. '{ "Z1K1": "Z12", "Z12K1": ['
				. '{ "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "primer texto" }'
				. '] },'
				. '{ "Z1K1": "Z12", "Z12K1": ['
				. '{ "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "segundo texto" }'
				. '] }'
				. '] }',
			],

			'zobject with array of multilingual strings and different languages' => [
				'{ "Z1K1": "Z2", "Z2K2": ['
				. '{ "Z1K1": "Z12", "Z12K1": ['
				. '{ "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "primer texto" },'
				. '{ "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "first text" }'
				. '] },'
				. '{ "Z1K1": "Z12", "Z12K1": ['
				. '{ "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "second text" },'
				. '{ "Z1K1": "Z11", "Z11K1": "uk", "Z11K2": "другий текст" }'
				. '] }'
				. '] }',
				'["cat", "es", "en"]',
				'{ "Z1K1": "Z2", "Z2K2": ['
				. '{ "Z1K1": "Z12", "Z12K1": ['
				. '{ "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "primer texto" }'
				. '] },'
				. '{ "Z1K1": "Z12", "Z12K1": ['
				. '{ "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "second text" }'
				. '] }'
				. '] }',
			],
		];
	}

	/**
	 * @dataProvider provideGetPreferredMonolingualString
	 * @covers ::getPreferredMonolingualString
	 */
	public function testGetPreferredMonolingualString( $multilingualStr, $languages, $expected ) {
		$this->assertSame(
			FormatJson::encode( FormatJson::decode( $expected ) ),
			FormatJson::encode( ZObjectUtils::getPreferredMonolingualString(
				FormatJson::decode( $multilingualStr ),
				FormatJson::decode( $languages )
			) )
		);
	}

	public function provideGetPreferredMonolingualString() {
		return [
			'no monolingual string and no languages' => [ '[]', '[]', '[]', ],
			'no monolingual string and one languages' => [ '[]', '["en"]', '[]', ],
			'no monolingual string and many languages' => [ '[]', '["es", "en"]', '[]', ],

			'one monolingual string and no languages' => [
				'[{ "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "type" }]',
				'[]',
				'[{ "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "type" }]',
			],
			'one monolingual string and an available language' => [
				'[{ "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "type" }]',
				'["en"]',
				'[{ "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "type" }]',
			],
			'one monolingual string and one unavailable language' => [
				'[{ "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "type" }]',
				'["fr"]',
				'[{ "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "type" }]',
			],
			'one monolingual string and one unavailable language' => [
				'[{ "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "type" }]',
				'["fr"]',
				'[{ "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "type" }]',
			],

			'many monolingual strings and no languages' => [
				'[{ "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "tipo" },'
				. ' { "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "type" }]',
				'[]',
				'[{ "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "tipo" }]',
			],
			'many monolingual strings and one available languages' => [
				'[{ "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "tipo" },'
				. ' { "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "type" }]',
				'["en"]',
				'[{ "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "type" }]',
			],
		  'many monolingual strings and one unavailable languages' => [
				'[{ "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "tipo" },'
				. ' { "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "type" }]',
				'["fr"]',
				'[{ "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "tipo" }]',
			],
			'many monolingual strings and some available languages' => [
				'[{ "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "tipo" },'
				. ' { "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "type" }]',
				'["cat", "es", "en"]',
				'[{ "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "tipo" }]',
			],
			'many monolingual strings and some unavailable languages' => [
				'[{ "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "tipo" },'
				. ' { "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "type" }]',
				'["uk", "ru"]',
				'[{ "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "tipo" }]',
			],
		];
	}

	/**
	 * @dataProvider provideNormalizeZStringsAndZReferences
	 * @covers ::normalizeZStringsAndZReferences
	 * @covers ::normalizeZStringOrZReference
	 */
	public function testNormalizeZStringsAndZReferences( $input, $expected ) {
		$this->assertSame(
			FormatJson::encode( FormatJson::decode( $expected ) ),
			FormatJson::encode( ZObjectUtils::normalizeZStringsAndZReferences( FormatJson::decode( $input ) ) )
		);
	}

	public function provideNormalizeZStringsAndZReferences() {
		return [
			'normalize empty zobject' => [
				'{}',
				'{}'
			],
			'normalize empty zlist' => [
				'{ "Z2K2": [] }',
				'{ "Z2K2": [] }'
			],
			'normalize canonical string' => [
				'{ "Z2K2": "string value" }',
				'{ "Z2K2": { "Z1K1": "Z6", "Z6K1": "string value" } }'
			],
			'normalize canonical reference' => [
				'{ "Z2K2": "Z111" }',
				'{ "Z2K2": { "Z1K1": "Z9", "Z9K1": "Z111" } }'
			],
			'normalize zlist' => [
				'{ "Z2K2": ['
				. '{ "Z1K1": "Z2", "Z2K1": "Z111" },'
				. '{ "Z1K1": "Z2", "Z2K1": "string" }'
				. '] }',
				'{ "Z2K2": ['
				. '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z9", "Z9K1": "Z111" } },'
				. '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "string" } }'
				. '] }'
			],
			'normalize zlist of canonical strings and references' => [
				'{ "Z2K2": [ "canonical", "strings", "Z111" ] }',
				'{ "Z2K2": ['
				. '{ "Z1K1": "Z6", "Z6K1": "canonical" },'
				. '{ "Z1K1": "Z6", "Z6K1": "strings" },'
				. '{ "Z1K1": "Z9", "Z9K1": "Z111" }'
				. '] }'
			],
			'leave untouched an already normalized string' => [
				'{ "Z2K2": { "Z1K1": "Z6", "Z6K1": "string value" } }',
				'{ "Z2K2": { "Z1K1": "Z6", "Z6K1": "string value" } }'
			],
			'leave untouched an already normalized reference' => [
				'{ "Z2K2": { "Z1K1": "Z9", "Z9K1": "Z111" } }',
				'{ "Z2K2": { "Z1K1": "Z9", "Z9K1": "Z111" } }'
			],
			'leave untouched an object type key' => [
				'{ "Z1K1": "Z3" }',
				'{ "Z1K1": "Z3" }'
			],
			'leave untouched monolingual string keys' => [
				'{ "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "label" }',
				'{ "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "label" }'
			],
			'leave untouched multilingual string keys' => [
				'{ "Z1K1": "Z12", "Z12K1": [ { "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "etiqueta" } ] }',
				'{ "Z1K1": "Z12", "Z12K1": [ { "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "etiqueta" } ] }',
			],
			'normalize full zobject with type, strings, references and multilingual strings' => [
				'{ "Z1K1": "Z3",'
				. ' "Z3K1": "Z6",'
				. ' "Z3K2": "Z111K1",'
				. ' "Z3K3": { "Z1K1": "Z12", "Z12K1": ['
				. ' { "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "label" },'
				. ' { "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "etiqueta" }'
				. ' ] },'
				. ' "Z3K4": "default value" }',
				'{ "Z1K1": "Z3",'
				. ' "Z3K1": { "Z1K1": "Z9", "Z9K1": "Z6" },'
			  . ' "Z3K2": { "Z1K1": "Z6", "Z6K1": "Z111K1" },'
			  . ' "Z3K3": { "Z1K1": "Z12", "Z12K1": ['
				. ' { "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "label" },'
				. ' { "Z1K1": "Z11", "Z11K1": "es", "Z11K2": "etiqueta" }'
				. ' ] },'
				. ' "Z3K4": { "Z1K1": "Z6", "Z6K1": "default value" } }'
			]
		];
	}
}
