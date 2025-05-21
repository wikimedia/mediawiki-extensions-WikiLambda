<?php
/**
 * WikiLambda ZMonoLingualString
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;

class ZMonoLingualString extends ZObject {

	/**
	 * Create a ZMonoLingualString instance given a language ZReference and a value ZString
	 *
	 * @param ZReference|ZNaturalLanguage $language
	 * @param ZString $value
	 */
	public function __construct( $language, $value ) {
		$this->data[ ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE ] = $language;
		$this->data[ ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE ] = $value;
	}

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
		return [
			'type' => [
				'type' => ZTypeRegistry::Z_REFERENCE,
				'value' => ZTypeRegistry::Z_MONOLINGUALSTRING,
			],
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
	 * @inheritDoc
	 */
	public function isValid(): bool {
		// Language can be a Reference or a literal Natural Language
		$lang = $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE ];
		if ( !( $lang instanceof ZReference ) && !( $lang instanceof ZNaturalLanguage ) ) {
			return false;
		}

		// If ZReference, check it's a valid language Zid
		$langs = ZLangRegistry::singleton();
		if ( ( $lang instanceof ZReference ) && !$langs->isValidLanguageZid( $lang->getZValue() ) ) {
			return false;
		}

		// If ZNaturalLanguage, check it's a valid Z60 object
		if ( ( $lang instanceof ZNaturalLanguage ) && !$lang->isValid() ) {
			return false;
		}

		// Value should be a ZString
		if ( !( $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE ] instanceof ZString ) ) {
			return false;
		}

		return true;
	}

	/**
	 * Get a map representing this ZMonoLingualString language and string value.
	 *
	 * @return array Language and string of this ZMonoLingualString
	 */
	public function getZValue() {
		return [ $this->getLanguage() => $this->getString() ];
	}

	/**
	 * Get the Zid that represents the language for this ZMonoLingualString
	 *
	 * @return string Language Zid or code
	 */
	public function getLanguage() {
		return $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE ]->getZValue();
	}

	/**
	 * Get the string value of this ZMonoLingualString
	 *
	 * @return ?string String value
	 */
	public function getString() {
		return $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE ]->getZValue();
	}
}
