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
		 * TODO (T436773): Re-ordering is only detected where the two lists hold the
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
		 * O(n*m) full recursive diffs, even where unpairedIndices() has already
		 * said which item was added or removed. Only its guess is skipped, not
		 * its work.
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
				// find which rows have been deleted. The join keys say so
				// exactly where they can; failing that, fall back to the
				// rows with a larger number of edits.
				$deletedIndices = $this->unpairedIndices( $oldArray, $newArray )
					?? $matrix->getIndicesOfRemovedItems();
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
				// find which columns have been added. The join keys say so
				// exactly where they can; failing that, fall back to the
				// columns with a larger number of edits.
				$addedIndices = $this->unpairedIndices( $newArray, $oldArray )
					?? $matrix->getIndicesOfAddedItems();
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
	 * The indices of the items one list holds that the other does not, by their
	 * join keys, or null where the keys cannot say.
	 *
	 * DiffMatrix has to guess this from edit counts, and its guess is that the
	 * added or removed item is whichever has no identical counterpart and differs
	 * most from everything on the other side. An item edited in place answers that
	 * description too, and being edited makes it differ more, so it wins: editing
	 * one alias set of eight languages reports the language edited as newly added,
	 * shifts every language after it by one, and turns a change of one entry into
	 * a change of all of them. Join keys tell the two cases apart, because an item
	 * keeps its key when its content changes.
	 *
	 * This answers only for lists whose every item carries a key of its own, since
	 * an item that cannot be keyed might be the one that went, and only where the
	 * keys account for the whole change of length. A list that both gained and lost
	 * items needs a removal addressed in the old list's index space and an addition
	 * in the new list's at once, which a Diff cannot hold; that is left to the guess
	 * along with everything else the keys cannot settle.
	 *
	 * @param array $items The longer list: the one holding the unpaired items
	 * @param array $others The shorter list
	 * @return int[]|null Indices into $items, ascending
	 */
	private function unpairedIndices( array $items, array $others ): ?array {
		$keys = DiffItemKeyer::uniqueJoinKeys( $items );
		$otherKeys = DiffItemKeyer::uniqueJoinKeys( $others );
		if ( count( $keys ) !== count( $items ) || count( $otherKeys ) !== count( $others ) ) {
			return null;
		}

		$unpaired = array_values( array_diff_key( $keys, $otherKeys ) );
		return ( count( $unpaired ) === count( $items ) - count( $others ) ) ? $unpaired : null;
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
