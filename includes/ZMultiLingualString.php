<?php
/**
 * WikiLambda ZMultiLingualString
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use Language;
use MediaWiki\Languages\LanguageFallback;
use MediaWiki\MediaWikiServices;

class ZMultiLingualString implements ZObject {

	private $zObjectType = 'ZMultiLingualString';

	private $keys = [ ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE => [] ];

	public function __construct( $strings = [] ) {
		foreach ( $strings as $index => $monoLingualString ) {
			if ( !is_a( $monoLingualString, ZMonoLingualString::class ) ) {
				$monoLingualString = ZObjectFactory::create( $monoLingualString );
			}

			$this->keys[ ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE ][ $monoLingualString->getLanguage() ] = $monoLingualString->getString();
		}
	}

	public function getZType() : string {
		return $this->zObjectType;
	}

	public function getZValue() {
		return $this->keys[ ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE ];
	}

	private function getStringForLanguageCode( string $languageCode ) : string {
		return $this->keys[ ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE ][ $languageCode ] ?? '';
	}

	private function isLanguageProvidedValue( string $languageCode ) : bool {
		return array_key_exists( $languageCode, $this->keys[ ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE ] );
	}

	/**
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

	public function isValid() : bool {
		return true;
	}
}
