<?php
/**
 * WikiLambda ZObjectListDiffer. Implements doDiff to calculate the diff
 * between two non-associative arrays or lists.
 *
 * TODO: Consider creating a special operation for list type change when
 * the diff is detected on the first item of the arrays (Benjamin arrays)
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Diff;

use Diff\Differ\Differ;
use Diff\DiffOp\Diff\Diff;
use Diff\DiffOp\DiffOp;
use Diff\DiffOp\DiffOpAdd;
use Diff\DiffOp\DiffOpRemove;
use Exception;

class ZObjectListDiffer implements Differ {

	/** @var ZObjectDiffer */
	private $zObjectDiffer;

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
		 * FIXME: According to T312259 the items in a list can be reordered.
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
				if ( count( $itemDiff ) > 0 ) {
					$listDiff[ $index ] = new Diff( $itemDiff, false );
				}
			}
		} else {
			$matrix = new DiffMatrix( $this->zObjectDiffer, $oldArray, $newArray );

			if ( count( $oldArray ) > count( $newArray ) ) {
				// If $oldArray has more items than $newArray, the
				// matrix has more rows than colums, so we need to
				// find which row has been deleted by finding the
				// row with a larger number of edits.
				$deletedIndex = $matrix->getIndexOfMostEditedRow();
				for ( $index = 0; $index < count( $oldArray ); $index++ ) {
					if ( $index === $deletedIndex ) {
						$listDiff[ $index ] = new DiffOpRemove( $oldArray[ $index ] );
					} else {
						// There is an extra row in the matrix to make it square,
						// so we recalculate the row index
						$rowIndex = $index > $deletedIndex ? $index + 1 : $index;
						// FIXME: when we return the diffOps of the rows after the
						// deletion should we report a index change diff as well?
						if ( $matrix->hasDiffOps( $rowIndex, $index ) ) {
							$listDiff[ $index ] = new Diff( $matrix->getDiffOps( $rowIndex, $index ) );
						}
					}
				}
			} else {
				// If $newArray has more items than $oldArray, the
				// matrix has more colums than rows, and we need to
				// find which column has been deleted by finding the
				// column with a larger number of edits.
				$addedIndex = $matrix->getIndexOfMostEditedCol();
				for ( $index = 0; $index < count( $newArray ); $index++ ) {
					if ( $index === $addedIndex ) {
						$listDiff[ $index ] = new DiffOpAdd( $newArray[ $index ] );
					} else {
						// There is an extra column in the matrix for it to be
						// square, so we recalculate the col index.
						$colIndex = $index > $addedIndex ? $index + 1 : $index;
						if ( $matrix->hasDiffOps( $index, $colIndex ) ) {
							$listDiff[ $index ] = new Diff( $matrix->getDiffOps( $index, $colIndex ) );
						}
					}
				}
			}
		}

		return $listDiff;
	}

}
