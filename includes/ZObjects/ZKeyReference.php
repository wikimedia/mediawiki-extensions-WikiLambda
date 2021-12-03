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
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

class ZKeyReference extends ZObject {

	/**
	 * Construct a ZKeyReference instance, bypassing the internal ZString formally contained.
	 *
	 * @param string $value
	 */
	public function __construct( $value ) {
		$this->data[ ZTypeRegistry::Z_KEYREFERENCE_VALUE ] = $value;
	}

	/**
	 * @inheritDoc
	 */
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

	/**
	 * @inheritDoc
	 */
	public function isValid(): bool {
		if ( !is_string( $this->data[ ZTypeRegistry::Z_KEYREFERENCE_VALUE ] ) ) {
			return false;
		}
		return ZObjectUtils::isValidZObjectKey( $this->data[ ZTypeRegistry::Z_KEYREFERENCE_VALUE ] );
	}

	/**
	 * Get string value of the ZKeyReference object
	 *
	 * @return string The identifier of the ZKey referred by this ZObject
	 */
	public function getZValue() {
		return $this->data[ ZTypeRegistry::Z_KEYREFERENCE_VALUE ];
	}
}
