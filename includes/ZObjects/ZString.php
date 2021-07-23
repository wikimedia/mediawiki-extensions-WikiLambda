<?php
/**
 * WikiLambda ZString
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\ZTypeRegistry;

class ZString extends ZObject {

	public static function getDefinition(): array {
		return [
			'type' => ZTypeRegistry::Z_STRING,
			'keys' => [
				ZTypeRegistry::Z_STRING_VALUE => [
					'type' => ZTypeRegistry::BUILTIN_STRING,
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

	public function getZValue() {
		return $this->data[ ZTypeRegistry::Z_STRING_VALUE ];
	}

	public function isValid(): bool {
		// All strings of any value are by definition valid (including null, which is read as empty).
		return true;
	}
}
