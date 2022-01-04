<?php
/**
 * WikiLambda ZReference
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

class ZReference extends ZObject {

	/**
	 * Construct a ZReference instance given the string value of the Zid which it references to
	 *
	 * @param string $value
	 */
	public function __construct( $value ) {
		$this->data[ ZTypeRegistry::Z_REFERENCE_VALUE ] = $value;
	}

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
		return [
			'type' => ZTypeRegistry::Z_REFERENCE,
			'keys' => [
				ZTypeRegistry::Z_REFERENCE_VALUE => [
					'type' => ZTypeRegistry::BUILTIN_REFERENCE
				],
			],
		];
	}

	/**
	 * @inheritDoc
	 */
	public function isValid(): bool {
		if ( !is_string( $this->data[ ZTypeRegistry::Z_REFERENCE_VALUE ] ) ) {
			return false;
		}
		return ZObjectUtils::isValidZObjectReference( $this->data[ ZTypeRegistry::Z_REFERENCE_VALUE ] );
	}

	/**
	 * @inheritDoc
	 */
	public function getSerialized( $form = self::FORM_CANONICAL ) {
		if ( $form === self::FORM_CANONICAL ) {
			return $this->getZValue();
		} else {
			return parent::getSerialized();
		}
	}

	/**
	 * Get the value of this ZReference
	 *
	 * @return string
	 */
	public function getZValue() {
		return $this->data[ ZTypeRegistry::Z_REFERENCE_VALUE ];
	}
}
