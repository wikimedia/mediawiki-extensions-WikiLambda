<?php
/**
 * WikiLambda ZObjectDiffer. Differ service entrypoint, implements doDiff on
 * any kind of ZObject. Depending on the types, uses ZObjectMapDiffer or
 * ZObjectListDiffer.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Diff;

use Diff\Comparer\StrictComparer;
use Diff\Differ\Differ;
use Diff\DiffOp\Diff\Diff;
use Diff\DiffOp\DiffOp;
use Diff\DiffOp\DiffOpChange;
use Exception;

class ZObjectDiffer {

	private const DIFF_STRING = 1;
	private const DIFF_ARRAY = 2;
	private const DIFF_ASSOCIATIVE = 3;

	/** @var ZObjectListDiffer */
	private $listDiffer;

	/** @var ZObjectMapDiffer */
	private $mapDiffer;

	/** @var StrictComparer */
	private $comparer;

	public function __construct() {
		$this->comparer = new StrictComparer();
		$this->listDiffer = new ZObjectListDiffer();
		$this->mapDiffer = new ZObjectMapDiffer( $this->listDiffer, $this->comparer );
		$this->listDiffer->setZObjectDiffer( $this );
	}

	/**
	 * @see Differ::doDiff
	 *
	 * Takes two ZObjects, computes the diff, and returns this diff as an array of DiffOp.
	 *
	 * @param array|string $oldValues The first array
	 * @param array|string $newValues The second array
	 *
	 * @throws Exception
	 * @return DiffOp returns either an atomic DiffOp or a new
	 */
	public function doDiff( $oldValues, $newValues ): DiffOp {
		$oldDiffer = $this->getDifferType( $oldValues );
		$newDiffer = $this->getDifferType( $newValues );

		if ( $oldDiffer !== $newDiffer ) {
			// If the type is different, register a DiffOpChange
			return new DiffOpChange( $oldValues, $newValues );
		} elseif ( $oldDiffer === self::DIFF_ASSOCIATIVE ) {
			// If the items are associative arrays, call ZObjectMapDiffer::doDiff
			return new Diff( $this->mapDiffer->doDiff( $oldValues, $newValues ) );
		} elseif ( $oldDiffer === self::DIFF_ARRAY ) {
			// If the items are non-associative arrays, call ZObjectListDiffer::doDiff
			return new Diff( $this->listDiffer->doDiff( $oldValues, $newValues ), true );
		} else {
			// If the items are strings and not equal, register a DiffOpChange
			if ( !$this->comparer->valuesAreEqual( $oldValues, $newValues ) ) {
				return new DiffOpChange( $oldValues, $newValues );
			}
		}

		// Return an empty diff
		return new Diff( [] );
	}

	/**
	 * Returns the type of differ that we should use for a given input.
	 *
	 * @param array|string $input
	 * @return int
	 */
	protected function getDifferType( $input ): int {
		if ( is_array( $input ) ) {
			return $this->isAssociative( $input )
				? self::DIFF_ASSOCIATIVE
				: self::DIFF_ARRAY;
		}
		return self::DIFF_STRING;
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
	 * Returns a flat collection of diffs with an absolute path and the DiffOp
	 * that has been detected under that path.
	 *
	 * @param DiffOp $diff
	 * @return array
	 */
	public static function flattenDiff( $diff ): array {
		// Finish condition when the $diff is an atomic DiffOp
		if ( $diff->isAtomic() ) {
			return [ [
				'path' => [],
				'op' =>	$diff
			] ];
		}

		// Else prepend the key to the path and return a flattened array of DiffOps
		// If it's not atomic, then $diff must be an instanceof Diff
		'@phan-var Diff $diff';
		$branches = [];
		foreach ( $diff->getOperations() as $key => $diffOp ) {
			$flatOps = self::flattenDiff( $diffOp );
			for ( $index = 0; $index < count( $flatOps ); $index++ ) {
				array_unshift( $flatOps[$index]['path'], $key );
			}
			$branches = array_merge( $branches, $flatOps );
		}
		return $branches;
	}

}
