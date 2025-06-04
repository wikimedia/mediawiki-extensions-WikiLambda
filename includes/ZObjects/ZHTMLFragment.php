<?php
/**
 * WikiLambda ZHTMLFragment (Z89)
 *
 * @file
 * @ingroup Extensions
 * @copyright 2024 – Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;

class ZHTMLFragment extends ZObject {

	/**
	 * Construct a ZHTMLFragment instance (Z89)
	 *
	 * @param string $html
	 */
	public function __construct( $html = '' ) {
		$this->data[ ZTypeRegistry::Z_HTML_FRAGMENT_VALUE ] = $html;
	}

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
		return [
			'type' => [
				'type' => ZTypeRegistry::Z_REFERENCE,
				'value' => ZTypeRegistry::Z_HTML_FRAGMENT,
			],
			'keys' => [
				ZTypeRegistry::Z_HTML_FRAGMENT_VALUE => [
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
		if ( !is_string( $this->data[ ZTypeRegistry::Z_HTML_FRAGMENT_VALUE ] ) ) {
			return false;
		}
		return true;
	}

	/**
	 * Get the HTML fragment value
	 *
	 * @return string
	 */
	public function getZValue() {
		return $this->data[ ZTypeRegistry::Z_HTML_FRAGMENT_VALUE ];
	}
}
