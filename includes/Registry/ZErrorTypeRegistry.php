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

use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Title\Title;

/**
 * A registry service for ZErrorType
 */
class ZErrorTypeRegistry extends ZObjectRegistry {

	// TODO (T300512): Bring all constants (error types ZIDs) to schemata
	public const Z_ERROR_UNKNOWN = 'Z500';
	public const Z_ERROR_INVALID_SYNTAX = 'Z501';
	public const Z_ERROR_NOT_WELLFORMED = 'Z502';
	public const Z_ERROR_ZID_NOT_FOUND = 'Z504';
	public const Z_ERROR_ARGUMENT_TYPE_MISMATCH = 'Z506';
	public const Z_ERROR_EVALUATION = 'Z507';
	public const Z_ERROR_LIST = 'Z509';
	public const Z_ERROR_MISSING_KEY = 'Z511';
	public const Z_ERROR_MISSING_PERSISTENT_VALUE = 'Z513';
	public const Z_ERROR_UNDEFINED_LIST_TYPE = 'Z519';
	public const Z_ERROR_WRONG_LIST_TYPE = 'Z520';
	public const Z_ERROR_NOT_NUMBER_BOOLEAN_NULL = 'Z521';
	public const Z_ERROR_ARRAY_ELEMENT_NOT_WELLFORMED = 'Z522';
	public const Z_ERROR_MISSING_TYPE = 'Z523';
	public const Z_ERROR_TYPE_NOT_STRING_ARRAY = 'Z524';
	public const Z_ERROR_INVALID_KEY = 'Z525';
	public const Z_ERROR_KEY_VALUE_NOT_WELLFORMED = 'Z526';
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
	public const Z_ERROR_ORCHESTRATOR_RATE_LIMIT = 'Z570';
	public const Z_ERROR_EVALUATOR_RATE_LIMIT = 'Z571';

	private const BUILT_IN_ERRORS = [
		'Z500' => 'Z_ERROR_UNKNOWN',
		'Z501' => 'Z_ERROR_INVALID_SYNTAX',
		'Z502' => 'Z_ERROR_NOT_WELLFORMED',
		'Z504' => 'Z_ERROR_ZID_NOT_FOUND',
		'Z506' => 'Z_ERROR_ARGUMENT_TYPE_MISMATCH',
		'Z507' => 'Z_ERROR_EVALUATION',
		'Z509' => 'Z_ERROR_LIST',
		'Z511' => 'Z_ERROR_MISSING_KEY',
		'Z513' => 'Z_ERROR_MISSING_PERSISTENT_VALUE',
		'Z519' => 'Z_ERROR_UNDEFINED_LIST_TYPE',
		'Z521' => 'Z_ERROR_NOT_NUMBER_BOOLEAN_NULL',
		'Z522' => 'Z_ERROR_ARRAY_ELEMENT_NOT_WELLFORMED',
		'Z523' => 'Z_ERROR_MISSING_TYPE',
		'Z524' => 'Z_ERROR_TYPE_NOT_STRING_ARRAY',
		'Z525' => 'Z_ERROR_INVALID_KEY',
		'Z526' => 'Z_ERROR_KEY_VALUE_NOT_WELLFORMED',
		'Z532' => 'Z_ERROR_STRING_VALUE_MISSING',
		'Z533' => 'Z_ERROR_STRING_VALUE_WRONG_TYPE',
		'Z535' => 'Z_ERROR_REFERENCE_VALUE_MISSING',
		'Z536' => 'Z_ERROR_REFERENCE_VALUE_WRONG_TYPE',
		'Z537' => 'Z_ERROR_REFERENCE_VALUE_INVALID',
		'Z538' => 'Z_ERROR_WRONG_NAMESPACE',
		'Z539' => 'Z_ERROR_WRONG_CONTENT_TYPE',
		'Z540' => 'Z_ERROR_INVALID_LANG_CODE',
		'Z541' => 'Z_ERROR_LANG_NOT_FOUND',
		'Z542' => 'Z_ERROR_UNEXPECTED_ZTYPE',
		'Z543' => 'Z_ERROR_ZTYPE_NOT_FOUND',
		'Z544' => 'Z_ERROR_CONFLICTING_TYPE_NAMES',
		'Z545' => 'Z_ERROR_CONFLICTING_TYPE_ZIDS',
		'Z546' => 'Z_ERROR_BUILTIN_TYPE_NOT_FOUND',
		'Z547' => 'Z_ERROR_INVALID_FORMAT',
		'Z548' => 'Z_ERROR_INVALID_JSON',
		'Z549' => 'Z_ERROR_INVALID_REFERENCE',
		'Z550' => 'Z_ERROR_UNKNOWN_REFERENCE',
		'Z551' => 'Z_ERROR_SCHEMA_TYPE_MISMATCH',
		'Z552' => 'Z_ERROR_ARRAY_TYPE_MISMATCH',
		'Z553' => 'Z_ERROR_DISALLOWED_ROOT_ZOBJECT',
		'Z554' => 'Z_ERROR_LABEL_CLASH',
		'Z555' => 'Z_ERROR_UNMATCHING_ZID',
		'Z556' => 'Z_ERROR_INVALID_TITLE',
		'Z557' => 'Z_ERROR_USER_CANNOT_EDIT',
		'Z559' => 'Z_ERROR_USER_CANNOT_RUN',
		'Z570' => 'Z_ERROR_ORCHESTRATOR_RATE_LIMIT',
		'Z571' => 'Z_ERROR_EVALUATOR_RATE_LIMIT',
	];

	/**
	 * Initialize ZErrorTypeRegistry
	 */
	protected function initialize(): void {
		// Registry for ZObjects of type ZErrorType/Z500
		$this->type = ZTypeRegistry::Z_ERRORTYPE;
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

		if ( $this->isBuiltinZErrorType( $errorType ) ) {
			return true;
		}

		$zObject = $this->fetchZErrorType( $errorType );
		if ( $zObject === false ) {
			return false;
		}

		$this->register( $errorType, $zObject->getLabels()->getStringForLanguageCode( 'en' ) );
		return true;
	}

	/**
	 * Fetches a given error type Zid from the database, throwing error if the ZErrorType does not
	 * exist or if the fetched object is not of the wanted type
	 *
	 * @param string $errorType
	 * @return ZObjectContent|bool Found ZObject
	 * @throws ZErrorException
	 */
	private function fetchZErrorType( string $errorType ) {
		// TODO (T338253): This is quite expensive. Store this in a metadata DB table, instead of fetching it live?
		$title = Title::newFromText( $errorType, NS_MAIN );
		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$zObject = $zObjectStore->fetchZObjectByTitle( $title );

		if ( $zObject === false ) {
			return false;
			// throw new ZErrorException(
			// 	ZErrorFactory::createZErrorInstance(
			// 		self::Z_ERROR_ZID_NOT_FOUND,
			// 		[ "data" => $errorType ]
			// 	)
			// );
		}

		if ( $zObject->getZType() !== ZTypeRegistry::Z_ERRORTYPE ) {
			return false;
			// throw new ZErrorException(
			// 	ZErrorFactory::createZErrorInstance(
			// 		self::Z_ERROR_UNEXPECTED_ZTYPE,
			// 		[
			// 			"expected" => ZTypeRegistry::Z_ERRORTYPE,
			// 			"used" => $errorType
			// 		]
			// 	)
			// );
		}

		return $zObject;
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
		} catch ( ZErrorException $e ) {
			return false;
		}
	}

	/**
	 * Check if the given Zid is an already cached ZErrorType (Z50)
	 *
	 * @param string $errorType
	 * @return bool
	 */
	public function isZErrorTypeCached( string $errorType ): bool {
		return array_key_exists( $errorType, $this->registry );
	}

	/**
	 * Check if the given Zid belongs to a builtin ZErrorType
	 *
	 * @param string $errorType
	 * @return bool
	 */
	private function isBuiltinZErrorType( string $errorType ): bool {
		return array_key_exists( $errorType, self::BUILT_IN_ERRORS );
	}

	/**
	 * Gets the ZErrorType label in English
	 *
	 * @param string $errorType
	 * @param string $errorLanguageCode Language code, defaulting to English
	 * @return string
	 * @throws ZErrorException
	 */
	public function getZErrorTypeLabel( string $errorType, string $errorLanguageCode = 'en' ): string {
		$registryCacheKey = $errorType . ':' . $errorLanguageCode;

		if ( $this->isZErrorTypeCached( $registryCacheKey ) ) {
			return $this->registry[ $registryCacheKey ];
		}

		// If the language code is not known, fallback to English
		$zLangRegistry = ZLangRegistry::singleton();
		if ( $zLangRegistry->isLanguageKnownGivenCode( $errorLanguageCode ) === false ) {
			$errorLanguageCode = 'en';
		}

		$zObject = $this->fetchZErrorType( $errorType );
		if ( $zObject === false ) {
			return "Unknown error $errorType";
		}

		$errorLabel = $zObject->getLabels()->getStringForLanguageCode( $errorLanguageCode );
		$this->register( $registryCacheKey, $errorLabel );

		return $errorLabel;
	}
}
