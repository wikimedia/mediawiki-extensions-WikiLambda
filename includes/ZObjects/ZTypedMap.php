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

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

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

			$mapKey = $pair->getFirstElement();

			if ( $mapKey && $mapKey->getZValue() === $key->getZValue() ) {
				return $pair->getSecondElement();
			}
		}
		return null;
	}

	/**
	 * Ensures there is an entry for the given key / value in the ZMap.  If there is
	 * already an entry for the given key, overwrites the corresponding value.  Otherwise,
	 * creates a new entry. N.B.: Modifies the content of the ZMap's list in place.
	 *
	 * TODO (T302015): When ZMap keys are extended beyond Z6/Z39, update accordingly
	 *
	 * @param ZObject $key A Z6 or Z39 instance to serve as the key
	 * @param ?ZObject $value A ZObject to set; if null, no object is set
	 * @throws ZErrorException
	 */
	public function setValueForKey( ZObject $key, ?ZObject $value ) {
		if ( $value === null ) {
			return;
		}

		$typedList = $this->getList();
		if ( $typedList === null ) {
			// The list we're wrapping was not created correctly; nothing we can do but throw
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_WRONG_LIST_TYPE,
					[
						'data' => $typedList
					]
				)
			);
		}

		// Check the types of the key and value for compatibility
		if ( !ZObjectUtils::isCompatibleType( $this->getKeyType(), $key ) ) {
			// The key we've been given is of an unacceptable type
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_ARRAY_TYPE_MISMATCH,
					[
						'key' => 'key',
						'expected' => $this->getKeyType()->getZValue(),
						'data' => $key->getValueByKey( ZTypeRegistry::Z_OBJECT_TYPE ),
					]
				)
			);
		}

		if ( !ZObjectUtils::isCompatibleType( $this->getValueType(), $value ) ) {
			// The value we've been given is of an unacceptable type
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_ARRAY_TYPE_MISMATCH,
					[
						'key' => 'value',
						'expected' => $this->getValueType()->getZValue(),
						'data' => $value->getValueByKey( ZTypeRegistry::Z_OBJECT_TYPE ),
					]
				)
			);
		}

		foreach ( $typedList->getAsArray() as $index => $pair ) {
			if ( !( $pair instanceof ZTypedPair ) ) {
				continue;
			}

			$mapKey = $pair->getFirstElement();

			if ( $mapKey && $mapKey->getZValue() === $key->getZValue() ) {
				$pair->setSecondElement( $value );
				return;
			}
		}

		// The key isn't present in the map, so add an entry for it
		$pairType = ZTypedPair::buildType( $this->getKeyType()->getZValue(), $this->getValueType()->getZValue() );
		$newPair = new ZTypedPair( $pairType, $key, $value );
		$typedList->appendArray( [ $newPair ], false );
		$this->data[ 'K1' ] = $typedList;
	}

}
