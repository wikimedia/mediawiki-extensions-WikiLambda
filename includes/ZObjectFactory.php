<?php
/**
 * WikiLambda ZObject factory
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZKey;
use MediaWiki\Extension\WikiLambda\ZObjects\ZList;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualStringSet;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualStringSet;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use Title;

class ZObjectFactory {

	/**
	 * Creates a ZPersistentObject from the given input data.
	 * If the input already has the ZPersistentObejct keys, it uses
	 * them to construct the wrapper object. If not, it builds a wrapper
	 * ZPersistentObject with empty values.
	 *
	 * @param string|array|ZObject|\stdClass $input The item to turn into a ZObject
	 * @return ZPersistentObject
	 * @throws ZErrorException
	 */
	public static function createPersistentContent( $input ) {
		if ( $input instanceof ZPersistentObject ) {
			return $input;
		}

		if ( is_object( $input ) && !( $input instanceof ZObject ) ) {
			$objectVars = get_object_vars( $input );
			$type = $objectVars[ ZTypeRegistry::Z_OBJECT_TYPE ];

			// If input is a JSON object representing a Z2: return new ZPersistentObject
			if ( $type === ZTypeRegistry::Z_PERSISTENTOBJECT ) {
				$zid = ZTypeRegistry::Z_NULL_REFERENCE;

				if ( array_key_exists( ZTypeRegistry::Z_PERSISTENTOBJECT_ID, $objectVars ) ) {
					$ref = $objectVars[ ZTypeRegistry::Z_PERSISTENTOBJECT_ID ];
					if ( is_string( $ref ) ) {
						$zid = $ref;
					} else {
						if ( property_exists( $ref, ZTypeRegistry::Z_REFERENCE_VALUE ) ) {
							$zid = $ref->{ ZTypeRegistry::Z_REFERENCE_VALUE };
						} else {
							$zid = $ref->{ ZTypeRegistry::Z_STRING_VALUE };
						}
					}
				}

				self::trackSelfReference( $zid, self::SET_SELF_ZID );
				$objectDefinition = self::validateObjectStructure( $objectVars, 'ZPersistentObject' );
				$persistentObj = new ZPersistentObject( ...$objectDefinition );

				self::trackSelfReference( $zid, self::UNSET_SELF_ZID );
				return $persistentObj;
			}
		}

		// If input is a JSON object representing the inner ZObject, wrap in new ZPersistenObject
		self::trackSelfReference( ZTypeRegistry::Z_NULL_REFERENCE, self::SET_SELF_ZID );

		$label = new ZMultiLingualString( [] );
		$aliases = new ZMultiLingualStringSet( [] );
		$value = self::create( $input );
		$persistentObj = new ZPersistentObject( ZTypeRegistry::Z_NULL_REFERENCE, $value, $label, $aliases );

		self::trackSelfReference( ZTypeRegistry::Z_NULL_REFERENCE, self::UNSET_SELF_ZID );
		return $persistentObj;
	}

	/**
	 * @param string|array|ZObject|\stdClass $object The item to turn into a ZObject
	 * @return ZObject
	 * @throws ZErrorException
	 */
	public static function create( $object ) {
		if ( $object instanceof ZObject ) {
			return $object;
		}

		if ( is_string( $object ) ) {
			if ( ZObjectUtils::isValidOrNullZObjectReference( $object ) ) {
				return new ZReference( $object );
			} else {
				return new ZString( $object );
			}
		}

		if ( is_array( $object ) ) {
			return new ZList( $object );
		}

		if ( !is_object( $object ) ) {
			// Error Z547: Invalid format
			throw new ZErrorException(
				new ZError(
					ZErrorTypeRegistry::Z_ERROR_INVALID_FORMAT,
					new ZString( "Couldn't create ZObject for given input '$object'; unrecognised format." )
				)
			);
		}

		$objectVars = get_object_vars( $object );

		if ( !array_key_exists( ZTypeRegistry::Z_OBJECT_TYPE, $objectVars ) ) {
			// Error Z511: Missing type
			throw new ZErrorException(
				new ZError(
					ZErrorTypeRegistry::Z_ERROR_MISSING_TYPE,
					new ZString( "ZObject record missing a type key." )
				)
			);
		}
		$type = $objectVars[ ZTypeRegistry::Z_OBJECT_TYPE ];

		if ( !ZObjectUtils::isValidZObjectReference( $type ) ) {
			// Error Z549: Invalid reference
			throw new ZErrorException(
				new ZError(
					ZErrorTypeRegistry::Z_ERROR_INVALID_REFERENCE,
					new ZString( "ZObject record type '$type' is an invalid key." )
				)
			);
		}

		$typeRegistry = ZTypeRegistry::singleton();
		if ( !$typeRegistry->isZObjectKeyKnown( $type ) ) {
			// Error Z550: Unknown reference
			throw new ZErrorException(
				new ZError(
					ZErrorTypeRegistry::Z_ERROR_UNKNOWN_REFERENCE,
					new ZString( "ZObject record type '$type' not recognised." )
				)
			);
		}

		// Wiki-provided type handling.
		if ( !$typeRegistry->isZTypeBuiltIn( $type ) ) {
			// TODO: This is quite expensive. Store this in a metadata DB table, instead of fetching it live?
			$targetTitle = Title::newFromText( $type, NS_MAIN );

			if ( !$targetTitle->exists() ) {
				// Error Z504: Zid not found
				throw new ZErrorException(
					new ZError(
						ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND,
						new ZString( "Couldn't create ZObject based on type '$type'; "
						. "not built-in, but no such page on wiki." )
					)
				);
			}

			$zObjectStore = WikiLambdaServices::getZObjectStore();
			$targetObject = $zObjectStore->fetchZObjectByTitle( $targetTitle );

			if ( !$targetObject ) {
				// Error Z504: Zid not found
				throw new ZErrorException(
					new ZError(
						ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND,
						new ZString( "Couldn't create ZObject based on type '$type'; "
						. "page isn't returned by the wiki." )
					)
				);
			}

			// We know this is a ZType, because it passed ZTypeRegistry::isZObjectKeyKnown above.
			$targetType = $targetObject->getInnerZObject();
			'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZType $targetType';
			foreach ( $targetType->getTypeKeys() as $key ) {
				// Validate the object definition against its specification in the database
				$keyId = $key->getKeyId();
				if ( array_key_exists( $keyId, $objectVars ) ) {

					// Validate the provided key values for built-ins using local PHP code
					$keyType = $key->getKeyType();
					if ( $typeRegistry->isZTypeBuiltIn( $keyType ) ) {
						if ( self::validateKeyValue( $keyId, $keyType, $objectVars[ $keyId ] ) === null ) {
							// Error Z551: Key type mismatch
							throw new ZErrorException(
								new ZError(
									ZErrorTypeRegistry::Z_ERROR_KEY_TYPE_MISMATCH,
									new ZString( "Couldn't create ZObject based on type '$type'; "
									. "key '$keyId' isn't a valid '$keyType'." )
								)
							);
						}
					} else {
						// TODO: Validate the provided key values for bespokes using FunctionEvaluator service
					}
				}
			}
			return new ZObject( $type, $objectVars );
		}

		$typeName = $typeRegistry->getZObjectTypeFromKey( $type );
		$typeClass = "MediaWiki\\Extension\\WikiLambda\\ZObjects\\$typeName";
		$objectDefinition = self::validateObjectStructure( $objectVars, $typeName );
		// Magic:
		return new $typeClass( ...$objectDefinition );
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
			// Error Z551: Key type mismatch
			throw new ZErrorException(
				new ZError(
					ZErrorTypeRegistry::Z_ERROR_KEY_TYPE_MISMATCH,
					new ZString( "Type of '$targetType' expected, but instead '$typeID' given." )
				)
			);
		}

		$creationArray = [];

		foreach ( $targetDefinition['keys'] as $key => $settings ) {
			if ( array_key_exists( $key, $objectVars ) ) {
				$creationArray[] = self::validateKeyValue( $key, $settings['type'], $objectVars[$key] );
			} else {
				if ( array_key_exists( 'required', $settings ) && ( $settings['required'] ) ) {
					// Error Z511: Missing key
					throw new ZErrorException(
						new ZError(
							ZErrorTypeRegistry::Z_ERROR_MISSING_KEY,
							new ZString( "$targetType missing required '$key' key." )
						)
					);
				}
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
	 * @throws ZErrorException
	 */
	private static function validateKeyValue( string $key, string $type, $value ) {
		$return = null;
		$typeRegistry = ZTypeRegistry::singleton();
		$langRegistry = ZLangRegistry::singleton();
		$errorRegistry = ZErrorTypeRegistry::singleton();

		// Adjust normalization of $value if necessary for references and strings:
		// FIXME: this is wrong, irrespectively to its format, returns only the value,
		// so in case of having a string 'Z111' vs a reference 'Z111' we lose the knowledge
		// of what it is.
		if ( is_object( $value ) ) {
			$objectVars = get_object_vars( $value );
			if (
				array_key_exists( ZTypeRegistry::Z_OBJECT_TYPE, $objectVars ) &&
				$objectVars[ZTypeRegistry::Z_OBJECT_TYPE] === ZTypeRegistry::Z_REFERENCE &&
				array_key_exists( ZTypeRegistry::Z_REFERENCE_VALUE, $objectVars )
			) {
				$value = $objectVars[ZTypeRegistry::Z_REFERENCE_VALUE];
			}
			if (
				array_key_exists( ZTypeRegistry::Z_OBJECT_TYPE, $objectVars ) &&
				$objectVars[ZTypeRegistry::Z_OBJECT_TYPE] === ZTypeRegistry::Z_STRING &&
				array_key_exists( ZTypeRegistry::Z_STRING_VALUE, $objectVars )
			) {
				$value = $objectVars[ZTypeRegistry::Z_STRING_VALUE];
			}
		}

		// This expects Z_TYPE_IDENTITY (Z4K3) to define a key
		// that hasn't been defined in Z2 before.
		if ( in_array( $key, ZTypeRegistry::SELF_REFERENTIAL_KEYS ) ) {
			if ( self::trackSelfReference( $value, self::SET_SELF_ZID ) ) {
				// Unexpected loop?
				self::warnDuplicateCreation( $value );
			}
		}

		switch ( $type ) {
			case ZTypeRegistry::BUILTIN_STRING:
				if ( is_string( $value ) ) {
					return $value;
				}
				break;

			case ZTypeRegistry::HACK_LANGUAGE:
				if ( is_string( $value ) && \Language::isValidCode( $value ) ) {
					return $value;
				}
				break;

			case ZTypeRegistry::BUILTIN_ARRAY:
			case ZTypeRegistry::Z_LIST:
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

			case ZTypeRegistry::HACK_ARRAY_Z_MONOLINGUALSTRINGSET:
				if ( is_array( $value ) ) {
					foreach ( $value as $key => $arrayItem ) {
						if ( $arrayItem instanceof ZMonoLingualStringSet ) {
							continue;
						}
						$value[ $key ] = self::validateKeyValue(
							'inner',
							ZTypeRegistry::Z_MONOLINGUALSTRINGSET,
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

			case ZTypeRegistry::HACK_REFERENCE_LANGUAGE:
				if (
					is_string( $value )
					&& ZObjectUtils::isValidZObjectReference( $value )
					&& (
						self::trackSelfReference( $value )
						|| $langRegistry->isValidLanguageZid( $value )
					)
				) {
					return $value;
				}
				break;

			case ZTypeRegistry::BUILTIN_REFERENCE:
				if (
					is_string( $value )
					&& ZObjectUtils::isValidZObjectReference( $value )
				) {
					return $value;
				}
				break;

			case ZTypeRegistry::BUILTIN_REFERENCE_NULLABLE:
				if (
					is_string( $value )
					&& (
						ZObjectUtils::isValidZObjectReference( $value )
						|| $value === ZTypeRegistry::Z_NULL_REFERENCE
					)
				) {
					return $value;
				}
				break;

			case ZTypeRegistry::HACK_REFERENCE_TYPE:
			case ZTypeRegistry::Z_TYPE:
				if (
					is_string( $value )
					&& ZObjectUtils::isValidZObjectReference( $value )
					&& (
						self::trackSelfReference( $value )
						|| $typeRegistry->isZObjectKeyKnown( $value )
					)
				) {
					return $value;
				}
				break;

			case ZTypeRegistry::Z_TYPE_IDENTITY:
				if (
					is_string( $value )
					&& ZObjectUtils::isValidZObjectKey( $value )
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

			case ZTypeRegistry::Z_STRING:
				if ( is_string( $value ) ) {
					return $value;
				}

				if ( is_object( $value ) ) {
					if ( $value instanceof ZString ) {
						return $value;
					}
					$return = get_object_vars( $value );
				} else {
					$return = $value;
				}

				if (
					!is_array( $return )
					|| !array_key_exists( ZTypeRegistry::Z_STRING_VALUE, $return )
					|| !is_string( $return[ ZTypeRegistry::Z_STRING_VALUE ] )
				) {
					break;
				}

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

			case ZTypeRegistry::Z_MONOLINGUALSTRINGSET:
				if ( is_object( $value ) ) {
					if ( $value instanceof ZMonoLingualStringSet ) {
						return $value;
					}
					$return = get_object_vars( $value );
				} else {
					$return = $value;
				}

				if (
					!is_array( $return )
					|| !array_key_exists( ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE, $return )
					|| !is_string( $return[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE ] )
					|| !\Language::isValidCode( $return[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE ] )
					|| !array_key_exists( ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE, $return )
					|| !is_array( $return[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE ] )
				) {
					break;
				}
				// TODO: Check that the list is of strings.
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

			case ZTypeRegistry::Z_MULTILINGUALSTRINGSET:
				if ( is_object( $value ) ) {
					if ( $value instanceof ZMultiLingualStringSet ) {
						return $value;
					}
					$return = get_object_vars( $value );
				} else {
					$return = $value;
				}

				if (
					!is_array( $return )
					|| !array_key_exists( ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE, $return )
					|| !is_array( $return[ ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE ] )
				) {
					break;
				}
				// Check that the value key is set to a ZList of ZMonoLingualStringSets.
				self::validateKeyValue(
					'inner',
					ZTypeRegistry::HACK_ARRAY_Z_MONOLINGUALSTRINGSET,
					$return[ ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE ]
				);
				return self::spliceReturn( $return, $type );

			case ZTypeRegistry::Z_ERRORTYPE:
				if (
					is_string( $value )
					&& ZObjectUtils::isValidZObjectReference( $value )
					&& $errorRegistry->isZErrorTypeKnown( $value )
				) {
					return $value;
				}
				break;

			default:
				// Error Z500: Default error.
				throw new ZErrorException(
					new ZError(
						ZErrorTypeRegistry::Z_ERROR_GENERIC,
						new ZString( "No validation for unknown '$type' type." )
					)
				);
		}

		// Fall-through error for known keys where the value don't pass validation.
		// TODO: We should log this properly, rather than expect the error string to contain an object.
		$valueString = is_string( $value ) ? $value : json_encode( $value );
		throw new ZErrorException(
			new ZError(
				ZErrorTypeRegistry::Z_ERROR_INVALID_SYNTAX,
				new ZString( "Value '$valueString' for '$key' of type '$type' is invalid." )
			)
		);
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

	/**
	 * @const bool
	 */
	private const SET_SELF_ZID = 1;
	private const UNSET_SELF_ZID = 2;
	private const CHECK_SELF_ZID = 3;

	/**
	 * Tracks Zids that appear in the ZObject validation context, which might referenced again from
	 * another key of the same ZObject. Depending on the mode flag, it sets a newly observed Zid,
	 * unsets it or just checks its presence.
	 *
	 * @param string $zid
	 * @param int $mode
	 * @return bool
	 */
	private static function trackSelfReference( $zid, $mode = self::CHECK_SELF_ZID ): bool {
		static $context = [];
		$isObserved = array_key_exists( $zid, $context );

		switch ( $mode ) {
			case self::CHECK_SELF_ZID:
				return $isObserved;
			case self::SET_SELF_ZID:
				$context[ $zid ] = true;
				return $isObserved;
			case self::UNSET_SELF_ZID:
				unset( $context[ $zid ] );
				return $isObserved;
			default:
				return false;
		}
	}

	/*
	 * @param string $zid
	 *
	 * @return null
	 */
	private static function warnDuplicateCreation( $zid ) {
		// Do nothing right now, but might be a concern?
	}

}
