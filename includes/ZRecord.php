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
		return true;
	}
}
