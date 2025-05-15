<?php
/**
 * WikiLambda ZMultiLingualString
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Language\Language;
use MediaWiki\Logger\LoggerFactory;

class ZMultiLingualString extends ZObject {

	/**
	 * Create a ZMultiLingualString instance given an array or a ZTypedList of
	 * ZMonoLingualString instances. Internally this class bypasses ZTypedList
	 * and stores an array with the language Zid as key.
	 *
	 * @param ZTypedList|array $strings
	 */
	public function __construct( $strings = [] ) {
		foreach ( ZObjectUtils::getIterativeList( $strings ) as $index => $monoLingualString ) {
			if ( $monoLingualString instanceof ZMonoLingualString ) {
				$this->setMonoLingualString( $monoLingualString );
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
				'value' => ZTypeRegistry::Z_MULTILINGUALSTRING,
			],
			'keys' => [
				ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE => [
					'type' => ZTypeRegistry::HACK_ARRAY_Z_MONOLINGUALSTRING,
					'required' => true,
				],
			],
		];
	}

	/**
	 * @inheritDoc
	 */
	public function isValid(): bool {
		// @phan-suppress-next-line PhanTypeSuspiciousNonTraversableForeach; it's a ZMonoLingualString[]
		foreach ( $this->data[ ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE ] ?? [] as $lang => $monolingualString ) {
			if ( !$monolingualString->isValid() ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * @inheritDoc
	 */
	public function getSerialized( $form = self::FORM_CANONICAL ) {
		$listType = new ZReference( ZTypeRegistry::Z_MONOLINGUALSTRING );
		$typedList = new ZTypedList( ZTypedList::buildType( $listType ), array_values( $this->getZValue() ) );
		return (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => $this->getZTypeObject()->getSerialized( $form ),
			ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE => $typedList->getSerialized( $form )
		];
	}

	/**
	 * Get the list of ZMonoLingualStrings that represent the value of this ZMultiLingualString
	 *
	 * @return array
	 */
	public function getZValue() {
		return $this->data[ ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE ] ?? [];
	}

	/**
	 * Get the values of this ZMultiLingualString in the shape of an array
	 * with language as key and string as value
	 *
	 * @return array
	 */
	public function getValueAsList() {
		$multi = [];
		foreach ( $this->getZValue() as $mono ) {
			$multi[ $mono->getLanguage() ] = $mono->getString();
		}
		return $multi;
	}

	/**
	 * Fetch the ZMultiLingualString's stored value for a given MediaWiki language code (e.g.
	 * 'en' or 'zh-hant'). Note that this is a raw fetch and does not walk the language fallback
	 * chain; users are expected to use getStringForLanguage() which does.
	 *
	 * @param string $languageCode The MediaWiki language code in which the string is wanted.
	 * @return string The string, or the empty string if .
	 */
	public function getStringForLanguageCode( string $languageCode ): string {
		try {
			$languageZid = ZLangRegistry::singleton()->getLanguageZidFromCode( $languageCode );
		} catch ( ZErrorException $e ) {
			return '';
		}
		return array_key_exists( $languageZid, $this->getZValue() )
			? $this->getZValue()[ $languageZid ]->getString()
			: '';
	}

	/**
	 * Check if the ZMultiLingualString has a stored value for a given MediaWiki language code (e.g.
	 * 'en' or 'zh-hant'). Note that this is a raw check and does not walk the language fallback
	 * chain.
	 *
	 * @param string $languageCode The MediaWiki language code in which the string is wanted.
	 * @return bool If there is a string stored.
	 */
	public function isLanguageProvidedValue( string $languageCode ): bool {
		try {
			$languageZid = ZLangRegistry::singleton()->getLanguageZidFromCode( $languageCode );
		} catch ( ZErrorException $e ) {
			return false;
		}
		return array_key_exists( $languageZid, $this->data[ ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE ] ?? [] );
	}

	/**
	 * Fetch the ZMultiLingualString's stored value for a given MediaWiki language class. This will
	 * walk the language fallback chain, and provide a fallback message if there is no label defined
	 * in the given language or any of its fallback languages.
	 *
	 * @param Language $language The MediaWiki language class in which the string is wanted.
	 * @return string|null The string, the value of the wikilambda-multilingualstring-nofallback message, or null.
	 */
	public function getStringForLanguage( Language $language ): ?string {
		return $this->buildStringForLanguage( $language )->placeholderNoFallback()->getString();
	}

	/**
	 * Instantiate a chained builder with which you can ask for a fallback in English,
	 * or define a placeholder. At the end, either call `getString()` or `getStringAndLanguageCode()`.
	 *
	 * @param Language $language
	 * @return StringForLanguageBuilder
	 */
	public function buildStringForLanguage( Language $language ): StringForLanguageBuilder {
		return new StringForLanguageBuilder( $language, $this );
	}

	/**
	 * @param ZMonoLingualString $value The new value to set.
	 */
	public function setMonoLingualString( ZMonoLingualString $value ): void {
		$language = $value->getLanguage();
		if ( !is_string( $language ) ) {
			$logger = LoggerFactory::getInstance( 'WikiLambda' );
			$logger->warning(
				'Label to be added to a ZMultiLingualString but not a string: {language}',
				[
					'language' => $language,
					'value' => $value,
					'e' => new \InvalidArgumentException()
				]
			);
			return;
		}
		$this->data[ ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE ][ $language ] = $value;
	}
}
