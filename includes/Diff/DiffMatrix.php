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

use Diff\DiffOp\Diff\Diff;
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
				$itemEditCount = count( $itemDiff );

				// We set the diff and diff count collections of this class
				$this->diffMatrix[ $i ][ $j ] = $itemDiff;
				$this->diffCountMatrix[ $i ][ $j ] = $itemEditCount;
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
	 * @return DiffOp
	 */
	public function getDiffOps( int $row, int $col ): DiffOp {
		return (
			( $row >= count( $this->diffMatrix ) ) ||
			( $col >= count( $this->diffMatrix[ $row ] ) )
		) ? new Diff( [] ) : $this->diffMatrix[ $row ][ $col ];
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
	 * Return the indices of the rows (old values) that were most edited,
	 * which will be the ones most likely removed in the case that oldArray
	 * has more items than newArray.
	 * The number of indices returned is always the difference between
	 * number of old items and number of new items.
	 *
	 * @return int[]
	 */
	public function getIndicesOfRemovedItems(): array {
		$numItems = count( $this->oldArray ) - count( $this->newArray );
		return $this->getIndicesOfMax( $this->editCountByRow, $numItems );
	}

	/**
	 * Return the indices of the cols (new values) that were most edited,
	 * which will be the ones most likely added in the case that oldArray
	 * has less items than newArray.
	 * The number of indices returned is always the difference between
	 * number of new items and number of old items.
	 *
	 * @return int[]
	 */
	public function getIndicesOfAddedItems(): array {
		$numItems = count( $this->newArray ) - count( $this->oldArray );
		return $this->getIndicesOfMax( $this->editCountByCol, $numItems );
	}

	/**
	 * Helper function to get the indices of the n highest values from a
	 * given array. In case of two equal values, the returned index will
	 * be the first one found.
	 *
	 * @param int[] $vector
	 * @param int $numItems
	 * @return array
	 */
	private function getIndicesOfMax( array $vector, int $numItems ): array {
		$vectorCopy = array_merge( [], $vector );
		uasort(
			$vectorCopy,
			static function ( int $a, int $b ) {
				return ( $a == $b ) ? 0 : ( ( $a < $b ) ? 1 : -1 );
			}
		);
		return array_slice( array_keys( $vectorCopy ), 0, $numItems );
	}

	/**
	 * Return integer that calculates the correct row or column index
	 * to access a particular matrix element depending on the items
	 * that have been removed or added in the diff.
	 *
	 * @param int[] $indices
	 * @param int $index
	 * @return int
	 */
	public function getNormalizer( array $indices, int $index ): int {
		return count( array_filter(
			$indices, static function ( int $i ) use ( $index ) {
				return ( $i < $index );
			}
		) );
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
