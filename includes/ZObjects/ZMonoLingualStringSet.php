<?php
/**
 * WikiLambda ZMonoLingualStringSet
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

class ZMonoLingualStringSet extends ZObject {

	/**
	 * Create a ZMonoLingualStringSet instance given a language ZReference and an array
	 * or ZList of ZString instances. Internally this class bypasses ZList and stores an
	 * array.
	 *
	 * @param ZReference $language
	 * @param ZList|array $value
	 */
	public function __construct( $language, $value = [] ) {
		$this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE ] = $language;
		$this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE ] = [];
		foreach ( ZObjectUtils::getIterativeList( $value ) as $index => $element ) {
			$this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE ][] = $element;
		}
	}

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
		return [
			'type' => ZTypeRegistry::Z_MONOLINGUALSTRINGSET,
			'keys' => [
				ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE => [
					'type' => ZTypeRegistry::HACK_REFERENCE_LANGUAGE,
					'required' => true,
				],
				ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE => [
					'type' => ZTypeRegistry::Z_LIST,
					'required' => true,
				],
			],
		];
	}

	/**
	 * @inheritDoc
	 */
	public function isValid(): bool {
		if ( !( $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE ] instanceof ZReference ) ) {
			return false;
		}
		if ( !is_array( $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE ] ) ) {
			return false;
		}
		foreach ( $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE ] as $value ) {
			if ( !( $value instanceof ZString ) ) {
				return false;
			}
		}
		// We also check validity of the language Zid.
		$langs = ZLangRegistry::singleton();
		return $langs->isValidLanguageZid( $this->getLanguage() );
	}

	/**
	 * Get a map representing this ZMonoLingualString language and string set.
	 *
	 * @return array Language and string set of this ZMonoLingualString
	 */
	public function getZValue() {
		return [ $this->getLanguage() => $this->getStringSet() ];
	}

	/**
	 * Get the Zid that represents the language for this ZMonoLingualStringSet
	 *
	 * @return string Language Zid
	 */
	public function getLanguage() {
		return $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE ]->getZValue();
	}

	/**
	 * Get an array of strings values contained by this ZMonoLingualStringSet
	 *
	 * @return string[] Set of string values
	 */
	public function getStringSet() {
		return array_map( static function ( $zstring ) {
			return $zstring->getZValue();
		}, $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE ]
		);
	}
}
