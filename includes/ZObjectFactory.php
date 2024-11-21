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
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZType;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;
use MediaWiki\Title\Title;

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
	 * TODO (T375065): This is probably unnecessary now. We never create an object
	 * just passing the inner object, so we should probably strip this feature.
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
		$persistentDescription = null;
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
			$persistentId = self::create( $input->{ ZTypeRegistry::Z_PERSISTENTOBJECT_ID } );
			$persistentLabel = self::create( $input->{ ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL } );

			$persistentAliases = property_exists( $input, ZTypeRegistry::Z_PERSISTENTOBJECT_ALIASES )
				? self::create( $input->{ ZTypeRegistry::Z_PERSISTENTOBJECT_ALIASES } )
				: null;

			$persistentDescription = property_exists( $input,
				ZTypeRegistry::Z_PERSISTENTOBJECT_DESCRIPTION )
				? self::create( $input->{ ZTypeRegistry::Z_PERSISTENTOBJECT_DESCRIPTION } )
				: null;
		}

		// Build empty values if we are creating a new ZPersistentObject wrapper
		// TODO (T362249): Looks like this case is never really used: contemplate removing it
		$persistentId ??= self::create( ZTypeRegistry::Z_NULL_REFERENCE );
		$persistentLabel ??= self::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MULTILINGUALSTRING,
			ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE => [ ZTypeRegistry::Z_MONOLINGUALSTRING ]
		] );

		// 4.2 Track self-reference if Z_PERSISNTENT_ID is present
		self::trackSelfReference( $persistentId->getZValue(), self::SET_SELF_ZID );

		// 4.3. Create and validate inner ZObject: can throw Z502/Not wellformed
		$zObject = self::create( $object );

		// 4.5. Construct ZPersistentObject()
		$persistentObject = new ZPersistentObject( $persistentId, $zObject, $persistentLabel,
			$persistentAliases, $persistentDescription );

		// 4.6. Check validity, to make sure that ID, label and aliases have the right format
		if ( !$persistentObject->isValid() ) {
			throw new ZErrorException(
				// TODO (T300506): Detail persistent object-related errors
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
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
		// We have a different error for Z2K2 being missing vs. the others.
		if ( !property_exists( $input, ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ) ) {
			throw new ZErrorException( ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_MISSING_PERSISTENT_VALUE,
				[ 'data' => $input ],
			) );
		}

		$otherRequiredKeys = [
			ZTypeRegistry::Z_PERSISTENTOBJECT_ID,
			ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL,
			// Disabled for now, optional
			// ZTypeRegistry::Z_PERSISTENTOBJECT_ALIASES,
			// Disabled for now, optional
			// ZTypeRegistry::Z_PERSISTENTOBJECT_DESCRIPTION,
		];

		foreach ( $otherRequiredKeys as $_i => $requiredKey ) {
			if ( !property_exists( $input, $requiredKey ) ) {
				throw new ZErrorException( ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_MISSING_KEY,
					[
						'data' => $input,
						'keywordArgs' => [ 'missing' => $requiredKey ],
					]
				) );
			}
		}

		return true;
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
	public static function create( $object ) {
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
			$listType = self::create( $rawListType );

			// TODO (T330321): All of the checks in the following if block have already been
			// checked during static validation, but the following block is:
			//  A) Incomplete (lacks other possible resolvers)
			//  B) Doesn't check that the objects resolve to ZType (not sure if we wanna do that)
			// So either we remove it completely, or we fix B.
			if ( !(
				// Mostly we expect direct references to ZTypes (but we don't check it's a type)
				$listType instanceof ZReference ||
				// … sometimes it's a ZFunctionCall to make a ZType (but we don't check it's a type)
				$listType instanceof ZFunctionCall ||
				// … occasionally it's an inline ZType (or a dereferenced one)
				$listType instanceof ZType
			) ) {
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
					$item = self::create( $value );
				} catch ( ZErrorException $e ) {
					// We increment the index to point at the correct array item
					// because we removed the first element by doing array_shift
					$arrayIndex = $index + 1;
					throw new ZErrorException(
						ZErrorFactory::createArrayElementZError( (string)( $arrayIndex ), $e->getZError() )
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
						$creationArray[] = self::create( $objectVars[ $key ] );
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
				if ( $key === ZTypeRegistry::Z_OBJECT_TYPE ) {
					continue;
				}
				try {
					$args[ $key ] = self::create( $value );
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
	 * Given a ZObject, return its type.
	 *
	 * It accepts both a canonical or a normal input.
	 *
	 * Throws errors if:
	 * * The object doesn't have a type/Z1K1
	 * * The object type is not a reference or a function call
	 * * The object type reference points at an unexisting object
	 * * The object type reference points at an object that's not a type
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
			// TODO (T298126): We should probably infer the type of ZObjects contained in
			// this array instead of just creating an untyped list of Z1s
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
		$type = self::create( $objectType );
		$typeRegistry = ZTypeRegistry::singleton();

		// If it's a ZReference, it must point at an object of type Z4
		if ( $type instanceof ZReference ) {
			$errorRegistry = ZErrorTypeRegistry::singleton();
			$typeZid = $type->getZValue();

			// Make sure that the reference is to a Z4

			// TODO (T375065): isZObjectKeyKnown fetches and validates types,
			// this has the potential of going into infinite loops when creating
			// error objects.
			// We should have a more efficient way to check that a Zid belongs to
			// a type, or a function (the most important cases for creation and
			// function call, respectively), probably through secondaty tables.
			// Notice that current labels table has this info but ONLY for those
			// objects containing labels, which means that:
			// * the process would not be fully trustworthy, or
			// * we'd need to make sure that types and functions are stored with labels
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
				// Make sure that the return type of the function is Z4 or Z1
				if (
					( $returnType !== ZTypeRegistry::Z_TYPE ) &&
					( $returnType !== ZTypeRegistry::Z_OBJECT )
				) {
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

		if ( $type instanceof ZType ) {
			// return the content of the Type Identity field
			return $type->getTypeId();
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
