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

	private $zObjectType;

	private $value;

	public function __construct( $value ) {
		// TODO: Type-check / form check.
		$this->value = $value ?? new \stdClass();
	}

	public function getType() {
		if ( $this->zObjectType === null ) {
			$objectVars = get_object_vars( $this->value );
			if ( !array_key_exists( 'Z1K1', $objectVars ) ) {
				throw new \InvalidArgumentException( "ZObject top-level record missing a type key." );
			}
			$this->zObjectType = ZTypeRegistry::singleton()->getZObjectTypeFromKey( $objectVars['Z1K1'] );
		}

		return $this->zObjectType;
	}

	public function getValue() {
		return $this->value;
	}

	public function isValid() : bool {
		// This implicitly checks for Z1K1 being set. Later, we'll care
		// about other things too.
		$this->getType();

		return true;
	}
}
