<?php
/**
 * WikiLambda ZObjectListDiffer. Implements doDiff to calculate the diff
 * between two non-associative arrays or lists.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Diff;

use Diff\Differ\Differ;
use Diff\DiffOp\DiffOp;
use Diff\DiffOp\DiffOpAdd;
use Diff\DiffOp\DiffOpRemove;
use Exception;

class ZObjectListDiffer implements Differ {

	private ZObjectDiffer $zObjectDiffer;

	/**
	 * Setter for the differ service that will calculate
	 * the diffs for every idem of the list.
	 *
	 * @param ZObjectDiffer $zObjectDiffer
	 */
	public function setZObjectDiffer( ZObjectDiffer $zObjectDiffer ): void {
		$this->zObjectDiffer = $zObjectDiffer;
	}

	/**
	 * @see Differ::doDiff
	 *
	 * Compares the difference between two Typed Lists
	 *
	 * @param array $oldArray The first array
	 * @param array $newArray The second array
	 *
	 * @throws Exception
	 * @return DiffOp[]
	 */
	public function doDiff( array $oldArray, array $newArray ): array {
		// 0. If both lists hold the same identifiable items in a different order,
		//    pair them up by identity rather than by position.
		$permutation = $this->permutationDiff( $oldArray, $newArray );
		if ( $permutation !== null ) {
			return $permutation;
		}

		// 1. Compare length of arrays
		// 2. If the length is the same, go item by item and diff them
		// 		using $this->zObjectDiffer;
		// 3. If the length is not the same then wtf.

		$listDiff = [];

		/**
		 * TODO (T338250): Re-ordering is only detected where the two lists hold the
		 * same identifiable items, which permutationDiff() has already handled by
		 * the time we get here. Two gaps remain.
		 *
		 * A list that was both re-ordered and added to or removed from still
		 * reports position by position. Telling those apart means addressing a
		 * removal in the old list's index space and an addition in the new list's
		 * at the same time, which a Diff cannot hold, since it keys one operation
		 * per index. It would need the operations to carry their own addressing
		 * rather than taking it from their key — a change visible to
		 * ZObjectAuthorization, whose rules match paths containing those indices.
		 *
		 * And DiffMatrix below still diffs every old item against every new one,
		 * O(n*m) full recursive diffs, to guess which items were added or removed.
		 * Pairing the identifiable items first would leave it only the remainder to
		 * guess at, which is both cheaper and more accurate.
		 */

		// If $newArray and $oldArray have the same number of items,
		// check diff one by one using ZObjectDiffer
		if ( count( $oldArray ) === count( $newArray ) ) {
			for ( $index = 0; $index < count( $oldArray ); $index++ ) {
				$oldItem = $oldArray[ $index ];
				$newItem = $newArray[ $index ];

				$itemDiff = $this->zObjectDiffer->doDiff( $oldItem, $newItem );

				if ( $itemDiff->isAtomic() || ( $itemDiff->count() > 0 ) ) {
					$listDiff[ $index ] = $itemDiff;
				}
			}
		} else {
			$matrix = new DiffMatrix( $this->zObjectDiffer, $oldArray, $newArray );

			if ( count( $oldArray ) > count( $newArray ) ) {
				// If $oldArray has more items than $newArray, the
				// matrix has more rows than colums, so we need to
				// find which rows have been deleted by finding the
				// n ones with a larger number of edits.
				$deletedIndices = $matrix->getIndicesOfRemovedItems();
				for ( $index = 0; $index < count( $oldArray ); $index++ ) {
					if ( in_array( $index, $deletedIndices ) ) {
						// If this is one of the deleted items, create Remove operation:
						$listDiff[ $index ] = new DiffOpRemove( $oldArray[ $index ] );
					} else {
						// If this is one of the non deleted items, add any changes
						// available in the appropriate position of the matrix:
						$normalizer = $matrix->getNormalizer( $deletedIndices, $index );
						$colIndex = $index - $normalizer;
						if ( $matrix->hasDiffOps( $index, $colIndex ) ) {
							$listDiff[ $index ] = $matrix->getDiffOps( $index, $colIndex );
						}
					}
				}
			} else {
				// If $newArray has more items than $oldArray, the
				// matrix has more colums than rows, and we need to
				// find which columns have been added by finding the
				// n ones with a larger number of edits.
				$addedIndices = $matrix->getIndicesOfAddedItems();
				for ( $index = 0; $index < count( $newArray ); $index++ ) {
					if ( in_array( $index, $addedIndices ) ) {
						// If this is one of the deleted items, create Add operation:
						$listDiff[ $index ] = new DiffOpAdd( $newArray[ $index ] );
					} else {
						// If this is one of the non deleted items, add any changes
						// available in the appropriate position of the matrix:
						$normalizer = $matrix->getNormalizer( $addedIndices, $index );
						$rowIndex = $index - $normalizer;
						if ( $matrix->hasDiffOps( $rowIndex, $index ) ) {
							$listDiff[ $index ] = $matrix->getDiffOps( $rowIndex, $index );
						}
					}
				}
			}
		}
		return $listDiff;
	}

	/**
	 * Diff two lists that hold the same items in a different order, reporting what
	 * moved rather than what each position now holds.
	 *
	 * Pairing by position makes a re-ordering look like a change to every position
	 * the moved item passed, which describes the positions rather than the item,
	 * and for a list where order carries meaning — which implementation of a
	 * function is preferred, say — hides the only thing that actually happened.
	 *
	 * This applies only where every item on both sides carries a join key of its
	 * own and the two sides carry the same set of them, which is what makes the
	 * pairing certain rather than a guess. Anything else — an item that cannot be
	 * keyed, two items sharing a key, a list that changed length or membership —
	 * is left to the positional pass. That leaves a list which was both re-ordered
	 * and added to reported as it is today; separating those needs an operation
	 * addressed in both lists' index spaces at once, which the diff structure,
	 * holding one operation per index, cannot express.
	 *
	 * Where an item both moved and changed, the change is reported and the move is
	 * not: the row is headed by the item either way, and its content changing is
	 * the more informative half.
	 *
	 * @param array $oldArray
	 * @param array $newArray
	 * @return array|null Null when the two lists are not a re-ordering of one set
	 *   of identifiable items, and must be paired up by position instead
	 */
	private function permutationDiff( array $oldArray, array $newArray ): ?array {
		if ( count( $oldArray ) !== count( $newArray ) ) {
			return null;
		}

		$oldKeys = DiffItemKeyer::uniqueJoinKeys( $oldArray );
		$newKeys = DiffItemKeyer::uniqueJoinKeys( $newArray );
		if ( count( $oldKeys ) !== count( $oldArray )
			|| count( $newKeys ) !== count( $newArray )
			|| array_diff_key( $oldKeys, $newKeys ) !== []
		) {
			return null;
		}

		// Same items, same places: nothing moved, so let the positional pass
		// report any content changes exactly as it always has.
		if ( $oldKeys === $newKeys ) {
			return null;
		}

		$listDiff = [];
		foreach ( $newKeys as $key => $newIndex ) {
			$oldIndex = $oldKeys[$key];
			$itemDiff = $this->zObjectDiffer->doDiff( $oldArray[$oldIndex], $newArray[$newIndex] );

			if ( $itemDiff->isAtomic() || ( $itemDiff->count() > 0 ) ) {
				$listDiff[$newIndex] = $itemDiff;
			} elseif ( $oldIndex !== $newIndex ) {
				$listDiff[$newIndex] = new DiffOpMove( $newArray[$newIndex], $oldIndex, $newIndex );
			}
		}

		// Report in list order, as the positional pass does.
		ksort( $listDiff );
		return $listDiff;
	}
}
