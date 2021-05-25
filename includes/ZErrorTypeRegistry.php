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

use InvalidArgumentException;
use Title;

/**
 * A registry service for ZErrorType
 */
class ZErrorTypeRegistry {

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
			return false;
		}

		if ( $zObject->getZType() !== ZTypeRegistry::Z_ERRORTYPE ) {
			throw new InvalidArgumentException( "ZObject for '$errorType' is not a ZErrorType object." );
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
