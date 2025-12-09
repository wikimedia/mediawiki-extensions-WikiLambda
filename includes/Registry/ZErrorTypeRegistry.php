<?php
/**
 * WikiLambda ZErrorTypeRegistry
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Registry;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\MediaWikiServices;
use ReflectionClass;

/**
 * A registry service for ZErrorType
 */
class ZErrorTypeRegistry extends ZObjectRegistry {

	// TODO (T300512): Bring all constants (error types ZIDs) to schemata
	public const Z_ERROR_UNKNOWN = 'Z500';
	public const Z_ERROR_INVALID_SYNTAX = 'Z501';
	public const Z_ERROR_NOT_WELLFORMED = 'Z502';
	public const Z_ERROR_NOT_IMPLEMENTED_YET = 'Z503';
	public const Z_ERROR_ZID_NOT_FOUND = 'Z504';
	public const Z_ERROR_ARGUMENT_COUNT_MISMATCH = 'Z505';
	public const Z_ERROR_ARGUMENT_TYPE_MISMATCH = 'Z506';
	public const Z_ERROR_EVALUATION = 'Z507';
	public const Z_ERROR_LIST = 'Z509';
	public const Z_ERROR_MISSING_KEY = 'Z511';
	public const Z_ERROR_MISSING_PERSISTENT_VALUE = 'Z513';
	public const Z_ERROR_RETURN_TYPE_MISMATCH = 'Z517';
	public const Z_ERROR_OBJECT_TYPE_MISMATCH = 'Z518';
	public const Z_ERROR_UNDEFINED_LIST_TYPE = 'Z519';
	public const Z_ERROR_WRONG_LIST_TYPE = 'Z520';
	public const Z_ERROR_NOT_NUMBER_BOOLEAN_NULL = 'Z521';
	public const Z_ERROR_ARRAY_ELEMENT_NOT_WELLFORMED = 'Z522';
	public const Z_ERROR_MISSING_TYPE = 'Z523';
	public const Z_ERROR_TYPE_NOT_STRING_ARRAY = 'Z524';
	public const Z_ERROR_INVALID_KEY = 'Z525';
	public const Z_ERROR_KEY_VALUE_NOT_WELLFORMED = 'Z526';
	public const Z_ERROR_CONNECTION_FAILURE = 'Z529';
	public const Z_ERROR_API_FAILURE = 'Z530';
	public const Z_ERROR_STRING_VALUE_MISSING = 'Z532';
	public const Z_ERROR_STRING_VALUE_WRONG_TYPE = 'Z533';
	public const Z_ERROR_REFERENCE_VALUE_MISSING = 'Z535';
	public const Z_ERROR_REFERENCE_VALUE_WRONG_TYPE = 'Z536';
	public const Z_ERROR_REFERENCE_VALUE_INVALID = 'Z537';
	public const Z_ERROR_WRONG_NAMESPACE = 'Z538';
	public const Z_ERROR_WRONG_CONTENT_TYPE = 'Z539';
	public const Z_ERROR_INVALID_LANG_CODE = 'Z540';
	public const Z_ERROR_LANG_NOT_FOUND = 'Z541';
	public const Z_ERROR_UNEXPECTED_ZTYPE = 'Z542';
	public const Z_ERROR_ZTYPE_NOT_FOUND = 'Z543';
	public const Z_ERROR_CONFLICTING_TYPE_NAMES = 'Z544';
	public const Z_ERROR_CONFLICTING_TYPE_ZIDS = 'Z545';
	public const Z_ERROR_BUILTIN_TYPE_NOT_FOUND = 'Z546';
	public const Z_ERROR_INVALID_FORMAT = 'Z547';
	public const Z_ERROR_INVALID_JSON = 'Z548';
	public const Z_ERROR_INVALID_REFERENCE = 'Z549';
	public const Z_ERROR_UNKNOWN_REFERENCE = 'Z550';
	public const Z_ERROR_SCHEMA_TYPE_MISMATCH = 'Z551';
	public const Z_ERROR_ARRAY_TYPE_MISMATCH = 'Z552';
	public const Z_ERROR_DISALLOWED_ROOT_ZOBJECT = 'Z553';
	public const Z_ERROR_LABEL_CLASH = 'Z554';
	public const Z_ERROR_UNMATCHING_ZID = 'Z555';
	public const Z_ERROR_INVALID_TITLE = 'Z556';
	public const Z_ERROR_USER_CANNOT_EDIT = 'Z557';
	public const Z_ERROR_USER_CANNOT_RUN = 'Z559';
	public const Z_ERROR_INVALID_EVALUATION_RESULT = 'Z560';
	public const Z_ERROR_ORCHESTRATOR_RATE_LIMIT = 'Z570';
	public const Z_ERROR_EVALUATOR_RATE_LIMIT = 'Z571';

	public const Z_ERROR_DUPLICATE_LANGUAGES = 'Z580';

	/**
	 * Initialize ZErrorTypeRegistry
	 */
	protected function initialize(): void {
		// Registry for ZObjects of type ZErrorType/Z500
		$this->type = ZTypeRegistry::Z_ERRORTYPE;
	}

	/**
	 * @param string $errorType
	 * @param ZPersistentObject $zobject
	 * @param string $languageCode
	 * @return ?string
	 */
	protected function registerZErrorTypeLabel( $errorType, $zobject, $languageCode = 'en' ): ?string {
		$langRegistry = ZLangRegistry::singleton();
		if ( !$langRegistry->isLanguageKnownGivenCode( $languageCode ) ) {
			$languageCode = 'en';
		}

		$registryKey = $errorType . ':' . $languageCode;

		$language = MediaWikiServices::getInstance()
			->getLanguageFactory()
			->getLanguage( $languageCode );

		$errorLabel = $zobject->getLabel( $language, true );
		if ( $errorLabel ) {
			$this->register( $registryKey, $errorLabel );
		}

		return $errorLabel;
	}

	/**
	 * Unregisters the given error type zid from the registry
	 * by deleting all the language entries associated for this zid
	 *
	 * @param string $zid
	 */
	public function unregister( string $zid ): void {
		$prefix = $zid . ':';
		foreach ( $this->registry as $errorKey => $errorLabel ) {
			if ( str_starts_with( $errorKey, $prefix ) ) {
				unset( $this->registry[ $errorKey ] );
			}
		}
	}

	/**
	 * Check if the given ZErrorType Zid is known
	 *
	 * @param string $errorType
	 * @return bool
	 */
	public function isZErrorTypeKnown( string $errorType ): bool {
		if ( $this->isZErrorTypeCached( $errorType ) ) {
			return true;
		}

		if ( self::isBuiltinZErrorType( $errorType ) ) {
			return true;
		}

		$zobject = $this->fetchZErrorType( $errorType );
		if ( !$zobject ) {
			return false;
		}

		$this->registerZErrorTypeLabel(
			$errorType,
			$zobject,
			RequestContext::getMain()->getLanguage()->getCode()
		);

		return true;
	}

	/**
	 * Fetches a given error type Zid from the database, throwing error if the ZErrorType does not
	 * exist or if the fetched object is not of the wanted type
	 *
	 * @param string $errorType
	 * @return ZPersistentObject|bool Found ZObject
	 */
	private function fetchZErrorType( string $errorType ) {
		$zObjectStore = WikiLambdaServices::getZObjectStore();

		// This can throw a ZErrorException if the ZID is not found, which will bubble up
		$zobjectContent = $zObjectStore->fetchZObject( $errorType );

		// ZObjectContent->getZType is a shortcut to ZObjectContent->getInnerZObject->getZType
		if ( !$zobjectContent || $zobjectContent->getZType() !== ZTypeRegistry::Z_ERRORTYPE ) {
			return false;
		}

		return $zobjectContent->getZObject();
	}

	/**
	 * Check if the given Zid belongs to a ZErrorType
	 *
	 * @param string $zid
	 * @return bool
	 */
	public function instanceOfZErrorType( string $zid ): bool {
		try {
			return $this->isZErrorTypeKnown( $zid );
		} catch ( ZErrorException ) {
			return false;
		}
	}

	/**
	 * Check if the given Zid is an already cached ZErrorType (Z50)
	 * If a language code is given, check it the label in that language is stored
	 *
	 * @param string $errorType
	 * @param string|bool $langCode
	 * @return bool
	 */
	private function isZErrorTypeCached( string $errorType, $langCode = false ): bool {
		if ( $langCode ) {
			$registryKey = $errorType . ':' . $langCode;
			return array_key_exists( $registryKey, $this->registry );
		}

		$prefix = $errorType . ':';
		foreach ( $this->registry as $errorKey => $errorLabel ) {
			if ( str_starts_with( $errorKey, $prefix ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Check if the given Zid belongs to a builtin ZErrorType (from the ones declared above)
	 *
	 * @param string $errorType
	 * @return bool
	 */
	private static function isBuiltinZErrorType( string $errorType ): bool {
		static $lookup = null;
		if ( $lookup === null ) {
			$lookup = array_flip( ( new ReflectionClass( self::class ) )->getConstants() );
		}
		return isset( $lookup[ $errorType ] );
	}

	/**
	 * Gets the ZErrorType label in English
	 *
	 * @param string $errorType
	 * @param string $errorLanguageCode Language code, defaulting to English
	 * @return string
	 */
	public function getZErrorTypeLabel( string $errorType, string $errorLanguageCode = 'en' ): string {
		$registryCacheKey = $errorType . ':' . $errorLanguageCode;

		if ( $this->isZErrorTypeCached( $errorType, $errorLanguageCode ) ) {
			return $this->registry[ $registryCacheKey ];
		}

		$zobject = $this->fetchZErrorType( $errorType );
		if ( !$zobject ) {
			return "Unknown error $errorType";
		}

		$errorLabel = $this->registerZErrorTypeLabel( $errorType, $zobject, $errorLanguageCode );
		if ( !$errorLabel ) {
			return "Unknown error $errorType";
		}

		return $errorLabel;
	}
}
