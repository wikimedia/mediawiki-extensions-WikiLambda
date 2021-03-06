<?php
/**
 * WikiLambda ZTypeRegistry
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use Title;

/**
 * A registry service for ZObject implementations.
 */
class ZTypeRegistry extends ZObjectRegistry {

	// Is there a better way to represent this direct string (as opposed to a ZString?)
	public const BUILTIN_STRING = 'String';
	// Is there a better way to represent this direct array (as opposed to a ZList?)
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
	public const HACK_ARRAY_Z_MONOLINGUALSTRING = 'Array(ZMonoLingualString)';

	public const Z_NULL_REFERENCE = 'Z0';

	public const Z_OBJECT = 'Z1';
	public const Z_OBJECT_TYPE = 'Z1K1';

	public const Z_PERSISTENTOBJECT = 'Z2';
	public const Z_PERSISTENTOBJECT_ID = 'Z2K1';
	public const Z_PERSISTENTOBJECT_VALUE = 'Z2K2';
	public const Z_PERSISTENTOBJECT_LABEL = 'Z2K3';

	public const Z_KEY = 'Z3';
	public const Z_KEY_TYPE = 'Z3K1';
	public const Z_KEY_ID = 'Z3K2';
	public const Z_KEY_LABEL = 'Z3K3';

	public const Z_TYPE = 'Z4';
	public const Z_TYPE_IDENTITY = 'Z4K1';
	public const Z_TYPE_KEYS = 'Z4K2';
	public const Z_TYPE_VALIDATOR = 'Z4K3';

	public const Z_ERROR = 'Z5';
	public const Z_ERROR_TYPE = 'Z5K1';
	public const Z_ERROR_VALUE = 'Z5K2';

	public const Z_STRING = 'Z6';
	public const Z_STRING_VALUE = 'Z6K1';

	public const Z_REFERENCE = 'Z9';
	public const Z_REFERENCE_VALUE = 'Z9K1';

	public const Z_LIST = 'Z10';
	public const Z_LIST_HEAD = 'Z10K1';
	public const Z_LIST_TAIL = 'Z10K2';

	public const Z_MONOLINGUALSTRING = 'Z11';
	public const Z_MONOLINGUALSTRING_LANGUAGE = 'Z11K1';
	public const Z_MONOLINGUALSTRING_VALUE = 'Z11K2';

	public const Z_MULTILINGUALSTRING = 'Z12';
	public const Z_MULTILINGUALSTRING_VALUE = 'Z12K1';

	public const Z_LANGUAGE = 'Z60';
	public const Z_LANGUAGE_CODE = 'Z60K1';

	private const BUILT_IN_TYPES = [
		self::Z_OBJECT => 'ZObject',
		self::Z_PERSISTENTOBJECT => 'ZPersistentObject',
		self::Z_KEY => 'ZKey',
		self::Z_ERROR => 'ZError',
		self::Z_TYPE => 'ZType',
		self::Z_STRING => 'ZString',
		self::Z_REFERENCE => 'ZReference',
		self::Z_LIST => 'ZList',
		self::Z_MONOLINGUALSTRING => 'ZMonoLingualString',
		self::Z_MULTILINGUALSTRING => 'ZMultiLingualString',
	];

	// These consts are currently only used by ZObjectStore to prohibit creation, and are not (yet) built-in.
	public const Z_CODE = 'Z16';
	public const Z_ARGUMENTDECLARATION = 'Z17';
	public const Z_ARGUMENTREFERENCE = 'Z18';
	public const Z_NULL = 'Z23';
	public const Z_KEYREFERENCE = 'Z39';
	public const Z_BOOLEAN = 'Z40';
	public const Z_ERRORTYPE = 'Z50';

	public const IGNORE_KEY_NORMALIZATION = [
		self::Z_OBJECT_TYPE,
		self::Z_MONOLINGUALSTRING_LANGUAGE,
		self::Z_MONOLINGUALSTRING_VALUE,
		self::Z_MULTILINGUALSTRING_VALUE
	];

	/**
	 * Initialize ZTypeRegistry
	 */
	protected function initialize() : void {
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
	public function register( string $key, string $type ) : void {
		if ( $this->isZObjectKeyCached( $key ) ) {
			$conflictingType = $this->getZObjectKeyFromType( $key );
			throw new ZErrorException(
				new ZError(
					ZErrorTypeRegistry::Z_ERROR_CONFLICTING_TYPE_NAMES,
					new ZString( "ZObject key '$key' already used to register as '$conflictingType'." )
				)
			);
		}

		if ( $this->isZObjectTypeCached( $type ) ) {
			$conflictingKey = $this->getZObjectTypeFromKey( $type );
			throw new ZErrorException(
				new ZError(
					ZErrorTypeRegistry::Z_ERROR_CONFLICTING_TYPE_ZIDS,
					new ZString( "ZObject type '$type' already registered as '$conflictingKey'." )
				)
			);
		}

		if (
			$this->isZTypeBuiltIn( $key )
			&& !class_exists( 'MediaWiki\Extension\WikiLambda\ZObjects\\' . self::BUILT_IN_TYPES[ $key ] )
		) {
			throw new ZErrorException(
				new ZError(
					ZErrorTypeRegistry::Z_ERROR_BUILTIN_TYPE_NOT_FOUND,
					new ZString( "ZObject type '$key' is built-in, but class '$type' is not found." )
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
	public function unregister( string $key ) : void {
		if ( !array_key_exists( $key, self::BUILT_IN_TYPES ) ) {
			unset( $this->registry[ $key ] );
		}
	}

	/**
	 * Get the array of the keys of the ZTypes stored in the cache
	 *
	 * @return string[] Keys of the ZTypes stored in the cache
	 */
	public function getCachedZObjectKeys() : array {
		return array_keys( $this->registry );
	}

	/**
	 * Whether the provided ZType is 'built-in' to the WikiLambda extension, and thus its validator
	 * is provided in PHP code.
	 *
	 * @param string $key The key of the ZType to check.
	 * @return bool
	 */
	public function isZTypeBuiltIn( string $key ) : bool {
		return array_key_exists( $key, self::BUILT_IN_TYPES );
	}

	/**
	 * Whether the provided ZType is cached.
	 *
	 * @param string $key The key of the ZType to check
	 * @return bool
	 */
	public function isZObjectKeyCached( string $key ) : bool {
		return in_array( $key, $this->getCachedZObjectKeys(), true );
	}

	/**
	 * Whether the provided ZType is known, either because it's a registered type
	 * or because it's persisted in the database. If the type is not yet cached but
	 * it's a valid type, it registers it.
	 *
	 * @param string $key The key of the ZType to check
	 * @return bool
	 * @throws ZErrorException
	 */
	public function isZObjectKeyKnown( string $key ) : bool {
		if ( $this->isZObjectKeyCached( $key ) ) {
			return true;
		}

		$title = Title::newFromText( $key, NS_ZOBJECT );

		// TODO: This is quite expensive. Store this in a metadata DB table, instead of fetching it live?
		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$zObject = $zObjectStore->fetchZObjectByTitle( $title );

		if ( $zObject === false ) {
			return false;
		}

		if ( $zObject->getZType() !== self::Z_TYPE ) {
			// Error Z542: unexpected zobject type
			throw new ZErrorException(
				new ZError(
					ZErrorTypeRegistry::Z_ERROR_UNEXPECTED_ZTYPE,
					new ZString( "ZObject for '$key' is not a ZType object." )
				)
			);
		}

		// TODO: Do we want to always store English? Or the wiki's contentLanguage? Or something else?
		$this->register( $key, $zObject->getLabels()->getStringForLanguageCode( 'en' ) );

		return true;
	}

	/**
	 * Returns the ZType class name given its ZID
	 *
	 * @param string $key The key of the ZType to check
	 * @return string Class name for the ZType
	 * @throws ZErrorException
	 */
	public function getZObjectTypeFromKey( string $key ) : string {
		if ( !$this->isZObjectKeyKnown( $key ) ) {
			// Error Z504: Zid not found
			throw new ZErrorException(
				new ZError(
					ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND,
					new ZString( "ZObject key '$key' is not registered." )
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
	public function getCachedZObjectTypes() : array {
		return array_values( $this->registry );
	}

	/**
	 * Whether the given ZType is saved in the cache.
	 *
	 * @param string $type Name of the ZType
	 * @return bool
	 */
	public function isZObjectTypeCached( string $type ) : bool {
		// TODO: The registry is just a cache; also check the DB given the key.
		return in_array( $type, $this->getCachedZObjectTypes(), true );
	}

	/**
	 * Whether the given ZType is known, either because it's saved in the cache or because
	 * it is persisted in the database.
	 *
	 * @param string $type Name of the ZType
	 * @return bool
	 */
	public function isZObjectTypeKnown( string $type ) : bool {
		if ( $this->isZObjectTypeCached( $type ) ) {
			return true;
		}

		// TODO: Walk the DB to find if this type is registered.
		return false;
	}

	/**
	 * Returns the ZType id of a given type.
	 *
	 * @param string $type Name of the ZType
	 * @return string ZID of the ZType
	 * @throws ZErrorException
	 */
	public function getZObjectKeyFromType( string $type ) : string {
		if ( !$this->isZObjectTypeKnown( $type ) ) {
			// Error Z543: ZType not found
			throw new ZErrorException(
				new ZError(
					ZErrorTypeRegistry::Z_ERROR_ZTYPE_NOT_FOUND,
					new ZString( "ZObject type '$type' is not registered." )
				)
			);
		}
		return array_search( $type, $this->registry );
	}

}
