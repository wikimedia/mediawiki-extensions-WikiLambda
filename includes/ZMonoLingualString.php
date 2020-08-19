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

	public static function create( array $objectVars ) : ZObject {
		if ( !array_key_exists( ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE, $objectVars ) ) {
			throw new \InvalidArgumentException( "ZMonoLingualString missing the language code key." );
		}
		if ( !array_key_exists( ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE, $objectVars ) ) {
			throw new \InvalidArgumentException( "ZMonoLingualString missing the value key." );
		}
		return new ZMonoLingualString( $objectVars[ ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE ], $objectVars[ ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE ] );
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
