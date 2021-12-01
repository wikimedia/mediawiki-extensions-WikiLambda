<?php
/**
 * WikiLambda ZMonoLingualString
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;

class ZMonoLingualString extends ZObject {

	public static function getDefinition(): array {
		return [
			'type' => ZTypeRegistry::Z_MONOLINGUALSTRING,
			'keys' => [
				ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE => [
					'type' => ZTypeRegistry::HACK_REFERENCE_LANGUAGE,
					'required' => true,
				],
				ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE => [
					'type' => ZTypeRegistry::BUILTIN_STRING,
					'required' => true,
				],
			],
		];
	}

	/**
	 * Create a ZMonoLingualString instance given a language ZReference and a value ZString
	 *
	 * @param ZReference $language
	 * @param ZString $value
	 */
	public function __construct( $language, $value ) {
		$this->data[ ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE ] = $language;
		$this->data[ ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE ] = $value;
	}

	public function getZValue() {
		return [ $this->getLanguage() => $this->getString() ];
	}

	public function getLanguage() {
		return $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE ]->getZValue();
	}

	public function getString() {
		return $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE ]->getZValue();
	}

	public function isValid(): bool {
		if ( !( $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE ] instanceof ZReference ) ) {
			return false;
		}
		if ( !( $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE ] instanceof ZString ) ) {
			return false;
		}
		// We also check validity of the language Zid.
		$langs = ZLangRegistry::singleton();
		return $langs->isValidLanguageZid( $this->getLanguage() );
	}
}
