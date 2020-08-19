<?php
/**
 * WikiLambda ZRecord
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

class ZRecord implements ZObject {

	private $zValue;

	private $zObjectType;

	public function __construct( $type, $value ) {
		$this->zObjectType = ZTypeRegistry::singleton()->getZObjectTypeFromKey( $type );
		$this->zValue = ZObjectFactory::create( $value );
	}

	public static function create( array $objectVars ) : ZObject {
		if ( !array_key_exists( ZTypeRegistry::Z_RECORD_VALUE, $objectVars ) ) {
			throw new \InvalidArgumentException( "ZObject record missing a generic value key." );
		}
		if ( count( $objectVars ) !== 2 ) {
			throw new \InvalidArgumentException( "ZObject generic record with extra keys: " . implode( ', ', array_keys( $objectVars ) ) . "." );
		}
		return new ZRecord( $objectVars[ ZTypeRegistry::Z_OBJECT_TYPE ], $objectVars[ ZTypeRegistry::Z_RECORD_VALUE ] );
	}

	public function getZType() : string {
		if ( $this->zObjectType === null ) {
			$objectVars = get_object_vars( $this->zValue );
			if ( !array_key_exists( ZTypeRegistry::Z_OBJECT_TYPE, $objectVars ) ) {
				throw new \InvalidArgumentException( "ZObject top-level record missing a type key." );
			}
			$this->zObjectType = ZTypeRegistry::singleton()->getZObjectTypeFromKey( $objectVars[ZTypeRegistry::Z_OBJECT_TYPE] );
		}

		return $this->zObjectType;
	}

	public function getZValue() {
		return $this->zValue;
	}

	public function isValid() : bool {
		// TODO: Right now these are uneditable and guaranteed valid on creation, but when we
		// add model (API and UX) editing, this will need to actually evaluate.
		return true;
	}
}
