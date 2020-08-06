<?php
/**
 * WikiLambda ZObject utilities class
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use stdClass;

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
	 * @param string|array|object $input
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
	 * @param object $input
	 * @return bool
	 */
	public static function isValidZObjectRecord( object $input ) : bool {
		$objectVars = get_object_vars( $input );
		// TODO: This shouldn't hard-code knowledge of the type?
		if ( !array_key_exists( 'Z1K1', $objectVars ) ) {
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
	 * A ZObject reference key
	 *
	 * @param string $input
	 * @return bool
	 */
	public static function isValidZObjectKey( string $input ) : bool {
		return preg_match( "/^\s*(Z[1-9]\d*)?K\d+\s*$/", $input );
	}

	/**
	 * Canonicalizes a ZObject.
	 *
	 * @param string|array|object $input decoded JSON object for a valid ZObject
	 * @return string|array|object canonical decoded JSON object of same ZObject
	 */
	public static function canonicalize( $input ) {
		if ( is_array( $input ) ) {
			return array_map( 'self::canonicalize', $input );
		}

		if ( is_object( $input ) ) {
			return self::canonicalizeZRecord( $input );
		}

		return $input;
	}

	/**
	 * Canonicalizes a ZRecord.
	 *
	 * For now, it just trims the keys. There will be plenty of other thins it
	 * will eventually do.
	 *
	 * @param object $input the decoded JSON object representing a valid ZObject
	 * @return object canonical decoded JSON object representing the same ZObject
	 */
	public static function canonicalizeZRecord( object $input ): object {
		$trimmed = new stdClass;
		$input_vars = get_object_vars( $input );
		foreach ( $input_vars as $key => $value ) {
			$trimmed_key = trim( $key );
			$trimmed->$trimmed_key = self::canonicalize( $value );
		}

		return $trimmed;
	}

}
