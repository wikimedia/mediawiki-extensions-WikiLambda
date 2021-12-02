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

	/**
	 * Construct a ZQuote instance that can contain any value
	 *
	 * @param mixed $value
	 */
	public function __construct( $value = '' ) {
		$this->data[ ZTypeRegistry::Z_QUOTE_VALUE ] = $value;
	}

	/**
	 * @inheritDoc
	 */
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

	/**
	 * @inheritDoc
	 */
	public function isValid(): bool {
		// For ZQuote, any value is valid by definition.
		return true;
	}

	/**
	 * @inheritDoc
	 */
	public function getSerialized( $form = self::FORM_CANONICAL ) {
		return (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_QUOTE,
			ZTypeRegistry::Z_QUOTE_VALUE => $this->getZValue()
		];
	}

	/**
	 * Get the raw content of the value quoted by this ZQuote instance
	 *
	 * @return mixed
	 */
	public function getZValue() {
		return $this->data[ ZTypeRegistry::Z_QUOTE_VALUE ];
	}
}
