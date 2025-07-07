<?php
/**
 * WikiLambda ZMultiLingualStringSet
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Language\Language;
use MediaWiki\Languages\LanguageFallback;
use MediaWiki\MediaWikiServices;

class ZMultiLingualStringSet extends ZObject {

	/**
	 * Construct a ZMultiLingualStringSet instance given an array or a ZTypedList
	 * of ZMonoLingualStringSet instances.
	 *
	 * @param ZTypedList|array $strings
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
			'type' => [
				'type' => ZTypeRegistry::Z_REFERENCE,
				'value' => ZTypeRegistry::Z_MULTILINGUALSTRINGSET,
			],
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
		// @phan-suppress-next-line PhanTypeSuspiciousNonTraversableForeach; it's a ZMonoLingualStringSet[]
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
		} catch ( ZErrorException ) {
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

		// TODO (T362246): Dependency-inject
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
		} catch ( ZErrorException ) {
			return false;
		}
		$aliases = $this->data[ ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE ][ $languageZid ] ?? [];
		return ( $aliases !== [] );
	}

	/**
	 * Add or replace a ZMonoLingualStringSet.
	 *
	 * @param ZMonoLingualStringSet $value The new value to set.
	 * @throws ZErrorException
	 */
	public function setMonoLingualStringSet( ZMonoLingualStringSet $value ): void {
		$language = $value->getLanguage();

		// (T391528) Don't let bad user input trigger an odd exception.
		if ( !$language || !is_string( $language ) ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_INVALID_LANG_CODE,
					[
						'lang' => $value
					]
				)
			);
		}

		$this->data[ ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE ][ $language ] = $value;
	}

	/**
	 * Convert this ZObject into its serialized canonical representation
	 *
	 * @param int $form
	 * @return \stdClass|array|string
	 */
	public function getSerialized( $form = self::FORM_CANONICAL ) {
		$listType = new ZReference( ZTypeRegistry::Z_MONOLINGUALSTRINGSET );
		$typedList = new ZTypedList( ZTypedList::buildType( $listType ), array_values( $this->getZValue() ) );
		return (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => $this->getZTypeObject()->getSerialized( $form ),
			ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE => $typedList->getSerialized( $form )
		];
	}
}
