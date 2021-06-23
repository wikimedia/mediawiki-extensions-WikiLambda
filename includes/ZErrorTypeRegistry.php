<?php
/**
 * WikiLambda ZErrorTypeRegistry
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
 * A registry service for ZErrorType
 */
class ZErrorTypeRegistry {

	public const Z_ERROR_GENERIC = 'Z500';

	public const Z_ERROR_INVALID_SYNTAX = 'Z501';
	public const Z_ERROR_ZID_NOT_FOUND = 'Z504';
	public const Z_ERROR_ARGUMENT_TYPE_MISMATCH = 'Z506';
	public const Z_ERROR_MISSING_KEY = 'Z511';
	public const Z_ERROR_MISSING_TYPE = 'Z523';
	public const Z_ERROR_INVALID_KEY = 'Z525';
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
	public const Z_ERROR_KEY_TYPE_MISMATCH = 'Z551';

	/**
	 * @return ZErrorTypeRegistry
	 */
	public static function singleton() {
		static $instance = null;
		if ( $instance === null ) {
			$instance = new self();
		}
		return $instance;
	}

	/**
	 * @var array
	 */
	private $zErrorTypes = [];

	/**
	 * Check if the given Zid belongs to a ZErrorType (Z50)
	 * TODO: Maybe we want to take this into a ZErrorTypeRegistry?
	 *
	 * @param string $errorType
	 * @return bool
	 * @throws ZErrorException
	 */
	public function isZErrorTypeKnown( string $errorType ) : bool {
		if ( $this->isZErrorTypeCached( $errorType ) ) {
			return true;
		}

		// TODO: This is quite expensive. Store this in a metadata DB table, instead of fetching it live?
		$title = Title::newFromText( $errorType, NS_ZOBJECT );
		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$zObject = $zObjectStore->fetchZObjectByTitle( $title );

		if ( $zObject === false ) {
			// Zid is not known
			return false;
		}

		if ( $zObject->getZType() !== ZTypeRegistry::Z_ERRORTYPE ) {
			// Error Z506: Argument type mismatches
			throw new ZErrorException(
				new ZError(
					self::Z_ERROR_ARGUMENT_TYPE_MISMATCH,
					new ZString( "ZObject for '$errorType' is not a ZErrorType object." )
				)
			);
		}

		$this->registerErrorType( $errorType, $zObject->getLabels()->getStringForLanguageCode( 'en' ) );
		return true;
	}

	/**
	 * Check if the given Zid is an already cached ZErrorType (Z50)
	 *
	 * @param string $errorType
	 * @return bool
	 */
	private function isZErrorTypeCached( string $errorType ) : bool {
		return array_key_exists( $errorType, $this->zErrorTypes );
	}

	/**
	 * Gets the ZErrorType label in English
	 * TODO: should it be in the user selected language instead?
	 *
	 * @param string $errorType
	 * @return string
	 */
	public function getZErrorTypeLabel( string $errorType ) : string {
		if ( $this->isZErrorTypeKnown( $errorType ) ) {
			return $this->zErrorTypes[ $errorType ];
		} else {
			return "Unknown error";
		}
	}

	/**
	 * Caches the given Zid in the error type registry
	 *
	 * @param string $errorType
	 * @param string $label
	 */
	private function registerErrorType( string $errorType, string $label ) {
		$this->zErrorTypes[ $errorType ] = $label;
	}

	/**
	 * Removes the given ZErrorType Zid from the error type registry
	 *
	 * @param string $errorType
	 */
	public function unregisterErrorType( string $errorType ) {
		unset( $this->zErrorTypes[ $errorType ] );
	}
}
