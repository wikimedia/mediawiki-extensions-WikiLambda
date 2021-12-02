<?php
/**
 * WikiLambda ZList
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;

class ZList extends ZObject {

	/**
	 * Create a new ZList instance given an array (canonical form) or two parameters representing
	 * the head and the tail of the list
	 *
	 * @param array $head
	 * @param array|null $tail
	 */
	public function __construct( $head = [], $tail = null ) {
		// TODO: (T296824) Special handling for convenience. Possibly not worth the complexity? To re-evaluate.
		if ( is_array( $head ) && $tail === null ) {
			$this->data[ ZTypeRegistry::Z_LIST_HEAD ] = array_slice( $head, 0, 1 )[ 0 ] ?? null;
			$this->data[ ZTypeRegistry::Z_LIST_TAIL ] = array_slice( $head, 1 ) ?? [];
		} else {
			$this->data[ ZTypeRegistry::Z_LIST_HEAD ] = $head;
			$this->data[ ZTypeRegistry::Z_LIST_TAIL ] = $tail;
		}
	}

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
		return [
			'type' => ZTypeRegistry::Z_LIST,
			'keys' => [
				ZTypeRegistry::Z_LIST_HEAD => [
					'type' => ZTypeRegistry::Z_OBJECT,
				],
				ZTypeRegistry::Z_LIST_TAIL => [
					'type' => ZTypeRegistry::BUILTIN_ARRAY,
				],
			],
		];
	}

	/**
	 * @inheritDoc
	 */
	public function isValid(): bool {
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
	 * Checks the validity for an element of this ZList.
	 *
	 * @param mixed $value
	 * @return bool
	 */
	private function isValidValue( $value ): bool {
		if ( $value === null ) {
			return true;
		}

		if ( is_object( $value ) && $value instanceof ZObject ) {
			return $value->isValid();
		}

		if ( is_string( $value ) ) {
			return true;
		}

		if ( is_array( $value ) ) {
			foreach ( $value as $key => $innerValue ) {
				if ( !self::isValidValue( $innerValue ) ) {
					return false;
				}
			}
			return true;
		}
		return false;
	}

	/**
	 * @inheritDoc
	 */
	public function getSerialized( $form = self::FORM_CANONICAL ) {
		// TODO: (T296737) fix different serialization modes, only returning FORM_CANONICAL
		$list = $this->getZListAsArray();
		return array_map( static function ( $value ) use ( $form ) {
			return ( $value instanceof ZObject ) ? $value->getSerialized( $form ) : $value;
		}, $list );
	}

	/**
	 * Get a pair that represent the head and tail of this ZList
	 *
	 * @return array
	 */
	public function getZValue() {
		return [ $this->data[ ZTypeRegistry::Z_LIST_HEAD ], $this->data[ ZTypeRegistry::Z_LIST_TAIL ] ];
	}

	/**
	 * Get the array of ZObjects represented by this ZList
	 *
	 * @return array
	 */
	public function getZListAsArray(): array {
		$result = [];
		if ( isset( $this->data[ ZTypeRegistry::Z_LIST_HEAD ] ) ) {
			$result[] = $this->data[ ZTypeRegistry::Z_LIST_HEAD ];
		}
		return array_merge( $result, (array)$this->data[ ZTypeRegistry::Z_LIST_TAIL ] );
	}
}
