<?php
/**
 * WikiLambda ZObject
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

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
		// TODO: This shouldn't hard-code knowledge of the type
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
}
