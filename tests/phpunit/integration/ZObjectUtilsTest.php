<?php

/**
 * WikiLambda unit test suite for the ZObjectUtils file
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use FormatJson;
use Html;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjectUtils
 * @group Database
 */
class ZObjectUtilsTest extends WikiLambdaIntegrationTestCase {

	private const EN = 'Z1002';
	private const ES = 'Z1003';
	private const FR = 'Z1004';
	private const RU = 'Z1005';
	private const UK = 'Z1332';
	private const CAT = 'Z1789';

	public function addDBDataOnce() {
		$langs = ZLangRegistry::singleton();
		$langs->register( 'en', self::EN );
		$langs->register( 'es', self::ES );
		$langs->register( 'fr', self::FR );
		$langs->register( 'ru', self::RU );
		$langs->register( 'uk', self::UK );
		$langs->register( 'cat', self::CAT );
	}

	/**
	 * @dataProvider provideIsValidSerialisedZObject
	 * @covers ::isValidSerialisedZObject
	 * @covers ::isValidZObject
	 * @covers ::isValidZObjectList
	 * @covers ::isValidZObjectRecord
	 */
	public function testIsValidSerialisedZObject( $input, $expected ) {
		$this->assertSame( $expected, ZObjectUtils::isValidSerialisedZObject( $input ) );
	}

	public function provideIsValidSerialisedZObject() {
		return [
			'invalid JSON' => [ '{ bad JSON! Tut, tut.', false ],

			'empty string' => [ '', true ],
			'short string' => [ 'Test', true ],
			'messy string' => [ "This is a [basic] \tcomplicated\ntest {string}!", true ],

			'empty list' => [ '[ "Z1" ]', true ],
			'string singleton list' => [ '[ "Z6", "Test"]', true ],
			'string multiple list' => [ '[ "Z6", "Test1", "Test2" , "Test3"]', true ],
			'record singleton list' => [ '[ "Z1", { "Z1K1": "Test!", "Z2K1": "Test" }]', true ],
			'record multiple list' => [
				'["Z1", { "Z1K1": "Test!", "Z2K1": "Test" },{ "Z1K1": "Test2!", "Z2K1": "Test2?" }]',
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
				'{ "Z1K1": [ "Z6", "Test", "Second test"], "Z2K1": { "Z1K1": "Test", "K2": "Test"} }',
				true
			],
			'record with list and invalid sub-record' => [
				'{ "Z1K1": [ "Z6", "Test", "Second test"], "Z2K1": { "K2": "Test"} }',
				false
			],

			'invalid zobject (int not string/list/record)' => [ '{ "Z1K1": "Test", "Z2K1": 2 }', false ],
			'invalid zobject (float not string/list/record)' => [ '{ "Z1K1": "Test", "Z2K1": 2.0 }', false ],
		];
	}

	/**
	 * @covers ::isValidZObjectList
	 */
	public function testIsValidZObjectList_zeroLengthList() {
		$this->expectException( ZErrorException::class );
		ZObjectUtils::isValidZObjectList( [] );
	}

	/**
	 * @covers ::isValidZObjectList
	 */
	public function testIsValidZObjectList_listWithNonZObject() {
		$this->expectException( ZErrorException::class );
		ZObjectUtils::isValidZObjectList( [ 'Z6', 12 ] );
	}

	/**
	 * @dataProvider provideIsValidZObjectResolver
	 * @covers ::isValidZObjectResolver
	 */
	public function testIsValidZObjectResolver( $input, $expected ) {
		$this->assertSame( $expected, ZObjectUtils::isValidZObjectResolver( $input ) );
	}

	public function provideIsValidZObjectResolver() {
		yield 'Empty string' => [ '', false ];
		yield 'Contentful string' => [ 'Hello', false ];
		yield 'Reference string' => [ 'Z123', true ];
		yield 'Reference-like string' => [ 'A123', false ];
		yield 'Key reference string' => [ 'Z123K1', false ];

		yield 'Empty record' => [ json_decode( '{}' ), false ];
		yield 'Un-typed record' => [ json_decode( '{ "Z1K1": "Test" }' ), false ];
		yield 'String record' => [ json_decode( '{ "Z1K1": "Z6", "Z6K1": "Test" }' ), false ];

		yield 'Reference record' => [ json_decode( '{ "Z1K1": "Z9", "Z9K1": "Z1234" }' ), true ];
		yield 'Function call record' => [ json_decode( '{ "Z1K1": "Z7", "Z7K1": "Z1234" }' ), true ];
		yield 'Argument reference record' => [ json_decode( '{ "Z1K1": "Z18", "Z18K1": "Z1234" }' ), true ];
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
			'empty mixed list' => [ '["Z1"]', '["Z1"]' ],
			'empty list of strings' => [ '["Z6"]', '["Z6"]' ],
			'list with empty string' => [ '["Z6", ""]', '["Z6", ""]' ],
			'list with two empty strings' => [ '["Z6", "", ""]', '["Z6", "", ""]' ],
			'list with ordered strings' => [ '["Z6", "a", "b"]', '["Z6", "a", "b"]' ],
			'list with unordered strings' => [ '["Z1", "b", "a"]', '["Z1", "b", "a"]' ],
			'list with lists' => [ '["Z1",["Z1"],["Z1",["Z1"]],["Z1"]]', '["Z1",["Z1"],["Z1",["Z1"]],["Z1"]]' ],

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
				'["Z1", { " Z1K1 ": "Z60", "Z60K1 ": "a" }]',
				'["Z1", { "Z1K1": "Z60", "Z60K1": "a" }]'
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
			'unnecessary escaped string' => [
				'{ "Z1K1": "Z6", "Z6K1": "Z" }',
				'"Z"'
			],
			'escaped string QID' => [
				'{ "Z1K1": "Z6", "Z6K1": "Q42" }',
				'{ "Z1K1": "Z6", "Z6K1": "Q42" }'
			],
			'unnecessary escaped string key' => [
				'{ "Z1K1": "Z6", "Z6K1": "Z1K1" }',
				'"Z1K1"'
			],
			'unnecessary escaped string with whitespace' => [
				'{ "Z1K1": "Z6", "Z6K1": " Z1" }',
				'" Z1"'
			],
			'unnecessary double escaped string' => [
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
				'["Z6",{ "Z1K1": "Z6", "Z6K1": "Z6" }, { "Z1K1": "Z6", "Z6K1": "Z" }]',
				'["Z6",{ "Z1K1": "Z6", "Z6K1": "Z6" }, "Z" ]'
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
			'list in list' => [
				'["Z1",["Z1"]]',
				'["Z1",["Z1"]]'
			],
			'lists in list' => [
				'["Z1",["Z6"], ["Z6"]]',
				'["Z1",["Z6"], ["Z6"]]'
			],
			'ZObject with global keys' => [
				'{ "Z1K1": "Z60", "Z60K1": "test" }',
				'{ "Z1K1": "Z60", "Z60K1": "test" }',
			],
			'ZObject with local keys' => [
				'{ "Z1K1": "Z60", "K1": "test" }',
				'{ "Z1K1": "Z60", "Z60K1": "test" }',
			],
			// Generic list examples
			'empty generic list' => [
				'{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" } }',
				'["Z1"]'
			],
			'single object in a generic list' => [
				'{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" },'
					. '"K1": "a",'
					. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" } } }',
				'["Z1", "a"]'
			],
			'single string in generic list' => [
				'{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" },'
					. ' "K1": "a",'
					. ' "K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" } } }',
				'["Z6", "a"]'
			],
			'two strings in a generic list' => [
				'{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" },'
					. '"K1": "a",'
					. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" },'
					. '"K1": "b",'
					. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" } } } }',
				'["Z6", "a", "b"]'
			],
			'empty generic list in generic list' => [
				'{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" },'
					. ' "K1": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" } },'
					. ' "K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" } } }',
				'["Z1", ["Z1"]]'
			],
			'two empty generic lists in generic list' => [
				'{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" },'
					. ' "K1": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" } },'
					. ' "K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" },'
					. ' "K1": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" } },'
					. ' "K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z1" } } } }',
				'["Z1", ["Z1"], ["Z1"]]'
			]
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
				$languages
			) )
		);
	}

	public function provideFilterZMultilingualStringsToLanguage() {
		return [
			'empty zobject' => [
				'{}',
				[],
				'{}'
			],
			'zobject with string values' => [
				'{ "Z1K1": "Z2", "Z2K2": "string value" }',
				[],
				'{ "Z1K1": "Z2", "Z2K2": "string value" }'
			],
			'zobject with array value' => [
				'{ "Z1K1": "Z2", "Z2K2": ["Z1", { "Z1K1": "Z111"}, {"Z1K1": "Z222"}] }',
				[],
				'{ "Z1K1": "Z2", "Z2K2": ["Z1", { "Z1K1": "Z111"}, {"Z1K1": "Z222"}] }'
			],
			'zobject with nested zobject' => [
				'{ "Z1K1": "Z2", "Z2K2": { "Z1K1": "Z3", "Z3K3": { "Z1K1": "Z6" } } }',
				[],
				'{ "Z1K1": "Z2", "Z2K2": { "Z1K1": "Z3", "Z3K3": { "Z1K1": "Z6" } } }'
			],

			'zobject with multilingual string and no languages' => [
				'{ "Z1K1": "Z12", "Z12K1": ["Z11",'
				. '{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "type" },'
				. '{ "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "tipo" }'
				. '] }',
				[],
				'{ "Z1K1": "Z12", "Z12K1": ["Z11",{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "type" }] }'
			],

			'zobject with multilingual string and language chain' => [
				'{ "Z1K1": "Z12", "Z12K1": ["Z11",'
				. '{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "type" },'
				. '{ "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "tipo" }'
				. '] }',
				[ self::ES, self::EN ],
				'{ "Z1K1": "Z12", "Z12K1": ["Z11",{ "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "tipo" }] }'
			],

			'zobject with nested multilingual strings' => [
				'{ "Z1K1": "Z2", "Z2K3": { "Z1K1": "Z12", "Z12K1": ["Z11",'
				. '{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "label" },'
				. '{ "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "etiqueta" }'
				. '] }, "Z2K2": { "Z1K1": "Z2", "Z2K3": { "Z1K1": "Z12", "Z12K1": ["Z11",'
				. '{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "nested label" },'
				. '{ "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "etiqueta anidada" }'
				. '] } } }',
				[ self::ES, self::EN ],
				'{ "Z1K1": "Z2", "Z2K3": {"Z1K1": "Z12", "Z12K1": ["Z11",'
				. '{ "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "etiqueta" }'
				. '] }, "Z2K2": { "Z1K1": "Z2", "Z2K3": {"Z1K1": "Z12", "Z12K1": ["Z11",'
				. '{ "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "etiqueta anidada" }'
				. '] } } }'
			],

			'zobject with array of multilingual strings and same languages' => [
				'{ "Z1K1": "Z2", "Z2K2": ["Z12",'
				. '{ "Z1K1": "Z12", "Z12K1": ["Z11",'
				. '{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "first text" },'
				. '{ "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "primer texto" }'
				. '] },'
				. '{ "Z1K1": "Z12", "Z12K1": ["Z11",'
				. '{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "second text" },'
				. '{ "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "segundo texto" }'
				. '] }'
				. '] }',
				[ self::ES, self::EN ],
				'{ "Z1K1": "Z2", "Z2K2": ["Z12",'
				. '{ "Z1K1": "Z12", "Z12K1": ["Z11",'
				. '{ "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "primer texto" }'
				. '] },'
				. '{ "Z1K1": "Z12", "Z12K1": ["Z11",'
				. '{ "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "segundo texto" }'
				. '] }'
				. '] }',
			],

			'zobject with array of multilingual strings and different languages' => [
				'{ "Z1K1": "Z2", "Z2K2": ["Z12",'
				. '{ "Z1K1": "Z12", "Z12K1": ["Z11",'
				. '{ "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "primer texto" },'
				. '{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "first text" }'
				. '] },'
				. '{ "Z1K1": "Z12", "Z12K1": ["Z11",'
				. '{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "second text" },'
				. '{ "Z1K1": "Z11", "Z11K1": "Z1332", "Z11K2": "другий текст" }'
				. '] }'
				. '] }',
				[ self::CAT, self::ES, self::EN ],
				'{ "Z1K1": "Z2", "Z2K2": ["Z12",'
				. '{ "Z1K1": "Z12", "Z12K1": ["Z11",'
				. '{ "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "primer texto" }'
				. '] },'
				. '{ "Z1K1": "Z12", "Z12K1": ["Z11",'
				. '{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "second text" }'
				. '] }'
				. '] }',
			],

			'empty language list but we give a string as the input' => [
				'"string value"',
				[],
				'"string value"'
			],
			'non-empty language list but we give a string as the input' => [
				'"string value"',
				[ self::ES, self::EN ],
				'"string value"'
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
				$languages
			) )
		);
	}

	public function provideGetPreferredMonolingualString() {
		return [
			'no monolingual string and no languages' => [ '["Z11"]', [], '["Z11"]', ],
			'no monolingual string and one languages' => [ '["Z11"]', [ self::EN ], '["Z11"]', ],
			'no monolingual string and many languages' => [ '["Z11"]', [ self::ES, self::EN ], '["Z11"]', ],

			'one monolingual string and no languages' => [
				'["Z11",{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "type" }]',
				[],
				'["Z11",{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "type" }]',
			],
			'one monolingual string and an available language' => [
				'["Z11",{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "type" }]',
				[ self::EN ],
				'["Z11",{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "type" }]',
			],
			'one monolingual string and one unavailable language' => [
				'["Z11",{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "type" }]',
				[ self::FR ],
				'["Z11",{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "type" }]',
			],
			'one monolingual string and one unavailable language' => [
				'["Z11",{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "type" }]',
				[ self::FR ],
				'["Z11",{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "type" }]',
			],

			'many monolingual strings and no languages' => [
				'["Z11",{ "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "tipo" },'
				. ' { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "type" }]',
				[],
				'["Z11",{ "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "tipo" }]',
			],
			'many monolingual strings and one available languages' => [
				'["Z11",{ "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "tipo" },'
				. ' { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "type" }]',
				[ self::EN ],
				'["Z11",{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "type" }]',
			],
		  'many monolingual strings and one unavailable languages' => [
				'["Z11",{ "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "tipo" },'
				. ' { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "type" }]',
				[ self::FR ],
				'["Z11",{ "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "tipo" }]',
			],
			'many monolingual strings and some available languages' => [
				'["Z11",{ "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "tipo" },'
				. ' { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "type" }]',
				[ self::CAT, self::ES, self::EN ],
				'["Z11",{ "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "tipo" }]',
			],
			'many monolingual strings and some unavailable languages' => [
				'["Z11",{ "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "tipo" },'
				. ' { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "type" }]',
				[ self::UK, self::RU ],
				'["Z11",{ "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "tipo" }]',
			],
		];
	}

	/**
	 * @dataProvider provideTypeEqualTo
	 * @covers ::isTypeEqualTo
	 */
	public function testTypeEqualTo( $type1, $type2, $expectedResult ) {
		$this->assertSame(
			$expectedResult,
			ZObjectUtils::isTypeEqualTo( FormatJson::decode( $type1 ), FormatJson::decode( $type2 ) )
		);
	}

	public function provideTypeEqualTo() {
		return [
			'equal canonical types' => [ '"Z11"', '"Z11"', true ],
			'non equal canonical types' => [ '"Z11"', '"Z12"', false ],
			'equal normal types' => [
				'{ "Z1K1": "Z9", "Z9K1": "Z11" }',
				'{ "Z1K1": "Z9", "Z9K1": "Z11" }',
				true
			],
			'non equal normal types' => [
				'{ "Z1K1": "Z9", "Z9K1": "Z11" }',
				'{ "Z1K1": "Z9", "Z9K1": "Z12" }',
				false
			],
			'non equal normal types with extra key' => [
				'{ "Z1K1": "Z9", "Z9K1": "Z11" }',
				'{ "Z1K1": "Z9", "Z9K1": "Z11", "Z9K3": "extra" }',
				false
			],
			'same types but in different forms fails' => [
				'"Z12"',
				'{ "Z1K1": "Z9", "Z9K1": "Z12" }',
				false
			],
			'equal list types' => [
				'{ "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z6" } }',
				'{ "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z6" } }',
				true
			],
			'non equal list types' => [
				'{ "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z6" } }',
				'{ "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z1" } }',
				false
			],
			'non equal list types with extra key' => [
				'{ "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z6" } }',
				'{ "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z1" } }'
					. ' "Z882K1": { "Z1K1": "Z9", "Z9K1": "Z1" } }',
				false
			],
			'non equal list types with less keys' => [
				'{ "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z6" } }'
					. ' "Z882K1": { "Z1K1": "Z9", "Z9K1": "Z1" } }',
				'{ "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z1" } }',
				false
			],
			'non equal list and error types' => [
				'{ "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z6" } }',
				'{ "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z885" },'
					. ' "Z885K1": { "Z1K1": "Z9", "Z9K1": "Z500" } }',
				false
			],
			'equal list types in different formats fails' => [
				'{ "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" }',
				'{ "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z6" } }',
				false
			],
		];
	}

	/**
	 * @dataProvider provideNormalize()
	 * @covers ::normalize
	 * @covers ::normalizeInternal
	 * @covers ::normalizeZStringOrZReference
	 * @covers ::normalizeList
	 * @covers ::isTypeEqualTo
	 * @covers ::normalizeListInternal
	 */
	public function testNormalize( $input, $expected ) {
		$this->assertSame(
			FormatJson::encode( FormatJson::decode( $expected ) ),
			FormatJson::encode( ZObjectUtils::normalize( FormatJson::decode( $input ) ) )
		);
	}

	public function provideNormalize() {
		return [
				'normalize empty zobject' => [
				'{}',
				'{}'
			],
			'normalize empty list' => [
				'[ "Z1" ]',
				'{ "Z1K1": { "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z1" } } }'
			],
			'normalize empty list as value' => [
				'{ "Z2K2": [ "Z1" ] }',
				'{ "Z2K2": { "Z1K1": { "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z1" } } } }'
			],
			'normalize canonical string' => [
				'{ "Z2K2": "string value" }',
				'{ "Z2K2": { "Z1K1": "Z6", "Z6K1": "string value" } }'
			],
			'normalize canonical reference' => [
				'{ "Z2K2": "Z111" }',
				'{ "Z2K2": { "Z1K1": "Z9", "Z9K1": "Z111" } }'
			],
			'normalize list with two elements of a same type' => [
				'{ "Z2K2": [ "Z2", '
				. '{ "Z1K1": "Z2", "Z2K1": "Z111" },'
				. '{ "Z1K1": "Z2", "Z2K1": "string" }'
				. '] }',
				'{ "Z2K2": { "Z1K1": {'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z2" } },'
					. ' "K1": { "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z2" },'
					. ' "Z2K1": { "Z1K1": "Z9", "Z9K1": "Z111" } },'
					. ' "K2": { "Z1K1": {'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z2" } },'
					. ' "K1": { "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z2" },'
					. ' "Z2K1": { "Z1K1": "Z6", "Z6K1": "string" } },'
					. ' "K2": { "Z1K1": {'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z2" } } } } } }'

			],
			'normalize list with two elements of a different type' => [
				'[ "Z1", "string", "Z111" ]',
				'{ "Z1K1": {'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z1" } },'
					. ' "K1": { "Z1K1": "Z6", "Z6K1": "string" },'
					. ' "K2": { "Z1K1": {'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z1" } },'
					. ' "K1": { "Z1K1": "Z9", "Z9K1": "Z111" },'
					. ' "K2": { "Z1K1": {'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z1" } } } } }'
			],
			'normalize monolingual string keys' => [
				'{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "label" }',
				'{ "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z11" },'
					. ' "Z11K1": { "Z1K1": "Z9", "Z9K1": "Z1002" },'
					. ' "Z11K2": { "Z1K1": "Z6", "Z6K1": "label" } }'
			],
			'normalize multilingual string keys' => [
				'{ "Z1K1": "Z12", "Z12K1": ['
					. ' "Z11",'
					. ' { "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "etiqueta" } ] }',
				'{ "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z12" }, "Z12K1": { "Z1K1": {'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z11" } },'
					. ' "K1": { "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z11" },'
					. ' "Z11K1": { "Z1K1": "Z9", "Z9K1": "Z1003" },'
					. ' "Z11K2": { "Z1K1": "Z6", "Z6K1": "etiqueta" } },'
					. ' "K2": { "Z1K1": {'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z11" } } } } }'
			],
			'leave untouched an already normalized string' => [
				'{ "Z2K2": { "Z1K1": "Z6", "Z6K1": "string value" } }',
				'{ "Z2K2": { "Z1K1": "Z6", "Z6K1": "string value" } }'
			],
			'leave untouched an already normalized reference' => [
				'{ "Z2K2": { "Z1K1": "Z9", "Z9K1": "Z111" } }',
				'{ "Z2K2": { "Z1K1": "Z9", "Z9K1": "Z111" } }'
			],
			'leave untouched an already normalized list' => [
				'{ "Z1K1": {'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z1" } },'
					. ' "K1": { "Z1K1": "Z6", "Z6K1": "string" },'
					. ' "K2": { "Z1K1": {'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z1" } },'
					. ' "K1": { "Z1K1": "Z9", "Z9K1": "Z111" },'
					. ' "K2": { "Z1K1": {'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z1" } } } } }',
				'{ "Z1K1": {'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z1" } },'
					. ' "K1": { "Z1K1": "Z6", "Z6K1": "string" },'
					. ' "K2": { "Z1K1": {'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z1" } },'
					. ' "K1": { "Z1K1": "Z9", "Z9K1": "Z111" },'
					. ' "K2": { "Z1K1": {'
					. ' "Z1K1": { "Z1K1": "Z9", "Z9K1": "Z7" },'
					. ' "Z7K1": { "Z1K1": "Z9", "Z9K1": "Z881" },'
					. ' "Z881K1": { "Z1K1": "Z9", "Z9K1": "Z1" } } } } }'
			]
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
				'{ "Z2K2": [ "Z1" ] }',
				'{ "Z2K2": [ { "Z1K1": "Z9", "Z9K1": "Z1" } ] }'
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
				'{ "Z2K2": [ "Z2",'
				. '{ "Z1K1": "Z2", "Z2K1": "Z111" },'
				. '{ "Z1K1": "Z2", "Z2K1": "string" }'
				. '] }',
				'{ "Z2K2": [ { "Z1K1": "Z9", "Z9K1": "Z2" },'
				. '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z9", "Z9K1": "Z111" } },'
				. '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "string" } }'
				. '] }'
			],
			'normalize zlist of canonical strings and references' => [
				'{ "Z2K2": [ "Z6", "canonical", "strings", "Z111" ] }',
				'{ "Z2K2": [ { "Z1K1": "Z9", "Z9K1": "Z6" },'
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
				'{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "label" }',
				'{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "label" }'
			],
			'leave untouched multilingual string keys' => [
				'{ "Z1K1": "Z12", "Z12K1": [ "Z11", { "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "etiqueta" } ] }',
				'{ "Z1K1": "Z12", "Z12K1": [ "Z11", { "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "etiqueta" } ] }',
			],
			'normalize full zobject with type, strings, references and multilingual strings' => [
				'{ "Z1K1": "Z3",'
				. ' "Z3K1": "Z6",'
				. ' "Z3K2": "Z111K1",'
				. ' "Z3K3": { "Z1K1": "Z12", "Z12K1": [ "Z11",'
				. ' { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "label" },'
				. ' { "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "etiqueta" }'
				. ' ] },'
				. ' "Z3K4": "default value" }',
				'{ "Z1K1": "Z3",'
				. ' "Z3K1": { "Z1K1": "Z9", "Z9K1": "Z6" },'
			  . ' "Z3K2": { "Z1K1": "Z6", "Z6K1": "Z111K1" },'
			  . ' "Z3K3": { "Z1K1": "Z12", "Z12K1": [ "Z11",'
				. ' { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "label" },'
				. ' { "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "etiqueta" }'
				. ' ] },'
				. ' "Z3K4": { "Z1K1": "Z6", "Z6K1": "default value" } }'
			]
		];
	}

	/**
	 * @dataProvider provideIsValidZObjectKey
	 * @covers ::isValidZObjectKey
	 */
	public function testIsValidZObjectKey( $input, $expected ) {
		$this->assertSame( $expected, ZObjectUtils::isValidZObjectKey( $input ) );
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
		$this->assertSame( $expected, ZObjectUtils::isValidZObjectReference( $input ) );
	}

	public function provideIsValidZObjectReference() {
		return [
			'empty string' => [ '', false ],

			'Simple ZID' => [ 'Z1', true ],
			'Big ZID' => [ 'Z1234567890', true ],
			'Null ZID' => [ 'Z0', false ],

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
	 * @dataProvider provideIsValidOrNullZObjectReference
	 * @covers ::isValidZObjectReference
	 * @covers ::isValidOrNullZObjectReference
	 * @covers ::isNullReference
	 */
	public function testIsValidOrNullZObjectReference( $input, $expected ) {
		$this->assertSame( $expected, ZObjectUtils::isValidOrNullZObjectReference( $input ) );
	}

	public function provideIsValidOrNullZObjectReference() {
		return [
			'empty string' => [ '', false ],
			'Simple ZID' => [ 'Z1', true ],
			'Big ZID' => [ 'Z1234567890', true ],
			'Null ZID' => [ 'Z0', true ],
			'Invalid ZID' => [ 'ZK1', false ],
			'Key' => [ 'Z1K1', false ],
		];
	}

	/**
	 * @covers ::isNullReference
	 */
	public function testIsNullReference() {
		$this->assertTrue( ZObjectUtils::isNullReference( 'Z0' ) );
		$this->assertFalse( ZObjectUtils::isNullReference( 'Z1' ) );
		$this->assertFalse( ZObjectUtils::isNullReference( 'foo' ) );
	}

	/**
	 * @dataProvider provideIsValidZObjectReference
	 * @dataProvider provideIsValidNonZObjectId
	 * @covers ::isValidId
	 */
	public function testIsValidId( $input, $expected ) {
		$this->assertSame( $expected, ZObjectUtils::isValidId( $input ) );
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
		$this->assertSame( $expected, ZObjectUtils::isValidZObjectGlobalKey( $input ) );
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
		$this->assertSame( $expected, ZObjectUtils::getZObjectReferenceFromKey( $input ) );
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
	 * @dataProvider provideGetRequiredZids
	 * @covers ::getRequiredZids
	 */
	public function testGetRequiredZids( $input, $expected ) {
		$this->assertSame( $expected, ZObjectUtils::getRequiredZids( $input ) );
	}

	public function provideGetRequiredZids() {
		return [
			'string with ref' => [ 'Z1', [ 'Z1' ] ],
			'string without ref' => [ 'text', [] ],
			'array with strings' => [ [ 'Z6', 'text', 'another text' ], [ 'Z6' ] ],
			'array with strings' => [ [ 'Z1', 'text', 'Z1', 'another text', 'Z2' ], [ 'Z1', 'Z2' ] ],
			'object zstring' => [
				(object)[
					'Z1K1' => 'Z6',
					'Z6K1' => 'string'
				],
				[ 'Z1', 'Z6' ]
			],
			'object zreference' => [
				(object)[
					'Z1K1' => 'Z9',
					'Z9K1' => 'Z111'
				],
				[ 'Z1', 'Z9', 'Z111' ]
			],
			'object with array and strings' => [
				(object)[
					'Z1K1' => 'Z2',
					'Z2K1' => [ 'Z1K1' => 'Z9', 'Z9K1' => 'Z111' ],
					'Z2K2' => [ 'Z222', 'Z333', 'text' ]
				],
				[ 'Z1', 'Z2', 'Z9', 'Z111', 'Z222', 'Z333' ]
			],
			'object with local keys' => [
				(object)[
					'Z1K1' => 'Z2',
					'K1' => 'key one',
					'K2' => 'Z222'
				],
				[ 'Z1', 'Z2', 'Z222' ]
			],
		];
	}

	/**
	 * @covers ::getLabelOfFunctionArgument
	 */
	public function testGetLabelOfFunctionArgument() {
		$this->insertZids( [ 'Z17' ] );

		$en = $this->makeLanguage( 'en' );
		$ru = $this->makeLanguage( 'ru' );

		// Result for a non-Function is just the requested key
		$persistentObjectOfZ2 = $this->getZPersistentObject( 'Z2' );
		$response = ZObjectUtils::getLabelOfFunctionArgument( 'Z2K1', $persistentObjectOfZ2, $en );
		$this->assertSame( 'Z2K1', $response );

		$persistentObjectOfEcho = $this->getZPersistentObject( 'Z801' );
		// Result for a pre-defined Function is the expected value
		$response = ZObjectUtils::getLabelOfFunctionArgument( 'Z801K1', $persistentObjectOfEcho, $en );
		$this->assertSame( 'input', $response );

		// Result for a pre-defined Function is the expected value falling back from unset language
		$response = ZObjectUtils::getLabelOfFunctionArgument( 'Z801K1', $persistentObjectOfEcho, $ru );
		$this->assertSame( 'input', $response );

		// Result for a pre-defined Function with an unknown key is the expected value
		$response = ZObjectUtils::getLabelOfFunctionArgument( 'Z801K27', $persistentObjectOfEcho, $en );
		$this->assertSame( 'Z801K27', $response );
	}

	/**
	 * @covers ::extractHumanReadableZObject
	 * @covers ::getLabelOfGlobalKey
	 * @covers ::getLabelOfTypeKey
	 * @covers ::getLabelOfFunctionArgument
	 * @covers ::getLabelOfErrorTypeKey
	 */
	public function testExtractHumanReadableZObject_global() {
		$this->insertZids( [ 'Z17', 'Z50' ] );
		$en = $this->makeLanguage( 'en' );
		$data = [
			'Z1' => $this->getZPersistentObject( 'Z1' ),
			'Z504' => $this->getZPersistentObject( 'Z504' ),
			'Z885' => $this->getZPersistentObject( 'Z885' ),
		];

		$zobject = '{"Z1K1":{"Z1K1":"Z7","Z7K1":"Z885","Z885K1":"Z504"},"Z504K1":"Z404"}';
		$translated = '{"type":{"type":"Z7","Z7K1":"Errortype to type","errortype":"ZID not found"},"ZID":"Z404"}';
		$result = ZObjectUtils::extractHumanReadableZObject( json_decode( $zobject ), $data, $en );
		$this->assertSame( $translated, json_encode( $result ) );
	}

	/**
	 * @covers ::extractHumanReadableZObject
	 * @covers ::getLabelOfGlobalKey
	 * @covers ::getLabelOfTypeKey
	 * @covers ::getLabelOfFunctionArgument
	 * @covers ::getLabelOfErrorTypeKey
	 */
	public function testExtractHumanReadableZObject_unknownKeys() {
		$this->insertZids( [ 'Z8', 'Z17', 'Z50' ] );
		$en = $this->makeLanguage( 'en' );
		$data = [
			'Z1' => $this->getZPersistentObject( 'Z1' ),
			'Z504' => $this->getZPersistentObject( 'Z504' ),
			'Z885' => $this->getZPersistentObject( 'Z885' ),
		];

		$zobject = '{"Z1K1":{"Z1K1":"Z7","Z7K1":"Z885","Z885K1":"Z504", '
			. '"Z885K2":"unknown function argument key"},'
			. '"Z504K2":"unknown error key",'
			. '"Z1K2": "unknown global key"}';
		$translated = '{"type":{"type":"Z7","Z7K1":"Errortype to type","errortype":"ZID not found",'
			. '"Z885K2":"unknown function argument key"},'
			. '"Z504K2":"unknown error key",'
			. '"Z1K2":"unknown global key"}';
		$result = ZObjectUtils::extractHumanReadableZObject( json_decode( $zobject ), $data, $en );
		$this->assertSame( $translated, json_encode( $result ) );
	}

	/**
	 * @covers ::extractHumanReadableZObject
	 * @covers ::getLabelOfLocalKey
	 * @covers ::getLabelOfGlobalKey
	 * @covers ::getLabelOfTypeKey
	 * @covers ::getLabelOfErrorTypeKey
	 */
	public function testExtractHumanReadableZObject_local() {
		$this->insertZids( [ 'Z17', 'Z50' ] );
		$en = $this->makeLanguage( 'en' );
		$data = [
			'Z6' => $this->getZPersistentObject( 'Z6' ),
			'Z504' => $this->getZPersistentObject( 'Z504' )
		];

		$zobject = '{"Z1K1":{"Z1K1":"Z7","Z7K1":"Z885","Z885K1":"Z504"},"K1":"Z404"}';
		$translated = '{"Z1K1":{"Z1K1":"Z7","Z7K1":"Z885","Z885K1":"ZID not found"},"ZID":"Z404"}';
		$result = ZObjectUtils::extractHumanReadableZObject( json_decode( $zobject ), $data, $en );
		$this->assertSame( $translated, json_encode( $result ) );

		$zobject = '{"Z1K1":"Z6","K1":"tasty soup"}';
		$translated = '{"Z1K1":"String","value":"tasty soup"}';
		$result = ZObjectUtils::extractHumanReadableZObject( json_decode( $zobject ), $data, $en );
		$this->assertSame( $translated, json_encode( $result ) );

		$zobject = '{"Z1K1":"Z9","K1":"Z111"}';
		$translated = '{"Z1K1":"Z9","K1":"Z111"}';
		$result = ZObjectUtils::extractHumanReadableZObject( json_decode( $zobject ), $data, $en );
		$this->assertSame( $translated, json_encode( $result ) );
	}

	/**
	 * @dataProvider provideGetLabelOfReference
	 * @covers ::getLabelOfReference
	 */
	public function testGetLabelOfReference( $data, $lang, $requiredLangs, $expected ) {
		$this->registerLangs( $requiredLangs );
		$zobject = ZObjectFactory::createChild( FormatJson::parse( $data )->getValue() );
		$this->assertSame( $expected, ZObjectUtils::getLabelOfReference( 'Z111', $zobject, $lang ) );
	}

	public function provideGetLabelOfReference() {
		return [
			'simple label in English' => [
				'{"Z1K1":"Z2", "Z2K1":"Z111", "Z2K2":"empty object", "Z2K3": { "Z1K1":"Z12", "Z12K1":["Z11",'
					. '{"Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "label"}'
					. ']}}',
				$this->makeLanguage( 'en' ),
				[ 'en' ],
				'label'
			],
			'fallback to English' => [
				'{"Z1K1":"Z2", "Z2K1":"Z111", "Z2K2":"empty object", "Z2K3":{"Z1K1":"Z12", "Z12K1":["Z11",'
					. '{"Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2":"label"}'
					. ']}}',
				$this->makeLanguage( 'es' ),
				[ 'en', 'es' ],
				'label'
			],
			'simple label in Spanish' => [
				'{"Z1K1":"Z2", "Z2K1":"Z111", "Z2K2":"empty object", "Z2K3": {"Z1K1":"Z12", "Z12K1":["Z11",'
					. '{"Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2":"label"},'
					. '{"Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2":"etiqueta"}'
					. ']}}',
				$this->makeLanguage( 'es' ),
				[ 'en', 'es' ],
				'etiqueta'
			],
			'no label available' => [
				'{"Z1K1":"Z2", "Z2K1":"Z111", "Z2K2":"empty object", "Z2K3":{"Z1K1":"Z12", "Z12K1":["Z11"]}}',
				$this->makeLanguage( 'es' ),
				[ 'es' ],
				'Z111'
			],
			'no label or fallback' => [
				'{"Z1K1":"Z2", "Z2K1":"Z111", "Z2K2":"empty object", "Z2K3": {"Z1K1":"Z12", "Z12K1":["Z11",'
					. '{"Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2":"etiqueta"}'
					. ']}}',
				$this->makeLanguage( 'de' ),
				[ 'de' ],
				'Z111'
			],
		];
	}

	/**
	 * @dataProvider provideGetLabelOfGlobalKey_type
	 * @covers ::getLabelOfGlobalKey
	 * @covers ::getLabelOfTypeKey
	 */
	public function testGetLabelOfGlobalKey_type( $key, $lang, $expected ) {
		$this->registerLangs( [ 'en', 'fr', 'pcd', 'zh' ] );
		$ztype = ZObjectFactory::createChild( FormatJson::parse( ZTestType::TEST_ENCODING )->getValue() );
		$this->assertSame( $expected, ZObjectUtils::getLabelOfGlobalKey( $key, $ztype, $lang ) );
	}

	public function provideGetLabelOfGlobalKey_type() {
		return [
			'existing label in existing lang' => [
				'Z111K1', $this->makeLanguage( 'en' ), 'Demonstration key'
			],
			'existing label in other existing lang' => [
				'Z111K1', $this->makeLanguage( 'fr' ), 'Index pour démonstration'
			],
			'existing label in non existing lang, falls back to english' => [
				'Z111K1', $this->makeLanguage( 'zh' ), 'Demonstration key'
			],
			'existing label in other existing lang' => [
				'Z111K2', $this->makeLanguage( 'fr' ), 'Autre index pour démonstration'
			],
			'existing label in non existing lang, falls back to french' => [
				'Z111K2', $this->makeLanguage( 'pcd' ), 'Autre index pour démonstration'
			],
			'non existing label' => [
				'Z111K3', $this->makeLanguage( 'en' ), 'Z111K3'
			],
		];
	}

	/**
	 * @covers ::getLabelOfTypeKey
	 */
	public function testGetLabelOfTypeKey_wrong() {
		$this->insertZids( [ 'Z60' ] );
		$zobject = $this->getZPersistentObject( 'Z1002' );

		$this->assertSame(
			'Z1002K1',
			ZObjectUtils::getLabelOfTypeKey( 'Z1002K1', $zobject, $this->makeLanguage( 'en' ) )
		);
	}

	/**
	 * @dataProvider provideGetLabelOfTypeKey_unknown
	 * @covers ::getLabelOfTypeKey
	 */
	public function testGetLabelOfTypeKey_unknown( $key, $zobject ) {
		$this->assertSame(
			$key,
			ZObjectUtils::getLabelOfTypeKey( $key, $zobject, $this->makeLanguage( 'en' ) )
		);
	}

	public function provideGetLabelOfTypeKey_unknown() {
		$type1 = ZObjectFactory::createChild( json_decode(
			'{ "Z1K1": "Z4", "Z4K1": "Z11111", "Z4K2": ["Z3",'
			. '{ "Z1K1": "Z3", "Z3K1": "Z6", "Z3K2": "Z11111K1" }'
			. '] }'
		) );
		$persistentType1 = new ZPersistentObject(
			new ZReference( 'Z11111' ),
			$type1,
			new ZMultiLingualString( [] )
		);

		$type2 = ZObjectFactory::createChild( json_decode(
			'{ "Z1K1": "Z4", "Z4K1": "Z11111", "Z4K2": ["Z3",'
			. '{ "Z1K1": "Z3", "Z3K1":"Z6", "Z3K2":"Z11111K1", "Z3K3":{"Z1K1":"Z12","Z12K1":["Z11"] } }'
			. '] }'
		) );
		$persistentType2 = new ZPersistentObject(
			new ZReference( 'Z11111' ),
			$type2,
			new ZMultiLingualString( [] )
		);

		return [
			'type key with no label key' => [ 'Z11111K1', $persistentType1 ],
			'type key with empty labels' => [ 'Z11111K1', $persistentType2 ]
		];
	}

	/**
	 * @dataProvider provideGetLabelOfGlobalKey_error
	 * @covers ::getLabelOfGlobalKey
	 * @covers ::getLabelOfErrorTypeKey
	 */
	public function testGetLabelOfGlobalKey_error( $key, $lang, $expected ) {
		$this->insertZids( [ 'Z50' ] );
		$zerrortype = $this->getZPersistentObject( 'Z504' );
		$this->assertSame( $expected, ZObjectUtils::getLabelOfGlobalKey( $key, $zerrortype, $lang ) );
	}

	public function provideGetLabelOfGlobalKey_error() {
		return [
			'existing label in existing lang' => [
				'Z504K1', $this->makeLanguage( 'en' ), 'ZID'
			],
			'existing label in non existing lang, english fallback' => [
				'Z504K1', $this->makeLanguage( 'fr' ), 'ZID'
			],
			'non existing label in existing lang' => [
				'Z504K2', $this->makeLanguage( 'en' ), 'Z504K2'
			],
		];
	}

	/**
	 * @covers ::getLabelOfGlobalKey
	 */
	public function testGetLabelOfGlobalKey_unknown() {
		$this->insertZids( [ 'Z60' ] );
		$language = $this->getZPersistentObject( 'Z1002' );
		$this->assertSame(
			'Z1002K1',
			ZObjectUtils::getLabelOfGlobalKey( 'Z1002K1', $language, $this->makeLanguage( 'en' ) )
		);
	}

	/**
	 * @dataProvider provideGetLabelOfLocalKey
	 * @covers ::getLabelOfLocalKey
	 * @covers ::getLabelOfErrorTypeKey
	 */
	public function testGetLabelOfLocalKey( $key, $json, $lang, $expected ) {
		$this->insertZids( [ 'Z50' ] );
		$data = [
			'Z6' => $this->getZPersistentObject( 'Z6' ),
			'Z11' => $this->getZPersistentObject( 'Z11' ),
			'Z504' => $this->getZPersistentObject( 'Z504' ),
		];
		$zobject = json_decode( $json );
		$this->assertSame( $expected, ZObjectUtils::getLabelOfLocalKey( $key, $zobject, $data, $lang ) );
	}

	public function provideGetLabelOfLocalKey() {
		return [
			'valid local label' => [
				'K1', '{ "Z1K1": "Z6", "K1": "tasty soup" }', $this->makeLanguage( 'en' ), 'value'
			],
			'invalid local label' => [
				'K2', '{ "Z1K1": "Z6", "K2": "tasty soup" }', $this->makeLanguage( 'en' ), 'K2'
			],
			'valid second local label' => [
				'K2', '{ "Z1K1": "Z11", "K2": "tasty soup", "K1": "Z1002" }', $this->makeLanguage( 'en' ), 'text'
			],
			'local label from errortype' => [
				'K1',
				'{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z885", "Z885K1": "Z504"}, "K1": "Z404" }',
				$this->makeLanguage( 'en' ),
				'ZID'
			],
			'invalid local label from errortype' => [
				'K2',
				'{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z885", "Z885K1": "Z504"}, "K1": "Z404" }',
				$this->makeLanguage( 'en' ),
				'K2'
			]
		];
	}

	/**
	 * @dataProvider provideGetErrorTypeKeys
	 * @covers ::getLabelOfErrorTypeKey
	 */
	public function testErrorTypeKeys( $persistentObject, $lang ) {
		$key = 'Z5555K1';
		$this->assertSame(
			$key,
			ZObjectUtils::getLabelOfErrorTypeKey( $key, $persistentObject, $lang )
		);
	}

	public function provideGetErrorTypeKeys() {
		$id = new ZReference( 'Z5555' );
		$labels = new ZMultiLingualString( [] );
		$errorType = new ZReference( 'Z50' );

		$value1 = new ZObject( $errorType );
		$value2 = new ZObject( $errorType, [
			'Z50K1' => ZObjectFactory::createChild( [ "Z1" ] )
		] );
		$value3 = new ZObject( $errorType, [
			'Z50K1' => ZObjectFactory::createChild( json_decode(
				'["Z3", {"Z1K1": "Z3", "Z3K1":"Z6", "Z3K2": "Z5555K1"}]'
			) )
		] );
		$value4 = new ZObject( $errorType, [
			'Z50K1' => ZObjectFactory::createChild( json_decode(
				'["Z3", {"Z1K1": "Z3", "Z3K1":"Z6", "Z3K2": "Z5555K1", "Z3K3":{"Z1K1": "Z12", "Z12K1":["Z11"]}}]'
			) )
		] );

		return [
			'no error keys key' => [
				new ZPersistentObject( $id, $value1, $labels ),
				$this->makeLanguage( 'en' )
			],
			'empty key array' => [
				new ZPersistentObject( $id, $value2, $labels ),
				$this->makeLanguage( 'en' )
			],
			'found key with no labels' => [
				new ZPersistentObject( $id, $value3, $labels ),
				$this->makeLanguage( 'en' )
			],
			'found key with empty labels' => [
				new ZPersistentObject( $id, $value4, $labels ),
				$this->makeLanguage( 'en' )
			]
		];
	}

	/**
	 * @dataProvider provideIterativeList
	 * @covers ::getIterativeList
	 */
	public function testIterativeList( $object, $count ) {
		$list = ZObjectUtils::getIterativeList( $object );
		$this->assertIsArray( $list );
		$this->assertCount( $count, $list );
	}

	public function provideIterativeList() {
		$generic1 = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" } }';
		$generic2 = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" },'
			. '"K1": "first string",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" } } }';
		$generic3 = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" },'
			. '"K1": "first string",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" },'
			. '"K1": "second string",'
			. '"K2": { "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" } } } }';
		$emptyGeneric = ZObjectFactory::createChild( json_decode( $generic1 ) );
		$genericOne = ZObjectFactory::createChild( json_decode( $generic2 ) );
		$genericTwo = ZObjectFactory::createChild( json_decode( $generic3 ) );
		return [
			'normal array' => [ [ "eins", "zwei" ], 2 ],
			'empty generic list' => [ $emptyGeneric, 0 ],
			'generic list with one element' => [ $genericOne, 1 ],
			'generic list with two elements' => [ $genericTwo, 2 ],
		];
	}

	/**
	 * @covers ::extractHumanReadableZObject
	 * @covers ::getLabelOfGlobalKey
	 * @covers ::getLabelOfTypeKey
	 * @covers ::getLabelOfFunctionArgument
	 * @covers ::getLabelOfErrorTypeKey
	 */
	public function testExtractHumanReadableZObject_failOnInvalid() {
		$en = $this->makeLanguage( 'en' );

		$this->expectException( ZErrorException::class );
		ZObjectUtils::extractHumanReadableZObject( 1000, [], $en );
	}

	/**
	 * @covers ::extractHumanReadableZObject
	 * @covers ::getLabelOfGlobalKey
	 * @covers ::getLabelOfTypeKey
	 * @covers ::getLabelOfFunctionArgument
	 * @covers ::getLabelOfErrorTypeKey
	 */
	public function testExtractHumanReadableZObject_repeatedLabel() {
		$this->insertZids( [ 'Z17' ] );
		$en = $this->makeLanguage( 'en' );
		$data = [
			'Z1' => $this->getZPersistentObject( 'Z1' ),
			'Z7' => $this->getZPersistentObject( 'Z7' ),
			'Z881' => $this->getZPersistentObject( 'Z881' ),
		];

		// Z1K1 and Z881K1 have the same english label (type)
		$zobject = '{"Z1K1":{"Z1K1":"Z7","Z7K1":"Z881","Z881K1":"Z6" },"K1":"string"}';
		$translated = '{"type":{"type":"Function call","function":"Typed list","type (Z881K1)":"Z6"},'
			. '"K1":"string"}';

		$result = ZObjectUtils::extractHumanReadableZObject( json_decode( $zobject ), $data, $en );
		$this->assertSame( $translated, json_encode( $result ) );
	}

	/**
	 * @covers ::extractHumanReadableZObject
	 * @covers ::getLabelOfGlobalKey
	 * @covers ::getLabelOfTypeKey
	 * @covers ::getLabelOfFunctionArgument
	 * @covers ::getLabelOfErrorTypeKey
	 */
	public function testExtractHumanReadableZObject_literalFunction() {
		$this->insertZids( [ 'Z17' ] );
		$en = $this->makeLanguage( 'en' );
		$data = [
			'Z1' => $this->getZPersistentObject( 'Z1' ),
			'Z7' => $this->getZPersistentObject( 'Z7' ),
			'Z881' => $this->getZPersistentObject( 'Z881' ),
		];

		$zobject = '{"Z1K1":{ "Z1K1":"Z7",'
			. ' "Z7K1": { "Z1K1":"Z8", "Z8K1":["Z17"], "Z8K2":"Z4", "Z8K3":["Z20"], "Z8K4":["Z14"], "Z8K5":"Z881" },'
			. ' "Z881K1":"Z6" }, "K1":"string"}';
		$translated = '{"type":{"type":"Function call",'
			. '"function":{"type":"Z8","Z8K1":["Z17"],"Z8K2":"Z4","Z8K3":["Z20"],"Z8K4":["Z14"],"Z8K5":"Typed list"},'
			. '"type (Z881K1)":"Z6"},"K1":"string"}';
		$result = ZObjectUtils::extractHumanReadableZObject( json_decode( $zobject ), $data, $en );
		$this->assertSame( $translated, json_encode( $result ) );
	}

	/**
	 * @covers ::getIsoCode
	 */
	public function testGetIsoCode() {
		$actual = ZObjectUtils::getIsoCode( 'en', 'English', 'ext-wikilambda-viewpage-header--iso-code' );
		$expected = Html::element(
			'span',
			[
				'data-title' => 'English',
				'class' => 'ext-wikilambda-viewpage-header--iso-code'
			],
			'en'
		);
		$this->assertIsString( $actual );

		// correctly generates iso code
		$this->assertSame( $expected, $actual );
	}
}
