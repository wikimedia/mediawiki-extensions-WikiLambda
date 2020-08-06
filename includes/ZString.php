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

	private $value;

	public function __construct( string $value = '' ) {
		$this->value = $value;
	}

	public function getType() {
		return 'ZString';
	}

	public function getValue() {
		return $this->value;
	}

	public function isValid() : bool {
		return true;
	}
}
