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
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\Validation\ZObjectStructureValidator;
use MediaWiki\Extension\WikiLambda\ZObjects\ZList;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use Title;

class ZObjectFactory {

	/**
	 * Validates and creates a ZPersistentObject from the given input data.
	 * If the input already has the ZPersistentObejct keys, it uses
	 * them to construct the wrapper object. If not, it builds a wrapper
	 * ZPersistentObject with empty values. The resulting ZObject will be
	 * structurally valid or well-formed.
	 *
	 * This method is the entrypoint from WikiLambda content object.
	 *
	 * @param string|array|\stdClass $input The item to turn into a ZObject
	 * @return ZPersistentObject
	 * @throws ZErrorException
	 */
	public static function createPersistentContent( $input ) {
		// 1. Get ZObject type. If not present, throw a not wellformed error
		try {
			$inputType = self::extractObjectType( $input );
		} catch ( ZErrorException $e ) {
			throw new ZErrorException(
				ZErrorFactory::createValidationZError( $e->getZError() )
			);
		}

		$object = $input;
		$type = $inputType;

		// 2. If ZObject type is Z_PERSISTENT_OBJECT (Z2), get inner object.
		// 		If not present, throw a now wellformed error.
		if ( $inputType === ZTypeRegistry::Z_PERSISTENTOBJECT ) {
			try {
				$object = self::extractInnerObject( $input );
			} catch ( ZErrorException $e ) {
				throw new ZErrorException(
					ZErrorFactory::createValidationZError( $e->getZError() )
				);
			}

			// Get type of the inner ZObject. If not present, throw a not wellformed error
			try {
				$type = self::extractObjectType( $object );
			} catch ( ZErrorException $e ) {
				throw new ZErrorException(
					ZErrorFactory::createValidationZError( $e->getZError() )
				);
			}
		}

		// 3. Make sure that the ZObject type is not one of the disallowed types
		// 		to directly wrap in a ZPersistentObject
		if ( in_array( $type, ZTypeRegistry::DISALLOWED_ROOT_ZOBJECTS ) ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_DISALLOWED_ROOT_ZOBJECT,
					[
						'data' => $object
					]
				)
			);
		}

		// 4. Create ZPersistentObject wrapper
		// 4.1. Extract persistent keys or assign empty values
		$persistentId = null;
		$persistentLabel = null;
		$persistentAliases = null;
		if ( $inputType === ZTypeRegistry::Z_PERSISTENTOBJECT ) {
			// Check that required keys exist
			try {
				self::validatePersistentKeys( $input );
			} catch ( ZErrorException $e ) {
				throw new ZErrorException(
					ZErrorFactory::createValidationZError( $e->getZError() )
				);
			}
			// Build the values
			$persistentId = self::createChild( $input->{ ZTypeRegistry::Z_PERSISTENTOBJECT_ID } );
			$persistentLabel = self::createChild( $input->{ ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL } );
			$persistentAliases = property_exists( $input,  ZTypeRegistry::Z_PERSISTENTOBJECT_ALIASES )
				? self::createChild( $input->{ ZTypeRegistry::Z_PERSISTENTOBJECT_ALIASES } )
				: null;
		}

		// Build empty values if we are creating a new ZPersistentObject wrapper
		// TODO: Looks like this case is never really used: contemplate removing it
		$persistentId = $persistentId ?? self::createChild( ZTypeRegistry::Z_NULL_REFERENCE );
		$persistentLabel = $persistentLabel ?? self::createChild( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MULTILINGUALSTRING,
			ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE => []
		] );

		// 4.2 Track self-reference if Z_PERSISNTENT_ID is present
		self::trackSelfReference( $persistentId->getZValue(), self::SET_SELF_ZID );

		// 4.3. Create and validate inner ZObject: can throw Z502 not wellformed
		$zObject = self::create( $object );

		// 4.5. Construct ZPersistentObject()
		$persistentObject = new ZPersistentObject( $persistentId, $zObject, $persistentLabel, $persistentAliases );

		// 4.6. Check validity, to make sure that ID, label and aliases have the right format
		if ( !$persistentObject->isValid() ) {
			throw new ZErrorException(
				// FIXME Detail persistent object-related errors
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_GENERIC,
					[
						'message' => "ZPersistentObject not valid"
					]
				)
			);
		}

		// 4.6. Untrack self-reference
		self::trackSelfReference( $persistentId->getZValue(), self::UNSET_SELF_ZID );
		return $persistentObject;
	}

	/**
	 * Check that the required ZPersistentObject keys exists and, if they don't, raise
	 * missing key errors (Z511)
	 *
	 * @param string|array|\stdClass $input The item to check is a ZObject
	 * @return bool
	 * @throws ZErrorException
	 */
	public static function validatePersistentKeys( $input ): bool {
		if ( is_string( $input ) ) {
			return true;
		}

		$record = is_object( $input ) ? get_object_vars( $input ) : $input;

		if ( !is_array( $record ) ) {
			// TODO: Throw?
		}

		if ( !array_key_exists( ZTypeRegistry::Z_PERSISTENTOBJECT_ID, $record ) ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_MISSING_KEY,
					[
						'data' => $record,
						'keywordArgs' => [ 'missing' => ZTypeRegistry::Z_PERSISTENTOBJECT_ID ]
					]
				)
			);
		}

		if ( !array_key_exists( ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL, $record ) ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_MISSING_KEY,
					[
						'data' => $record,
						'keywordArgs' => [ 'missing' => ZTypeRegistry::Z_PERSISTENTOBJECT_ID ]
					]
				)
			);
		}

		// The existence of Z2K2 has already been checked
		return true;
	}

	/**
	 * Validates and creates an object of type ZObject from a given input data.
	 * The resulting ZObject will be structurally valid or well-formed.
	 *
	 * This method is the entrypoint from WikiLambda ZObject creation parting
	 * from their serialized representation.
	 *
	 * @param string|array|\stdClass $input
	 * @return ZObject
	 * @throws ZErrorException
	 */
	public static function create( $input ): ZObject {
		// 1. Get ZObject type. If not present, return a not wellformed error.
		try {
			$type = self::extractObjectType( $input );
		} catch ( ZErrorException $e ) {
			throw new ZErrorException(
				ZErrorFactory::createValidationZError( $e->getZError() )
			);
		}

		// 2. Create ZObjectStructureValidator to check that the ZObject is well formed
		try {
			$validator = ZObjectStructureValidator::createCanonicalValidator( $type );
		} catch ( ZErrorException $e ) {
			// If there's no function-schemata validator (user-defined type), we do a generic custom validation
			return self::createCustom( $input );
		}

		$status = $validator->validate( $input );

		// 3. Check structural validity or wellformedness:
		// 		If structural validation does not succeed, we cannot save the ZObject:
		// 		throw ZErrorException with the ZError returned by the validator
		if ( !$status->isValid() ) {
			throw new ZErrorException( $status->getErrors() );
		}

		// 4. Everything is correct, create ZObject instances
		return self::createChild( $input );
	}

	/**
	 * Creates an instance of a custom or user-defined type after validating it's basic
	 * structure: the keys are valid ZObject keys and the values have the correct types
	 *
	 * @param string|array|\stdClass $input
	 * @return ZObject
	 * @throws ZErrorException
	 */
	public static function createCustom( $input ): ZObject {
		try {
			ZObjectUtils::isValidZObject( $input );
		} catch ( ZErrorException $e ) {
			throw new ZErrorException(
				ZErrorFactory::createValidationZError( $e->getZError() )
			);
		}

		return self::createChild( $input );
	}

	/**
	 * Creates an object of type ZObject from the given input. This method should only
	 * be called internally, either from the ZObjectFactory of from the ZObject
	 * constructors. ZObjects created using this method will not necessarily be
	 * structurally valid.
	 *
	 * @param string|array|ZObject|\stdClass $object The item to turn into a ZObject
	 * @return ZObject
	 * @throws ZErrorException
	 */
	public static function createChild( $object ) {
		if ( $object instanceof ZObject ) {
			return $object;
		}

		if ( is_string( $object ) ) {
			if ( ZObjectUtils::isValidZObjectReference( $object ) ) {
				return new ZReference( $object );
			} else {
				return new ZString( $object );
			}
		}

		if ( is_array( $object ) ) {
			$items = [];
			foreach ( $object as $index => $item ) {
				try {
					$items[] = self::createChild( $item );
				} catch ( ZErrorException $e ) {
					throw new ZErrorException(
						ZErrorFactory::createArrayElementZError( (string)$index, $e->getZError() )
					);
				}
			}
			return new ZList( $items );
		}

		if ( !is_object( $object ) ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_INVALID_FORMAT,
					[
						'data' => $object
					]
				)
			);
		}

		$type = self::extractObjectType( $object );

		if ( !ZObjectUtils::isValidZObjectReference( $type ) ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_REFERENCE_VALUE_INVALID,
					[
						'data' => $type
					]
				)
			);
		}

		$objectVars = get_object_vars( $object );

		$typeRegistry = ZTypeRegistry::singleton();
		$errorRegistry = ZErrorTypeRegistry::singleton();

		// TERRIBLE AND VERY PROVISIONAL HACK: If the ZObject that we are trying
		// to instance is an error, and its type is a known error type, we are
		// going to allow it without any other checks.
		if (
			!$typeRegistry->isZObjectKeyKnown( $type ) &&
			$errorRegistry->instanceOfZErrorType( $type )
		) {
			return new ZObject( $type, $objectVars );
		}

		if ( !$typeRegistry->isZObjectKeyKnown( $type ) ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_UNKNOWN_REFERENCE,
					[
						'data' => $type
					]
				)
			);
		}

		// User-defined type.
		if ( !$typeRegistry->isZTypeBuiltIn( $type ) ) {
			$targetTitle = Title::newFromText( $type, NS_MAIN );
			if ( !$targetTitle->exists() ) {
				throw new ZErrorException(
					ZErrorFactory::createZErrorInstance(
						ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND,
						[
							'data' => $type
						]
					)
				);
			}

			$zObjectStore = WikiLambdaServices::getZObjectStore();
			$targetObject = $zObjectStore->fetchZObjectByTitle( $targetTitle );
			if ( !$targetObject ) {
				throw new ZErrorException(
					ZErrorFactory::createZErrorInstance(
						ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND,
						[
							'data' => $type
						]
					)
				);
			}
			return new ZObject( $type, $objectVars );
		}

		$typeName = $typeRegistry->getZObjectTypeFromKey( $type );
		$typeClass = "MediaWiki\\Extension\\WikiLambda\\ZObjects\\$typeName";
		$objectArgs = self::createKeyValues( $objectVars, $typeName );

		// Magic:
		return new $typeClass( ...$objectArgs );
	}

	/**
	 * This method takes an input and a built-in ZObject type name and returns the
	 * required arguments to call the ZObject constructur
	 *
	 * @param array $objectVars
	 * @param string $targetType
	 * @return array arguments to pass to the target ZObject constructor
	 */
	private static function createKeyValues( array $objectVars, string $targetType ) {
		// Magic
		$targetDefinition = call_user_func(
			'MediaWiki\Extension\WikiLambda\ZObjects\\' . $targetType . '::getDefinition'
		);
		$targetZid = ZTypeRegistry::singleton()->getZObjectKeyFromType( $targetType );

		$creationArray = [];
		foreach ( $targetDefinition['keys'] as $key => $settings ) {
			if ( array_key_exists( $key, $objectVars ) ) {
				if ( in_array( $key, ZTypeRegistry::TERMINAL_KEYS ) ) {
					// Return the value if it belongs to a terminal key (Z6K1 or Z9K1)
					$creationArray[] = $objectVars[ $key ];
				} else {
					// Build the value of a given key to create nested ZObjects
					// If it fails, throw a key value error (Z526)
					try {
						$creationArray[] = self::createChild( $objectVars[ $key ] );
					} catch ( ZErrorException $e ) {
						throw new ZErrorException( ZErrorFactory::createKeyValueZError( $key, $e->getZError() ) );
					}
				}
			} else {
				// If it doesn't exist in $objectVars, we pass null
				$creationArray[] = null;
				if ( array_key_exists( 'required', $settings ) && ( $settings['required'] ) ) {
					// Error Z511: Missing key
					throw new ZErrorException(
						ZErrorFactory::createZErrorInstance(
							ZErrorTypeRegistry::Z_ERROR_MISSING_KEY,
							[
								'data' => $objectVars,
								'keywordArgs' => [ 'missing' => $key ]
							]
						)
					);
				}
			}
		}

		return $creationArray;
	}

	/**
	 * Returns the inner ZObject of a given ZPersistentObject representation, which
	 * corresponds to is value key (Z2K2)
	 *
	 * @param \stdClass $object
	 * @return \stdClass|array|string
	 * @throws ZErrorException
	 */
	private static function extractInnerObject( $object ) {
		if ( !property_exists( $object, ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ) ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_MISSING_KEY,
					[
						'data' => $object,
						'keywordArgs' => [ 'missing' => ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ]
					]
				)
			);
		}
		return $object->{ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE};
	}

	/**
	 * Get a given ZObject's type, irrespective of it being in canonical or in normal form
	 *
	 * @param \stdClass|array|string $object
	 * @return string
	 * @throws ZErrorException
	 */
	private static function extractObjectType( $object ): string {
		// Check for canonical strings and references
		if ( is_string( $object ) ) {
			if ( ZObjectUtils::isValidOrNullZObjectReference( $object ) ) {
				return ZTypeRegistry::Z_REFERENCE;
			}
			return ZTypeRegistry::Z_STRING;
		}

		// Check for canonical arrays
		if ( is_array( $object ) ) {
			return ZTypeRegistry::Z_LIST;
		}

		// Check for invalid type
		if ( !is_object( $object ) ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_INVALID_FORMAT,
					[
						'data' => $object
					]
				)
			);
		}

		if ( !property_exists( $object, ZTypeRegistry::Z_OBJECT_TYPE ) ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_MISSING_TYPE,
					[
						'data' => $object
					]
				)
			);
		}

		$type = $object->{ZTypeRegistry::Z_OBJECT_TYPE};

		// FIXME: The following check is here so that we can handle normal form,
		// but this might not be necessary in the future, as we will be receiving
		// only ZObjects in their canonical form
		if ( is_object( $type ) ) {
			$type = $type->{ ZTypeRegistry::Z_REFERENCE_VALUE };
		}

		if ( !ZObjectUtils::isValidZObjectReference( $type ) ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_REFERENCE_VALUE_INVALID,
					[
						'data' => $type
					]
				)
			);
		}

		return $type;
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
}
