<?php
/**
 * WikiLambda ZString
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

class ZString implements ZObject {

	private $zObjectType = 'ZString';

	private $value;

	public function __construct( $value = '' ) {
		if ( is_string( $value ) ) {
			$this->value = $value;
		} else {
			$this->value = get_object_vars( $value )[ ZTypeRegistry::Z_STRING_VALUE ];
		}
	}

	public static function create( array $objectVars ) : ZObject {
		if ( !array_key_exists( ZTypeRegistry::Z_STRING_VALUE, $objectVars ) ) {
			throw new \InvalidArgumentException( "ZString missing the value key." );
		}
		return new ZString( $objectVars[ ZTypeRegistry::Z_STRING_VALUE ] );
	}

	public function getZType() : string {
		return $this->zObjectType;
	}

	public function getZValue() {
		return $this->value;
	}

	public function isValid() : bool {
		return true;
	}
}
