<?php
/**
 * WikiLambda ZString
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

class ZString implements ZObject {

	private $data = [];

	public static function getDefinition() : array {
		return [
			'type' => 'ZString',
			'keys' => [
				ZTypeRegistry::Z_STRING_VALUE => [
					'type' => ZTypeRegistry::HACK_STRING,
					'default' => ''
				],
			],
		];
	}

	public function __construct( $value = '' ) {
		if ( is_string( $value ) || $value === null ) {
			$this->data[ ZTypeRegistry::Z_STRING_VALUE ] = $value;
		} elseif ( is_array( $value ) ) {
			$this->data[ ZTypeRegistry::Z_STRING_VALUE ] = $value[0];
		} else {
			$this->data[ ZTypeRegistry::Z_STRING_VALUE ] = get_object_vars( $value )[ ZTypeRegistry::Z_STRING_VALUE ];
		}
	}

	public static function create( array $objectVars ) : ZObject {
		if ( !array_key_exists( ZTypeRegistry::Z_STRING_VALUE, $objectVars ) ) {
			throw new \InvalidArgumentException( "ZString missing the value key." );
		}
		return new ZString( $objectVars[ ZTypeRegistry::Z_STRING_VALUE ] );
	}

	public function getZType() : string {
		return static::getDefinition()['type'];
	}

	public function getZValue() {
		return $this->data[ ZTypeRegistry::Z_STRING_VALUE ];
	}

	public function isValid() : bool {
		// All strings of any value are by definition valid (including null, which is read as empty).
		return true;
	}
}
