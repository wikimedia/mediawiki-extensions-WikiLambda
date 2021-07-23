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

use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Extension\WikiLambda\ZTypeRegistry;

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
		return ZObjectUtils::isValidZObjectReference( $this->data[ ZTypeRegistry::Z_REFERENCE_VALUE ] );
	}
}
