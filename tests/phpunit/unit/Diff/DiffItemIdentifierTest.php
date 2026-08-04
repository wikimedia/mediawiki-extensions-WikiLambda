<?php

/**
 * WikiLambda unit test suite for the DiffItemIdentifier
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests;

use MediaWiki\Extension\WikiLambda\Diff\DiffItemIdentifier;
use MediaWiki\Extension\WikiLambda\Diff\DiffItemKeyer;
use MediaWiki\Extension\WikiLambda\Diff\DiffLabelResolver;
use MediaWikiUnitTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Diff\DiffItemIdentifier
 */
class DiffItemIdentifierTest extends MediaWikiUnitTestCase {

	private function newIdentifier(): DiffItemIdentifier {
		$labels = $this->createMock( DiffLabelResolver::class );
		$labels->method( 'getKeyLabel' )->willReturnCallback(
			static fn ( string $key ): string => [
				'Z14293K1' => 'function to use',
				'Z10000K1' => 'first argument',
				'Z14293K2' => 'for the following languages',
			][$key] ?? $key
		);
		$labels->method( 'getReference' )->willReturnCallback(
			static fn ( string $zid ): ?array => [
				'Z32270' => [ 'label' => 'subject is type of, Lorrain', 'url' => '/wiki/Z32270' ],
				'Z801' => [ 'label' => null, 'url' => '/wiki/Z801' ],
			][$zid] ?? null
		);
		$labels->method( 'getLanguage' )->willReturnCallback(
			static fn ( string $zid ): array => [
				'Z1002' => [ 'name' => 'English', 'code' => 'en', 'dir' => 'ltr' ],
			][$zid] ?? [ 'name' => $zid, 'code' => '', 'dir' => 'auto' ]
		);
		return new DiffItemIdentifier( $labels );
	}

	public function testReportedCaseIsNamedByItsFunction() {
		// The option added at index 17 of Z26096's list (T284473).
		$this->assertSame(
			'subject is type of, Lorrain',
			$this->newIdentifier()->getHandle( [
				'Z1K1' => 'Z14293',
				'Z14293K1' => 'Z32270',
				'Z14293K2' => [ 'Z60', 'Z2053' ],
			] )
		);
	}

	public function testMonolingualIsNamedByItsLanguage() {
		$this->assertSame(
			'English',
			$this->newIdentifier()->getHandle(
				[ 'Z1K1' => 'Z11', 'Z11K1' => 'Z1002', 'Z11K2' => 'Mushroom' ]
			)
		);
	}

	public function testMonolingualStringSetIsNamedByItsLanguage() {
		$this->assertSame(
			'English',
			$this->newIdentifier()->getHandle(
				[ 'Z1K1' => 'Z31', 'Z31K1' => 'Z1002', 'Z31K2' => [ 'Z6', 'a' ] ]
			)
		);
	}

	public function testArgumentDeclarationIsNamedByItsIdNotItsType() {
		// Z17K1 is the type, which every string argument in the wiki shares; the
		// argument id names precisely one.
		$this->assertSame(
			'first argument',
			$this->newIdentifier()->getHandle(
				[ 'Z1K1' => 'Z17', 'Z17K1' => 'Z6', 'Z17K2' => 'Z10000K1' ]
			)
		);
	}

	public function testKeyDeclarationIsNamedByItsIdNotItsType() {
		$this->assertSame(
			'for the following languages',
			$this->newIdentifier()->getHandle(
				[ 'Z1K1' => 'Z3', 'Z3K1' => 'Z6', 'Z3K2' => 'Z14293K2' ]
			)
		);
	}

	public function testImplementationIsNamedByItsFunction() {
		// The function sorts first, so the fallback reaches it unaided.
		$this->assertSame(
			'subject is type of, Lorrain',
			$this->newIdentifier()->getHandle(
				[ 'Z1K1' => 'Z14', 'Z14K1' => 'Z32270', 'Z14K2' => [ 'Z1K1' => 'Z7' ] ]
			)
		);
	}

	public function testFunctionIsNamedByItsIdentityNotItsArguments() {
		// A function's identity sorts last, behind an argument list that names
		// nothing.
		$this->assertSame(
			'subject is type of, Lorrain',
			$this->newIdentifier()->getHandle(
				[ 'Z1K1' => 'Z8', 'Z8K1' => [ 'Z17' ], 'Z8K2' => 'Z6', 'Z8K5' => 'Z32270' ]
			)
		);
	}

	public function testTypeWithoutAStatedKeyFallsBackToItsFirstKey() {
		$this->assertSame(
			'subject is type of, Lorrain',
			$this->newIdentifier()->getHandle(
				[ 'Z1K1' => 'Z99999', 'Z99999K1' => 'Z32270', 'Z99999K2' => 'other' ]
			)
		);
	}

	public function testStatedKeyThatIsAbsentFallsBackToTheFirstKey() {
		// A malformed argument declaration without its id still names something.
		$this->assertSame(
			'Z6',
			$this->newIdentifier()->getHandle( [ 'Z1K1' => 'Z17', 'Z17K1' => 'Z6' ] )
		);
	}

	public function testReferenceWithoutALabelIsNamedByItsZid() {
		$this->assertSame(
			'Z801',
			$this->newIdentifier()->getHandle( [ 'Z1K1' => 'Z14', 'Z14K1' => 'Z801' ] )
		);
	}

	public function testBareReferenceIsNamedByItsLabel() {
		$this->assertSame( 'subject is type of, Lorrain', $this->newIdentifier()->getHandle( 'Z32270' ) );
	}

	public function testShortStringNamesItself() {
		$this->assertSame( 'Mushroom', $this->newIdentifier()->getHandle( 'Mushroom' ) );
	}

	/**
	 * @dataProvider provideUnnameableItems
	 */
	public function testUnnameableItemGivesNull( $item ) {
		$this->assertNull( $this->newIdentifier()->getHandle( $item ) );
	}

	public static function provideUnnameableItems() {
		return [
			// Too long to read as a name in a breadcrumb.
			'long string' => [ str_repeat( 'a', 41 ) ],
			'empty string' => [ '' ],
			'null' => [ null ],
			'empty record' => [ [] ],
			// A nested structure identifies nothing readably.
			'record whose first key is a structure' => [
				[ 'Z1K1' => 'Z99999', 'Z99999K1' => [ 'Z1K1' => 'Z6', 'Z6K1' => 'x' ] ],
			],
			// A monolingual with no language cannot be keyed by one.
			'monolingual without a language' => [ [ 'Z1K1' => 'Z11', 'Z11K2' => 'Mushroom' ] ],
			// An anonymous function has no identity to name it by.
			'function without an identity' => [ [ 'Z1K1' => 'Z8', 'Z8K1' => [ 'Z17' ], 'Z8K2' => 'Z6' ] ],
			'record of nothing but its type' => [ [ 'Z1K1' => 'Z14293' ] ],
		];
	}

	public function testJoinKeyIsNotTheLocalisedHandle() {
		$item = [ 'Z1K1' => 'Z14293', 'Z14293K1' => 'Z32270' ];

		// The same notion of identity, resolved for a reader versus left exact.
		$this->assertSame( 'subject is type of, Lorrain', $this->newIdentifier()->getHandle( $item ) );
		$this->assertSame( 'Z32270', DiffItemKeyer::getJoinKey( $item ) );
	}

	public function testHandleIsPlainTextNotHtml() {
		$this->assertSame(
			'<script>alert(1)</script>',
			$this->newIdentifier()->getHandle( '<script>alert(1)</script>' )
		);
	}
}
