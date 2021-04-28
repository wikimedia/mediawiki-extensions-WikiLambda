<?php
/**
 * WikiLambda ZMultiLingualString
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use Language;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZTypeRegistry;
use MediaWiki\Languages\LanguageFallback;
use MediaWiki\MediaWikiServices;

class ZMultiLingualString extends ZObject {

	public static function getDefinition() : array {
		return [
			'type' => ZTypeRegistry::Z_MULTILINGUALSTRING,
			'keys' => [
				ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE => [
					'type' => ZTypeRegistry::HACK_ARRAY_Z_MONOLINGUALSTRING,
					'required' => true,
				],
			],
		];
	}

	public function __construct( $strings = [] ) {
		foreach ( $strings as $index => $monoLingualString ) {
			if ( !( $monoLingualString instanceof ZMonoLingualString ) ) {
				$monoLingualString = ZObjectFactory::create( $monoLingualString );
			}
			$this->setMonoLingualString( $monoLingualString );
		}
	}

	public function getZValue() {
		return $this->data[ ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE ] ?? [];
	}

	/**
	 * Fetch the ZMultiLingualString's stored value for a given MediaWiki language code (e.g.
	 * 'en' or 'zh-hant'). Note that this is a raw fetch and does not walk the language fallback
	 * chain; users are expected to use getStringForLanguage() which does.
	 *
	 * @param string $languageCode The MediaWiki language code in which the string is wanted.
	 * @return string The string, or the empty string if .
	 */
	public function getStringForLanguageCode( string $languageCode ) : string {
		return $this->data[ ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE ][ $languageCode ] ?? '';
	}

	/**
	 * Check if the ZMultiLingualString has a stored value for a given MediaWiki language code (e.g.
	 * 'en' or 'zh-hant'). Note that this is a raw check and does not walk the language fallback
	 * chain.
	 *
	 * @param string $languageCode The MediaWiki language code in which the string is wanted.
	 * @return bool If there is a string stored.
	 */
	public function isLanguageProvidedValue( string $languageCode ) : bool {
		return array_key_exists( $languageCode, $this->data[ ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE ] ?? [] );
	}

	/**
	 * Fetch the ZMultiLingualString's stored value for a given MediaWiki language class. This will
	 * walk the language fallback chain, and provide a fallback message if there is no label defined
	 * in the given language or any of its fallback languages.
	 *
	 * @param Language $language The MediaWiki language class in which the string is wanted.
	 * @return string The string, or the value of the wikilambda-multilingualstring-nofallback message.
	 */
	public function getStringForLanguage( Language $language ) : string {
		if ( $this->isLanguageProvidedValue( $language->mCode ) ) {
			return $this->getStringForLanguageCode( $language->mCode );
		}

		$fallbacks = MediaWikiServices::getInstance()->getLanguageFallback()->getAll(
			$language->mCode,
			LanguageFallback::STRICT /* Don't try for en unless it's an accepted fallback. */
		);

		foreach ( $fallbacks as $index => $languageCode ) {
			if ( $this->isLanguageProvidedValue( $languageCode ) ) {
				return $this->getStringForLanguageCode( $languageCode );
			}
		}

		return wfMessage( 'wikilambda-multilingualstring-nofallback' )->inLanguage( $language )->text();
	}

	/**
	 * @param ZMonoLingualString $value The new value to set.
	 */
	public function setMonoLingualString( ZMonoLingualString $value ) : void {
		$this->data[ ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE ][ $value->getLanguage() ] = $value->getString();
	}

	/**
	 * @param Language $language The MediaWiki language class in which the string is to be set.
	 * @param string $value The new string to set.
	 */
	public function setStringForLanguage( Language $language, string $value ) : void {
		$languageCode = $language->mCode;
		$this->data[ ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE ][ $languageCode ] = $value;
	}

	/**
	 * @param Language $language The MediaWiki language class in which the string is to be unset.
	 */
	public function removeValue( Language $language ) : void {
		if ( $this->isLanguageProvidedValue( $language->mCode ) ) {
			unset( $this->data[ ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE ][ $language->mCode ] );
		}
	}

	public function isValid() : bool {
		foreach ( $this->data[ ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE ] ?? [] as $languageCode => $value ) {
			if ( !Language::isValidCode( $languageCode ) ) {
				return false;
			}
			// TODO: Do we care about the validity of the values?
		}
		return true;
	}
}
