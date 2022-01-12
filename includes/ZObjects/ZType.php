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
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

class ZType extends ZObject {

	/**
	 * Construct a ZType instance given the identity ZReference, a ZList of ZKeys and a ZReference
	 * to the type validator
	 *
	 * @param ZObject $identity
	 * @param ZObject $keys
	 * @param ZObject $validator
	 */
	public function __construct( $identity, $keys, $validator ) {
		$this->data[ ZTypeRegistry::Z_TYPE_IDENTITY ] = $identity;
		$this->data[ ZTypeRegistry::Z_TYPE_KEYS ] = $keys;
		$this->data[ ZTypeRegistry::Z_TYPE_VALIDATOR ] = $validator;
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
					// TODO: Walk the array of ZKeys.
					'type' => ZTypeRegistry::HACK_ARRAY_Z_KEY,
					'required' => true,
				],
				ZTypeRegistry::Z_TYPE_VALIDATOR => [
					// NOTE: Allows Z0 until we support ZFunctions.
					'type' => ZTypeRegistry::BUILTIN_REFERENCE_NULLABLE,
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

		// Key map must be set to an array, ZList or ZGenericList of zero or more ZKeys, all valid
		if ( !isset( $this->data[ ZTypeRegistry::Z_TYPE_KEYS ] ) ) {
			return false;
		}
		$keys = $this->data[ ZTypeRegistry::Z_TYPE_KEYS ];
		if ( !is_array( $keys ) ) {
			if ( $keys instanceof ZList ) {
				if ( !$keys->isValid() ) {
					return false;
				}
				$keys = $keys->getZListAsArray();
			} elseif ( $keys instanceof ZGenericList ) {
				if ( $keys->getElementType() !== ZTypeRegistry::Z_KEY ) {
					return false;
				}
				$keys = $keys->getZGenericListAsArray();
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
			if ( ZObjectUtils::getZObjectReferenceFromKey( $key->getKeyId() ) !== $this->getTypeId() ) {
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
		// TODO: Actually check that the validator is a ZFunction that applies to us.

		return true;
	}

	/**
	 * Get the complete data values of this ZType, comprised of identity, keys and validator
	 *
	 * @return array
	 */
	public function getZValue() {
		return $this->data;
	}

	/**
	 * Get the string representation of th ZType Zid
	 *
	 * @return string
	 */
	public function getTypeId() {
		return $this->data[ ZTypeRegistry::Z_TYPE_IDENTITY ]->getZValue();
	}

	/**
	 * Get a ZList with the set of ZKeys for this ZType
	 *
	 * @return ZList
	 */
	public function getTypeKeys() {
		return $this->data[ ZTypeRegistry::Z_TYPE_KEYS ];
	}

	/**
	 * Get the string representation fo the ZReference to this ZType validator
	 *
	 * @return string
	 */
	public function getTypeValidator() {
		return $this->data[ ZTypeRegistry::Z_TYPE_VALIDATOR ]->getZValue();
	}

	/**
	 * Get the ZKey of a given key reference from the set of ZKeys of this ZType or
	 * null if the ZKey is not available.
	 *
	 * @param string $key
	 * @return ZKey|null
	 */
	public function getZKey( $key ) {
		$keys = $this->getTypeKeys()->getZListAsArray();
		foreach ( $keys as $zkey ) {
			if ( $zkey->getKeyId() === $key ) {
				return $zkey;
			}
		}
		return null;
	}
}
