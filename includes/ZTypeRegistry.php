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
		$this->internalRegisterType( 'Z1', 'ZObject' );
		$this->internalRegisterType( 'Z2', 'ZPersistentObject' );
		$this->internalRegisterType( 'Z3', 'ZString' );
		$this->internalRegisterType( 'Z4', 'ZList' );
		$this->internalRegisterType( 'Z5', 'ZRecord' );
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

		$pageType = $zObject->getType();
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
