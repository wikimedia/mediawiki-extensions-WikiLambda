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
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Languages\LanguageFallback;
use MediaWiki\MediaWikiServices;

class ZMultiLingualStringSet extends ZObject {

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

	public function __construct( $strings = [] ) {
		foreach ( $strings as $index => $monoLingualStringSet ) {
			if ( !( $monoLingualStringSet instanceof ZMonoLingualStringSet ) ) {
				$monoLingualStringSet = ZObjectFactory::create( $monoLingualStringSet );
			}
			$this->setMonoLingualStringSet( $monoLingualStringSet );
		}
	}

	public function getZValue() {
		return $this->data[ ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE ] ?? [];
	}

	public function isValid(): bool {
		$langs = ZLangRegistry::singleton();
		foreach ( $this->data[ ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE ] ?? [] as $languageZid => $value ) {
			if ( !$langs->isValidLanguageZid( $languageZid ) ) {
				return false;
			}
			// TODO: Do we care about the validity of the values?
		}
		return true;
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
		return $this->data[ ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE ][ $languageZid ] ?? [];
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
			LanguageFallback::STRICT /* Don't try for en unless it's an accepted fallback. */
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
	 * @return bool If there is a listß stored.
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
		$this->data[ ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE ][ $value->getLanguage() ] = $value->getStringSet();
	}
}
