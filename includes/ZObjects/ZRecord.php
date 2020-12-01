<?php
/**
 * WikiLambda ZRecord
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZTypeRegistry;

class ZRecord implements ZObject {

	/** @var array */
	private $data = [];

	public static function getDefinition() : array {
		return [
			'keys' => [
				ZTypeRegistry::Z_OBJECT_TYPE => [
					'type' => ZTypeRegistry::Z_PERSISTENTOBJECT_ID,
				],
				ZTypeRegistry::Z_RECORD_VALUE => [
					'type' => ZTypeRegistry::Z_OBJECT,
				],
			],
		];
	}

	public function __construct( $type, $value ) {
		// HACK: This will go away when we move this code into ZObject itself somehow (?)
		$this->data[ ZTypeRegistry::Z_OBJECT_TYPE ] = ZTypeRegistry::singleton()->getZObjectTypeFromKey( $type );
		$this->data[ ZTypeRegistry::Z_RECORD_VALUE ] = ZObjectFactory::create( $value );
	}

	public static function create( array $objectVars ) : ZObject {
		if ( !array_key_exists( ZTypeRegistry::Z_RECORD_VALUE, $objectVars ) ) {
			throw new \InvalidArgumentException( "ZObject record missing a generic value key." );
		}
		if ( count( $objectVars ) !== 2 ) {
			throw new \InvalidArgumentException(
				"ZObject generic record with extra keys: " . implode( ', ', array_keys( $objectVars ) ) . "."
			);
		}
		return new ZRecord( $objectVars[ ZTypeRegistry::Z_OBJECT_TYPE ], $objectVars[ ZTypeRegistry::Z_RECORD_VALUE ] );
	}

	public function getZType() : string {
		if ( !isset( $this->data[ ZTypeRegistry::Z_OBJECT_TYPE ] ) ) {
			$objectVars = get_object_vars( $this->data[ ZTypeRegistry::Z_RECORD_VALUE ] );
			if ( !array_key_exists( ZTypeRegistry::Z_OBJECT_TYPE, $objectVars ) ) {
				throw new \InvalidArgumentException( "ZObject top-level record missing a type key." );
			}
			$this->data[ ZTypeRegistry::Z_OBJECT_TYPE ] =
				ZTypeRegistry::singleton()->getZObjectTypeFromKey( $objectVars[ZTypeRegistry::Z_OBJECT_TYPE] );
		}

		return $this->data[ ZTypeRegistry::Z_OBJECT_TYPE ];
	}

	public function getZValue() {
		return $this->data[ ZTypeRegistry::Z_RECORD_VALUE ];
	}

	public function isValid() : bool {
		// TODO: Right now these are uneditable and guaranteed valid on creation, but when we
		// add model (API and UX) editing, this will need to actually evaluate.
		return true;
	}
}
