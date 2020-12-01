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
use MediaWiki\Extension\WikiLambda\ZObjects\ZKey;
use MediaWiki\Extension\WikiLambda\ZObjects\ZList;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;

class ZObjectFactory {

	/**
	 * @param string $text The serialised form in a string
	 * @return ZObject
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
	 * @return ZObject
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
			throw new InvalidArgumentException(
				"Couldn't create ZObject for given input '$object'; unrecognised format."
			);
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

		$typeName = $registry->getZObjectTypeFromKey( $type );
		$typeClass = "MediaWiki\\Extension\\WikiLambda\\ZObjects\\$typeName";

		switch ( $type ) {
			case ZTypeRegistry::Z_KEY:
			case ZTypeRegistry::Z_LIST:
			case ZTypeRegistry::Z_MONOLINGUALSTRING:
			case ZTypeRegistry::Z_MULTILINGUALSTRING:
			case ZTypeRegistry::Z_OBJECT:
			// case ZTypeRegistry::Z_PERSISTENTOBJECT:
			case ZTypeRegistry::Z_STRING:
			case ZTypeRegistry::Z_TYPE:
				$objectDefinition = self::validateObjectStructure( $objectVars, $typeName );
				return new $typeClass( ...$objectDefinition );

			default:
				// Magic:
				// wfDeprecated( '::create for ' . $typeName );
				return call_user_func(
					$typeClass . '::create',
					$objectVars
				);
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
		$targetDefinition = call_user_func(
			'MediaWiki\Extension\WikiLambda\ZObjects\\' . $targetType . '::getDefinition'
		);

		$targetZid = ZTypeRegistry::singleton()->getZObjectKeyFromType( $targetType );

		$typeID = $objectVars[ ZTypeRegistry::Z_OBJECT_TYPE ];
		if ( $typeID !== $targetZid ) {
			throw new \InvalidArgumentException(
				"Type of '$targetType' expected, but instead '$typeID' given."
			);
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
		$registry = ZTypeRegistry::singleton();

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

			case ZTypeRegistry::HACK_ARRAY:
				if ( is_array( $value ) ) {
					foreach ( $value as $key => $arrayItem ) {
						if ( $arrayItem instanceof ZObject ) {
							continue;
						}
						$value[ $key ] = self::validateKeyValue(
							'inner',
							ZTypeRegistry::Z_OBJECT,
							$arrayItem
						);
					}
					return $value;
				}
				break;

			case ZTypeRegistry::HACK_ARRAY_Z_MONOLINGUALSTRING:
				if ( is_array( $value ) ) {
					foreach ( $value as $key => $arrayItem ) {
						if ( $arrayItem instanceof ZMonoLingualString ) {
							continue;
						}
						$value[ $key ] = self::validateKeyValue(
							'inner',
							ZTypeRegistry::Z_MONOLINGUALSTRING,
							$arrayItem
						);
					}
					return $value;
				}
				break;

			case ZTypeRegistry::HACK_ARRAY_Z_KEY:
				if ( is_array( $value ) ) {
					foreach ( $value as $key => $arrayItem ) {
						if ( $arrayItem instanceof ZKey ) {
							continue;
						}
						$value[ $key ] = self::validateKeyValue( 'inner', ZTypeRegistry::Z_KEY, $arrayItem );
					}
					return $value;
				}
				break;

			case ZTypeRegistry::HACK_REFERENCE:
				if (
					is_string( $value )
					&& ZKey::isValidZObjectReference( $value )
				) {
					return $value;
				}
				break;

			case ZTypeRegistry::HACK_REFERENCE_NULLABLE:
				if (
					is_string( $value )
					&& (
						ZKey::isValidZObjectReference( $value )
						|| $value === 'Z0'
					)
				) {
					return $value;
				}
				break;

			case ZTypeRegistry::HACK_REFERENCE_TYPE:
				if (
					is_string( $value )
					&& ZKey::isValidZObjectReference( $value )
					&& $registry->isZObjectKeyKnown( $value )
				) {
					return $value;
				}
				break;

			case ZTypeRegistry::Z_TYPE_IDENTITY:
				if (
					is_string( $value )
					&& ZKey::isValidZObjectKey( $value )
				) {
					return $value;
				}
				break;

			case ZTypeRegistry::Z_OBJECT:
				if ( is_string( $value ) ) {
					return $value;
				}

				if ( is_array( $value ) ) {
					return $value;
				}

				if ( is_object( $value ) ) {
					if ( $value instanceof ZObject ) {
						return $value;
					}
					$return = get_object_vars( $value );
				} else {
					$return = $value;
				}

				if (
					!is_array( $return )
					|| !array_key_exists( ZTypeRegistry::Z_OBJECT_TYPE, $return )
				) {
					break;
				}

				return self::spliceReturn( $return, $return[ ZTypeRegistry::Z_OBJECT_TYPE ] );

			case ZTypeRegistry::Z_KEY:
				if ( is_object( $value ) ) {
					if ( $value instanceof ZKey ) {
						return $value;
					}
					$return = get_object_vars( $value );
				} else {
					$return = $value;
				}

				if (
					!is_array( $return )
					|| !array_key_exists( ZTypeRegistry::Z_KEY_TYPE, $return )
					|| !array_key_exists( ZTypeRegistry::Z_KEY_ID, $return )
					|| !array_key_exists( ZTypeRegistry::Z_KEY_LABEL, $return )
				) {
					break;
				}

				// Check that the label key is set to a valid ZMultiLingualString
				self::validateKeyValue(
					'inner',
					ZTypeRegistry::Z_MULTILINGUALSTRING,
					$return[ ZTypeRegistry::Z_KEY_LABEL ]
				);

				return self::spliceReturn( $return, $type );

			case ZTypeRegistry::Z_MONOLINGUALSTRING:
				if ( is_object( $value ) ) {
					if ( $value instanceof ZMonoLingualString ) {
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

			case ZTypeRegistry::Z_MULTILINGUALSTRING:
				if ( is_object( $value ) ) {
					if ( $value instanceof ZMultiLingualString ) {
						return $value;
					}
					$return = get_object_vars( $value );
				} else {
					$return = $value;
				}

				if (
					!is_array( $return )
					|| !array_key_exists( ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE, $return )
					|| !is_array( $return[ ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE ] )
				) {
					break;
				}
				// Check that the value key is set to a ZList of ZMonoLingualStrings.
				self::validateKeyValue(
					'inner',
					ZTypeRegistry::HACK_ARRAY_Z_MONOLINGUALSTRING,
					$return[ ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE ]
				);
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

	/**
	 * @param array $value
	 * @param string $type
	 *
	 * @return ZObject
	 */
	private static function spliceReturn( $value, $type ) {
		$value[ ZTypeRegistry::Z_OBJECT_TYPE ] = $type;
		return self::create( (object)$value );
	}
}
