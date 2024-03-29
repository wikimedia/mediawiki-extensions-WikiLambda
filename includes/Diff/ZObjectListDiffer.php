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
		// 1. Compare length of arrays
		// 2. If the length is the same, go item by item and diff them
		// 		using $this->zObjectDiffer;
		// 3. If the length is not the same then wtf.

		$listDiff = [];

		/**
		 * TODO (T338250): According to T312259 the items in a list can be reordered.
		 *
		 * Current implementation will find diffs between the items on the
		 * same position when the two lists have identical length.
		 *
		 * If we want to find position changes and flag them as such, we
		 * should calculate the edit matrix also when the count of elements
		 * is the same in $newArray and $oldArray.
		 *
		 * This would give us some matrix edit count like the following:
		 *
		 * | 0 1 1 |
		 * | 1 1 0 |
		 * | 1 0 1 |
		 *
		 * Where the zero edits are not in the matrix diagonal. This would
		 * probably flag a couple of indexChange edits such as:
		 *
		 * [ list.1, indexChange, [1, 2] ]
		 * [ list.2, indexChange, [2, 1] ]
		 *
		 * However, this means that for equal length arrays the complexity
		 * of finding a diff would directly go from O(n) to O(n2).
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
}
