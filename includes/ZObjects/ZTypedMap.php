<?php
/**
 * WikiLambda ZTypedMap
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;

class ZTypedMap extends ZObject {

	/**
	 * Create a new ZTypedMap instance
	 *
	 * @param ZFunctionCall $functionCall
	 * @param ZTypedList|null $list
	 */
	public function __construct( $functionCall, $list = null ) {
		$this->type = $functionCall;
		$this->data[ 'K1' ] = $list;
	}

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
		return [
			'type' => [
				'type' => ZTypeRegistry::Z_FUNCTIONCALL,
				'value' => ZTypeRegistry::Z_FUNCTION_TYPED_MAP,
			],
			'keys' => [
				'K1' => [
					'type' => ZTypeRegistry::Z_FUNCTION_TYPED_LIST,
				],
			],
		];
	}

	/**
	 * Build the function call that defines the type of this Typed Map
	 *
	 * @param string $keyType
	 * @param string $valueType
	 * @return ZFunctionCall
	 */
	public static function buildType( $keyType, $valueType ): ZFunctionCall {
		return new ZFunctionCall(
			new ZReference( ZTypeRegistry::Z_FUNCTION_TYPED_MAP ),
			[
				ZTypeRegistry::Z_FUNCTION_TYPED_MAP_KEY_TYPE => new ZReference( $keyType ),
				ZTypeRegistry::Z_FUNCTION_TYPED_MAP_VALUE_TYPE => new ZReference( $valueType )
			]
		);
	}

	/**
	 * Valid if each ZTypedPair in the ZTypedList is of the same type as the map's type.
	 *
	 * @inheritDoc
	 */
	public function isValid(): bool {
		$typedList = $this->getList();
		if ( $typedList === null ) {
			return false;
		}

		foreach ( $typedList->getAsArray() as $index => $entry ) {
			if ( !( $entry instanceof ZTypedPair ) ) {
				return false;
			}

			if (
				$entry->getFirstType()->getZValue() !== $this->getKeyType()->getZValue() ||
				$entry->getSecondType()->getZValue() !== $this->getValueType()->getZValue()
			) {
				return false;
			}

			if ( !$entry->isValid() ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Returns the type of the keys of this ZTypedMap
	 *
	 * @return ZReference The type of the keys
	 */
	public function getKeyType(): ZReference {
		// @phan-suppress-next-line PhanTypeMismatchReturnSuperType phan can't tell this must be a ZReference
		return $this->type->getValueByKey( ZTypeRegistry::Z_FUNCTION_TYPED_MAP_KEY_TYPE );
	}

	/**
	 * Returns the type of the values of this ZTypedMap
	 *
	 * @return ZReference The type of the values
	 */
	public function getValueType(): ZReference {
		// @phan-suppress-next-line PhanTypeMismatchReturnSuperType phan can't tell this must be a ZReference
		return $this->type->getValueByKey( ZTypeRegistry::Z_FUNCTION_TYPED_MAP_VALUE_TYPE );
	}

	/**
	 * Returns the ZTypedList
	 *
	 * @return ?ZTypedList The list of typed pairs
	 */
	public function getList(): ?ZTypedList {
		return $this->data[ 'K1' ] ?? null;
	}

	/**
	 * Returns the ZTypedList
	 *
	 * @param ZObject $key
	 * @return ?ZObject The value at the key, if available
	 */
	public function getValueGivenKey( ZObject $key ): ?ZObject {
		$typedList = $this->getList();
		if ( $typedList === null ) {
			return null;
		}

		foreach ( $typedList->getAsArray() as $index => $pair ) {
			if ( !( $pair instanceof ZTypedPair ) ) {
				continue;
			}

			if ( $pair->getFirstElement()->getZValue() === $key->getZValue() ) {
				return $pair->getSecondElement();
			}
		}
		return null;
	}
}