<?php
/**
 * WikiLambda ZObject utilities class
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use Normalizer;
use stdClass;
use Transliterator;

class ZObjectUtils {

	/**
	 * @param string $input
	 * @return bool
	 */
	public static function isValidSerialisedZObject( string $input ): bool {
		// ZObject := String | List | Record
		// String  := "Character*" // to be specific, as in JSON / ECMA-404
		// List    := [(ZObject(,ZObject)*)]
		// Record  := { "Z1K1": ZObject(, "Key": ZObject)* }
		// Key     := ZNumberKNumber | KNumber

		// Encoded inputs which don't start with {, or [, are instead read as strings.
		if ( $input !== '' && ( $input[0] === '{' || $input[0] === '[' ) ) {
			$evaluatedInput = json_decode( $input );
			// Compatibility with PHP 7.2; JSON_THROW_ON_ERROR is PHP 7.3+
			if ( $evaluatedInput === null ) {
				return false;
			}
			return self::isValidZObject( $evaluatedInput );
		}

		// An actual string, not an encoded item.
		return true;
	}

	/**
	 * @param string|array|stdClass $input
	 * @return bool
	 */
	public static function isValidZObject( $input ): bool {
		if ( is_string( $input ) ) {
			return true;
		}

		if ( is_array( $input ) ) {
			return self::isValidZObjectList( $input );
		}

		if ( is_object( $input ) ) {
			return self::isValidZObjectRecord( $input );
		}
		// Fall-through.
		return false;
	}

	/**
	 * @param array $input
	 * @return bool
	 */
	public static function isValidZObjectList( array $input ): bool {
		// TODO: Simplify this to array_reduce(…)
		foreach ( $input as $index => $value ) {
			if ( !self::isValidZObject( $value ) ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * @param stdClass $input
	 * @return bool
	 */
	public static function isValidZObjectRecord( stdClass $input ): bool {
		$objectVars = get_object_vars( $input );
		// TODO: This shouldn't hard-code knowledge of the type?
		if ( !array_key_exists( ZTypeRegistry::Z_OBJECT_TYPE, $objectVars ) ) {
			// Each ZObject must define its type.
			return false;
		}

		// TODO: Simplify this to array_reduce(…)
		foreach ( $input as $key => $value ) {
			if ( !self::isValidZObjectKey( $key ) ) {
				return false;
			}
			// TODO: Properly type-aware arbitrary checking?
			if ( !self::isValidZObject( $value ) ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Canonicalizes a ZObject.
	 *
	 * @param string|array|stdClass $input decoded JSON object for a valid ZObject
	 * @return string|array|stdClass canonical decoded JSON object of same ZObject
	 */
	public static function canonicalize( $input ) {
		if ( is_array( $input ) ) {
			return array_map( [ __CLASS__, 'canonicalize' ], $input );
		}

		if ( is_object( $input ) ) {
			$output = self::canonicalizeZRecord( $input );

			if ( property_exists( $output, 'Z1K1' )
				&& $output->Z1K1 == 'Z6'
				&& property_exists( $output, 'Z6K1' )
				&& !self::isValidId( $output->Z6K1 ) ) {
				return self::canonicalize( $output->Z6K1 );
			}

			if ( property_exists( $output, 'Z1K1' )
				&& $output->Z1K1 == 'Z9'
				&& property_exists( $output, 'Z9K1' )
				&& self::isValidId( $output->Z9K1 ) ) {
				return self::canonicalize( $output->Z9K1 );
			}

			if ( property_exists( $output, 'Z1K1' )
				&& $output->Z1K1 == 'Z10' ) {

				if ( !property_exists( $output, 'Z10K1' )
					&& !property_exists( $output, 'Z10K2' ) ) {
					return [];
				}

				if ( !property_exists( $output, 'Z10K2' ) ) {
					return [ self::canonicalize( $output->Z10K1 ) ];
				}

				return array_merge(
					[ self::canonicalize( $output->Z10K1 ) ],
					self::canonicalize( $output->Z10K2 )
				);

			}

			return $output;
		}

		return $input;
	}

	/**
	 * Compares IDs of ZKeys in an order.
	 *
	 * First come global ZIDs, then local ones. The globals are sorted first
	 * numerically by the Z-Number, and then by the K-Number.
	 *
	 * @param string $left left key for comparision
	 * @param string $right right key for comparision
	 * @return int whether left is smaller (-1) than right or not (+1)
	 */
	public static function orderZKeyIDs( string $left, string $right ): int {
		if ( $left == $right ) {
			return 0;
		}
		if ( $left[0] == 'Z' && $right[0] == 'K' ) {
			return -1;
		}
		if ( $left[0] == 'K' && $right[0] == 'Z' ) {
			return 1;
		}
		$leftkpos = strpos( $left, 'K' );
		$rightkpos = strpos( $right, 'K' );
		if ( $leftkpos == 0 ) {
			$leftzid = 0;
		} else {
			$leftzid = intval( substr( $left, 1, $leftkpos - 1 ) );
		}
		if ( $rightkpos == 0 ) {
			$rightzid = 0;
		} else {
			$rightzid = intval( substr( $right, 1, $rightkpos - 1 ) );
		}
		if ( $leftzid < $rightzid ) {
			return -1;
		}
		if ( $leftzid > $rightzid ) {
			return 1;
		}
		$leftkid = intval( substr( $left, $leftkpos + 1 ) );
		$rightkid = intval( substr( $right, $rightkpos + 1 ) );
		if ( $leftkid < $rightkid ) {
			return -1;
		}
		return 1;
	}

	/**
	 * Canonicalizes a record-like ZObject.
	 *
	 * This trims and sorts the keys.
	 *
	 * @param stdClass $input The decoded JSON object of a well-formed ZObject
	 * @return stdClass Canonical decoded JSON object representing the same ZObject
	 */
	public static function canonicalizeZRecord( stdClass $input ): stdClass {
		$record = get_object_vars( $input );
		$record = array_combine( array_map( 'trim', array_keys( $record ) ), $record );

		$z1k1 = self::canonicalize( $record['Z1K1'] ?? null );
		if ( is_string( $z1k1 ) ) {
			foreach ( $record as $key => $value ) {
				if ( preg_match( '/^K[1-9]\d*$/', $key ) ) {
					// $key is guaranteed to be unique, so $globalKey is unique as well
					$globalKey = $z1k1 . $key;
					if ( !array_key_exists( $globalKey, $record ) ) {
						$record[$globalKey] = $value;
						unset( $record[$key] );
					}
				}
			}
		}

		uksort( $record, [ __CLASS__, 'orderZKeyIDs' ] );
		$record = array_map( [ __CLASS__, 'canonicalize' ], $record );
		return (object)$record;
	}

	/**
	 * Normalise and down-cast a label for database comparison by normalising Unicode, lower-casing,
	 * and collapsing accents.
	 *
	 * TODO: To consider further changes.
	 *
	 * @param string $input The input
	 * @return string
	 */
	public static function comparableString( string $input ): string {
		// First, lower-case the input (in a multi-byte-aware manner)
		$output = mb_strtolower( $input );

		// This Transliterator removes Latin accents but e.g. retains Han characters as-is.
		// Specifically, it does canonical decomposition (NFD); removes non-spacing marks like accents;
		// then recomposes, e.g. for Korean Hangul syllables.
		// TODO: Replace with a language-aware transliterator?
		$transliterator = Transliterator::create( 'NFD; [:Nonspacing Mark:] Remove; NFC;' );
		$output = $transliterator->transliterate( mb_strtolower( Normalizer::normalize( $output ) ) );

		return $output;
	}

	/**
	 * Filters ZObject to preferred language.
	 *
	 * Given a ZObject, reduces all its ZMultilingualStrings to
	 * only the preferred language or fallbacks.
	 *
	 * @param array|stdClass|string $input decoded JSON object for a ZObject
	 * @param string[] $languages array of language Zids
	 * @return string|array|stdClass same ZObject with only selected Monolingual
	 * string for each of its Multilingual strings
	 */
	public static function filterZMultilingualStringsToLanguage( $input, array $languages = [] ) {
		if ( is_string( $input ) ) {
			return $input;
		}

		// For each key of the input ZObject
		foreach ( $input as $index => $value ) {
			// If the value of the key is an array, apply language filter
			// to every element of the array
			if ( is_array( $value ) ) {
				$input->$index = array_map( function ( $item ) use ( $languages ) {
					return self::filterZMultilingualStringsToLanguage( $item, $languages );
				}, $value );
			}

			// If the value of the key is an object, apply language filter
			// to every key in the value object
			if ( is_object( $value ) ) {
				$input->$index = self::filterZMultilingualStringsToLanguage( $value, $languages );
			}

			// If the value is a string, and the type is ZMonolingualString,
			// select the preferred language out of the available ZMonolingualStrings
			if (
				is_string( $value ) &&
				$index === ZTypeRegistry::Z_OBJECT_TYPE &&
				$value === ZTypeRegistry::Z_MULTILINGUALSTRING
			) {
				$input->{ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE} = self::getPreferredMonolingualString(
					$input->{ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE},
					$languages
				);
				break;
			}
		}
		return $input;
	}

	/**
	 * Filters ZMonolingualString to preferred language.
	 *
	 * Returns the preferred ZMonolingualString of a ZMultilingualString given an
	 * array of preferred languages.
	 *
	 * @param array $multilingualStr decoded JSON for a ZMultilingualString value (Z12K1)
	 * @param string[] $languages array of language Zids
	 * @return array same ZMultilingualString value with only one item of the preferred language
	 */
	public static function getPreferredMonolingualString( array $multilingualStr, array $languages ): array {
		$availableLangs = [];
		$selectedIndex = 0;

		if ( count( $multilingualStr ) == 0 ) {
			return [];
		}

		foreach ( $multilingualStr as $value ) {
			$availableLangs[] = $value->{ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE};
		}

		foreach ( $languages as $lang ) {
			$index = array_search( $lang, $availableLangs );
			if ( $index !== false ) {
				$selectedIndex = $index;
				break;
			}
		}

		return [ $multilingualStr[ $selectedIndex ] ];
	}

	/**
	 * Returns a normalized ZObject
	 *
	 * @param string|array|stdClass $input decoded JSON canonical form of a ZObject
	 * @return string|array|stdClass same ZObject in normal form
	 */
	public static function normalize( $input ) {
		if ( is_string( $input ) ) {
			return self::normalizeZStringOrZReference( $input );
		}

		if ( is_array( $input ) ) {
			return self::normalizeZList( $input );
		}

		// Create a copy of the object and normalize it
		// We wrap $normal in an object in case it is already a terminal ZObject (Z6 or Z9)
		$normal = json_decode( json_encode( $input ) );
		self::normalizeInternal( (object)[ $normal ] );
		return $normal;
	}

	/**
	 * Normalizes a given object
	 *
	 * @param stdClass $input
	 */
	private static function normalizeInternal( $input ) {
		// for each key of the input ZObject
		foreach ( $input as $index => $value ) {
			// If the value is a string, convert into ZString or ZReference
			if ( is_string( $value ) ) {
				$input->$index = self::normalizeZStringOrZReference( $value );
			}

			// If the value is an array:
			// * Call normalizeZList recursively till the last element of the array
			// * to generate the normal form of a ZList
			if ( is_array( $value ) ) {
				$input->$index = self::normalizeZList( $value );
			}

			// If the value is an object:
			if ( is_object( $value ) ) {
				// If Z1K1 is a ZString or ZReference, ignore (it's already in the normal form)
				if ( array_key_exists( ZTypeRegistry::Z_OBJECT_TYPE, $value ) && (
					( $value->{ ZTypeRegistry::Z_OBJECT_TYPE } === ZTypeRegistry::Z_STRING ) ||
					( $value->{ ZTypeRegistry::Z_OBJECT_TYPE } === ZTypeRegistry::Z_REFERENCE ) )
				) {
					continue;
				}
				// Else, apply the normalizer to every key in the value object
				self::normalizeInternal( $value );
			}
		}
	}

	/**
	 * Returns a normalized ZList given an array of elements (ZObjects)
	 *
	 * @param array $input
	 * @return stdClass
	 */
	private static function normalizeZList( $input ): stdClass {
		if ( count( $input ) == 0 ) {
			return (object)[
				ZTypeRegistry::Z_OBJECT_TYPE => self::normalize( ZTypeRegistry::Z_LIST )
			];
		}
		return (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => self::normalize( ZTypeRegistry::Z_LIST ),
			ZTypeRegistry::Z_LIST_HEAD => self::normalize( array_shift( $input ) ),
			ZTypeRegistry::Z_LIST_TAIL => self::normalizeZList( $input )
		];
	}

	/**
	 * Returns the ZObject with normalized ZStrings and ZReferences.
	 *
	 * Given a canonical ZObject, returns the normal form with the following
	 * exceptions: ZList, ZMultilingualString, ZMonolingualString
	 *
	 * @param string|array|stdClass $input decoded JSON canonical form of a ZObject
	 * @return string|array|stdClass same ZObject in normal form except ZLists,
	 * ZMultilingualStrings and ZMonolingualStrings
	 */
	public static function normalizeZStringsAndZReferences( $input ) {
		// We need this for the case of lists with canonical strings or references
		// e.g. 'key': [ 'list', 'of', 'canonical', 'strings', 'and', 'Z999' ]
		if ( is_string( $input ) ) {
			return self::normalizeZStringOrZReference( $input );
		}

		// for each key of the input ZObject
		foreach ( $input as $index => $value ) {
			// Don't normalize ZObject Type, ZMultilingualString and ZMonolingualString keys.
			// This is necessary as we have ad-hoc components for these types.
			if ( array_search( $index, ZTypeRegistry::IGNORE_KEY_NORMALIZATION ) !== false ) {
				continue;
			}

			// If is ZList, apply the normalizer function to every
			// element of the array
			if ( is_array( $value ) ) {
				$input->$index = array_map( [ __CLASS__, 'normalizeZStringsAndZReferences' ], $value );
			}

			// If the value is an object:
			// * If Z1K1 is a ZString or ZReference, ignore (it's already in the normal form)
			// * Else, apply the normalizer to every key in the value object
			if ( is_object( $value ) ) {
				$type = $value->{ZTypeRegistry::Z_OBJECT_TYPE};
				if ( ( $type !== ZTypeRegistry::Z_STRING ) &&
					( $type !== ZTypeRegistry::Z_REFERENCE ) ) {
					$input->$index = self::normalizeZStringsAndZReferences( $value );
				}
			}

			// If the value is a string, convert into ZString or ZReference
			if ( is_string( $value ) ) {
				$input->$index = self::normalizeZStringOrZReference( $value );
			}
		}
		return $input;
	}

	/**
	 * Given a string value, checks its format and returns a normal form ZString or ZReference
	 *
	 * @param string $input
	 * @return stdClass Normal form of a String or a Reference
	 */
	private static function normalizeZStringOrZReference( $input ) {
		if ( self::isValidZObjectReference( $input ) || self::isNullReference( $input ) ) {
			return (object)[
				ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_REFERENCE,
				ZTypeRegistry::Z_REFERENCE_VALUE => $input
			];
		}
		return (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_STRING,
			ZTypeRegistry::Z_STRING_VALUE => $input
		];
	}

	/**
	 * Walks the ZObject tree and when it finds a ZObject with an explicit type that matches the
	 * type passed as a parameter, it applies the transformation to that sub ZObject. Note that this
	 * is also the finishing condition for the recursiveness: if another ZObject of the same type is
	 * a child of the first one found, it will not apply the transformation for the child one.
	 *
	 * @param array|stdClass|string $input decoded JSON object for a ZObject
	 * @param string $type
	 * @param callable $transformation
	 * @return array|stdClass|string
	 */
	public static function applyTransformationToType( $input, $type, $transformation ) {
		if ( is_string( $input ) ) {
			return $input;
		}
		if ( is_array( $input ) ) {
			return array_map( function ( $item ) use ( $type, $transformation ) {
				return self::applyTransformationToType( $item, $type, $transformation );
			}, $input );
		}
		if ( is_object( $input ) ) {
			if (
				property_exists( $input, ZTypeRegistry::Z_OBJECT_TYPE ) &&
				$input->{ZTypeRegistry::Z_OBJECT_TYPE} == $type
			) {
				return $transformation( $input );
			} else {
				foreach ( $input as $index => $value ) {
					$input->$index = self::applyTransformationToType( $value, $type, $transformation );
				}
				return $input;
			}
		}
	}

	/**
	 * Walks the ZObject tree and when it finds a given key or keys, it applies the transformation
	 * to its value. Note that this is also the finishing condition for the recursiveness: if another
	 * ZObject of the same type is a child of the first one found, it will not apply the transformation
	 * for the child one.
	 *
	 * @param array|stdClass|string $input decoded JSON object for a ZObject
	 * @param string[] $keys
	 * @param callable $transformation
	 * @return array|stdClass|string
	 */
	public static function applyTransformationToKeys( $input, $keys, $transformation ) {
		if ( is_string( $input ) ) {
			return $input;
		}
		if ( is_array( $input ) ) {
			return array_map( function ( $item ) use ( $keys, $transformation ) {
				return self::applyTransformationToKeys( $item, $keys, $transformation );
			}, $input );
		}
		if ( is_object( $input ) ) {
			foreach ( $input as $key => $value ) {
				if ( in_array( $key, $keys ) ) {
					$input->$key = $transformation( $value );
				} else {
					$input->$key = self::applyTransformationToKeys( $value, $keys, $transformation );
				}
			}
			return $input;
		}
	}

	/**
	 * Is the input a ZObject reference key (e.g. Z1 or Z12345)?
	 *
	 * @param string $input
	 * @return bool
	 */
	public static function isValidZObjectReference( string $input ): bool {
		return preg_match( "/^\s*Z[1-9]\d*\s*$/", $input );
	}

	/**
	 * Is the input a null reference (Z0)?
	 *
	 * @param string $input
	 * @return bool
	 */
	public static function isNullReference( string $input ): bool {
		return ( $input === ZTypeRegistry::Z_NULL_REFERENCE );
	}

	/**
	 * Is the input a ZObject reference key (e.g. Z1 or Z12345)?
	 *
	 * @param string $input
	 * @return bool
	 */
	public static function isValidOrNullZObjectReference( string $input ): bool {
		return ( self::isValidZObjectReference( $input ) || self::isNullReference( $input ) );
	}

	/**
	 * Is the input a valid possible identifier across WMF projects?
	 *
	 * @param string $input
	 * @return bool
	 */
	public static function isValidId( string $input ): bool {
		return preg_match( "/^[A-Z][1-9]\d*$/", $input );
	}

	/**
	 * Is the input a ZObject reference key (e.g. Z1K1 or K12345)?
	 *
	 * @param string $input
	 * @return bool
	 */
	public static function isValidZObjectKey( string $input ): bool {
		return preg_match( "/^\s*(Z[1-9]\d*)?K\d+\s*$/", $input );
	}

	/**
	 * Is the input a global ZObject reference key (e.g. Z1K1)?
	 *
	 * @param string $input
	 * @return bool
	 */
	public static function isValidZObjectGlobalKey( string $input ): bool {
		return preg_match( "/^\s*Z[1-9]\d*K\d+\s*$/", $input );
	}

	/**
	 * Split out the ZObject reference from a given global reference key (e.g. 'Z1' from 'Z1K1').
	 *
	 * @param string $input
	 * @return string
	 */
	public static function getZObjectReferenceFromKey( string $input ): string {
		preg_match( "/^\s*(Z[1-9]\d*)?(K\d+)\s*$/", $input, $matches );
		return $matches[1];
	}
}
