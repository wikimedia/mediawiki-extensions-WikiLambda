<?php
/**
 * WikiLambda ZType
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use InvalidArgumentException;

class ZType implements ZObject {

	/** @var array */
	private $data = [];

	public static function getDefinition() : array {
		return [
			'type' => 'ZType',
			'keys' => [
				ZTypeRegistry::Z_TYPE_IDENTITY => [
					// NOTE: Allows Z0.
					'type' => ZTypeRegistry::HACK_REFERENCE_NULLABLE,
				],
				ZTypeRegistry::Z_TYPE_KEYS => [
					// TODO: Walk the array of ZKeys.
					'type' => ZTypeRegistry::HACK_ARRAY_Z_KEY,
				],
				ZTypeRegistry::Z_TYPE_VALIDATOR => [
					// NOTE: Allows Z0 until we support ZFunctions.
					'type' => ZTypeRegistry::HACK_REFERENCE_NULLABLE,
				],
			],
		];
	}

	public function __construct( $identity, $keys, $validator ) {
		$this->data[ ZTypeRegistry::Z_TYPE_IDENTITY ] = $identity;
		$this->data[ ZTypeRegistry::Z_TYPE_KEYS ] = $keys;
		$this->data[ ZTypeRegistry::Z_TYPE_VALIDATOR ] = $validator;
	}

	public static function create( array $objectVars ) : ZObject {
		if ( $objectVars[ ZTypeRegistry::Z_OBJECT_TYPE ] !== ZTypeRegistry::Z_TYPE ) {
			throw new InvalidArgumentException(
				"Type of ZType expected, but instead '" . $objectVars[ ZTypeRegistry::Z_OBJECT_TYPE ] . "'."
			);
		}

		if ( !array_key_exists( ZTypeRegistry::Z_TYPE_IDENTITY, $objectVars ) ) {
			throw new InvalidArgumentException( "ZType missing the identity key." );
		}
		$typeId = $objectVars[ ZTypeRegistry::Z_TYPE_IDENTITY ];
		if ( !ZKey::isValidZObjectReference( $typeId ) ) {
			throw new InvalidArgumentException( "ZType id '$typeId' isn't valid." );
		}

		if ( !array_key_exists( ZTypeRegistry::Z_TYPE_KEYS, $objectVars ) ) {
			throw new InvalidArgumentException( "ZType missing the key." );
		}
		$typeKeys = [];
		foreach ( $objectVars[ ZTypeRegistry::Z_TYPE_KEYS ] as $index => $value ) {
			// TODO: Check that the ZKeys being referenced are for our ZID (which we don't know at this point?)
			$typeKeys[] = ZObjectFactory::create( $value );
		}

		if ( !array_key_exists( ZTypeRegistry::Z_TYPE_VALIDATOR, $objectVars ) ) {
			throw new InvalidArgumentException( "ZType missing the validator key." );
		}
		$typeValidator = $objectVars[ ZTypeRegistry::Z_TYPE_VALIDATOR ];
		// TODO: Once we support ZFunctions, this should check that it's a ZFunction.

		return new ZType( $typeId, $typeKeys, $typeValidator );
	}

	public function getZType() : string {
		return static::getDefinition()['type'];
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
		if ( !ZKey::isValidZObjectReference( $identity ) && $identity !== 'Z0' ) {
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
			if ( ZKey::getZObjectReferenceFromKey( $key->getKeyId() ) !== $identity ) {
				return false;
			}
		}

		// Validator must be set to a valid ZKey reference
		if ( !isset( $this->data[ ZTypeRegistry::Z_TYPE_VALIDATOR ] ) ) {
			return false;
		}
		$validator = $this->data[ ZTypeRegistry::Z_TYPE_VALIDATOR ];
		if ( !ZKey::isValidZObjectReference( $validator ) ) {
			return false;
		}
		// TODO: Actually check that the validator is a ZFunction that applies to us.

		return true;
	}
}
