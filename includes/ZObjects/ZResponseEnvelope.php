<?php
/**
 * WikiLambda ZResponseEnvelope
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;

class ZResponseEnvelope extends ZObject {

	/**
	 * Construct a new ZResponseEnvelope instance
	 *
	 * @param ?ZObject $response Value of the response
	 * @param ?ZObject $metadata Meta-data response
	 */
	public function __construct( $response, $metadata ) {
		$this->data[ ZTypeRegistry::Z_RESPONSEENVELOPE_VALUE ] = $response ?? new ZReference(
			ZTypeRegistry::Z_VOID );
		$this->data[ ZTypeRegistry::Z_RESPONSEENVELOPE_METADATA ] = $metadata ?? new ZReference(
			ZTypeRegistry::Z_VOID );
	}

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
		return [
			'type' => [
				'type' => ZTypeRegistry::Z_REFERENCE,
				'value' => ZTypeRegistry::Z_RESPONSEENVELOPE,
			],
			'keys' => [
				ZTypeRegistry::Z_RESPONSEENVELOPE_VALUE => [
					'type' => ZTypeRegistry::Z_OBJECT
				],
				ZTypeRegistry::Z_RESPONSEENVELOPE_METADATA => [
					'type' => ZTypeRegistry::Z_OBJECT
				],
			],
		];
	}

	/**
	 * @inheritDoc
	 */
	public function isValid(): bool {
		return (
			( $this->data[ ZTypeRegistry::Z_RESPONSEENVELOPE_VALUE ] instanceof ZObject &&
				$this->data[ ZTypeRegistry::Z_RESPONSEENVELOPE_VALUE ]->isValid() ) ||
			( $this->data[ ZTypeRegistry::Z_RESPONSEENVELOPE_METADATA ] instanceof ZObject &&
				$this->data[ ZTypeRegistry::Z_RESPONSEENVELOPE_METADATA ]->isValid() )
		);
	}

	/**
	 * Get the value part of the response envelope
	 *
	 * @return ZObject
	 */
	public function getZValue() {
		return $this->data[ ZTypeRegistry::Z_RESPONSEENVELOPE_VALUE ];
	}

	/**
	 * Get the Meta-data part of the response envelope
	 *
	 * TODO (T307483): This should ideally be type-hinted as a PHP implementation of ZMap,
	 * so that it'd be much easier to interact with.
	 *
	 * @return ZObject
	 */
	public function getZMetadata() {
		return $this->data[ ZTypeRegistry::Z_RESPONSEENVELOPE_METADATA ];
	}

	/**
	 * Does the meta-data in the response envelope have one or more fatal errors?
	 *
	 * @return bool
	 */
	public function hasErrors(): bool {
		return $this->getErrors() !== null;
	}

	/**
	 * Does the meta-data in the response envelope have one or more fatal errors?
	 *
	 * @return ZError|null
	 */
	public function getErrors(): ?ZError {
		$metaData = $this->getZMetadata();

		if ( !$metaData || !is_object( $metaData ) ) {
			return null;
		}

		if ( $metaData instanceof ZObject ) {
			if ( $metaData instanceof ZTypedMap ) {
				// @phan-suppress-next-line PhanTypeMismatchReturnSuperType phan can't tell this must be a ZError
				return $metaData->getValueGivenKey( new ZString( 'errors' ) );
			}

			if ( $metaData instanceof ZReference && $metaData->getZValue() === ZTypeRegistry::Z_VOID ) {
				return null;
			}
		}

		// A this point, we know we've been initialised with a raw object, presumably in the form of a ZTypedMap.

		if ( !property_exists( $metaData, ZTypeRegistry::Z_OBJECT_TYPE ) ) {
			return null;
		}

		// @phan-suppress-next-line PhanUndeclaredProperty phan can't tell this must exist per line #115
		$metaDataType = $metaData->{ ZTypeRegistry::Z_OBJECT_TYPE };

		if ( $metaDataType === ZTypeRegistry::Z_UNIT ) {
			return null;
		}

		if (
			!is_object( $metaDataType ) ||
			!property_exists( $metaDataType, ZTypeRegistry::Z_OBJECT_TYPE ) ||
			$metaDataType->{ ZTypeRegistry::Z_OBJECT_TYPE } !== ZTypeRegistry::Z_FUNCTIONCALL ||
			!property_exists( $metaDataType, ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION ) ||
			$metaDataType->{ ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION } !== 'Z883' ||
			!property_exists( $metaDataType, 'Z883K1' ) ||
			$metaDataType->{ 'Z883K1' } !== 'Z6' ||
			!property_exists( $metaDataType, 'Z883K2' ) ||
			$metaDataType->{ 'Z883K2' } !== 'Z1'
		) {
			// Meta-data map is a non-object or otherwise wrong; something's gone wrong, return nothing.
			return null;
		}

		'@phan-var \stdClass $metaData';
		$metaDataMapContents = $metaData->{ 'K1' };

		while ( property_exists( $metaDataMapContents, 'K1' ) ) {
			$currentValue = $metaDataMapContents->{ 'K1' };

			if ( $currentValue->{ 'K1' } === 'errors' ) {
				return $currentValue->{ 'K2' };
			}

			// Not found in this value, so recurse to the next value in the map
			$metaDataMapContents = $metaDataMapContents->{ 'K2' };
		}

		// Nothing found in the map, so there are no errors
		return null;
	}

	/**
	 * Set the meta-data in the response envelope to the given key.
	 *
	 * @param ZString|string $key The key to use
	 * @param ZObject $value The value to set
	 */
	public function setMetaDataValue( $key, ZObject $value ) {
		$metaData = $this->data[ ZTypeRegistry::Z_RESPONSEENVELOPE_METADATA ];

		if ( !( $metaData instanceof ZTypedMap ) ) {
			$metaData = self::wrapInResponseMap( $key, $value );
		} else {
			$key = $key instanceof ZString ? $key : new ZString( $key );
			$metaData->setValueForKey( $key, $value );
		}

		$this->data[ ZTypeRegistry::Z_RESPONSEENVELOPE_METADATA ] = $metaData;
	}

	/**
	 * Convenience method to make a ZTypedMap for a ZResponseEnvelope with a
	 * given key/value pair
	 *
	 * @param string $key The key to use
	 * @param ZObject $value The value to set
	 * @return ZTypedMap
	 */
	public static function wrapInResponseMap( $key, $value ): ZTypedMap {
		$pairType = ZTypedPair::buildType( 'Z6', 'Z1' );

		return new ZTypedMap(
			ZTypedMap::buildType( 'Z6', 'Z1' ),
			new ZTypedList(
				ZTypedList::buildType( $pairType ),
				[
					new ZTypedPair(
						$pairType,
						new ZString( $key ),
						$value
					),
				]
			)
		);
	}

	/**
	 * Convenience method to make a ZTypedMap for a ZResponseEnvelope for a ZError
	 *
	 * @param ZError $error The error to set
	 * @return ZTypedMap
	 */
	public static function wrapErrorInResponseMap( $error ): ZTypedMap {
		return self::wrapInResponseMap( 'errors', $error );
	}
}
