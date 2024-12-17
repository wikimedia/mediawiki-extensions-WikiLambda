<?php
/**
 * WikiLambda ZType
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;

class ZType extends ZObject {

	/**
	 * Construct a ZType instance given the identity ZReference, a ZTypedList of ZKeys,
	 * and a ZReference to the type validator
	 *
	 * @param ZObject $identity
	 * @param ZObject $keys
	 * @param ZObject $validator
	 * @param ?ZObject $equality
	 * @param ?ZObject $renderer
	 * @param ?ZObject $parser
	 * @param ?ZTypedList $deserialisers
	 * @param ?ZTypedList $serialisers
	 */
	public function __construct(
		$identity, $keys, $validator,
		?ZObject $equality = null,
		?ZObject $renderer = null, ?ZObject $parser = null,
		?ZTypedList $deserialisers = null, ?ZTypedList $serialisers = null
	) {
		$this->data[ ZTypeRegistry::Z_TYPE_IDENTITY ] = $identity;
		$this->data[ ZTypeRegistry::Z_TYPE_KEYS ] = $keys;
		$this->data[ ZTypeRegistry::Z_TYPE_VALIDATOR ] = $validator;
		$this->data[ ZTypeRegistry::Z_TYPE_EQUALITY ] = $equality ?? false;
		$this->data[ ZTypeRegistry::Z_TYPE_RENDERER ] = $renderer ?? false;
		$this->data[ ZTypeRegistry::Z_TYPE_PARSER ] = $parser ?? false;
		$this->data[ ZTypeRegistry::Z_TYPE_DESERIALISERS ] = $deserialisers ??
			new ZTypedList( ZTypedList::buildType( new ZReference( ZTypeRegistry::Z_DESERIALISER ) ) );
		$this->data[ ZTypeRegistry::Z_TYPE_SERIALISERS ] = $serialisers ??
			new ZTypedList( ZTypedList::buildType( new ZReference( ZTypeRegistry::Z_SERIALISER ) ) );
	}

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
		return [
			'type' => [
				'type' => ZTypeRegistry::Z_REFERENCE,
				'value' => ZTypeRegistry::Z_TYPE,
			],
			'keys' => [
				ZTypeRegistry::Z_TYPE_IDENTITY => [
					// NOTE: Allows Z0.
					'type' => ZTypeRegistry::BUILTIN_REFERENCE_NULLABLE,
				],
				ZTypeRegistry::Z_TYPE_KEYS => [
					// TODO (T362257): Walk the array of ZKeys.
					'type' => ZTypeRegistry::HACK_ARRAY_Z_KEY,
					'required' => true,
				],
				ZTypeRegistry::Z_TYPE_VALIDATOR => [
					// NOTE: Allows Z0 until we support ZFunctions.
					'type' => ZTypeRegistry::BUILTIN_REFERENCE_NULLABLE,
				],
				ZTypeRegistry::Z_TYPE_EQUALITY => [
					'type' => ZTypeRegistry::Z_FUNCTION,
					'required' => false,
				],
				ZTypeRegistry::Z_TYPE_RENDERER => [
					'type' => ZTypeRegistry::Z_FUNCTION,
					'required' => false,
				],
				ZTypeRegistry::Z_TYPE_PARSER => [
					'type' => ZTypeRegistry::Z_FUNCTION,
					'required' => false,
				],
				ZTypeRegistry::Z_TYPE_DESERIALISERS => [
					'type' => ZTypeRegistry::Z_FUNCTION_TYPED_LIST,
					'required' => false,
				],
				ZTypeRegistry::Z_TYPE_SERIALISERS => [
					'type' => ZTypeRegistry::Z_FUNCTION_TYPED_LIST,
					'required' => false,
				],
			],
		];
	}

	/**
	 * @inheritDoc
	 */
	public function isValid(): bool {
		// Identity must be set to a valid ZReference (or special case of 'Z0')
		if ( !isset( $this->data[ ZTypeRegistry::Z_TYPE_IDENTITY ] ) ) {
			return false;
		}
		if ( !( $this->data[ ZTypeRegistry::Z_TYPE_IDENTITY ] instanceof ZReference ) ) {
			return false;
		}
		if ( !( $this->data[ ZTypeRegistry::Z_TYPE_IDENTITY ]->isValid() ) ) {
			return false;
		}

		// Key map must be set to an array or ZTypedList of zero or more ZKeys, all valid
		if ( !isset( $this->data[ ZTypeRegistry::Z_TYPE_KEYS ] ) ) {
			return false;
		}
		$keys = $this->data[ ZTypeRegistry::Z_TYPE_KEYS ];
		if ( !is_array( $keys ) ) {
			if ( $keys instanceof ZTypedList ) {
				if ( $keys->getElementType()->getZValue() !== ZTypeRegistry::Z_KEY ) {
					return false;
				}
				$keys = $keys->getAsArray();
			} else {
				return false;
			}
		}
		foreach ( $keys as $key ) {
			if ( !( $key instanceof ZKey ) ) {
				return false;
			}
			if ( !$key->isValid() ) {
				return false;
			}
		}

		// Validator must be set to a valid ZKey reference
		if ( !isset( $this->data[ ZTypeRegistry::Z_TYPE_VALIDATOR ] ) ) {
			return false;
		}
		if ( !( $this->data[ ZTypeRegistry::Z_TYPE_VALIDATOR ] instanceof ZReference ) ) {
			return false;
		}
		if ( !( $this->data[ ZTypeRegistry::Z_TYPE_VALIDATOR ]->isValid() ) ) {
			return false;
		}
		// TODO (T362242): Actually check that the validator is a ZFunction that applies to us.

		// TODO (T362243): Check the equality, renderer, parser, and type converter keys.

		return true;
	}

	/**
	 * Get the representation of th ZType Zid
	 *
	 * @return ZReference|ZFunctionCall
	 */
	public function getTypeId() {
		return $this->data[ ZTypeRegistry::Z_TYPE_IDENTITY ];
	}

	/**
	 * Get a list with the set of ZKeys for this ZType
	 *
	 * @return ZTypedList
	 */
	public function getTypeKeys() {
		return $this->data[ ZTypeRegistry::Z_TYPE_KEYS ];
	}

	/**
	 * Get the string representation of the ZReference to this ZType's validator function
	 *
	 * @return string
	 */
	public function getTypeValidator() {
		return $this->data[ ZTypeRegistry::Z_TYPE_VALIDATOR ]->getZValue();
	}

	/**
	 * Get the string representation of the ZReference to this ZType's equality function,
	 * or false if there is none.
	 *
	 * @return string|false
	 */
	public function getEqualityFunction() {
		return $this->data[ ZTypeRegistry::Z_TYPE_EQUALITY ] ?
			$this->data[ ZTypeRegistry::Z_TYPE_EQUALITY ]->getZValue() :
			false;
	}

	/**
	 * Get the string representation of the ZReference to this ZType's rendering function,
	 * or false if there is none.
	 *
	 * @return string|false
	 */
	public function getRendererFunction() {
		return $this->data[ ZTypeRegistry::Z_TYPE_RENDERER ] ?
			$this->data[ ZTypeRegistry::Z_TYPE_RENDERER ]->getZValue() :
			false;
	}

	/**
	 * Get the string representation of the ZReference to this ZType's parsing function,
	 * or false if there is none.
	 *
	 * @return string|false
	 */
	public function getParserFunction() {
		return $this->data[ ZTypeRegistry::Z_TYPE_PARSER ] ?
			$this->data[ ZTypeRegistry::Z_TYPE_PARSER ]->getZValue() :
			false;
	}

	/**
	 * Get the ZList of this ZType's deserialisers
	 *
	 * @return ZTypedList
	 */
	public function getDeserialisers() {
		return $this->data[ ZTypeRegistry::Z_TYPE_DESERIALISERS ];
	}

	/**
	 * Get the ZList of this ZType's serialisers
	 *
	 * @return ZTypedList
	 */
	public function getSerialisers() {
		return $this->data[ ZTypeRegistry::Z_TYPE_SERIALISERS ];
	}

	/**
	 * Return whether the type has an identity key but is not
	 * one of the non-enum reserved types with identity key:
	 * * Type/Z4
	 * * Function/Z8
	 * * Deserialiser/Z46
	 * * Serialiser/Z64
	 *
	 * @return bool
	 */
	public function isEnumType() {
		$typeId = $this->getTypeId()->getZValue();

		if ( in_array( $typeId, ZTypeRegistry::EXCLUDE_TYPES_FROM_ENUMS ) ) {
			// Type has identity key but excluded from enum; return false
			return false;
		}

		$keys = $this->getTypeKeys()->getAsArray();
		foreach ( $keys as $key ) {
			if ( $key->getIsIdentity() ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Get the ZKey of a given key reference from the set of ZKeys of this ZType or
	 * null if the ZKey is not available.
	 *
	 * @param string $key
	 * @return ZKey|null
	 */
	public function getZKey( $key ) {
		$keys = $this->getTypeKeys()->getAsArray();
		foreach ( $keys as $zkey ) {
			if ( $zkey->getKeyId() === $key ) {
				return $zkey;
			}
		}
		return null;
	}
}
