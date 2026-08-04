<?php
/**
 * WikiLambda DiffOpMove: a list item that kept its content but changed position.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Diff;

use Diff\DiffOp\DiffOpChange;

/**
 * A re-ordering needs saying differently from a change of content: reporting it
 * as a change describes the positions the item passed rather than the item that
 * moved, and reporting it as a removal and an addition claims the item left the
 * list and a different one arrived.
 *
 * It cannot, however, be a new kind of operation. Diff keeps a private, fixed
 * list of the operation types it will hold — add, remove, change, list, map,
 * diff — and throws on anything else, with no way to extend it. So a move is
 * modelled as the specialisation of a change that it is: a change whose old and
 * new values are the same item, which additionally knows where that item was and
 * where it now is.
 *
 * That the type stays "change" is not a workaround to be undone later; it is
 * what keeps the rules in authorization-rules.yml applying to a re-ordering
 * exactly as they applied before it could be told apart, so recognising moves
 * cannot reduce the rights an edit requires. Callers that want to distinguish a
 * move must test for this class, not for the type.
 *
 * Both indices are as the item sits in its list, which for a typed list means
 * that index 1 is the first item, index 0 being the reference to the type of the
 * items.
 */
class DiffOpMove extends DiffOpChange {

	private int $oldIndex;

	private int $newIndex;

	/**
	 * @param mixed $value The item, unchanged in content
	 * @param int $oldIndex Where it was
	 * @param int $newIndex Where it now is
	 */
	public function __construct( $value, int $oldIndex, int $newIndex ) {
		// The item did not change, so both sides of the change are the same.
		parent::__construct( $value, $value );
		$this->oldIndex = $oldIndex;
		$this->newIndex = $newIndex;
	}

	/**
	 * The item that moved. Its content is the same on both sides, so this is
	 * simply a clearer name for either of them.
	 *
	 * @return mixed
	 */
	public function getValue() {
		return $this->getNewValue();
	}

	/**
	 * @return int
	 */
	public function getOldIndex(): int {
		return $this->oldIndex;
	}

	/**
	 * @return int
	 */
	public function getNewIndex(): int {
		return $this->newIndex;
	}

	/**
	 * @return array
	 */
	public function __serialize(): array {
		return [ $this->getNewValue(), $this->oldIndex, $this->newIndex ];
	}

	/**
	 * @param array $data
	 */
	public function __unserialize( $data ): void {
		[ $value, $this->oldIndex, $this->newIndex ] = $data;
		parent::__unserialize( [ $value, $value ] );
	}

	/**
	 * @see DiffOp::toArray
	 * @param callable|null $valueConverter optional callback used to convert any
	 *        complex values to arrays.
	 * @return array
	 */
	public function toArray( ?callable $valueConverter = null ): array {
		return [
			'type' => $this->getType(),
			'value' => $this->objectToArray( $this->getNewValue(), $valueConverter ),
			'oldindex' => $this->oldIndex,
			'newindex' => $this->newIndex,
		];
	}
}
