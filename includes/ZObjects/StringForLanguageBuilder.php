<?php

/**
 * WikiLambda StringForLanguageBuilder
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Language\Language;
use MediaWiki\Language\LanguageFallbackMode;
use MediaWiki\MediaWikiServices;

/**
 * Builder of a string for a certain language.
 *
 * Don't instantiate it directly, rather call
 * MediaWiki\Extension\WikiLambda\ZObjects\ZMultilingualString->buildStringForLanguage( $lang )
 */
class StringForLanguageBuilder {

	private LanguageFallbackMode $languageFallback = LanguageFallbackMode::STRICT;
	private Language $language;
	private ?string $placeholderText = null;
	private ZMultiLingualString $provider;

	/**
	 * @param Language $lang The language with build the string for
	 * @param ZMultilingualString $provider Object that provides the localized strings.
	 */
	public function __construct( Language $lang, ZMultiLingualString $provider ) {
		$this->language = $lang;
		$this->provider = $provider;
	}

	/**
	 * If the string for the language passed to the constructor is not available, fallback to English.
	 * @return StringForLanguageBuilder
	 */
	public function fallbackWithEnglish(): StringForLanguageBuilder {
		$this->languageFallback = LanguageFallbackMode::MESSAGES;
		return $this;
	}

	/**
	 * If we cannot find any string, return the passed placeholder.
	 * @param string $placeholderText Key of the placeholder
	 * @return StringForLanguageBuilder
	 */
	public function placeholderWith( string $placeholderText ): StringForLanguageBuilder {
		$this->placeholderText = $placeholderText;
		return $this;
	}

	/**
	 * If we cannot find any string, return the default placeholder.
	 * @return StringForLanguageBuilder
	 */
	public function placeholderNoFallback() {
		return $this->placeholderWith( 'wikilambda-multilingualstring-nofallback' );
	}

	/**
	 * If we cannot find any string, return the placeholder for a title.
	 * @return StringForLanguageBuilder
	 */
	public function placeholderForTitle() {
		return $this->placeholderWith( 'wikilambda-editor-default-name' );
	}

	/**
	 * @return ?string The language code for which a string value is provided.
	 */
	public function getLanguageProvided() {
		$languageCode = $this->language->getCode();
		if ( $this->provider->isLanguageProvidedValue( $languageCode ) ) {
			return $languageCode;
		}

		// TODO (T362246): Dependency-inject
		$fallbacks = MediaWikiServices::getInstance()->getLanguageFallback()->getAll(
			$languageCode,
			$this->languageFallback
		);

		foreach ( $fallbacks as $index => $fallbackLanguageCode ) {
			if ( $this->provider->isLanguageProvidedValue( $fallbackLanguageCode ) ) {
				return $fallbackLanguageCode;
			}
		}
		return null;
	}

	/**
	 * Return the string and the language code.
	 *
	 * @return array
	 */
	public function getStringAndLanguageCode(): array {
		$languageCodeProvided = $this->getLanguageProvided();

		if ( $languageCodeProvided !== null ) {
			$title = $this->provider->getStringForLanguageCode( $languageCodeProvided );

			// use 'untitled' placeholder instead of an empty string
			if ( $title === '' && $this->placeholderText !== null ) {
				$title = wfMessage( $this->placeholderText )->inLanguage( $this->language )->text();
			}

			return [
				'title' => $title,
				'languageCode' => $languageCodeProvided
			];
		}

		$languageCode = $this->language->getCode();

		if ( $this->placeholderText !== null ) {
			return [
				'title' => wfMessage( $this->placeholderText )->inLanguage( $this->language )->text(),
				'languageCode' => $languageCode
			];
		}
		return [
			'title' => null,
			'languageCode' => $languageCode
		];
	}

	/**
	 * Return the string.
	 *
	 * @return ?string
	 */
	public function getString(): ?string {
		return $this->getStringAndLanguageCode()[ 'title' ];
	}
}
