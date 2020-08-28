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
			return array_map( 'self::canonicalize', $input );
		}

		if ( is_object( $input ) ) {
			$output = self::canonicalizeZRecord( $input );
			if ( property_exists( $output, 'Z1K1' )
				&& $output->Z1K1 == 'Z6'
				&& property_exists( $output, 'Z6K1' )
				&& !ZKey::isValidId( $output->Z6K1 ) ) {
				return self::canonicalize( $output->Z6K1 );
			}
			return $output;
		}

		return $input;
	}

	/**
	 * Compares IDs of ZKeys in an order.
	 *
	 * First come global ZIDs, then local ones. The globals are sorted first
	 * numerically by the Z-Number, and the by the K-Number.
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
	 * Canonicalizes a ZRecord.
	 *
	 * This trims and sorts the keys.
	 *
	 * @param object $input the decoded JSON object representing a valid ZObject
	 * @return object canonical decoded JSON object representing the same ZObject
	 */
	public static function canonicalizeZRecord( object $input ): object {
		$trimmed = new stdClass;
		$input_vars = get_object_vars( $input );
		foreach ( $input_vars as $key => $value ) {
			$trimmed_key = trim( $key );
			$trimmed->$trimmed_key = $value;
		}

		$sorted = new stdClass;
		$keys = array_keys( get_object_vars( $trimmed ) );
		usort( $keys, 'self::orderZKeyIDs' );
		foreach ( $keys as $key ) {
			$sorted->$key = self::canonicalize( $trimmed->$key );
		}

		return $sorted;
	}

}
