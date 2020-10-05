<?php
/**
 * WikiLambda ZList
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

class ZList implements ZObject {

	private $data = [];

	public static function getDefinition() : array {
		return [
			'type' => 'ZList',
			'keys' => [
				ZTypeRegistry::Z_LIST_HEAD => [
					'type' => ZTypeRegistry::Z_OBJECT,
				],
				ZTypeRegistry::Z_LIST_TAIL => [
					// TODO: This is an array of ZObjects.
					'type' => ZTypeRegistry::HACK_ARRAY,
				],
			],
		];
	}

	public function __construct( $head = [], $tail = null ) {
		// Special handling for convenience. Possibly not worth the complexity? To re-evaluate.
		if ( is_array( $head ) && $tail === null ) {
			$this->data[ ZTypeRegistry::Z_LIST_HEAD ] = array_slice( $head, 0, 1 )[ 0 ] ?? null;
			$this->data[ ZTypeRegistry::Z_LIST_TAIL ] = array_slice( $head, 1 ) ?? [];
		} else {
			$this->data[ ZTypeRegistry::Z_LIST_HEAD ] = $head;
			$this->data[ ZTypeRegistry::Z_LIST_TAIL ] = $tail;
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
		return static::getDefinition()['type'];
	}

	public function getZValue() {
		return [ $this->data[ ZTypeRegistry::Z_LIST_HEAD ], $this->data[ ZTypeRegistry::Z_LIST_TAIL ] ];
	}

	public function getZListAsArray() : array {
		$result = [];
		if ( isset( $this->data[ ZTypeRegistry::Z_LIST_HEAD ] ) ) {
			$result[] = $this->data[ ZTypeRegistry::Z_LIST_HEAD ];
		}

		$result = array_merge( $result, (array)$this->data[ ZTypeRegistry::Z_LIST_TAIL ] );

		return $result;
	}

	public function isValid() : bool {
		if ( !self::isValidValue( $this->data[ ZTypeRegistry::Z_LIST_HEAD ] ) ) {
			return false;
		}

		foreach ( $this->data[ ZTypeRegistry::Z_LIST_TAIL ] as $key => $value ) {
			if ( !self::isValidValue( $value ) ) {
				return false;
			}
		}
		return true;
	}

	private function isValidValue( $value ) : bool {
		if ( is_object( $value ) && $value instanceof ZObject ) {
			return $value->isValid();
		} elseif ( $value === null ) {
			return true;
		} elseif ( !is_string( $value ) ) {
			return false;
		}
		return true;
	}
}
