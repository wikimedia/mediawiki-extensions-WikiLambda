<?php
/**
 * WikiLambda ZTypedList
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;

class ZTypedList extends ZObject {

	/**
	 * Create a new ZTypedList instance given an array (canonical form)
	 * or an object with K1 (head) and K2 (tail)
	 *
	 * @param ZFunctionCall $functionCall
	 * @param array|ZObject|null $head
	 * @param ZTypedList|null $tail
	 */
	public function __construct( $functionCall, $head = null, $tail = null ) {
		$this->type = $functionCall;
		if ( $head === null ) {
			$this->data = [];
		} elseif ( is_array( $head ) && ( $tail === null ) ) {
			$this->data = $head;
		} else {
			$tailAsArray = ( $tail === null ) ? [] : $tail->getAsArray();
			$this->data = array_merge( [ $head ], $tailAsArray );
		}
	}

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
		return [
			'type' => [
				'type' => ZTypeRegistry::Z_FUNCTIONCALL,
				'value' => ZTypeRegistry::Z_FUNCTION_TYPED_LIST,
			],
			'keys' => [
				'K1' => [
					'type' => ZTypeRegistry::Z_OBJECT,
				],
				'K2' => [
					'type' => ZTypeRegistry::Z_FUNCTION_TYPED_LIST,
				],
			],
		];
	}

	/**
	 * Build the function call that defines the type of this ZTypedList
	 *
	 * @param string $listType The ZID of the type of ZObjects this list contains
	 * @return ZFunctionCall
	 */
	public static function buildType( $listType ): ZFunctionCall {
		return new ZFunctionCall(
			new ZReference( ZTypeRegistry::Z_FUNCTION_TYPED_LIST ),
			[ ZTypeRegistry::Z_FUNCTION_TYPED_LIST_TYPE => $listType ]
		);
	}

	/**
	 * @inheritDoc
	 */
	public function isValid(): bool {
		foreach ( $this->data as $key => $value ) {
			if ( !( $value instanceof ZObject ) ) {
				return false;
			}
			if ( !$value->isValid() ) {
				return false;
			}
			if (
				( self::getElementType()->getZValue() !== ZTypeRegistry::Z_OBJECT )
				&& ( self::getElementType()->getZValue() !== $value->getZType() )
			) {
				return false;
			}
		}
		return true;
	}

	/**
	 * @inheritDoc
	 */
	public function getSerialized( $form = self::FORM_CANONICAL ) {
		if ( $form === self::FORM_CANONICAL ) {
			return self::getSerializedCanonical();
		} else {
			return self::getSerializedNormal( $this->data );
		}
	}

	/**
	 * Convert this ZTypedList into its serialized canonical representation
	 *
	 * @return array
	 */
	private function getSerializedCanonical() {
		$type = $this->type->getValueByKey(
			ZTypeRegistry::Z_FUNCTION_TYPED_LIST_TYPE
		)->getSerialized();

		$items = array_map( static function ( $value ) {
			return $value->getSerialized();
		}, $this->data );

		return array_merge( [ $type ], $items );
	}

	/**
	 * Convert this ZTypedList into its serialized normal representation
	 *
	 * @param array $list
	 * @return \stdClass
	 */
	private function getSerializedNormal( $list ) {
		if ( count( $list ) === 0 ) {
			return (object)self::returnEmptyTypedList( self::FORM_NORMAL );
		}

		$serialized = self::returnEmptyTypedList( self::FORM_NORMAL );
		$serialized[ 'K1' ] = $list[0]->getSerialized( self::FORM_NORMAL );
		$serialized[ 'K2' ] = self::getSerializedNormal( array_slice( $list, 1 ) ?? [] );
		return (object)$serialized;
	}

	/**
	 * Return an empty ZTypedList
	 *
	 * @param int $form
	 * @return array
	 */
	private function returnEmptyTypedList( $form ): array {
		return [
			ZTypeRegistry::Z_OBJECT_TYPE => $this->type->getSerialized( $form )
		];
	}

	/**
	 * Get a pair that represent the head and tail of this list
	 *
	 * @return array
	 */
	public function getZValue() {
		return $this->data;
	}

	/**
	 * Get the array of ZObjects represented by this list
	 *
	 * @return array
	 */
	public function getAsArray(): array {
		return $this->getZValue();
	}

	/**
	 * Returns the type of the elements of this ZTypedList
	 *
	 * @return ZObject The type of this ZObject
	 */
	public function getElementType(): ZObject {
		return $this->type->getValueByKey( ZTypeRegistry::Z_FUNCTION_TYPED_LIST_TYPE );
	}

	/**
	 * Returns true if it contains an empty list
	 *
	 * @return bool Whether it's an empty list
	 */
	public function isEmpty(): bool {
		return empty( $this->data );
	}

}
