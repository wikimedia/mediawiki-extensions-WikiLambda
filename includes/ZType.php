<?php
/**
 * WikiLambda ZType
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

class ZType implements ZObject {

	private $zObjectType = 'ZType';

	private $keys = [
		ZTypeRegistry::Z_TYPE_IDENTITY => null,
		ZTypeRegistry::Z_TYPE_KEYS => null,
		ZTypeRegistry::Z_TYPE_VALIDATOR => null
	];

	public function __construct( $identity, $keys, $validator ) {
		$this->keys[ ZTypeRegistry::Z_TYPE_IDENTITY ] = $identity;
		$this->keys[ ZTypeRegistry::Z_TYPE_KEYS ] = $keys;
		$this->keys[ ZTypeRegistry::Z_TYPE_VALIDATOR ] = $validator;
	}

	public static function create( array $objectVars ) : ZObject {
		if ( $objectVars[ ZTypeRegistry::Z_OBJECT_TYPE ] !== ZTypeRegistry::Z_TYPE ) {
			throw new \InvalidArgumentException( "Type of ZType expected, but instead '" . $objectVars[ ZTypeRegistry::Z_OBJECT_TYPE ] . "'." );
		}

		if ( !array_key_exists( ZTypeRegistry::Z_TYPE_IDENTITY, $objectVars ) ) {
			throw new \InvalidArgumentException( "ZType missing the identity key." );
		}
		$typeId = $objectVars[ ZTypeRegistry::Z_TYPE_IDENTITY ];
		if ( !ZKey::isValidZObjectReference( $typeId ) ) {
			throw new \InvalidArgumentException( "ZType id '$typeId' isn't valid." );
		}

		if ( !array_key_exists( ZTypeRegistry::Z_TYPE_KEYS, $objectVars ) ) {
			throw new \InvalidArgumentException( "ZType missing the key." );
		}
		$typeKeys = [];
		foreach ( $objectVars[ ZTypeRegistry::Z_TYPE_KEYS ] as $index => $value ) {
			// TODO: Check that the ZKeys being referenced are for our ZID (which we don't know at this point?)
			$typeKeys[] = ZKey::create( get_object_vars( $value ) );
		}

		if ( !array_key_exists( ZTypeRegistry::Z_TYPE_VALIDATOR, $objectVars ) ) {
			throw new \InvalidArgumentException( "ZType missing the validator key." );
		}
		$typeValidator = $objectVars[ ZTypeRegistry::Z_TYPE_VALIDATOR ];
		// TODO: Once we support ZFunctions, this should check that it's a ZFunction.

		return new ZType( $typeId, $typeKeys, $typeValidator );
	}

	public function getZType() : string {
		return $this->zObjectType;
	}

	public function getZValue() {
		return $this->keys;
	}

	public function getTypeId() {
		return $this->keys[ ZTypeRegistry::Z_TYPE_IDENTITY ];
	}

	public function getTypeKeys() {
		return $this->keys[ ZTypeRegistry::Z_TYPE_KEYS ];
	}

	public function getTypeValidator() {
		return $this->keys[ ZTypeRegistry::Z_TYPE_VALIDATOR ];
	}

	public function isValid() : bool {
		// TODO: Right now these are uneditable and guaranteed valid on creation, but when we
		// add model (API and UX) editing, this will need to actually evaluate.
		return true;
	}

	public function render() {
		return null;
	}
}
