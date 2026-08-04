<?php

/**
 * WikiLambda unit test suite for ZObjectListDiffer's pairing of list items
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests;

use MediaWiki\Extension\WikiLambda\Diff\DiffOpMove;
use MediaWiki\Extension\WikiLambda\Diff\ZObjectDiffer;
use MediaWikiUnitTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Diff\ZObjectListDiffer
 */
class ZObjectListDifferTest extends MediaWikiUnitTestCase {

	/**
	 * Diff two lists and return the operations found, as a map of dotted path to
	 * operation type — the same shape the authorization rules match against.
	 *
	 * Note that a move reports itself as a change, deliberately, so that the
	 * authorization rules keep applying to it; tell them apart by class.
	 *
	 * @param array $old
	 * @param array $new
	 * @return array<string,string>
	 */
	private function opTypesOf( array $old, array $new ): array {
		$flat = ZObjectDiffer::flattenDiff( ( new ZObjectDiffer() )->doDiff( $old, $new ) );
		$types = [];
		foreach ( $flat as $entry ) {
			$types[ implode( '.', $entry['path'] ) ] = $entry['op']->getType();
		}
		return $types;
	}

	/**
	 * The paths at which a re-ordering was reported.
	 *
	 * @param array $old
	 * @param array $new
	 * @return array
	 */
	private function movedPathsOf( array $old, array $new ): array {
		$moved = [];
		foreach ( $this->opsOf( $old, $new ) as $path => $op ) {
			if ( $op instanceof DiffOpMove ) {
				$moved[] = $path;
			}
		}
		return $moved;
	}

	/**
	 * @param array $old
	 * @param array $new
	 * @return array
	 */
	private function opsOf( array $old, array $new ): array {
		$ops = [];
		foreach ( ZObjectDiffer::flattenDiff( ( new ZObjectDiffer() )->doDiff( $old, $new ) ) as $entry ) {
			$ops[ implode( '.', $entry['path'] ) ] = $entry['op'];
		}
		return $ops;
	}

	public function testSwappedReferencesAreReportedAsMoves() {
		$ops = $this->opsOf(
			[ 'Z14', 'Z10003', 'Z10009' ],
			[ 'Z14', 'Z10009', 'Z10003' ]
		);

		// PHP coerces the numeric path keys to integers.
		$this->assertSame( [ 1, 2 ], array_keys( $ops ) );
		$this->assertInstanceOf( DiffOpMove::class, $ops[1] );
		$this->assertSame( 'Z10009', $ops[1]->getValue() );
		$this->assertSame( 2, $ops[1]->getOldIndex() );
		$this->assertSame( 1, $ops[1]->getNewIndex() );
		$this->assertSame( 'Z10003', $ops[2]->getValue() );
		$this->assertSame( 1, $ops[2]->getOldIndex() );
	}

	public function testReorderedMonolingualsArePairedByLanguage() {
		$monolingual = static fn ( string $language, string $text ): array => [
			'Z1K1' => 'Z11', 'Z11K1' => $language, 'Z11K2' => $text,
		];
		$old = [ 'Z11', $monolingual( 'Z1002', 'Mushroom' ), $monolingual( 'Z1004', 'Champignon' ) ];
		$new = [ 'Z11', $monolingual( 'Z1004', 'Champignon' ), $monolingual( 'Z1002', 'Mushroom' ) ];
		$types = $this->opTypesOf( $old, $new );

		$this->assertSame( [ 1 => 'change', 2 => 'change' ], $types );
		$this->assertSame( [ 1, 2 ], $this->movedPathsOf( $old, $new ) );
	}

	public function testUnchangedListReportsNothing() {
		$this->assertSame( [], $this->opTypesOf(
			[ 'Z14', 'Z10003', 'Z10009' ],
			[ 'Z14', 'Z10003', 'Z10009' ]
		) );
	}

	public function testDifferentItemsOfTheSameCountAreStillChanges() {
		// Membership differs, so nothing moved; this must keep reporting a change,
		// which for an attached list is what requires the connect and disconnect
		// rights.
		$this->assertSame(
			[ 1 => 'change' ],
			$this->opTypesOf( [ 'Z14', 'Z10003' ], [ 'Z14', 'Z10008' ] )
		);
	}

	public function testReorderingAlongsideAnAdditionFallsBackToPositions() {
		// A list that both grew and was re-ordered cannot be reported as moves,
		// because an addition and a removal cannot share one index.
		$this->assertSame( [], $this->movedPathsOf(
			[ 'Z14', 'Z10003', 'Z10009' ],
			[ 'Z14', 'Z10009', 'Z10003', 'Z10012' ]
		) );
	}

	public function testItemsSharingAJoinKeyFallBackToPositions() {
		// Two implementations of one function are indistinguishable by identity,
		// so they cannot be paired by it.
		$implementation = static fn ( string $function, string $code ): array => [
			'Z1K1' => 'Z14', 'Z14K1' => $function, 'Z14K3' => $code,
		];
		$this->assertSame( [], $this->movedPathsOf(
			[ 'Z14', $implementation( 'Z10001', 'a' ), $implementation( 'Z10001', 'b' ) ],
			[ 'Z14', $implementation( 'Z10001', 'b' ), $implementation( 'Z10001', 'a' ) ]
		) );
	}

	public function testItemThatMovedAndChangedIsReportedAsAChange() {
		$monolingual = static fn ( string $language, string $text ): array => [
			'Z1K1' => 'Z11', 'Z11K1' => $language, 'Z11K2' => $text,
		];
		$old = [ 'Z11', $monolingual( 'Z1002', 'Mushroom' ), $monolingual( 'Z1004', 'Champignon' ) ];
		$new = [ 'Z11', $monolingual( 'Z1004', 'Champignon' ), $monolingual( 'Z1002', 'Toadstool' ) ];

		// The French entry only moved; the English one moved and changed, and the
		// change to its text is what gets reported.
		$this->assertSame( [ 1 ], $this->movedPathsOf( $old, $new ) );
		$this->assertSame( 'change', $this->opTypesOf( $old, $new )['2.Z11K2'] );
	}
}
