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
	public function __construct(
		private readonly ZObjectDiffer $zObjectDiffer,
		private readonly array $oldArray,
		private readonly array $newArray
	) {
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
	 * Returns the indices of the old items that were most probably deleted, by looking
	 * at the matrix's rows and finding out which one or ones are the items most distinct
	 * from their previous version.
	 *
	 * The matrix is represented by new items in their columns and old items in its
	 * rows, so when we see more columns than rows, we are calculating additions,
	 * and when we see more rows than columns, we are calculating deletions.
	 *
	 * @return int[]
	 */
	public function getIndicesOfRemovedItems(): array {
		$numItems = count( $this->oldArray ) - count( $this->newArray );
		return $this->getIndicesOfMaxEdits( $this->diffCountMatrix, $numItems );
	}

	/**
	 * Returns the indices of the new items that were most probably added, by looking
	 * at the matrix's columns and finding out which ones are the items most distinct
	 * from their previous version.
	 *
	 * The matrix is represented by new items in their columns and old items in its
	 * rows, so when we see more columns than rows, we are calculating additions,
	 * and when we see more rows than columns, we are calculating deletions.
	 *
	 * @return int[]
	 */
	public function getIndicesOfAddedItems(): array {
		$numItems = count( $this->newArray ) - count( $this->oldArray );
		return $this->getIndicesOfMaxEdits( $this->getCols(), $numItems );
	}

	/**
	 * Helper function to get the indices of the n highest values from a given array
	 * of vectors. When we are calculating deletions, the array of vectors will be
	 * the array of rows of the matrix. When calculating additions, the array of
	 * vectors will be the transposed, so the list of columns.
	 *
	 * Given a list of vectors, and a number of items to select (number of additions
	 * or number of deletions):
	 *
	 * 1. First, try to select the indices of the added/deleted items by excluding
	 *    vectors that contain zeroes. This is because vectors containing zeroes
	 *    signal that they are identical to an element from the old version, so
	 *    they have likely not been added or deleted (that would signal they are
	 *    duplicates).
	 *
	 * 2. If with non-zero vectors we still haven't covered the number of indices
	 *    that we need to find, we try with the rest of the vectors (those that
	 *    contain one or more zeroes). For that, we order the rows by number
	 *    of edits in descending order, and we choose those missing items
	 *    that have more edits (they are most distinct to the old version)
	 *
	 * 3. In case of a tie, we prioritize choosing those items that have a higher
	 *    index. This is so that we generally choose additions and deletions at
	 *    the tail of the list, rather than at the head.
	 *
	 * @param int[][] $vectors
	 * @param int $numItems
	 * @return array
	 */
	private function getIndicesOfMaxEdits( array $vectors, int $numItems ): array {
		// 1. Select indices from unseen vectors (those that don't have zeroes)
		// array_filter() does not reindex, so we have the original indexes
		$unseenVectors = array_filter( $vectors, static function ( array $vector ): bool {
			return !in_array( 0, $vector, true );
		} );
		$unseenIndices = $this->getTopIndicesByEdits( $unseenVectors, $numItems );

		// If we don't need to find any additional items added, we return the found indices
		if ( count( $unseenIndices ) === $numItems ) {
			return $unseenIndices;
		}

		// 2. From the other vectors (the ones containing zeroes), we need to choose n keys
		// fill up till $numItems; we do this by getting those indexes that collect more edits.
		$numMissing = $numItems - count( $unseenIndices );
		$seenVectors = array_filter( $vectors, static function ( array $vector ): bool {
			return in_array( 0, $vector, true );
		} );

		// We get the leftover from $seenIndices
		$seenIndices = $this->getTopIndicesByEdits( $seenVectors, $numMissing );

		// Merge all, and we're done
		return [ ...$unseenIndices, ...$seenIndices ];
	}

	/**
	 * Given a map of column/row vectors (indexed by their original position),
	 * returns the indices of the $max vectors with the largest sum of edit counts.
	 * If the given vectors contains less elements than the input $max, then returns
	 * all of their indices.
	 *
	 * E.g.
	 * * given $vectors [ 4 => [1,4,2,2], 5 => [2,5,3,3] ]
	 * * with $max=1 returns [ 5 ]
	 * * with $max=3 returns [ 4, 5 ]
	 *
	 * In case of tie, get latest indexes.
	 *
	 * E.g.
	 * * given $vectors [ 4 => [1,4,2,2], 5 => [4,1,2,2] ]
	 * * with $max=1 returns [ 5 ]
	 *
	 * @param int[][] $vectors
	 * @param int $max
	 * @return int[]
	 */
	private function getTopIndicesByEdits( array $vectors, int $max ): array {
		// We choose those that have larger number of edits, for which we first aggregate
		$sums = array_map( static fn ( array $vect ): int => array_sum( $vect ), $vectors );
		// ... then we sort by values in DESC order, and in case tie, by indexes in DESC
		// NOTE: We are intentionally adding or removing at/from the tail of the list
		// whenever there are mixed up changes/adds/additions. Otherwise we could simply
		// use arsort( $sums ) instead of sorting by both value and index.
		uksort( $sums, static function ( int $idxA, int $idxB ) use ( $sums ): int {
			$diff = $sums[$idxB] <=> $sums[$idxA];
			return ( $diff !== 0 ) ? $diff : $idxB <=> $idxA;
		} );
		// ... and we slice to select max $numItems, preserve_keys=true to keep the indexes
		$sums = array_slice( $sums, 0, $max, true );

		return array_keys( $sums );
	}

	/**
	 * Returns the diff count matrix transposed as columns.
	 *
	 * E.g. Given a diffCountMatrix containing the following rows:
	 * [ [0, 2, 2],
	 *   [1, 0, 4],
	 *   [1, 5, 0] ]
	 *
	 * this method returns the transposed matrix:
	 * [ [0, 1, 1],
	 *   [2, 0, 5],
	 *   [2, 4, 0] ]
	 *
	 * @return int[][]
	 */
	private function getCols(): array {
		return array_map(
			fn ( $j ) => array_column( $this->diffCountMatrix, $j ),
			range( 0, count( $this->newArray ) - 1 )
		);
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
