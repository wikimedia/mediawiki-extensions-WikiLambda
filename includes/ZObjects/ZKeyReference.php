<?php
/**
 * WikiLambda ZKeyReference
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;

class ZKeyReference extends ZObject {

	public static function getDefinition(): array {
		return [
			'type' => ZTypeRegistry::Z_KEYREFERENCE,
			'keys' => [
				ZTypeRegistry::Z_KEYREFERENCE_VALUE => [
					'type' => ZTypeRegistry::BUILTIN_STRING,
					'default' => ''
				],
			],
		];
	}

	public function __construct( $value = '' ) {
		if ( is_string( $value ) || $value === null ) {
			$this->data[ ZTypeRegistry::Z_KEYREFERENCE_VALUE ] = $value;
		} elseif ( is_array( $value ) ) {
			$this->data[ ZTypeRegistry::Z_KEYREFERENCE_VALUE ] = $value[0];
		} else {
			$this->data[ ZTypeRegistry::Z_KEYREFERENCE_VALUE ] = get_object_vars( $value )[
				ZTypeRegistry::Z_KEYREFERENCE_VALUE
			];
		}
	}

	public function getZValue() {
		return $this->data[ ZTypeRegistry::Z_KEYREFERENCE_VALUE ];
	}

	public function isValid(): bool {
		// TODO: isValid if value is a string and has Z*K* shape
		return true;
	}
}
