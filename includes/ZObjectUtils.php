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

use MediaWiki\Extension\WikiLambda\ZObjects\ZKey;
use Normalizer;
use stdClass;
use Transliterator;

class ZObjectUtils {

	/**
	 * @param string $input
	 * @return bool
	 */
	public static function isValidSerialisedZObject( string $input ) : bool {
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
	public static function isValidZObject( $input ) : bool {
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
	public static function isValidZObjectList( array $input ) : bool {
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
	public static function isValidZObjectRecord( stdClass $input ) : bool {
		$objectVars = get_object_vars( $input );
		// TODO: This shouldn't hard-code knowledge of the type?
		if ( !array_key_exists( ZTypeRegistry::Z_OBJECT_TYPE, $objectVars ) ) {
			// Each ZObject must define its type.
			return false;
		}

		// TODO: Simplify this to array_reduce(…)
		foreach ( $input as $key => $value ) {
			if ( !ZKey::isValidZObjectKey( $key ) ) {
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
				&& !ZKey::isValidId( $output->Z6K1 ) ) {
				return self::canonicalize( $output->Z6K1 );
			}

			if ( property_exists( $output, 'Z1K1' )
				&& $output->Z1K1 == 'Z9'
				&& property_exists( $output, 'Z9K1' )
				&& ZKey::isValidId( $output->Z9K1 ) ) {
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
	public static function orderZKeyIDs( string $left, string $right ) : int {
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
	public static function comparableString( string $input ) : string {
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
	 * @param array|stdClass $input decoded JSON object for a ZObject
	 * @param string[] $languages array of language codes
	 * @return string|array|stdClass same ZObject with only selected Monolingual
	 * string for each of its Multilingual strings
	 */
	public static function filterZMultilingualStringsToLanguage( $input, array $languages = [] ) {
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
	 * @param string[] $languages array of language codes
	 * @return array same ZMultilingualString value with only one item of the preferred language
	 */
	public static function getPreferredMonolingualString( array $multilingualStr, array $languages ) : array {
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
	public static function normalizeZStringOrZReference( $input ) {
		if ( ZKey::isValidZObjectReference( $input ) ) {
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
	 * Given a ZPersistentObject, returns its labels
	 * HACK: Remove this method as soon as we have ZObjectContent
	 * saving ZPersistentObject (Z2) keys (Z2K1, Z2K2 and Z2K3)
	 *
	 * @param stdClass $data
	 * @return array labels
	 */
	public static function getZPersistentObjectLabels( $data ) : array {
		$monolingualStrings = $data
			->{ ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL }
			->{ ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE };
		$labels = [];
		foreach ( $monolingualStrings as $s ) {
			$labels[ $s->{ ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE } ] =
				$s->{ ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE };
		}
		return $labels;
	}

	/**
	 * Given a ZPersistentObject, returns its type
	 * HACK: Remove this method as soon as we have ZObjectContent
	 * saving ZPersistentObject (Z2) keys (Z2K1, Z2K2 and Z2K3)
	 *
	 * @param stdClass $data
	 * @return string|null This ZObject ZType
	 */
	public static function getZPersistentObjectType( $data ) {
		if (
			property_exists( $data, ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ) &&
			property_exists( $data->{ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE }, ZTypeRegistry::Z_OBJECT_TYPE ) ) {
			return $data
				->{ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE }
				->{ ZTypeRegistry::Z_OBJECT_TYPE };
		}
		return null;
	}

	/**
	 * Given a ZPersistentObject, returns its ID
	 * HACK: Remove this method as soon as we have ZObjectContent
	 * saving ZPersistentObject (Z2) keys (Z2K1, Z2K2 and Z2K3)
	 *
	 * @param stdClass $data
	 * @return string|null This ZObject ZId
	 */
	public static function getZPersistentObjectId( $data ) {
		if ( property_exists( $data, ZTypeRegistry::Z_PERSISTENTOBJECT_ID ) ) {
			$ref = $data->{ ZTypeRegistry::Z_PERSISTENTOBJECT_ID };
			if ( is_string( $ref ) ) {
				return $ref;
			}
			if ( property_exists( $ref, ZTypeRegistry::Z_REFERENCE_VALUE ) ) {
				return $ref->{ ZTypeRegistry::Z_REFERENCE_VALUE };
			}
		}
		return null;
	}

}
