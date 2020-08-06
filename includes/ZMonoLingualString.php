<?php
/**
 * WikiLambda ZMonoLingualString
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

class ZMonoLingualString implements ZObject {

	private $zObjectType = 'ZMonoLingualString';

	private $keys = [
		ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE => '',
		ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE => ''
	];

	public function __construct( $langage = '', $value = '' ) {
		$this->keys[ ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE ] = $langage;
		$this->keys[ ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE ] = $value;
	}

	public function getZType() : string {
		return $this->zObjectType;
	}

	public function getZValue() {
		return [ $this->getLanguage() => $this->getString() ];
	}

	public function getLanguage() {
		return $this->keys[ ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE ];
	}

	public function getString() {
		return $this->keys[ ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE ];
	}

	public function isValid() : bool {
		return true;
	}
}
