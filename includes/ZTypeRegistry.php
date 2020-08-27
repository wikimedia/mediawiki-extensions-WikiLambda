<?php
/**
 * WikiLambda ZTypeRegistry
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use InvalidArgumentException;
use Title;

/**
 * A registry service for ZObject implementations.
 */
class ZTypeRegistry {

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

	public const Z_RECORD = 'Z5';
	public const Z_RECORD_VALUE = 'Z5K1';

	public const Z_STRING = 'Z6';
	public const Z_STRING_VALUE = 'Z6K1';

	public const Z_LIST = 'Z10';
	public const Z_LIST_HEAD = 'Z10K1';
	public const Z_LIST_TAIL = 'Z10K2';

	public const Z_MONOLINGUALSTRING = 'Z11';
	public const Z_MONOLINGUALSTRING_LANGUAGE = 'Z11K1';
	public const Z_MONOLINGUALSTRING_VALUE = 'Z11K2';

	public const Z_MULTILINGUALSTRING = 'Z12';
	public const Z_MULTILINGUALSTRING_VALUE = 'Z12K1';

	/**
	 * @return ZTypeRegistry
	 */
	public static function singleton() {
		static $instance = null;
		if ( $instance === null ) {
			$instance = new self();
		}

		return $instance;
	}

	private function __construct() {
		// TODO: The built-in objects should register themselves, except (?) Z1.
		$this->internalRegisterType( self::Z_OBJECT, 'ZObject' );
		$this->internalRegisterType( self::Z_PERSISTENTOBJECT, 'ZPersistentObject' );
		$this->internalRegisterType( self::Z_KEY, 'ZKey' );
		$this->internalRegisterType( self::Z_TYPE, 'ZType' );
		$this->internalRegisterType( self::Z_STRING, 'ZString' );
		$this->internalRegisterType( self::Z_LIST, 'ZList' );

		$this->internalRegisterType( self::Z_RECORD, 'ZRecord' );

		$this->internalRegisterType( self::Z_MONOLINGUALSTRING, 'ZMonoLingualString' );
		$this->internalRegisterType( self::Z_MULTILINGUALSTRING, 'ZMultiLingualString' );
	}

	/**
	 * @var array
	 */
	private $zObjectTypes = [];

	/**
	 * @return string[]
	 */
	public function getCachedZObjectKeys() : array {
		return array_keys( $this->zObjectTypes );
	}

	public function isZObjectKeyCached( string $key ) : bool {
		return in_array( $key, $this->getCachedZObjectKeys(), true );
	}

	public function isZObjectKeyKnown( string $key ) : bool {
		if ( $this->isZObjectKeyCached( $key ) ) {
			return true;
		}

		$title = Title::newFromText( $key, NS_ZOBJECT );

		// TODO: This is quite exceptionally expensive. Store this in a metadata DB table, instead of fetching it live?
		$zObject = ZPersistentObject::getObjectFromDB( $title );

		if ( $zObject === false ) {
			return false;
		}

		if ( $zObject->getZType() !== 'ZType' ) {
			throw new InvalidArgumentException( "ZObject for '$key' is not a ZType object." );
		}

		// TODO: Do we want to always store English? Or the wiki's contentLanguage? Or something else?
		$this->internalRegisterType( $key, $zObject->getLabel( new \LanguageEn() ) );

		return true;
	}

	public function getZObjectTypeFromKey( string $key ) : string {
		if ( !$this->isZObjectKeyKnown( $key ) ) {
			throw new InvalidArgumentException( "ZObject key '$key' is not registered." );
		}
		return $this->zObjectTypes[ $key ];
	}

	/**
	 * @return string[]
	 */
	public function getCachedZObjectTypes() : array {
		return array_values( $this->zObjectTypes );
	}

	public function isZObjectTypeCached( string $type ) : bool {
		// TODO: The registry is just a cache; also check the DB given the key.
		return in_array( $type, $this->getCachedZObjectTypes(), true );
	}

	public function isZObjectTypeKnown( string $type ) : bool {
		if ( $this->isZObjectTypeCached( $type ) ) {
			return true;
		}

		// TODO: Walk the DB to find if this type is registered.
		return false;
	}

	public function getZObjectKeyFromType( string $type ) : string {
		if ( !$this->isZObjectTypeKnown( $type ) ) {
			throw new InvalidArgumentException( "ZObject type '$type' is not registered." );
		}
		return array_search( $type, $this->zObjectTypes );
	}

	public function registerType( string $type ) : string {
		$newKey = 'Z' . ( intval( substr( array_key_last( $this->zObjectTypes ), 1 ) ) + 1 );
		$this->internalRegisterType( $newKey, $type );
		return $newKey;
	}

	private function internalRegisterType( string $key, string $type ) : void {
		if ( $this->isZObjectKeyCached( $key ) ) {
			$conflictingType = $this->getZObjectKeyFromType( $key );
			throw new InvalidArgumentException( "ZObject key '$key' already used to register as '$conflictingType'." );
		}

		if ( $this->isZObjectTypeCached( $type ) ) {
			$conflictingKey = $this->getZObjectTypeFromKey( $type );
			throw new InvalidArgumentException( "ZObject type '$type' already registered as '$conflictingKey'." );
		}

		if (
			$type !== 'ZObject'
			&& !class_exists( 'MediaWiki\Extension\WikiLambda\\' . $type )
		) {
			// TODO: Decide what we want to do here; do we need to re-model each of the built-in types (ZList, ZString,…) as ZType implementations on-wiki?
			// throw new InvalidArgumentException( "ZObject type '$type' not a known class." );
		}

		$this->zObjectTypes[ $key ] = $type;
	}

}
