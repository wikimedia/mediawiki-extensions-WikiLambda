<?php
/**
 * WikiLambda ZObject utilities specific to repo-mode class
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Language\Language;
use MediaWiki\MediaWikiServices;
use MediaWiki\Title\Title;

class ZObjectRepoUtils {

	/**
	 * Get a language code from a string that may be either a code or a Wikifunctions ZLanguage ZID.
	 *
	 * @param string $languageString The string to interpret as a language, which may be a language code or a ZID
	 * @param string $fallback The language code to return if the string cannot be interpreted, defaulting to 'en'
	 * @return Language The Langauge for the interpreted language code, or the fallback if the input is invalid
	 */
	public static function getLanguageFromString( string $languageString, string $fallback = 'en' ): Language {
		$targetLanguage = $languageString;

		$services = MediaWikiServices::getInstance();

		// Allow the user-language to be a ZObject
		if ( ZObjectUtils::isValidZObjectReference( $languageString ) ) {
			$zobjectStore = $services->get( 'WikiLambdaZObjectStore' );
			$targetLanguageContent = $zobjectStore->fetchZObjectByTitle(
				Title::newFromText( $languageString, NS_MAIN )
			);
			if (
				$targetLanguageContent &&
				$targetLanguageContent->getObject() &&
				$targetLanguageContent->getObject()->Z2K2 &&
				$targetLanguageContent->getObject()->Z2K2->Z1K1 &&
				$targetLanguageContent->getObject()->Z2K2->Z1K1 === ZTypeRegistry::Z_LANGUAGE &&
				$targetLanguageContent->getObject()->Z2K2->Z60K1
			) {
				$targetLanguage = $targetLanguageContent->getObject()->Z2K2->Z60K1;
			} else {
				$targetLanguage = $fallback;
			}
		}

		// Given this is user input, validate the language code, and fall back if it's not valid
		if ( !$services->getLanguageNameUtils()->isSupportedLanguage( $targetLanguage ) ) {
			if ( !$services->getLanguageNameUtils()->isSupportedLanguage( $fallback ) ) {
				// Recover from invalid fallback language codes by using the default language
				$targetLanguage = 'en';
			} else {
				$targetLanguage = $fallback;
			}
		}

		// Given we've validated above the language (or fallback), we don't need to catch InvalidArgumentException.
		return $services->getLanguageFactory()->getLanguage( $targetLanguage );
	}

}
