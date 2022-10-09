<?php
/**
 * WikiLambda ZObject factory
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\Validation\ZObjectStructureValidator;
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;
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
		// 1. Get ZObject type. If not present or invalid, throw a not wellformed error
		try {
			$inputTypeZObject = self::extractObjectType( $input );
			$typeZid = $inputTypeZObject->getZValue();
		} catch ( ZErrorException $e ) {
			throw new ZErrorException(
				ZErrorFactory::createValidationZError( $e->getZError() )
			);
		}

		$object = $input;

		// 2. If ZObject type is Z2/Z_PERSISTENT_OBJECT, get the inner object.
		// 		If not present, throw a not wellformed error.
		if ( $typeZid === ZTypeRegistry::Z_PERSISTENTOBJECT ) {
			try {
				$object = self::extractInnerObject( $input );
			} catch ( ZErrorException $e ) {
				throw new ZErrorException(
					ZErrorFactory::createValidationZError( $e->getZError() )
				);
			}

			// Get type of the inner ZObject. If not present, throw a not wellformed error
			try {
				$innerTypeZObject = self::extractObjectType( $object );
				$typeZid = $innerTypeZObject->getZValue();
			} catch ( ZErrorException $e ) {
				throw new ZErrorException(
					ZErrorFactory::createValidationZError( $e->getZError() )
				);
			}
		}

		// 3. Make sure that the ZObject type is not one of the disallowed types
		// 		to directly wrap in a ZPersistentObject
		if ( in_array( $typeZid, ZTypeRegistry::DISALLOWED_ROOT_ZOBJECTS ) ) {
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
		if ( $inputTypeZObject->getZValue() === ZTypeRegistry::Z_PERSISTENTOBJECT ) {
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
			ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE => [ ZTypeRegistry::Z_MONOLINGUALSTRING ]
		] );

		// 4.2 Track self-reference if Z_PERSISNTENT_ID is present
		self::trackSelfReference( $persistentId->getZValue(), self::SET_SELF_ZID );

		// 4.3. Create and validate inner ZObject: can throw Z502/Not wellformed
		$zObject = self::create( $object );

		// 4.5. Construct ZPersistentObject()
		$persistentObject = new ZPersistentObject( $persistentId, $zObject, $persistentLabel, $persistentAliases );

		// 4.6. Check validity, to make sure that ID, label and aliases have the right format
		if ( !$persistentObject->isValid() ) {
			throw new ZErrorException(
				// FIXME (T300506) Detail persistent object-related errors
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
	 * Z511/Missing key errors
	 *
	 * @param string|array|\stdClass $input The item to check is a ZObject
	 * @return bool
	 * @throws ZErrorException
	 */
	public static function validatePersistentKeys( $input ): bool {
		$validator = ZObjectStructureValidator::createCanonicalValidator( ZTypeRegistry::Z_PERSISTENTOBJECT );
		$status = $validator->validate( $input );

		if ( !$status->isValid() ) {
			throw new ZErrorException( $status->getErrors() );
		}

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
			$typeZObject = self::extractObjectType( $input );
			$typeZid = $typeZObject->getZValue();
		} catch ( ZErrorException $e ) {
			throw new ZErrorException(
				ZErrorFactory::createValidationZError( $e->getZError() )
			);
		}

		// 2. Create ZObjectStructureValidator to check that the ZObject is well formed
		try {
			// FIXME (T309409): Generic validator should work with lists but it fails during ZObject migration
			$validator = ZObjectStructureValidator::createCanonicalValidator( is_array( $input ) ? "LIST" : $typeZid );
		} catch ( ZErrorException $e ) {
			// If there's no function-schemata validator (user-defined type), we do a generic custom validation
			$validator = ZObjectStructureValidator::createCanonicalValidator( ZTypeRegistry::Z_OBJECT );
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
	 * @deprecated
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
			if ( count( $object ) === 0 ) {
				throw new ZErrorException(
					ZErrorFactory::createZErrorInstance(
						ZErrorTypeRegistry::Z_ERROR_UNDEFINED_LIST_TYPE,
						[
							'data' => $object
						]
					)
				);
			}

			$rawListType = array_shift( $object );
			$listType = self::createChild( $rawListType );

			if ( !( $listType instanceof ZReference ) && !( $listType instanceof ZFunctionCall ) ) {
				throw new ZErrorException(
					ZErrorFactory::createZErrorInstance(
						ZErrorTypeRegistry::Z_ERROR_WRONG_LIST_TYPE,
						[
							'data' => $rawListType
						]
					)
				);
			}

			$items = [];

			foreach ( $object as $index => $value ) {
				try {
					$item = self::createChild( $value );
				} catch ( ZErrorException $e ) {
					throw new ZErrorException(
						ZErrorFactory::createArrayElementZError( (string)$index, $e->getZError() )
					);
				}
				$items[] = $item;
			}

			return new ZTypedList( ZTypedList::buildType( $listType ), $items );
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

		$typeRegistry = ZTypeRegistry::singleton();
		$typeZObject = self::extractObjectType( $object );
		$typeZid = $typeZObject->getZValue();
		$objectVars = get_object_vars( $object );

		// If typeZObject is a ZReference and a built-in, build args and call constructor
		if ( ( $typeZObject instanceof ZReference ) && ( $typeRegistry->isZTypeBuiltIn( $typeZid ) ) ) {
			$typeName = $typeRegistry->getZObjectTypeFromKey( $typeZid );
			$typeClass = "MediaWiki\\Extension\\WikiLambda\\ZObjects\\$typeName";
			$objectArgs = self::createKeyValues( $objectVars, $typeName );
			// Magic:
			return new $typeClass( ...$objectArgs );
		}

		// If typeZObject is a ZFunctionCall and a built-in, build args and call constructor
		if ( ( $typeZObject instanceof ZFunctionCall ) && ( $typeRegistry->isZFunctionBuiltIn( $typeZid ) ) ) {
			$builtinName = $typeRegistry->getZFunctionBuiltInName( $typeZid );
			$builtinClass = "MediaWiki\\Extension\\WikiLambda\\ZObjects\\$builtinName";
			$objectArgs = self::createKeyValues( $objectVars, $builtinName );
			// Magic:
			return new $builtinClass( $typeZObject, ...$objectArgs );
		}

		// No built-in type or function call, so we build a generic ZObject instance:
		// * typeZid is a user-defined type Zid or function Zid, so:
		// * we check that it exists in the wiki
		// * we call the ZObject constructor
		$targetTitle = Title::newFromText( $typeZid, NS_MAIN );
		if ( !$targetTitle->exists() ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND,
					[
						'data' => $typeZid
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
						'data' => $typeZid
					]
				)
			);
		}

		$objectArgs = self::createKeyValues( $objectVars, "ZObject" );
		return new ZObject( ...$objectArgs );
	}

	/**
	 * This method takes an input and a built-in ZObject type name and returns the
	 * required arguments to call the ZObject constructur
	 *
	 * @param array $objectVars
	 * @param string $targetType
	 * @return array arguments to pass to the target ZObject constructor
	 * @phan-return non-empty-array
	 */
	private static function createKeyValues( array $objectVars, string $targetType ) {
		// Magic
		$targetDefinition = call_user_func(
			'MediaWiki\Extension\WikiLambda\ZObjects\\' . $targetType . '::getDefinition'
		);

		$creationArray = [];
		foreach ( $targetDefinition['keys'] as $key => $settings ) {
			if ( array_key_exists( $key, $objectVars ) ) {
				if ( in_array( $key, ZTypeRegistry::TERMINAL_KEYS ) ) {
					// Return the value if it belongs to a terminal key (Z6K1 or Z9K1)
					$creationArray[] = $objectVars[ $key ];
				} else {
					// Build the value of a given key to create nested ZObjects
					// If it fails, throw a Z526/Key value error
					try {
						$creationArray[] = self::createChild( $objectVars[ $key ] );
					} catch ( ZErrorException $e ) {
						throw new ZErrorException( ZErrorFactory::createKeyValueZError( $key, $e->getZError() ) );
					}
				}

				// Remove every definition key from the objectVars, so that we can pass
				// them as additional parameters if the definition specifies so.
				unset( $objectVars[ $key ] );

			} else {
				// If it doesn't exist in $objectVars, we pass null
				$creationArray[] = null;
				if ( array_key_exists( 'required', $settings ) && ( $settings['required'] ) ) {
					// Error Z511/Missing key
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

		// If ZObject Definition include the parameter 'additionalKeys',
		// pass the leftover objectVars as the last argument (ignore Z1K1)
		if ( array_key_exists( 'additionalKeys', $targetDefinition ) && $targetDefinition[ 'additionalKeys' ] ) {
			$args = [];
			foreach ( $objectVars as $key => $value ) {
				if ( $key === ZTypeRegistry::Z_OBJECT_TYPE ) { continue;
				}
				try {
					$args[ $key ] = self::createChild( $value );
				} catch ( ZErrorException $e ) {
					throw new ZErrorException( ZErrorFactory::createKeyValueZError( $key, $e->getZError() ) );
				}
			}
			$creationArray[] = $args;
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
		return $object->{ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE };
	}

	/**
	 * Get a given ZObject's type, irrespective of it being in canonical or in normal form
	 *
	 * @param \stdClass|array|string $object
	 * @return ZReference|ZFunctionCall Object type represented by a reference or a function call
	 * @throws ZErrorException
	 */
	private static function extractObjectType( $object ) {
		// Check for canonical strings and references
		if ( is_string( $object ) ) {
			if ( ZObjectUtils::isValidOrNullZObjectReference( $object ) ) {
				// returns ZReference
				return new ZReference( ZTypeRegistry::Z_REFERENCE );
			}
			// returns ZReference
			return new ZReference( ZTypeRegistry::Z_STRING );
		}

		// Check for canonical arrays
		if ( is_array( $object ) ) {
			// FIXME (T298126): We should probably infer the type of ZObjects contained in
			// this array instead of just creating a generic list of Z1s
			return new ZFunctionCall(
				new ZReference( ZTypeRegistry::Z_FUNCTION_TYPED_LIST ),
				[ ZTypeRegistry::Z_FUNCTION_TYPED_LIST_TYPE => ZTypeRegistry::Z_OBJECT_TYPE ]
			);
		}

		// Error invalid type
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

		// Error key Z1K1 does not exist
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

		// Value of Z1K1 can be a string or an object,
		// resulting on a ZReference or a ZFunctionCall
		$objectType = $object->{ ZTypeRegistry::Z_OBJECT_TYPE };
		$type = self::createChild( $objectType );
		$typeRegistry = ZTypeRegistry::singleton();

		// If it's a ZReference, it must point at an object of type Z4
		if ( $type instanceof ZReference ) {
			$errorRegistry = ZErrorTypeRegistry::singleton();
			$typeZid = $type->getZValue();

			// FIXME (T298093)
			// Remove this exception, we will not have ZReferences to ZErrorTypes
			// here, but ZFunctionCalls to Z885.
			// For now, if it's a reference to a ZErrorType (e.g. Z511), accept it
			// as if it were a type.
			if (
				!$typeRegistry->isZObjectKeyKnown( $typeZid ) &&
				$errorRegistry->instanceOfZErrorType( $typeZid )
			) {
				return $type;
			}

			// Make sure that the reference is to a Z4
			if ( !$typeRegistry->isZObjectKeyKnown( $typeZid ) ) {
				throw new ZErrorException(
					ZErrorFactory::createZErrorInstance(
						ZErrorTypeRegistry::Z_ERROR_UNKNOWN_REFERENCE,
						[
							'data' => $typeZid
						]
					)
				);
			}

			// return ZReference
			return $type;
		}

		if ( $type instanceof ZFunctionCall ) {
			// Only check return type for non built-in type functions, as we know
			// that those have Z4 as their return type
			if ( !$typeRegistry->isZFunctionBuiltIn( $type->getZValue() ) ) {
				$returnType = $type->getReturnType();
				// Make sure that the function Zid exists
				if ( $returnType === null ) {
					throw new ZErrorException(
						ZErrorFactory::createZErrorInstance(
							ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND,
							[
								'data' => $type->getZValue()
							]
						)
					);
				}
				// Make sure that the return type of the function is Z4
				if ( $returnType !== ZTypeRegistry::Z_TYPE ) {
					throw new ZErrorException(
						ZErrorFactory::createZErrorInstance(
							ZErrorTypeRegistry::Z_ERROR_UNEXPECTED_ZTYPE,
							[
								'expected' => ZTypeRegistry::Z_TYPE,
								'used' => $type->getReturnType()
							]
						)
					);
				}
			}
			// return ZFunctionCall
			return $type;
		}

		// Invalid type: Z1K1 contains something else than a ZReference or a ZFunctionCall
		throw new ZErrorException(
			ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_REFERENCE_VALUE_INVALID,
				[
					'data' => $type->getZValue()
				]
			)
		);
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
