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
}
