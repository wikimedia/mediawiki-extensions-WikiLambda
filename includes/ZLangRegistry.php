<?php
/**
 * WikiLambda ZLangRegistry
 *
 * @file
 * @ingroup Extensions
 * @copyright 2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use Title;

/**
 * A registry service for ZLanguage and language codes
 */
class ZLangRegistry extends ZObjectRegistry {

	private const FALLBACK_LANGUAGE_ZID = 'Z1002';
	private const FALLBACK_LANGUAGE_CODE = 'en';

	/**
	 * Initialize ZLangRegistry
	 */
	protected function initialize() : void {
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
	public function getLanguageCodeFromZid( $zid ) : string {
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
	 * @return string
	 * @throws ZErrorException
	 */
	public function getLanguageZidFromCode( $code ) : string {
		$zid = array_search( $code, $this->registry );
		if ( $zid ) {
			return $zid;
		}

		$zid = $this->fetchLanguageZidFromCode( $code );
		$this->register( $zid, $code );
		return $zid;
	}

	/**
	 * Fetch zid from the database, parse it and return its language code.
	 *
	 * @param string $zid
	 * @return string The language code of the ZLanguage identified by this Zid
	 * @throws ZErrorException
	 */
	private function fetchLanguageCodeFromZid( $zid ) : string {
		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$title = Title::newFromText( $zid, NS_ZOBJECT );

		$content = $zObjectStore->fetchZObjectByTitle( $title );
		if ( !$content ) {
			// Error Z504: Zid not found
			throw new ZErrorException(
				new ZError(
					ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND,
					new ZString( "Language object with zid '$zid' not found." )
				)
			);
		}

		$code = $this->getLanguageCodeFromContent( $content );
		if ( !$code ) {
			// Error Z511: Key not found (Z60K1)
			throw new ZErrorException(
				new ZError(
					ZErrorTypeRegistry::Z_ERROR_MISSING_KEY,
					new ZString( "Language object with zid '$zid' is invalid: key 'Z60K1' not found." )
				)
			);
		}

		return $code;
	}

	/**
	 * Find ZLanguage in the database given a language code.
	 *
	 * FIXME: This is extremely slow and should be soon replaced for another method
	 * that doesn't scan all Z60 objects. Like, for example, implement aliases and
	 * include them in the secondary labels database (T262091) and add aliases to all
	 * Z60s so that their aliases include all the possible language codes associated
	 * to that given language (T283605)
	 *
	 * @param string $code
	 * @return string The ZLanguage Zid associated to this language code
	 * @throws ZErrorException
	 */
	private function fetchLanguageZidFromCode( $code ) : string {
		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$zids = $zObjectStore->fetchZidsOfType( ZTypeRegistry::Z_LANGUAGE );
		$foundZid = false;

		foreach ( $zids as $zid ) {
			$title = Title::newFromText( $zid, NS_ZOBJECT );
			$content = $zObjectStore->fetchZObjectByTitle( $title );
			$foundCode = $this->getLanguageCodeFromContent( $content );
			if ( $foundCode == $code ) {
				$foundZid = $zid;
				break;
			}
		}

		if ( !$foundZid ) {
			// Error Z541: Unregistered language
			throw new ZErrorException(
				new ZError(
					ZErrorTypeRegistry::Z_ERROR_LANG_NOT_FOUND,
					new ZString( "Language object with language code '$code' not found" )
				)
			);
		}

		return $foundZid;
	}

	/**
	 * Returns the language code from a ZObjectContent wrapping a Z60.
	 *
	 * @param ZObjectContent $content
	 * @return string|bool Language code or false if content object is not valid Z60.
	 */
	private function getLanguageCodeFromContent( $content ) {
		// If we want to validate the ZObject, we can do:
		// return $zobject->getInnerZObject()->getValueByKey( ZTypeRegistry::Z_LANGUAGE_CODE );

		// If we don't validate (faster), we can do:
		$zobject = $content->getObject()->{ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE};
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
		} catch ( ZErrorException $e ) {
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
			} catch ( ZErrorException $e ) {
				// We ignore the language code if it's not available as Zid
			}
		}
		return $languageZids;
	}
}
