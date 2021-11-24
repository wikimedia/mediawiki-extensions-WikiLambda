<?php
/**
 * WikiLambda ZQuote
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;

class ZQuote extends ZObject {

	public static function getDefinition(): array {
		return [
			'type' => ZTypeRegistry::Z_QUOTE,
			'keys' => [
				ZTypeRegistry::Z_QUOTE_VALUE => [
					'type' => ZTypeRegistry::BUILTIN_ANY,
					'default' => ''
				],
			],
		];
	}

	public function __construct( $value = '' ) {
		$this->data[ ZTypeRegistry::Z_QUOTE_VALUE ] = $value;
	}

	public function getZValue() {
		return $this->data[ ZTypeRegistry::Z_QUOTE_VALUE ];
	}

	public function isValid(): bool {
		return true;
	}

	/**
	 * Convert this ZObject into its serialized canonical representation
	 *
	 * @param int $form
	 * @return \stdClass|array|string
	 */
	public function getSerialized( $form = self::FORM_CANONICAL ) {
		return (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_QUOTE,
			ZTypeRegistry::Z_QUOTE_VALUE => $this->getZValue()
		];
	}
}
