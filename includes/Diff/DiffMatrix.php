<?php
/**
 * WikiLambda DiffMatrix utility class to compute differences
 * between two lists with different number of items.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Diff;

use Diff\DiffOp\DiffOp;

class DiffMatrix {

	/** @var ZObjectDiffer */
	private $zObjectDiffer;

	/** @var array */
	private $oldArray;

	/** @var array */
	private $newArray;

	/** @var array Matrix with all the DiffOps found for every combination of old and new items. */
	private $diffMatrix = [];

	/** @var array Matrix with all the DiffOps count for every combination of old and new items. */
	private $diffCountMatrix = [];

	/** @var array List of sums of edit counts for every row. */
	private $editCountByRow;

	/** @var array List of sums of edit counts for every column. */
	private $editCountByCol;

	/**
	 * Creates a DiffMatrix object between an array of old values and an array of new values.
	 * This class also exposes utilities to operate on row and col edit counts and find items
	 * that have been deleted, added or changed positions.
	 *
	 * @param ZObjectDiffer $zObjectDiffer injected ZObjectDiffer to calculate diff between list items
	 * @param array $oldArray
	 * @param array $newArray
	 */
	public function __construct( ZObjectDiffer $zObjectDiffer, array $oldArray, array $newArray ) {
		$this->zObjectDiffer = $zObjectDiffer;
		$this->oldArray = $oldArray;
		$this->newArray = $newArray;
		$this->calculateDiffMatrix();
	}

	/**
	 * Iterates over rows and colums and generates both
	 * the matrix of DiffOps and the matrix of edit counts.
	 */
	private function calculateDiffMatrix(): void {
		// Initialize edit count by row and by column
		$this->editCountByRow = $this->zeroArray( count( $this->oldArray ) );
		$this->editCountByCol = $this->zeroArray( count( $this->newArray ) );

		// For every old item...
		for ( $i = 0; $i < count( $this->oldArray ); $i++ ) {
			$oldItem = $this->oldArray[ $i ];

			// ... we calculate its diff with every new item.
			for ( $j = 0; $j < count( $this->newArray ); $j++ ) {
				$newItem = $this->newArray[ $j ];
				$itemDiff = $this->zObjectDiffer->doDiff( $oldItem, $newItem );

				// We set the diff and diff count collections of this class
				$this->diffMatrix[ $i ][ $j ] = $itemDiff;
				$this->diffCountMatrix[ $i ][ $j ] = count( $itemDiff );
				// FIXME: count of edits cannot be done so simply as to count the roots,
				// we need either to implement a diff counter, or to directly do the
				// translation from tree of diff into list of diffs before the return of
				// zobjectDiffer->doDiff() and zobjectMapDiffer->doDiff()
				$itemEditCount = count( $itemDiff );
				$this->editCountByRow[ $i ] += $itemEditCount;
				$this->editCountByCol[ $j ] += $itemEditCount;
			}
		}
	}

	/**
	 * Get the set of DiffOps saved in the matrix by row and column indices
	 *
	 * @param int $row
	 * @param int $col
	 * @return DiffOp[]
	 */
	public function getDiffOps( int $row, int $col ): array {
		return (
			( $row >= count( $this->diffMatrix ) ) ||
			( $col >= count( $this->diffMatrix[ $row ] ) )
		) ? [] : $this->diffMatrix[ $row ][ $col ];
	}

	/**
	 * Whether the matrix position given by row and colum registers
	 * any diffs or not
	 *
	 * @param int $row
	 * @param int $col
	 * @return bool
	 */
	public function hasDiffOps( int $row, int $col ): bool {
		return (
			( $row >= count( $this->diffCountMatrix ) ) ||
			( $col >= count( $this->diffCountMatrix[ $row ] ) )
		) ? false : ( $this->diffCountMatrix[ $row ][ $col ] > 0 );
	}

	/**
	 * Get the set of edit counts for every row.
	 *
	 * @return int[]
	 */
	public function getEditCountByRow(): array {
		return $this->editCountByRow;
	}

	/**
	 * Get the set of edit counts for every column.
	 *
	 * @return int[]
	 */
	public function getEditCountByCol(): array {
		return $this->editCountByCol;
	}

	/**
	 * Return the index of the row (old values) that was most edited,
	 * which will be the one most likely removed in the case that oldArray
	 * has more items than newArray.
	 *
	 * @return int
	 */
	public function getIndexOfMostEditedRow(): int {
		return $this->getIndexOfMax( $this->editCountByRow );
	}

	/**
	 * Return the index of the col (new values) that was most edited,
	 * which will be the one most likely added in the case that oldArray
	 * has less items than newArray.
	 *
	 * @return int
	 */
	public function getIndexOfMostEditedCol(): int {
		return $this->getIndexOfMax( $this->editCountByCol );
	}

	/**
	 * Helper function to get the index of the highest integer from the
	 * given array. In case of two equal values, the returned index will
	 * be the first one found.
	 *
	 * @param int[] $numbers
	 * @return int
	 */
	private function getIndexOfMax( $numbers ): int {
		$max = 0;
		$maxIndex = 0;
		for ( $i = 0; $i < count( $numbers ); $i++ ) {
			if ( $numbers[$i] > $max ) {
				$max = $numbers[$i];
				$maxIndex = $i;
			}
		}
		return $maxIndex;
	}

	/**
	 * Return an array of n number of zeros. This function helps us
	 * initialize the arrays of edit count by row and by column.
	 *
	 * @param int $n
	 * @return int[]
	 */
	private function zeroArray( int $n ): array {
		$zeroArray = [];
		for ( $i = 0; $i < $n; $i++ ) {
			$zeroArray[] = 0;
		}
		return $zeroArray;
	}

	/**
	 * Returns a string representing the matrix of edit counts.
	 *
	 * @return string
	 */
	public function __toString(): string {
		$string = "";
		foreach ( $this->diffCountMatrix as $row ) {
			$string .= json_encode( $row );
			$string .= "\n";
		}
		return $string;
	}
}
