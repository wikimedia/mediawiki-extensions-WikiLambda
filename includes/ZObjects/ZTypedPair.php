<?php
/**
 * WikiLambda ZTypedPair
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;

class ZTypedPair extends ZObject {

	private ZTypeRegistry $typeRegistry;

	/**
	 * Create a new ZTypedPair instance
	 *
	 * @param ZFunctionCall $functionCall
	 * @param ZObject|null $firstItem
	 * @param ZObject|null $secondItem
	 */
	public function __construct( $functionCall, $firstItem = null, $secondItem = null ) {
		$this->type = $functionCall;

		$this->data[ 'K1' ] = $firstItem;
		$this->data[ 'K2' ] = $secondItem;

		$this->typeRegistry = ZTypeRegistry::singleton();
	}

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
		return [
			'type' => [
				'type' => ZTypeRegistry::Z_FUNCTIONCALL,
				'value' => ZTypeRegistry::Z_FUNCTION_TYPED_PAIR,
			],
			'keys' => [
				'K1' => [
					'type' => ZTypeRegistry::Z_OBJECT,
				],
				'K2' => [
					'type' => ZTypeRegistry::Z_OBJECT,
				],
			],
		];
	}

	/**
	 * Build the function call that defines the type of this Typed Pair
	 *
	 * @param string $firstType
	 * @param string $secondType
	 * @return ZFunctionCall
	 */
	public static function buildType( $firstType, $secondType ): ZFunctionCall {
		return new ZFunctionCall(
			new ZReference( ZTypeRegistry::Z_FUNCTION_TYPED_PAIR ),
			[
				ZTypeRegistry::Z_FUNCTION_TYPED_FIRST_TYPE => new ZReference( $firstType ),
				ZTypeRegistry::Z_FUNCTION_TYPED_SECOND_TYPE => new ZReference( $secondType )
			]
		);
	}

	/**
	 * Valid if both the first and second items are extant ZObjects of the right type (or the type is Z1)
	 *
	 * @inheritDoc
	 */
	public function isValid(): bool {
		$firstItem = $this->data[ 'K1' ] ?? null;
		$secondItem = $this->data[ 'K2' ] ?? null;

		if ( !( $firstItem instanceof ZObject && $secondItem instanceof ZObject ) ) {
			return false;
		}

		if ( !( $firstItem->isValid() && $secondItem->isValid() ) ) {
			return false;
		}

		return (
			$this->typeRegistry->isZObjectInstanceOfType( $firstItem, $this->getFirstType()->getZValue() ) &&
			$this->typeRegistry->isZObjectInstanceOfType( $secondItem, $this->getSecondType()->getZValue() )
		);
	}

	/**
	 * Returns the type of the first element of this ZTypedPair
	 *
	 * @return ZReference The type of the first element
	 */
	public function getFirstType(): ZReference {
		// @phan-suppress-next-line PhanTypeMismatchReturnSuperType phan can't tell this must be a ZReference
		return $this->type->getValueByKey( ZTypeRegistry::Z_FUNCTION_TYPED_FIRST_TYPE );
	}

	/**
	 * Returns the first element of this ZTypedPair
	 *
	 * @return ?ZObject The first element
	 */
	public function getFirstElement(): ?ZObject {
		return $this->data[ 'K1' ] ?? null;
	}

	/**
	 * Sets the first element of this ZTypedPair
	 *
	 * @param ZObject $newValue The new first element
	 */
	public function setFirstElement( ZObject $newValue ) {
		$this->data[ 'K1' ] = $newValue;
	}

	/**
	 * Returns the type of the second element of this ZTypedPair
	 *
	 * @return ZReference The type of the second element
	 */
	public function getSecondType(): ZReference {
		// @phan-suppress-next-line PhanTypeMismatchReturnSuperType phan can't tell this must be a ZReference
		return $this->type->getValueByKey( ZTypeRegistry::Z_FUNCTION_TYPED_SECOND_TYPE );
	}

	/**
	 * Returns the second element of this ZTypedPair
	 *
	 * @return ?ZObject The second element
	 */
	public function getSecondElement(): ?ZObject {
		return $this->data[ 'K2' ] ?? null;
	}

	/**
	 * Sets the second element of this ZTypedPair
	 *
	 * @param ZObject $newValue The new second element
	 */
	public function setSecondElement( ZObject $newValue ) {
		$this->data[ 'K2' ] = $newValue;
	}
}
