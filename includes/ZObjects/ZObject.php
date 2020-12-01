<?php
/**
 * WikiLambda generic ZObject class
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\ZTypeRegistry;

class ZObject {

	/** @var array */
	private $data = [];

	/**
	 * Provide this ZObject's schema.
	 *
	 * @return array It's complicated.
	 */
	public static function getDefinition() : array {
		return [
			'type' => 'ZObject',
			'keys' => [
				ZTypeRegistry::Z_OBJECT_TYPE => [
					'type' => ZTypeRegistry::HACK_REFERENCE_TYPE,
				],
			],
		];
	}

	public function __construct( $type ) {
		$this->data[ ZTypeRegistry::Z_OBJECT_TYPE ] = ZTypeRegistry::singleton()->getZObjectTypeFromKey( $type );
	}

	public static function create( array $objectVars ) : ZObject {
		if ( count( $objectVars ) !== 1 ) {
			throw new \InvalidArgumentException(
				"ZObject generic object with extra keys: " . implode( ', ', array_keys( $objectVars ) ) . "."
			);
		}
		return new ZObject( $objectVars[ ZTypeRegistry::Z_OBJECT_TYPE ] );
	}

	/**
	 * @return string The type of this ZObject
	 */
	public function getZType() : string {
		return static::getDefinition()['type'];
	}

	/**
	 * @return mixed The generic content of this ZObject; most ZObject types will implement specific
	 *   accessors specific to that type.
	 */
	public function getZValue() {
		return $this->data;
	}

	/**
	 * Validate this ZObject against our schema, to prevent creation and saving of invalid items.
	 *
	 * @return bool Whether content is valid
	 */
	public function isValid() : bool {
		// TODO: Right now these are uneditable and guaranteed valid on creation, but when we
		// add model (API and UX) editing, this will need to actually evaluate.
		return true;
	}
}
