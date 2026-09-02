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

	/**
	 * An alias set: a monolingual string set of one language.
	 *
	 * The tests below use alias sets rather than plain monolingual strings
	 * because the edit-count guess only goes wrong where one item can differ
	 * from the rest by much more than another does, and an item holding a list
	 * of its own is what makes that possible. It is also where this was found.
	 *
	 * @param string $language
	 * @param string[] $aliases
	 * @return array
	 */
	private function aliasSet( string $language, array $aliases ): array {
		return [
			'Z1K1' => 'Z31',
			'Z31K1' => $language,
			'Z31K2' => array_merge( [ 'Z6' ], $aliases ),
		];
	}

	public function testEditedItemIsNotMistakenForTheAddedOne() {
		// The edit-count guess asks which item has no identical counterpart and
		// differs most from the other side. An item edited in place answers that
		// too, and being edited makes it differ more, so it wins over the item
		// that really is new. Every item after it then shifts by one, and a
		// change of one entry reports as a change of all of them.
		$old = [
			'Z31',
			$this->aliasSet( 'Z1002', [ 'a', 'b', 'c' ] ),
			$this->aliasSet( 'Z1004', [ 'f' ] ),
		];
		$new = [
			'Z31',
			$this->aliasSet( 'Z1002', [ 'x', 'y', 'z' ] ),
			$this->aliasSet( 'Z1004', [ 'f' ] ),
			$this->aliasSet( 'Z1732', [ 'h' ] ),
		];

		// Only the English aliases changed, and only the last entry is new. In
		// particular no entry reports a change of language.
		$this->assertSame(
			[
				'1.Z31K2.1' => 'change',
				'1.Z31K2.2' => 'change',
				'1.Z31K2.3' => 'change',
				3 => 'add',
			],
			$this->opTypesOf( $old, $new )
		);
	}

	public function testItemAddedInTheMiddleDoesNotShiftTheOnesAfterIt() {
		$old = [
			'Z31',
			$this->aliasSet( 'Z1002', [ 'a', 'b', 'c' ] ),
			$this->aliasSet( 'Z1004', [ 'f' ] ),
		];
		$new = [
			'Z31',
			$this->aliasSet( 'Z1002', [ 'x', 'y', 'z' ] ),
			$this->aliasSet( 'Z1732', [ 'h' ] ),
			$this->aliasSet( 'Z1004', [ 'f' ] ),
		];

		// The French entry is untouched even though it is now one place further
		// down, so it must report nothing.
		$this->assertSame(
			[
				'1.Z31K2.1' => 'change',
				'1.Z31K2.2' => 'change',
				'1.Z31K2.3' => 'change',
				2 => 'add',
			],
			$this->opTypesOf( $old, $new )
		);
	}

	public function testRemovedItemIsFoundByItsKeyNotByEditCount() {
		$old = [
			'Z31',
			$this->aliasSet( 'Z1002', [ 'a', 'b', 'c' ] ),
			$this->aliasSet( 'Z1004', [ 'f' ] ),
			$this->aliasSet( 'Z1005', [ 'g' ] ),
		];
		$new = [
			'Z31',
			$this->aliasSet( 'Z1002', [ 'x', 'y', 'z' ] ),
			$this->aliasSet( 'Z1005', [ 'g' ] ),
		];

		// The French entry went; the English one was edited, not removed.
		$this->assertSame(
			[
				'1.Z31K2.1' => 'change',
				'1.Z31K2.2' => 'change',
				'1.Z31K2.3' => 'change',
				2 => 'remove',
			],
			$this->opTypesOf( $old, $new )
		);
	}

	public function testListThatBothGainedAndLostItemsFallsBackToPositions() {
		// The keys leave two entries unpaired but the list only grew by one, so
		// they do not account for the change on their own and the edit-count
		// guess still has to decide. It must still report the addition.
		$old = [
			'Z31',
			$this->aliasSet( 'Z1002', [ 'a', 'b', 'c' ] ),
			$this->aliasSet( 'Z1004', [ 'f' ] ),
		];
		$new = [
			'Z31',
			$this->aliasSet( 'Z1002', [ 'a', 'b', 'c' ] ),
			$this->aliasSet( 'Z1005', [ 'g' ] ),
			$this->aliasSet( 'Z1732', [ 'h' ] ),
		];

		$this->assertContains( 'add', $this->opTypesOf( $old, $new ) );
	}

	public function testItemsSharingAJoinKeyStillFallBackToPositions() {
		// Two implementations of one function cannot be told apart by identity,
		// so which of them is the new one stays a guess.
		$implementation = static fn ( string $function, string $code ): array => [
			'Z1K1' => 'Z14', 'Z14K1' => $function, 'Z14K3' => $code,
		];
		$this->assertContains( 'add', $this->opTypesOf(
			[ 'Z14', $implementation( 'Z10001', 'a' ) ],
			[ 'Z14', $implementation( 'Z10001', 'a' ), $implementation( 'Z10001', 'b' ) ]
		) );
	}
}
