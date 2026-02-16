<?php

/**
 * WikiLambda unit test suite for the ZObjectUtils file
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentUtils;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentUtils
 * @group Database
 */
class AbstractContentUtilsTest extends WikiLambdaIntegrationTestCase {
	/**
	 * @dataProvider provideIsValidWikidataItemReference
	 */
	public function testIsValidWikidataItemReference( $input, $expected ) {
		$this->assertSame( $expected, AbstractContentUtils::isValidWikidataItemReference( $input ) );
	}

	public static function provideIsValidWikidataItemReference() {
		return [
			'empty string' => [ '', false ],
			'ZID' => [ 'Z12345', false ],
			'Lexeme Id' => [ 'L12345', false ],
			'Not wellformed QID' => [ 'Q123-foo', false ],
			'QID with whitespaces' => [ ' Q12345 ', false ],
			'Simple Qid' => [ 'Q12345', true ],
			'Big QID' => [ 'Q1234567890', true ],
			'Null QID' => [ 'Q0', false ],
		];
	}

	public function testIsNullWikidataItemReference() {
		$this->assertFalse( AbstractContentUtils::isNullWikidataItemReference( 'foo' ) );
		$this->assertFalse( AbstractContentUtils::isNullWikidataItemReference( 'Q12345' ) );
		$this->assertTrue( AbstractContentUtils::isNullWikidataItemReference( 'Q0' ) );
	}

	/**
	 * @dataProvider provideIsValidAbstractWikiTitle
	 */
	public function testIsValidAbstractWikiTitle( $input, $expected ) {
		$this->assertSame( $expected, AbstractContentUtils::isValidAbstractWikiTitle( $input ) );
	}

	public static function provideIsValidAbstractWikiTitle() {
		return [
			'empty string' => [ '', false ],
			'ZID' => [ 'Z12345', false ],
			'Lexeme Id' => [ 'L12345', false ],
			'Null QID' => [ 'Q0', false ],
			'namespace:title' => [ 'foo:bar', false ],
			'Vimple QID' => [ 'Q12345', true ],
			'Valid Namespace:QID' => [ 'Abstract Wikipedia:Q12345', true ]
		];
	}

	/**
	 * @dataProvider provideMakeCacheForAbstractFragment
	 */
	public function testMakeCacheForAbstractFragment( $input, $expected ) {
		$this->assertEquals( $expected, AbstractContentUtils::makeCacheKeyForAbstractFragment( $input ) );
	}

	public static function provideMakeCacheForAbstractFragment() {
		yield 'Literal html' => [
			json_decode( '{ "Z1K1": "Z89", "Z89K1": "<b>Testing</b>" }' ),
			'Z1K1|Z89,Z89K1|<b>Testing</b>,'
		];

		yield 'Simple fragment' => [
			json_decode( '{ "Z1K1": "Z7", "Z7K1": "Z801", "Z801K1": "<b>Testing</b>" }' ),
			'Z1K1|Z7,Z7K1|Z801,Z801K1|<b>Testing</b>,'
		];

		yield 'More complex fragment' => [
			json_decode( '{ "Z1K1": "Z7", "Z7K1": "Z27868",'
				. '"Z27868K1": { "Z1K1": "Z7", "Z7K1": "Z23753",'
				. ' "Z23753K1": { "Z1K1": "Z18", "Z18K1": "Z825K1" },'
				. ' "Z23753K2": { "Z1K1": "Z18", "Z18K1": "Z825K2" } } }' ),
			'Z1K1|Z7,Z7K1|Z27868,Z27868K1|Z1K1|Z7,Z7K1|Z23753,Z23753K1|Z1K1|Z18,'
				. 'Z18K1|Z825K1,,Z23753K2|Z1K1|Z18,Z18K1|Z825K2,,,'
		];
	}
}
