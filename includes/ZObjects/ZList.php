<?php
/**
 * WikiLambda ZList
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\ZTypeRegistry;

class ZList extends ZObject {

	public static function getDefinition() : array {
		return [
			'type' => ZTypeRegistry::Z_LIST,
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

	/**
	 * @param mixed $value
	 *
	 * @return bool
	 */
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
