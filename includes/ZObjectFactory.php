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

		// TODO: Type-check / form check based on the specific type.

		if ( !array_key_exists( ZTypeRegistry::Z_OBJECT_TYPE, $objectVars ) ) {
			throw new \InvalidArgumentException( "ZObject record missing a type key." );
		}
		$type = $objectVars[ ZTypeRegistry::Z_OBJECT_TYPE ];

		// TODO: This should be handled by the individual classes via the registry.

		// HACK: For ZPersistentObject, we care about the inner object, not the ZPO
		if ( $type === ZTypeRegistry::Z_PERSISTENTOBJECT ) {
			if ( !array_key_exists( ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE, $objectVars ) ) {
				throw new \InvalidArgumentException( "ZObject record of a ZPersistentObject missing the value key." );
			}
			return self::create( $objectVars[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ] );
		}

		if ( $type == ZTypeRegistry::Z_STRING ) {
			if ( !array_key_exists( ZTypeRegistry::Z_STRING_VALUE, $objectVars ) ) {
				throw new \InvalidArgumentException( "ZObject record of a ZString missing the value key." );
			}
			return new ZString( $objectVars[ ZTypeRegistry::Z_STRING_VALUE ] );
		}

		if ( $type == ZTypeRegistry::Z_LIST ) {
			if ( !array_key_exists( ZTypeRegistry::Z_LIST_HEAD, $objectVars ) ) {
				throw new \InvalidArgumentException( "ZObject record of a ZList missing the head value key." );
			}
			if ( !array_key_exists( ZTypeRegistry::Z_LIST_TAIL, $objectVars ) ) {
				throw new \InvalidArgumentException( "ZObject record of a ZList missing the tail value key." );
			}
			return new ZList( $objectVars[ ZTypeRegistry::Z_LIST_HEAD ], $objectVars[ ZTypeRegistry::Z_LIST_TAIL ] );
		}

		// Must be a generic record:
		if ( !array_key_exists( 'Z5K1', $objectVars ) ) {
			throw new \InvalidArgumentException( "ZObject record missing a generic value key." );
		}
		if ( count( $objectVars ) !== 2 ) {
			$keys = implode( ', ', array_keys( $objectVars ) );
			throw new \InvalidArgumentException( "ZObject generic record with extra keys: $keys." );
		}
		return new ZRecord( $type, $objectVars[ 'Z5K1' ] );
	}
}
