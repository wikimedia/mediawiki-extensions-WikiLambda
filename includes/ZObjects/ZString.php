<?php
/**
 * WikiLambda ZString
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

class ZString extends ZObject {

	/**
	 * @inheritDoc
	 */
	public function __construct( $value = '' ) {
		if ( is_string( $value ) || $value === null ) {
			$this->data[ ZTypeRegistry::Z_STRING_VALUE ] = $value;
			return;
		}

		if ( is_array( $value ) ) {
			$this->data[ ZTypeRegistry::Z_STRING_VALUE ] = $value[0] ?? '';
			return;
		}

		if ( $value instanceof ZString ) {
			$this->data[ZTypeRegistry::Z_STRING_VALUE] = $value->getZValue();
			return;
		}

		// Possibly a serialised version of a ZString; pull out the value and use it if so, otherwise we'll default.
		if ( $value instanceof \stdclass ) {
			$arrayObject = get_object_vars( $value );
			if (
				array_key_exists( 'data', $arrayObject )
				&& array_key_exists( ZTypeRegistry::Z_STRING_VALUE, $arrayObject['data'] )
				&& is_string( $arrayObject['data'][ZTypeRegistry::Z_STRING_VALUE] )
			) {
				$this->data[ZTypeRegistry::Z_STRING_VALUE] = $arrayObject['data'][ZTypeRegistry::Z_STRING_VALUE];
				return;
			}
		}

		// Otherwise give up and have it as null
		$this->data[ ZTypeRegistry::Z_STRING_VALUE ] = null;
	}

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
		return [
			'type' => [
				'type' => ZTypeRegistry::Z_REFERENCE,
				'value' => ZTypeRegistry::Z_STRING,
			],
			'keys' => [
				ZTypeRegistry::Z_STRING_VALUE => [
					'type' => ZTypeRegistry::BUILTIN_STRING,
					'default' => ''
				],
			],
		];
	}

	/**
	 * @inheritDoc
	 */
	public function isValid(): bool {
		// For ZString, all strings of any value are by definition valid (including null,
		// which is read as empty).
		if ( !is_string( $this->data[ ZTypeRegistry::Z_STRING_VALUE ] ) ) {
			return false;
		}
		return true;
	}

	/**
	 * @inheritDoc
	 */
	public function getSerialized( $form = self::FORM_CANONICAL ) {
		if ( $form === self::FORM_CANONICAL ) {
			if ( !ZObjectUtils::isValidZObjectReference( $this->getZValue() ?? '' ) ) {
				return $this->getZValue();
			}
		}
		return parent::getSerialized();
	}

	/**
	 * Get the string value wrapped in this ZString instance
	 *
	 * @return string|null
	 */
	public function getZValue() {
		return $this->data[ ZTypeRegistry::Z_STRING_VALUE ];
	}
}
