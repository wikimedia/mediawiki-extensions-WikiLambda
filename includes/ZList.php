<?php
/**
 * WikiLambda ZList
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

class ZList implements ZObject {

	private $zObjectType = 'ZList';

	private $value;

	private $keys = [
		// HEAD
		'K1' => [],
		// TAIL
		'K2' => []
	];

	public function __construct( $head = [], $tail = null ) {
		if ( is_array( $head ) && $tail === null ) {
			$this->keys['K1'] = array_slice( $head, 0, 1 )[ 0 ] ?? null;
			$this->keys['K2'] = array_slice( $head, 1 );
		} else {
			$this->keys['K1'] = $head;
			$this->keys['K2'] = $tail;
		}
	}

	public function getZType() : string {
		return $this->zObjectType;
	}

	public function getZValue() {
		return [ $this->keys['K1'], $this->keys['K2'] ];
	}

	public function isValid() : bool {
		if ( !self::isValidValue( $this->keys['K1'] ) ) {
			return false;
		}

		foreach ( $this->keys['K2'] as $key => $value ) {
			if ( !self::isValidValue( $value ) ) {
				return false;
			}
		}
		return true;
	}

	private function isValidValue( $value ) : bool {
		if (
			is_object( $value )
			&& $value instanceof ZObject
			&& !$value->isValid()
		) {
			return false;
		} elseif ( !is_string( $value ) ) {
			return false;
		}
		return true;
	}
}
