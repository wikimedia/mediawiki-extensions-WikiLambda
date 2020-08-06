<?php
/**
 * WikiLambda ZList
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

class ZList implements ZObject {

	private $zObjectType = 'ZList';

	private $value;

	public function __construct( $value = [] ) {
		$this->value = $value;
	}

	public function getType() {
		return 'ZList';
	}

	public function getValue() {
		return $this->value;
	}

	public function isValid() : bool {
		foreach ( $this->value as $key => $value ) {
			if (
				is_object( $value )
				&& $value instanceof ZObject
				&& !$value->isValid()
			) {
				return false;
			} elseif ( !is_string( $value ) ) {
				return false;
			}
		}
		return true;
	}
}
