<?php
/**
 * WikiLambda ZType
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Extension\WikiLambda\ZTypeRegistry;

class ZType extends ZObject {

	public static function getDefinition() : array {
		return [
			'type' => ZTypeRegistry::Z_TYPE,
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

	public function __construct( $identity, $keys, $validator ) {
		$this->data[ ZTypeRegistry::Z_TYPE_IDENTITY ] = $identity;
		$this->data[ ZTypeRegistry::Z_TYPE_KEYS ] = $keys;
		$this->data[ ZTypeRegistry::Z_TYPE_VALIDATOR ] = $validator;
	}

	public function getZValue() {
		return $this->data;
	}

	public function getTypeId() {
		return $this->data[ ZTypeRegistry::Z_TYPE_IDENTITY ];
	}

	public function getTypeKeys() {
		return $this->data[ ZTypeRegistry::Z_TYPE_KEYS ];
	}

	public function getTypeValidator() {
		return $this->data[ ZTypeRegistry::Z_TYPE_VALIDATOR ];
	}

	public function isValid() : bool {
		// Identity must be set to a valid ZKey reference (or special case of 'Z0')
		if ( !isset( $this->data[ ZTypeRegistry::Z_TYPE_IDENTITY ] ) ) {
			return false;
		}
		$identity = $this->data[ ZTypeRegistry::Z_TYPE_IDENTITY ];
		if ( !ZObjectUtils::isValidZObjectReference( $identity ) && $identity !== ZTypeRegistry::Z_NULL_REFERENCE ) {
			return false;
		}

		// Key map must be set to an array or ZList of zero or more ZKeys, all valid, and of our ZID
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
			if ( ZObjectUtils::getZObjectReferenceFromKey( $key->getKeyId() ) !== $identity ) {
				return false;
			}
		}

		// Validator must be set to a valid ZKey reference
		if ( !isset( $this->data[ ZTypeRegistry::Z_TYPE_VALIDATOR ] ) ) {
			return false;
		}
		$validator = $this->data[ ZTypeRegistry::Z_TYPE_VALIDATOR ];
		if ( !ZObjectUtils::isValidZObjectReference( $validator ) || $validator === ZTypeRegistry::Z_NULL_REFERENCE ) {
			return false;
		}
		// TODO: Actually check that the validator is a ZFunction that applies to us.

		return true;
	}
}
