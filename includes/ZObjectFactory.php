<?php
/**
 * WikiLambda ZObject factory
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use InvalidArgumentException;

class ZObjectFactory {

	/**
	 * @param string $text The serialised form in a string
	 * @return object A ZObject
	 */
	public static function createFromSerialisedString( string $text ) {
		if ( $text === '' || ( $text[0] !== '{' && $text[0] !== '[' ) ) {
			return new ZString( $text );
		}

		$evaluatedInput = json_decode( $text );
		// Compatibility with PHP 7.2; JSON_THROW_ON_ERROR is PHP 7.3+
		if ( $evaluatedInput === null ) {
			throw new InvalidArgumentException( "Couldn't create ZObject for given input '$text'; invalid JSON." );
		}

		return self::create( $evaluatedInput );
	}

	/**
	 * @param object $object The object to turn into a ZObject
	 * @return object A ZObject
	 */
	public static function create( $object ) {
		if ( is_string( $object ) ) {
			return new ZString( $object );
		}

		if ( is_array( $object ) ) {
			return new ZList( $object );
		}

		if ( !is_object( $object ) ) {
			throw new InvalidArgumentException( "Couldn't create ZObject for given input '$object'; 	unrecognized format." );
		}

		$objectVars = get_object_vars( $object );

		if ( !array_key_exists( ZTypeRegistry::Z_OBJECT_TYPE, $objectVars ) ) {
			throw new \InvalidArgumentException( "ZObject record missing a type key." );
		}
		$type = $objectVars[ ZTypeRegistry::Z_OBJECT_TYPE ];

		$registry = ZTypeRegistry::singleton();
		if ( !$registry->isZObjectKeyKnown( $type ) ) {
			throw new \InvalidArgumentException( "ZObject record type '$type' not recognised." );
		}

		// HACK: Fallback to generic ZRecord if we think we're a ZObject
		if ( $type === ZTypeRegistry::Z_OBJECT ) {
			$type = ZTypeRegistry::Z_RECORD;
		}

		// Magic:
		return call_user_func( 'MediaWiki\Extension\WikiLambda\\' . $registry->getZObjectTypeFromKey( $type ) . '::create', $objectVars );
	}
}
