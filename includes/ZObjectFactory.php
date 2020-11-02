<?php
/**
 * WikiLambda ZObject factory
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
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
	 * @param string|array|object $object The item to turn into a ZObject
	 * @return object A ZObject
	 */
	public static function create( $object ) {
		if ( $object instanceof ZObject ) {
			return $object;
		}

		if ( is_string( $object ) ) {
			return new ZString( $object );
		}

		if ( is_array( $object ) ) {
			return new ZList( $object );
		}

		if ( !is_object( $object ) ) {
			throw new InvalidArgumentException( "Couldn't create ZObject for given input '$object'; unrecognised format." );
		}

		$objectVars = get_object_vars( $object );

		if ( !array_key_exists( ZTypeRegistry::Z_OBJECT_TYPE, $objectVars ) ) {
			throw new \InvalidArgumentException( "ZObject record missing a type key." );
		}
		$type = $objectVars[ ZTypeRegistry::Z_OBJECT_TYPE ];

		if ( !ZKey::isValidZObjectReference( $type ) ) {
			throw new \InvalidArgumentException( "ZObject record type '$type' is an invalid key." );
		}

		$registry = ZTypeRegistry::singleton();
		if ( !$registry->isZObjectKeyKnown( $type ) ) {
			throw new \InvalidArgumentException( "ZObject record type '$type' not recognised." );
		}

		// HACK: Fallback to generic ZRecord if we think we're a ZObject
		if ( $type === ZTypeRegistry::Z_OBJECT ) {
			$type = ZTypeRegistry::Z_RECORD;
		}

		$typeName = ZTypeRegistry::singleton()->getZObjectTypeFromKey( $type );

		switch ( $type ) {
			case ZTypeRegistry::Z_MONOLINGUALSTRING:
			case ZTypeRegistry::Z_MULTILINGUALSTRING:
			case ZTypeRegistry::Z_STRING:
				$objectDefinition = self::validateObjectStructure( $objectVars, $typeName );
				$typeClass = 'MediaWiki\Extension\WikiLambda\\' . $typeName;
				return new $typeClass( ...$objectDefinition );

			default:
				// Magic:
				// wfDeprecated( '::create for ' . $typeName );
				return call_user_func( 'MediaWiki\Extension\WikiLambda\\' . $registry->getZObjectTypeFromKey( $type ) . '::create', $objectVars );
		}
	}

	/**
	 * This method takes as input arbitrary input and a ZObject type name, and recursively validates
	 * the input, returning if valid an array of a complete top-level ZObject definition for calling
	 * its constructor, or if invalid throwing an error.
	 *
	 * @param array $objectVars The input to validate.
	 * @param string $targetType The ZObject type against which to validate the input.
	 * @return array ZObject definition.
	 */
	private static function validateObjectStructure( array $objectVars, string $targetType ) {
		// TODO: Fetch from DB if there's no class for this.
		// Magic:
		$targetDefinition = call_user_func( 'MediaWiki\Extension\WikiLambda\\' . $targetType . '::getDefinition' );

		$targetZid = ZTypeRegistry::singleton()->getZObjectKeyFromType( $targetType );

		if ( $objectVars[ ZTypeRegistry::Z_OBJECT_TYPE ] !== $targetZid && $targetType !== 'ZRecord' ) {
			throw new \InvalidArgumentException( "Type of '$targetType' expected, but instead '" . $objectVars[ ZTypeRegistry::Z_OBJECT_TYPE ] . "' given." );
		}

		$creationArray = [];

		foreach ( $targetDefinition['keys'] as $key => $settings ) {
			if ( !array_key_exists( $key, $objectVars ) ) {
				if ( array_key_exists( 'default', $settings ) ) {
					$objectVars[$key] = $settings['default'];
				} elseif ( !array_key_exists( 'optional', $settings ) ) {
					throw new \InvalidArgumentException( "$targetType missing the required '$key' key." );
				}
			}

			if ( array_key_exists( $key, $objectVars ) ) {
				$creationArray[] = self::validateKeyValue( $key, $settings['type'], $objectVars[$key] );
			}
		}

		return $creationArray;
	}

	/**
	 * This method takes as input a arbitrary input of an individual key value and a ZObject type
	 * name that it is meant to reflect, and recursively validates the input, returning a ZObject if
	 * valid, or throwing an error if invalid.
	 *
	 * @param string $key The key to validate (unused except for error / logging purposes).
	 * @param string $type The ZType against which validate.
	 * @param mixed $value The input value to validate.
	 * @return ZObject|array|string Definition
	 */
	private static function validateKeyValue( string $key, string $type, $value ) {
		$return = null;

		switch ( $type ) {
			case ZTypeRegistry::HACK_STRING:
				if ( is_string( $value ) ) {
					return $value;
				}
				break;

			case ZTypeRegistry::HACK_LANGUAGE:
				if ( is_string( $value ) && \Language::isValidCode( $value ) ) {
					return $value;
				}
				break;

			case ZTypeRegistry::HACK_ARRAY_Z_MONOLINGUALSTRING:
				if ( is_array( $value ) ) {
					foreach ( $value as $arrayItem ) {
						if ( is_a( $arrayItem, ZMonoLingualString::class ) ) {
							continue;
						}
						self::validateKeyValue( 'inner', ZTypeRegistry::Z_MONOLINGUALSTRING, $arrayItem );
					}
					return $value;
				}
				break;

			case ZTypeRegistry::Z_MONOLINGUALSTRING:
				if ( is_object( $value ) ) {
					if ( is_a( $value, ZMonoLingualString::class ) ) {
						return $value;
					}
					$return = get_object_vars( $value );
				} else {
					$return = $value;
				}

				if (
					!is_array( $return )
					|| !array_key_exists( ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE, $return )
					|| !is_string( $return[ ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE ] )
					|| !\Language::isValidCode( $return[ ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE ] )
					|| !array_key_exists( ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE, $return )
					|| !is_string( $return[ ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE ] )
				) {
					break;
				}
				return self::spliceReturn( $return, $type );

			default:
				// Default error.
				throw new \InvalidArgumentException( "No validation for unknown '$type' type." );
		}
		// Fall-through error for known keys where the value don't pass validation.
		// TODO: We should log this properly, rather than expect the error string to contain an object.
		ob_start();
		var_dump( $value );
		$valueString = ob_get_contents();
		ob_end_clean();
		throw new \InvalidArgumentException( "Value '$valueString' for '$key' of type '$type' is invalid." );
	}

	private static function spliceReturn( $value, $type ) {
		$value[ ZTypeRegistry::Z_OBJECT_TYPE ] = $type;
		return self::create( $value );
	}
}
