<?php
/**
 * WikiLambda ZTypeRegistry
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Registry;

use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Title\Title;

/**
 * A registry service for ZObject implementations.
 */
class ZTypeRegistry extends ZObjectRegistry {

	// Builtin Types that need special treatment while ZObject creation:

	// Needed for quote type, it can be anything
	public const BUILTIN_ANY = 'Any';
	// Is there a better way to represent this direct string (as opposed to a ZString?)
	public const BUILTIN_STRING = 'String';
	// Is there a better way to represent this direct array
	public const BUILTIN_ARRAY = 'Array';
	// Needed until we have a ZReference type
	public const BUILTIN_REFERENCE = 'Reference';
	// Needed until we have a better way to cut the Gordian Knot of Z0 references?
	public const BUILTIN_REFERENCE_NULLABLE = 'NullableReference';
	// Needed until we have sub-types
	public const HACK_REFERENCE_TYPE = 'Reference(Type)';
	// Needed until we have sub-types
	public const HACK_REFERENCE_LANGUAGE = 'Reference(Language)';
	// Needed until we have a ZLanguage type (or similar)
	public const HACK_LANGUAGE = 'Language';
	// Needed until we have sub-types
	public const HACK_ARRAY_Z_KEY = 'Array(ZKey)';
	// Needed until we have sub-types
	public const HACK_ARRAY_Z_STRING = 'Array(ZString)';
	// Needed until we have sub-types
	public const HACK_ARRAY_Z_MONOLINGUALSTRING = 'Array(ZMonoLingualString)';
	// Needed until we have sub-types
	public const HACK_ARRAY_Z_MONOLINGUALSTRINGSET = 'Array(ZMonoLingualStringSet)';

	public const Z_NULL_REFERENCE = 'Z0';

	public const Z_OBJECT = 'Z1';
	public const Z_OBJECT_TYPE = 'Z1K1';

	public const Z_PERSISTENTOBJECT = 'Z2';
	public const Z_PERSISTENTOBJECT_ID = 'Z2K1';
	public const Z_PERSISTENTOBJECT_VALUE = 'Z2K2';
	public const Z_PERSISTENTOBJECT_LABEL = 'Z2K3';
	public const Z_PERSISTENTOBJECT_ALIASES = 'Z2K4';
	public const Z_PERSISTENTOBJECT_DESCRIPTION = 'Z2K5';

	public const Z_KEY = 'Z3';
	public const Z_KEY_TYPE = 'Z3K1';
	public const Z_KEY_ID = 'Z3K2';
	public const Z_KEY_LABEL = 'Z3K3';
	public const Z_KEY_IS_IDENTITY = 'Z3K4';

	public const Z_TYPE = 'Z4';
	public const Z_TYPE_IDENTITY = 'Z4K1';
	public const Z_TYPE_KEYS = 'Z4K2';
	public const Z_TYPE_VALIDATOR = 'Z4K3';
	public const Z_TYPE_EQUALITY = 'Z4K4';
	public const Z_TYPE_RENDERER = 'Z4K5';
	public const Z_TYPE_PARSER = 'Z4K6';
	public const Z_TYPE_DESERIALISERS = 'Z4K7';
	public const Z_TYPE_SERIALISERS = 'Z4K8';

	public const Z_ERROR = 'Z5';
	public const Z_ERROR_TYPE = 'Z5K1';
	public const Z_ERROR_VALUE = 'Z5K2';

	public const Z_STRING = 'Z6';
	public const Z_STRING_VALUE = 'Z6K1';

	public const Z_FUNCTIONCALL = 'Z7';
	public const Z_FUNCTIONCALL_FUNCTION = 'Z7K1';

	public const Z_FUNCTION = 'Z8';
	public const Z_FUNCTION_ARGUMENTS = 'Z8K1';
	public const Z_FUNCTION_RETURN_TYPE = 'Z8K2';
	public const Z_FUNCTION_TESTERS = 'Z8K3';
	public const Z_FUNCTION_IMPLEMENTATIONS = 'Z8K4';
	public const Z_FUNCTION_IDENTITY = 'Z8K5';

	public const Z_REFERENCE = 'Z9';
	public const Z_REFERENCE_VALUE = 'Z9K1';

	public const Z_MONOLINGUALSTRING = 'Z11';
	public const Z_MONOLINGUALSTRING_LANGUAGE = 'Z11K1';
	public const Z_MONOLINGUALSTRING_VALUE = 'Z11K2';

	public const Z_MULTILINGUALSTRING = 'Z12';
	public const Z_MULTILINGUALSTRING_VALUE = 'Z12K1';

	public const Z_IMPLEMENTATION = 'Z14';
	public const Z_IMPLEMENTATION_FUNCTION = 'Z14K1';
	public const Z_IMPLEMENTATION_COMPOSITION = 'Z14K2';
	public const Z_IMPLEMENTATION_CODE = 'Z14K3';
	public const Z_IMPLEMENTATION_BUILTIN = 'Z14K4';

	public const Z_ARGUMENTDECLARATION = 'Z17';
	public const Z_ARGUMENTDECLARATION_TYPE = 'Z17K1';
	public const Z_ARGUMENTDECLARATION_ID = 'Z17K2';
	public const Z_ARGUMENTDECLARATION_LABEL = 'Z17K3';

	public const Z_TESTER = 'Z20';
	public const Z_TESTER_FUNCTION = 'Z20K1';
	public const Z_TESTER_CALL = 'Z20K2';
	public const Z_TESTER_VALIDATION = 'Z20K3';

	public const Z_RESPONSEENVELOPE = 'Z22';
	public const Z_RESPONSEENVELOPE_VALUE = 'Z22K1';
	public const Z_RESPONSEENVELOPE_METADATA = 'Z22K2';

	public const Z_MONOLINGUALSTRINGSET = 'Z31';
	public const Z_MONOLINGUALSTRINGSET_LANGUAGE = 'Z31K1';
	public const Z_MONOLINGUALSTRINGSET_VALUE = 'Z31K2';

	public const Z_MULTILINGUALSTRINGSET = 'Z32';
	public const Z_MULTILINGUALSTRINGSET_VALUE = 'Z32K1';

	public const Z_KEYREFERENCE = 'Z39';
	public const Z_KEYREFERENCE_VALUE = 'Z39K1';

	public const Z_DESERIALISER = 'Z46';
	public const Z_DESERIALISER_IDENTITY = 'Z46K1';
	public const Z_DESERIALISER_TYPE = 'Z46K2';
	public const Z_DESERIALISER_LANGUAGE = 'Z46K3';
	public const Z_DESERIALISER_TARGET = 'Z46K4';
	public const Z_DESERIALISER_CODE = 'Z46K5';

	public const Z_LANGUAGE = 'Z60';
	public const Z_LANGUAGE_CODE = 'Z60K1';
	public const Z_LANGUAGE_SECONDARYCODES = 'Z60K2';

	public const Z_PROGRAMMINGLANGUAGE = 'Z61';

	public const Z_SERIALISER = 'Z64';
	public const Z_SERIALISER_IDENTITY = 'Z64K1';
	public const Z_SERIALISER_TYPE = 'Z64K2';
	public const Z_SERIALISER_LANGUAGE = 'Z64K3';
	public const Z_SERIALISER_SOURCE = 'Z64K4';
	public const Z_SERIALISER_CODE = 'Z64K5';

	public const Z_QUOTE = 'Z99';
	public const Z_QUOTE_VALUE = 'Z99K1';

	public const Z_ERRORTYPE = 'Z50';
	public const Z_ERRORTYPE_KEYS = 'Z50K1';

	// Wikidata Entity Types
	public const Z_WIKIDATA_ITEM = 'Z6001';
	public const Z_WIKIDATA_PROPERTY = 'Z6002';
	public const Z_WIKIDATA_STATEMENT = 'Z6003';
	public const Z_WIKIDATA_LEXEME_FORM = 'Z6004';
	public const Z_WIKIDATA_LEXEME = 'Z6005';
	public const Z_WIKIDATA_LEXEME_SENSE = 'Z6006';

	public const WIKIDATA_TYPES = [
		self::Z_WIKIDATA_ITEM,
		self::Z_WIKIDATA_PROPERTY,
		self::Z_WIKIDATA_STATEMENT,
		self::Z_WIKIDATA_LEXEME_FORM,
		self::Z_WIKIDATA_LEXEME,
		self::Z_WIKIDATA_LEXEME_SENSE
	];

	// Wikidata Reference Types:
	public const Z_WIKIDATA_REFERENCE_ITEM = 'Z6091';
	public const Z_WIKIDATA_REFERENCE_PROPERTY = 'Z6092';
	public const Z_WIKIDATA_REFERENCE_LEXEME_FORM = 'Z6094';
	public const Z_WIKIDATA_REFERENCE_LEXEME = 'Z6095';
	public const Z_WIKIDATA_REFERENCE_LEXEME_ID = 'Z6095K1';
	public const Z_WIKIDATA_REFERENCE_LEXEME_SENSE = 'Z6096';

	public const WIKIDATA_REFERENCE_TYPES = [
		self::Z_WIKIDATA_REFERENCE_ITEM,
		self::Z_WIKIDATA_REFERENCE_PROPERTY,
		self::Z_WIKIDATA_REFERENCE_LEXEME_FORM,
		self::Z_WIKIDATA_REFERENCE_LEXEME,
		self::Z_WIKIDATA_REFERENCE_LEXEME_SENSE
	];

	// Wikidata Entity Fetch Functions:
	public const Z_WIKIDATA_FETCH_LEXEME_FORM = 'Z6824';
	public const Z_WIKIDATA_FETCH_LEXEME_FORM_ID = 'Z6824K1';
	public const Z_WIKIDATA_FETCH_LEXEME = 'Z6825';
	public const Z_WIKIDATA_FETCH_LEXEME_ID = 'Z6825K1';

	public const WIKIDATA_FETCH_FUNCTIONS = [
		self::Z_WIKIDATA_FETCH_LEXEME_FORM,
		self::Z_WIKIDATA_FETCH_LEXEME
	];

	// Keep in sync with function-schemata's `typesBuiltIntoWikiLambda`
	private const BUILT_IN_TYPES = [
		self::Z_OBJECT => 'ZObject',
		self::Z_PERSISTENTOBJECT => 'ZPersistentObject',
		self::Z_KEY => 'ZKey',
		self::Z_ERROR => 'ZError',
		self::Z_TYPE => 'ZType',
		self::Z_STRING => 'ZString',
		self::Z_FUNCTIONCALL => 'ZFunctionCall',
		self::Z_FUNCTION => 'ZFunction',
		self::Z_REFERENCE => 'ZReference',
		self::Z_MONOLINGUALSTRING => 'ZMonoLingualString',
		self::Z_MULTILINGUALSTRING => 'ZMultiLingualString',
		self::Z_RESPONSEENVELOPE => 'ZResponseEnvelope',
		self::Z_MONOLINGUALSTRINGSET => 'ZMonoLingualStringSet',
		self::Z_MULTILINGUALSTRINGSET => 'ZMultiLingualStringSet',
		self::Z_KEYREFERENCE => 'ZKeyReference',
		self::Z_BOOLEAN => 'ZBoolean',
		self::Z_QUOTE => 'ZQuote',
	];

	public const TERMINAL_KEYS = [
		self::Z_STRING_VALUE,
		self::Z_REFERENCE_VALUE,
		self::Z_QUOTE_VALUE
	];

	/**
	 * An array of ZTypes which are prohibited from creation by any user. (T278175)
	 */
	public const DISALLOWED_ROOT_ZOBJECTS = [
		self::Z_PERSISTENTOBJECT,
		self::Z_KEY,
		self::Z_REFERENCE,
		self::Z_ARGUMENTDECLARATION,
		self::Z_ARGUMENTREFERENCE,
		self::Z_KEYREFERENCE,
		self::Z_ERROR,
		self::Z_CODE,
		// Wikidata types
		...self::WIKIDATA_TYPES,
		...self::WIKIDATA_REFERENCE_TYPES
		// TODO (T309302): Uncomment when fixed Z24 insertion issue
		// self::Z_UNIT,
	];

	public const EXCLUDE_TYPES_FROM_ENUMS = [
		self::Z_TYPE,
		self::Z_FUNCTION,
		self::Z_DESERIALISER,
		self::Z_SERIALISER
	];

	public const IGNORE_KEY_VALUES_FOR_LABELLING = [
		self::Z_QUOTE_VALUE,
		self::Z_KEYREFERENCE_VALUE,
		self::Z_KEY_ID,
		self::Z_PERSISTENTOBJECT_ID,
		self::Z_TYPE_IDENTITY,
	];

	public const SELF_REFERENTIAL_KEYS = [
		self::Z_TYPE_IDENTITY,
		self::Z_PERSISTENTOBJECT_ID,
		self::Z_FUNCTION_IDENTITY
	];

	// These consts are currently only used by ZObjectStore to prohibit creation, and are not (yet) built-in.
	public const Z_CODE = 'Z16';
	public const Z_CODE_LANGUAGE = 'Z16K1';
	public const Z_CODE_CODE = 'Z16K2';
	public const Z_ARGUMENTREFERENCE = 'Z18';
	public const Z_UNIT = 'Z21';
	public const Z_NULL = 'Z23';

	// These are provided for ease of use
	public const Z_VOID = 'Z24';
	public const Z_VOID_INSTANCE = [ self::Z_OBJECT_TYPE => self::Z_UNIT ];

	public const Z_BOOLEAN = 'Z40';
	public const Z_BOOLEAN_VALUE = 'Z40K1';
	public const Z_BOOLEAN_TRUE = 'Z41';
	public const Z_BOOLEAN_FALSE = 'Z42';

	public const IGNORE_KEY_NORMALIZATION = [
		self::Z_OBJECT_TYPE,
		self::Z_MONOLINGUALSTRING_LANGUAGE,
		self::Z_MONOLINGUALSTRING_VALUE,
		self::Z_MULTILINGUALSTRING_VALUE
	];

	public const Z_FUNCTION_TYPED_LIST = 'Z881';
	public const Z_FUNCTION_TYPED_LIST_TYPE = 'Z881K1';

	public const Z_FUNCTION_TYPED_PAIR = 'Z882';
	public const Z_FUNCTION_TYPED_FIRST_TYPE = 'Z882K1';
	public const Z_FUNCTION_TYPED_SECOND_TYPE = 'Z882K2';

	public const Z_FUNCTION_TYPED_MAP = 'Z883';
	public const Z_FUNCTION_TYPED_MAP_KEY_TYPE = 'Z883K1';
	public const Z_FUNCTION_TYPED_MAP_VALUE_TYPE = 'Z883K2';

	public const Z_FUNCTION_ERRORTYPE_TO_TYPE = 'Z885';
	public const Z_FUNCTION_ERRORTYPE_TYPE = 'Z885K1';

	// These are built-in functions that return a type, so we will
	// always find them as ZObject type values (Z1K1)
	public const BUILT_IN_TYPE_FUNCTIONS = [
		self::Z_FUNCTION_TYPED_LIST => 'ZTypedList',
		self::Z_FUNCTION_TYPED_PAIR => 'ZTypedPair',
		self::Z_FUNCTION_TYPED_MAP => 'ZTypedMap',
		self::Z_FUNCTION_ERRORTYPE_TO_TYPE => 'ZTypedError'
	];

	/**
	 * Initialize ZTypeRegistry
	 */
	protected function initialize(): void {
		// Registry for ZObjects of type ZType/Z4
		$this->type = self::Z_TYPE;

		foreach ( self::BUILT_IN_TYPES as $zKey => $classname ) {
			$this->register( $zKey, $classname );
		}
	}

	/**
	 * Registers the given ZType id and name in the type cache.
	 *
	 * @param string $key
	 * @param string $type
	 * @throws ZErrorException
	 */
	public function register( string $key, string $type ): void {
		if ( $this->isZObjectKeyCached( $key ) ) {
			$conflictingType = $this->getZObjectKeyFromType( $key );
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_CONFLICTING_TYPE_NAMES,
					[
						'zid' => $key,
						'name' => $type,
						'existing' => $conflictingType
					]
				)
			);
		}

		if ( $this->isZObjectTypeCached( $type ) ) {
			$conflictingKey = $this->getZObjectTypeFromKey( $type );
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_CONFLICTING_TYPE_ZIDS,
					[
						'zid' => $key,
						'name' => $type,
						'existing' => $conflictingKey
					]
				)
			);
		}

		if (
			$this->isZTypeBuiltIn( $key )
			&& !class_exists( 'MediaWiki\Extension\WikiLambda\ZObjects\\' . self::BUILT_IN_TYPES[ $key ] )
		) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_CONFLICTING_TYPE_ZIDS,
					[
						'zid' => $key,
						'name' => $type
					]
				)
			);
		}

		$this->registry[ $key ] = $type;
	}

	/**
	 * Removes the given ZType from the type cache, except for builtin types.
	 *
	 * @param string $key
	 */
	public function unregister( string $key ): void {
		if ( !array_key_exists( $key, self::BUILT_IN_TYPES ) ) {
			unset( $this->registry[ $key ] );
		}
	}

	/**
	 * Get the array of the keys of the ZTypes stored in the cache
	 *
	 * @return string[] Keys of the ZTypes stored in the cache
	 */
	public function getCachedZObjectKeys(): array {
		return array_keys( $this->registry );
	}

	/**
	 * Whether the provided ZType is 'built-in' to the WikiLambda extension, and thus its validator
	 * is provided in PHP code.
	 *
	 * @param string $key The key of the ZType to check.
	 * @return bool
	 */
	public function isZTypeBuiltIn( string $key ): bool {
		return array_key_exists( $key, self::BUILT_IN_TYPES );
	}

	/**
	 * Whether the provided ZFunction is 'built-in' to the WikiLambda extension, and thus its validator
	 * is provided in PHP code.
	 *
	 * @param string $key The key of the ZFunction to check.
	 * @return bool
	 */
	public function isZFunctionBuiltIn( string $key ): bool {
		return array_key_exists( $key, self::BUILT_IN_TYPE_FUNCTIONS );
	}

	/**
	 * Returns the class name given a built-in function Zid
	 *
	 * @param string $zid The zid of the built-in ZFunction
	 * @return ?string Class name for the built-in, or null if not known
	 */
	public function getZFunctionBuiltInName( string $zid ): ?string {
		return self::BUILT_IN_TYPE_FUNCTIONS[ $zid ] ?? null;
	}

	/**
	 * Whether the provided ZType is cached.
	 *
	 * @param string $key The key of the ZType to check
	 * @return bool
	 */
	public function isZObjectKeyCached( string $key ): bool {
		return in_array( $key, $this->getCachedZObjectKeys(), true );
	}

	/**
	 * Whether the provided ZType is known, either because it's a registered type
	 * or because it's persisted in the database. If the type is not yet cached but
	 * it's a valid type, it registers it.
	 *
	 * @param string $key The key of the ZType to check
	 * @return bool
	 */
	public function isZObjectKeyKnown( string $key ): bool {
		if ( $this->isZObjectKeyCached( $key ) ) {
			return true;
		}

		$title = Title::newFromText( $key, NS_MAIN );

		// TODO (T300530): This is quite expensive. Store this in a metadata DB table, instead of fetching it live?
		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$content = $zObjectStore->fetchZObjectByTitle( $title );

		if ( $content === false ) {
			return false;
		}

		// (T374241, T375065) Check that the object is a type without running validation
		// to avoid going into an infinite loop:
		$zObject = $content->getObject();
		$innerType = $zObject->{ self::Z_PERSISTENTOBJECT_VALUE }->{ self::Z_OBJECT_TYPE };
		if ( $innerType !== self::Z_TYPE ) {
			return false;
		}

		// We just need to store the index in the registry for newly fetched objects
		$this->register( $key, $key );

		return true;
	}

	/**
	 * Returns the ZType class name given its ZID
	 *
	 * @param string $key The key of the ZType to check
	 * @return string Class name for the ZType
	 * @throws ZErrorException
	 */
	public function getZObjectTypeFromKey( string $key ): string {
		if ( !$this->isZObjectKeyKnown( $key ) ) {
			// Error Z504: Zid not found
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND,
					[ 'data' => $key ]
				)
			);
		}
		return $this->registry[ $key ];
	}

	/**
	 * Returns the array of names of the cached ZTypes.
	 *
	 * @return string[] Array of cached ZTypes
	 */
	public function getCachedZObjectTypes(): array {
		return array_values( $this->registry );
	}

	/**
	 * Whether the given ZType is saved in the cache.
	 *
	 * @param string $type Name of the ZType
	 * @return bool
	 */
	public function isZObjectTypeCached( string $type ): bool {
		return in_array( $type, $this->getCachedZObjectTypes(), true );
	}

	/**
	 * Whether the given ZType is known, either because it's saved in the cache or because
	 * it is persisted in the database.
	 *
	 * @param string $type Name of the ZType
	 * @return bool
	 */
	public function isZObjectTypeKnown( string $type ): bool {
		if ( $this->isZObjectTypeCached( $type ) ) {
			return true;
		}

		// TODO (T300530): The registry is just a cache; also walk the DB to find if this type is registered.
		return false;
	}

	/**
	 * Returns the ZType id of a given type.
	 *
	 * @param string $type Name of the ZType
	 * @return string ZID of the ZType
	 * @throws ZErrorException
	 */
	public function getZObjectKeyFromType( string $type ): string {
		if ( !$this->isZObjectTypeKnown( $type ) ) {
			// Error Z543: ZType not found
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_ZTYPE_NOT_FOUND,
					[ 'type' => $type ]
				)
			);
		}
		return array_search( $type, $this->registry );
	}

	/**
	 * Checks if a given ZObject is an instance of a given type.
	 *
	 * @param ZObject $object
	 * @param string $type ZID of the type to test
	 * @return bool
	 * @throws ZErrorException
	 */
	public function isZObjectInstanceOfType( ZObject $object, string $type ): bool {
		if ( !$this->isZObjectKeyKnown( $type ) ) {
			// Error Z504: ZID not found
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND,
					[ 'data' => $type ]
				)
			);
		}

		if ( $type === self::Z_OBJECT || $type === $object->getZType() ) {
			return true;
		}

		if ( !( $object instanceof ZReference ) ) {
			return false;
		}

		if ( !ZObjectUtils::isValidZObjectReference( $object->getZValue() ) ) {
			return false;
		}

		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$objectTitle = Title::newFromText( $object->getZValue(), NS_MAIN );
		$fetchedObject = $zObjectStore->fetchZObjectByTitle( $objectTitle );

		return $fetchedObject && $type === $fetchedObject->getZType();
	}
}
