<?php
/**
 * WikiLambda ZMultiLingualStringSet
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use Language;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Languages\LanguageFallback;
use MediaWiki\MediaWikiServices;

class ZMultiLingualStringSet extends ZObject {

	/**
	 * Construct a ZMultiLingualStringSet instance given an array or a ZList
	 * of ZMonoLingualStringSet instances.
	 *
	 * @param ZList|array $strings
	 */
	public function __construct( $strings = [] ) {
		foreach ( ZObjectUtils::getIterativeList( $strings ) as $index => $monoLingualStringSet ) {
			if ( $monoLingualStringSet instanceof ZMonoLingualStringSet ) {
				$this->setMonoLingualStringSet( $monoLingualStringSet );
			}
		}
	}

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
		return [
			'type' => ZTypeRegistry::Z_MULTILINGUALSTRINGSET,
			'keys' => [
				ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE => [
					'type' => ZTypeRegistry::HACK_ARRAY_Z_MONOLINGUALSTRINGSET,
					'required' => true,
				],
			],
		];
	}

	/**
	 * @inheritDoc
	 */
	public function isValid(): bool {
		$stringsets = $this->data[ ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE ] ?? [];
		foreach ( $stringsets as $lang => $monolingualString ) {
			if ( !$monolingualString->isValid() ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Get the list of ZMonoLingualStringSets that represent the value of
	 * this ZMultiLingualStringSet
	 *
	 * @return array
	 */
	public function getZValue() {
		return $this->data[ ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE ] ?? [];
	}

	/**
	 * Get the values of this ZMultiLingualStringSet in the shape of an
	 * array with language as key and array of strings as value.
	 *
	 * @return array
	 */
	public function getValueAsList() {
		$multi = [];
		foreach ( $this->getZValue() as $mono ) {
			$multi[ $mono->getLanguage() ] = $mono->getStringSet();
		}
		return $multi;
	}

	/**
	 * Fetch the ZMultiLingualStringSet's stored values for a given MediaWiki language code (e.g.
	 * 'en' or 'zh-hant'). Note that this is a raw fetch and does not walk the language fallback
	 * chain; users are expected to use getStringForLanguage() which does.
	 *
	 * @param string $languageCode The MediaWiki language code in which the string is wanted.
	 * @return string[] The aliases list, possibly empty.
	 */
	public function getAliasesForLanguageCode( string $languageCode ): array {
		try {
			$languageZid = ZLangRegistry::singleton()->getLanguageZidFromCode( $languageCode );
		} catch ( ZErrorException $e ) {
			return [];
		}
		return array_key_exists( $languageZid, $this->getZValue() )
			? $this->getZValue()[ $languageZid ]->getStringSet()
			: [];
	}

	/**
	 * Fetch the ZMultiLingualStringSet's stored value for a given MediaWiki language class. This will
	 * walk the language fallback chain until there is a set value to return.
	 *
	 * @param Language $language The MediaWiki language class in which the string is wanted.
	 * @return string[] The aliases, possibly empty.
	 */
	public function getAliasesForLanguage( Language $language ): array {
		if ( $this->isLanguageProvidedValue( $language->getCode() ) ) {
			return $this->getAliasesForLanguageCode( $language->getCode() );
		}

		$fallbacks = MediaWikiServices::getInstance()->getLanguageFallback()->getAll(
			$language->getCode(),
			/* Don't try for en unless it's an accepted fallback. */ LanguageFallback::STRICT
		);

		foreach ( $fallbacks as $index => $languageCode ) {
			if ( $this->isLanguageProvidedValue( $languageCode ) ) {
				return $this->getAliasesForLanguageCode( $languageCode );
			}
		}

		return [];
	}

	/**
	 * Check if the ZMultiLingualStringSet has a stored value for a given MediaWiki language code (e.g.
	 * 'en' or 'zh-hant'). Note that this is a raw check and does not walk the language fallback
	 * chain.
	 *
	 * @param string $languageCode The MediaWiki language code in which the string is wanted.
	 * @return bool If there is a list stored.
	 */
	public function isLanguageProvidedValue( string $languageCode ): bool {
		try {
			$languageZid = ZLangRegistry::singleton()->getLanguageZidFromCode( $languageCode );
		} catch ( ZErrorException $e ) {
			return false;
		}
		$aliases = $this->data[ ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE ][ $languageZid ] ?? [];
		return !empty( $aliases );
	}

	/**
	 * Add or replace a ZMonoLingualStringSet.
	 *
	 * @param ZMonoLingualStringSet $value The new value to set.
	 */
	public function setMonoLingualStringSet( ZMonoLingualStringSet $value ): void {
		$this->data[ ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE ][ $value->getLanguage() ] = $value;
	}

	/**
	 * Convert this ZObject into its serialized canonical representation
	 *
	 * @param int $form
	 * @return \stdClass|array|string
	 */
	public function getSerialized( $form = self::FORM_CANONICAL ) {
		// TODO: (T296737) fix different serialization modes, only returning FORM_CANONICAL
		$monolingualStringSets = [];
		foreach ( $this->getZValue() as $lang => $value ) {
			$monolingualStringSets[] = $value->getSerialized( $form );
		}
		return (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => $this->getZType(),
			ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE => $monolingualStringSets
		];
	}
}
