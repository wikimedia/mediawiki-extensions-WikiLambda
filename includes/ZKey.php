<?php
/**
 * WikiLambda ZKey
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

class ZKey implements ZObject {

	private $zObjectType = 'ZKey';

	private $keys = [
		ZTypeRegistry::Z_KEY_TYPE => null,
		ZTypeRegistry::Z_KEY_ID => null,
		ZTypeRegistry::Z_KEY_LABEL => null
	];

	public function __construct( $type, $identity, $label ) {
		$this->keys[ ZTypeRegistry::Z_KEY_TYPE ] = $type;
		$this->keys[ ZTypeRegistry::Z_KEY_ID ] = $identity;
		$this->keys[ ZTypeRegistry::Z_KEY_LABEL ] = $label;
	}

	public static function create( array $objectVars ) : ZObject {
		if ( $objectVars[ ZTypeRegistry::Z_OBJECT_TYPE ] !== ZTypeRegistry::Z_KEY ) {
			throw new \InvalidArgumentException( "Type of ZKey expected, but instead '" . $objectVars[ ZTypeRegistry::Z_OBJECT_TYPE ] . "'." );
		}

		if ( !array_key_exists( ZTypeRegistry::Z_KEY_TYPE, $objectVars ) ) {
			throw new \InvalidArgumentException( "ZKey missing the type key." );
		}
		$keyType = $objectVars[ ZTypeRegistry::Z_KEY_TYPE ];
		$registry = ZTypeRegistry::singleton();
		if ( !$registry->isZObjectKeyKnown( $keyType ) ) {
			throw new \InvalidArgumentException( "ZKey type '$keyType' isn't known." );
		}
		$keyType = $registry->getZObjectTypeFromKey( $keyType );

		if ( !array_key_exists( ZTypeRegistry::Z_KEY_ID, $objectVars ) ) {
			throw new \InvalidArgumentException( "ZKey missing the id key." );
		}
		$keyId = $objectVars[ ZTypeRegistry::Z_KEY_ID ];
		if ( !self::isValidZObjectKey( $keyId ) ) {
			throw new \InvalidArgumentException( "ZKey id '$keyId' isn't valid." );
		}

		if ( !array_key_exists( ZTypeRegistry::Z_KEY_LABEL, $objectVars ) ) {
			throw new \InvalidArgumentException( "ZKey missing the label key." );
		}
		$keyLabel = ZMultiLingualString::create( get_object_vars( $objectVars[ ZTypeRegistry::Z_KEY_LABEL ] ) );

		return new ZKey( $keyType, $keyId, $keyLabel );
	}

	public function getZType() : string {
		return $this->zObjectType;
	}

	public function getZValue() {
		return $this->keys;
	}

	public function getKeyType() {
		return $this->keys[ ZTypeRegistry::Z_KEY_TYPE ];
	}

	public function getKeyId() {
		return $this->keys[ ZTypeRegistry::Z_KEY_ID ];
	}

	public function getKeyLabel() {
		return $this->keys[ ZTypeRegistry::Z_KEY_LABEL ];
	}

	public function isValid() : bool {
		// TODO: Right now these are uneditable and guaranteed valid on creation, but when we
		// add model (API and UX) editing, this will need to actually evaluate.
		return true;
	}

	public function render() {
		return null;
	}

	/**
	 * A ZObject reference key (e.g. Z1 or Z12345)
	 *
	 * @param string $input
	 * @return bool
	 */
	public static function isValidZObjectReference( string $input ) : bool {
		return preg_match( "/^\s*Z[1-9]\d*\s*$/", $input );
	}

	/**
	 * A valid possible identifier across WMF projects
	 *
	 * @param string $input
	 * @return bool
	 */
	public static function isValidId( string $input ) : bool {
		return preg_match( "/^[A-Z][1-9]\d*$/", $input );
	}

	/**
	 * A ZObject reference key (e.g. Z1K1 or K12345)
	 *
	 * @param string $input
	 * @return bool
	 */
	public static function isValidZObjectKey( string $input ) : bool {
		return preg_match( "/^\s*(Z[1-9]\d*)?K\d+\s*$/", $input );
	}

}
