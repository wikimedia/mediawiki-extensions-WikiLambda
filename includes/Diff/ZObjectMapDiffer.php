<?php
/**
 * WikiLambda ZObjectMapDiffer. Implements doDiff to calculate the diff
 * between two associative arrays, or maps.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Diff;

use Diff\Comparer\ValueComparer;
use Diff\DiffOp\Diff\Diff;
use Diff\DiffOp\DiffOp;
use Diff\DiffOp\DiffOpAdd;
use Diff\DiffOp\DiffOpChange;
use Diff\DiffOp\DiffOpRemove;
use Exception;

class ZObjectMapDiffer {

	/** @var ZObjectListDiffer */
	private $listDiffer;

	/** @var ValueComparer */
	private $valueComparer;

	/**
	 * Creates a ZObjectMapDiffer object
	 *
	 * @param ZObjectListDiffer $listDiffer
	 * @param ValueComparer $comparer
	 */
	public function __construct( ZObjectListDiffer $listDiffer, ValueComparer $comparer ) {
		$this->listDiffer = $listDiffer;
		$this->valueComparer = $comparer;
	}

	/**
	 * Computes the diff between two ZObject associate arrays.
	 *
	 * @param array $oldValues The first array
	 * @param array $newValues The second array
	 *
	 * @throws Exception
	 * @return DiffOp[]
	 */
	public function doDiff( array $oldValues, array $newValues ): array {
		$newSet = $this->arrayDiffAssoc( $newValues, $oldValues );
		$oldSet = $this->arrayDiffAssoc( $oldValues, $newValues );

		$diffSet = [];

		foreach ( $this->getAllKeys( $oldSet, $newSet ) as $key ) {
			$diffOp = $this->getDiffOpForElement( $key, $oldSet, $newSet );

			if ( $diffOp !== null ) {
				$diffSet[$key] = $diffOp;
			}
		}

		return $diffSet;
	}

	/**
	 * Returns the union of all keys present in old and new sets
	 *
	 * @param array $oldSet
	 * @param array $newSet
	 * @return string[]
	 */
	private function getAllKeys( array $oldSet, array $newSet ): array {
		return array_unique( array_merge(
			array_keys( $oldSet ),
			array_keys( $newSet )
		) );
	}

	/**
	 * Returns the DiffOp found for the old and new values of a given key
	 * or null if no diffs were found.
	 *
	 * @param string $key
	 * @param array $oldSet
	 * @param array $newSet
	 * @return DiffOp|null
	 */
	private function getDiffOpForElement( $key, array $oldSet, array $newSet ) {
		$hasOld = array_key_exists( $key, $oldSet );
		$hasNew = array_key_exists( $key, $newSet );

		if ( $hasOld && $hasNew ) {
			$oldValue = $oldSet[$key];
			$newValue = $newSet[$key];

			if ( is_array( $oldValue ) && is_array( $newValue ) ) {
				$diffOp = $this->getDiffForArrays( $oldValue, $newValue );
				return $diffOp->isEmpty() ? null : $diffOp;
			} else {
				return new DiffOpChange( $oldValue, $newValue );
			}
		} elseif ( $hasOld ) {
			return new DiffOpRemove( $oldSet[$key] );
		} elseif ( $hasNew ) {
			return new DiffOpAdd( $newSet[$key] );
		}

		return null;
	}

	/**
	 * Calculates the Diff between two arrays, calling ZObjectMapDiffer
	 * if the arrays are associative or ZObjectListDiffer if they are not
	 *
	 * @param array $old
	 * @param array $new
	 * @return Diff
	 */
	private function getDiffForArrays( array $old, array $new ): Diff {
		if ( $this->isAssociative( $old ) || $this->isAssociative( $new ) ) {
			return new Diff( $this->doDiff( $old, $new ), true );
		}

		return new Diff( $this->listDiffer->doDiff( $old, $new ), false );
	}

	/**
	 * Returns if an array is associative or not.
	 *
	 * @param array $array
	 * @return bool
	 */
	private function isAssociative( array $array ): bool {
		foreach ( $array as $key => $value ) {
			if ( is_string( $key ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Similar to the native array_diff_assoc function, except that it will
	 * spot differences between array values. Very weird the native
	 * function just ignores these...
	 *
	 * @see http://php.net/manual/en/function.array-diff-assoc.php
	 * @param array $from
	 * @param array $to
	 * @return array
	 */
	private function arrayDiffAssoc( array $from, array $to ): array {
		$diff = [];

		foreach ( $from as $key => $value ) {
			if ( !array_key_exists( $key, $to ) || !$this->valueComparer->valuesAreEqual( $to[$key], $value ) ) {
				$diff[$key] = $value;
			}
		}

		return $diff;
	}

}
