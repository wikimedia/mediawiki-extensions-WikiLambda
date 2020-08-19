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
		ZTypeRegistry::Z_LIST_HEAD => [],
		ZTypeRegistry::Z_LIST_TAIL => []
	];

	public function __construct( $head = [], $tail = null ) {
		if ( is_array( $head ) && $tail === null ) {
			$this->keys[ ZTypeRegistry::Z_LIST_HEAD ] = array_slice( $head, 0, 1 )[ 0 ] ?? null;
			$this->keys[ ZTypeRegistry::Z_LIST_TAIL ] = array_slice( $head, 1 );
		} else {
			$this->keys[ ZTypeRegistry::Z_LIST_HEAD ] = $head;
			$this->keys[ ZTypeRegistry::Z_LIST_TAIL ] = $tail;
		}
	}

	public static function create( array $objectVars ) : ZObject {
		if ( !array_key_exists( ZTypeRegistry::Z_LIST_HEAD, $objectVars ) ) {
			throw new \InvalidArgumentException( "ZList missing the head value key." );
		}
		if ( !array_key_exists( ZTypeRegistry::Z_LIST_TAIL, $objectVars ) ) {
			throw new \InvalidArgumentException( "ZList missing the tail value key." );
		}
		return new ZList( $objectVars[ ZTypeRegistry::Z_LIST_HEAD ], $objectVars[ ZTypeRegistry::Z_LIST_TAIL ] );
	}

	public function getZType() : string {
		return $this->zObjectType;
	}

	public function getZValue() {
		return [ $this->keys[ ZTypeRegistry::Z_LIST_HEAD ], $this->keys[ ZTypeRegistry::Z_LIST_TAIL ] ];
	}

	public function isValid() : bool {
		if ( !self::isValidValue( $this->keys[ ZTypeRegistry::Z_LIST_HEAD ] ) ) {
			return false;
		}

		foreach ( $this->keys[ ZTypeRegistry::Z_LIST_TAIL ] as $key => $value ) {
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
