<?php
/**
 * WikiLambda ZLangRegistry
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Registry;

use Exception;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Languages\LanguageFallback;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Title\Title;

/**
 * A registry service for ZLanguage and language codes
 */
class ZLangRegistry extends ZObjectRegistry {

	private const FALLBACK_LANGUAGE_ZID = 'Z1002';
	private const FALLBACK_LANGUAGE_CODE = 'en';
	public const MULTILINGUAL_VALUE = 'Z1360';

	/**
	 * Initialize ZLangRegistry
	 */
	protected function initialize(): void {
		// Registry for ZObjects of type ZLanguage/Z60
		$this->type = ZTypeRegistry::Z_LANGUAGE;

		$this->register(
			self::FALLBACK_LANGUAGE_ZID,
			self::FALLBACK_LANGUAGE_CODE
		);
	}

	/**
	 * Given a ZLanguage Zid, return its language code
	 *
	 * @param string $zid
	 * @return string
	 * @throws ZErrorException
	 */
	public function getLanguageCodeFromZid( $zid ): string {
		if ( array_key_exists( $zid, $this->registry ) ) {
			return $this->registry[ $zid ];
		}

		$code = $this->fetchLanguageCodeFromZid( $zid );
		$this->register( $zid, $code );
		return $code;
	}

	/**
	 * Given a language code, return its ZLanguage Zid
	 *
	 * @param string $code
	 * @param bool $fallback If true, give the ZLanguage for English
	 * @return string
	 * @throws ZErrorException
	 */
	public function getLanguageZidFromCode( $code, $fallback = false ): string {
		$zid = array_search( $code, $this->registry );
		if ( $zid ) {
			return $zid;
		}

		// Not in the registry, but let's check the DB
		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$zid = $zObjectStore->findZLanguageFromCode( $code );

		if ( $zid === null ) {
			if ( $fallback ) {
				return self::FALLBACK_LANGUAGE_ZID;
			}
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_LANG_NOT_FOUND,
					[ 'lang' => $code ]
				)
			);
		}

		// Add it to the register now for faster lookups later
		$this->register( $zid, $code );
		return $zid;
	}

	/**
	 * Check if a given language code, is a known ZLanguage Zid
	 *
	 * @param string $code
	 * @return bool
	 */
	public function isLanguageKnownGivenCode( $code ): bool {
		try {
			$this->getLanguageZidFromCode( $code );
		} catch ( Exception ) {
			return false;
		}
		return true;
	}

	/**
	 * Fetch zid from the database, parse it and return its language code.
	 *
	 * @param string $zid
	 * @return string The language code of the ZLanguage identified by this Zid
	 * @throws ZErrorException
	 */
	private function fetchLanguageCodeFromZid( $zid ): string {
		$zObjectStore = WikiLambdaServices::getZObjectStore();

		// Try the cache table, where it should be available
		$languages = $zObjectStore->findCodesFromZLanguage( $zid );

		if ( count( $languages ) ) {
			// Return the first, in case there are aliases
			return $languages[0];
		}

		// Fallback to the database just in case it's somehow not cached.
		$logger = LoggerFactory::getInstance( 'WikiLambda' );
		$logger->warning(
			'Called fetchLanguageCodeFromZid but not found in cache table: {zid}',
			[ 'zid' => $zid ]
		);

		$title = Title::newFromText( $zid, NS_MAIN );
		if ( !$title ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND,
					[ 'data' => $zid ]
				)
			);
		}

		$content = $zObjectStore->fetchZObjectByTitle( $title );
		if ( !$content ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND,
					[ 'data' => $zid ]
				)
			);
		}

		$code = $this->getLanguageCodeFromContent( $content );
		if ( !$code ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_MISSING_KEY,
					[
						'data' => $content->getObject(),
						'keywordArgs' => [ 'missing' => ZTypeRegistry::Z_LANGUAGE_CODE ]
					]
				)
			);
		}

		// Re-insert into the languages cache so we don't have this expensive miss again.
		$zObjectStore->insertZLanguageToLanguagesCache( $zid, $code );

		return $code;
	}

	/**
	 * Returns the language code from a ZObjectContent wrapping a Z60.
	 *
	 * @param ZObjectContent $content
	 * @return string|bool Language code or false if content object is not valid Z60.
	 */
	private function getLanguageCodeFromContent( $content ) {
		$zobject = $content->getObject()->{ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE };
		if (
			( $zobject->{ZTypeRegistry::Z_OBJECT_TYPE} === ZTypeRegistry::Z_LANGUAGE ) &&
			( property_exists( $zobject, ZTypeRegistry::Z_LANGUAGE_CODE ) )
		) {
			return $zobject->{ZTypeRegistry::Z_LANGUAGE_CODE};
		}
		return false;
	}

	/**
	 * Checks if the given Zid is a valid language Zid. For that it first checks whether the
	 * Zid is registered, and if it's not, it fetches it from the database.
	 *
	 * @param string $zid
	 * @return bool Is a valid ZLanguage Zid
	 */
	public function isValidLanguageZid( $zid ) {
		if ( !ZObjectUtils::isValidZObjectReference( $zid ) ) {
			return false;
		}
		try {
			$this->getLanguageCodeFromZid( $zid );
		} catch ( ZErrorException ) {
			return false;
		}
		return true;
	}

	/**
	 * Returns an array of language Zids given an array of language codes
	 *
	 * @param string[] $languageCodes
	 * @return string[]
	 */
	public function getLanguageZids( $languageCodes ) {
		$languageZids = [];
		foreach ( $languageCodes as $code ) {
			try {
				$languageZids[] = $this->getLanguageZidFromCode( $code );
			} catch ( ZErrorException ) {
				// We ignore the language code if it's not available as Zid
			}
		}
		return $languageZids;
	}

	/**
	 * Return the list of unique language Zids that correspond
	 * to the user's selected language, its fallbacks, and English
	 * if requested.
	 *
	 * @param LanguageFallback $languageFallback
	 * @param string $langCode - Language BCP47 code
	 * @return string[]
	 */
	public function getListOfFallbackLanguageZids( $languageFallback, $langCode ) {
		$languages = array_merge(
			[ $langCode ],
			$languageFallback->getAll( $langCode, LanguageFallback::MESSAGES )
		);
		return $this->getLanguageZids( array_unique( $languages ) );
	}
}
