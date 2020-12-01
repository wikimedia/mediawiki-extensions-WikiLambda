<?php
/**
 * WikiLambda ZObject utilities class
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
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
	 * @param string|array|object $input decoded JSON object for a valid ZObject
	 * @return string|array|object canonical decoded JSON object of same ZObject
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

}
