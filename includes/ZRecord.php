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
		return $this->zObjectType;
	}

	public function getZValue() {
		return $this->zValue;
	}

	public function isValid() : bool {
		return true;
	}
}
