<?php
/**
 * WikiLambda ZReference
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

class ZReference extends ZObject {

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

	public function __construct( $value ) {
		$this->data[ ZTypeRegistry::Z_REFERENCE_VALUE ] = $value;
	}

	public function getZValue() {
		return $this->data[ ZTypeRegistry::Z_REFERENCE_VALUE ];
	}

	public function isValid(): bool {
		if ( !isset( $this->data[ ZTypeRegistry::Z_REFERENCE_VALUE ] ) ) {
			return false;
		}
		return ZObjectUtils::isValidZObjectReference( $this->data[ ZTypeRegistry::Z_REFERENCE_VALUE ] );
	}

	/**
	 * Convert this ZObject into its serialized canonical representation
	 *
	 * @param int $form
	 * @return \stdClass|array|string
	 */
	public function getSerialized( $form = self::FORM_CANONICAL ) {
		if ( $form === self::FORM_CANONICAL ) {
			return $this->getZValue();
		} else {
			return parent::getSerialized();
		}
	}
}
