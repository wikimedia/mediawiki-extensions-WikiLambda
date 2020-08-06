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
use MediaWiki\MediaWikiServices;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Revision\RevisionStore;
use MediaWiki\Revision\SlotRecord;
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

	/** @var RevisionStore */
	private $revisionStore;

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
		$this->revisionStore = MediaWikiServices::getInstance()->getRevisionStore();

		// TODO: The built-in objects should register themselves, except (?) Z1.
		$this->internalRegisterType( self::Z_OBJECT, 'ZObject' );
		$this->internalRegisterType( self::Z_PERSISTENTOBJECT, 'ZPersistentObject' );
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
		if ( !$title->isKnown() ) {
			return false;
		}

		$revision = $this->revisionStore->getRevisionById( $title->getLatestRevID() );

		if ( !$revision ) {
			return false;
		}

		// TODO: This is quite exceptionally expensive. Store this in a metadata DB table, instead of fetching it live?
		// NOTE: Hard-coding use of MAIN slot; if we're going the MCR route, we may wish to change this (or not).
		$text = $revision->getSlot( SlotRecord::MAIN, RevisionRecord::RAW )->getContent()->getNativeData();
		$zObject = ZObjectFactory::createFromSerialisedString( $text );

		$pageType = $zObject->getZType();
		$this->internalRegisterType( $key, $pageType );
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
		if ( $this->isZObjectKeyCached( $type ) ) {
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
			throw new InvalidArgumentException( "ZObject type '$type' not a known class." );
		}

		$this->zObjectTypes[ $key ] = $type;
	}

}
