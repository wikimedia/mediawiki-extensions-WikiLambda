<?php

/**
 * WikiLambda unit test suite for the DiffItemKeyer
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests;

use MediaWiki\Extension\WikiLambda\Diff\DiffItemKeyer;
use MediaWikiUnitTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Diff\DiffItemKeyer
 */
class DiffItemKeyerTest extends MediaWikiUnitTestCase {

	/**
	 * @dataProvider provideJoinKeys
	 */
	public function testGetJoinKey( $item, ?string $expected ) {
		$this->assertSame( $expected, DiffItemKeyer::getJoinKey( $item ) );
	}

	public static function provideJoinKeys() {
		return [
			// A reference keys on its ZID, never on the label a handle would use.
			'bare reference' => [ 'Z32270', 'Z32270' ],
			'plain string' => [ 'Mushroom', 'Mushroom' ],
			// A long string is unreadable as a handle but perfectly good as a key.
			'long string' => [ str_repeat( 'a', 41 ), str_repeat( 'a', 41 ) ],
			'monolingual' => [
				[ 'Z1K1' => 'Z11', 'Z11K1' => 'Z1002', 'Z11K2' => 'Mushroom' ],
				'Z1002',
			],
			'monolingual string set' => [
				[ 'Z1K1' => 'Z31', 'Z31K1' => 'Z1002', 'Z31K2' => [ 'Z6', 'a' ] ],
				'Z1002',
			],
			'argument declaration' => [
				[ 'Z1K1' => 'Z17', 'Z17K1' => 'Z6', 'Z17K2' => 'Z10000K1' ],
				'Z10000K1',
			],
			'record keyed on its first key' => [
				[ 'Z1K1' => 'Z14293', 'Z14293K1' => 'Z32270' ],
				'Z32270',
			],
			// An implementation states no key of its own: the function it belongs
			// to sorts first, so the fallback reaches it.
			'implementation' => [
				[ 'Z1K1' => 'Z14', 'Z14K1' => 'Z32270', 'Z14K3' => [ 'Z1K1' => 'Z16' ] ],
				'Z32270',
			],
			// A function's identity sorts last, behind its arguments.
			'function' => [
				[ 'Z1K1' => 'Z8', 'Z8K1' => [ 'Z17' ], 'Z8K2' => 'Z6', 'Z8K5' => 'Z32270' ],
				'Z32270',
			],
			'error type' => [
				[ 'Z1K1' => 'Z50', 'Z50K1' => [ 'Z3' ], 'Z50K2' => 'Z500' ],
				'Z500',
			],
			// An anonymous function has no identity to key on, and an argument
			// list keys nothing, so it can only be paired by its position.
			'function without an identity' => [
				[ 'Z1K1' => 'Z8', 'Z8K1' => [ 'Z17' ], 'Z8K2' => 'Z6' ],
				null,
			],
			'empty string' => [ '', null ],
			'null' => [ null, null ],
			'empty record' => [ [], null ],
			'monolingual without a language' => [ [ 'Z1K1' => 'Z11', 'Z11K2' => 'x' ], null ],
			'record whose identifying value is a structure' => [
				[ 'Z1K1' => 'Z14293', 'Z14293K1' => [ 'Z1K1' => 'Z6', 'Z6K1' => 'x' ] ],
				null,
			],
		];
	}

	public function testUniqueJoinKeysIncludesTheLeadingTypeReference() {
		$this->assertSame(
			[ 'Z14' => 0, 'Z10021' => 1, 'Z10023' => 2 ],
			DiffItemKeyer::uniqueJoinKeys( [ 'Z14', 'Z10021', 'Z10023' ] )
		);
	}

	public function testUniqueJoinKeysDropsSharedAndUnkeyableItems() {
		// Two implementations of one function share a key, so neither can be
		// paired by it; the third has no key at all.
		$items = [
			'Z14',
			[ 'Z1K1' => 'Z14', 'Z14K1' => 'Z10001' ],
			[ 'Z1K1' => 'Z14', 'Z14K1' => 'Z10001' ],
			[ 'Z1K1' => 'Z14', 'Z14K1' => 'Z10002' ],
			[ 'Z1K1' => 'Z14' ],
		];

		$this->assertSame(
			[ 'Z14' => 0, 'Z10002' => 3 ],
			DiffItemKeyer::uniqueJoinKeys( $items )
		);
	}
}
