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

	/**
	 * Construct a new ZObject instance. This top-level class has a number of Type-specific sub-
	 * classes for built-in representations, and is mostly intended to represent instances of
	 * wiki-defined types.
	 *
	 * This constructor should only be called by ZObjectFactory (and test code), and not directly.
	 * Validation of inputs to this and all other ZObject constructors is left to ZObjectFactory.
	 *
	 * @param string $type ZReference for the specific ZType that is being instantiated (e.g. 'Z3').
	 */
	public function __construct( string $type ) {
		$this->data[ ZTypeRegistry::Z_OBJECT_TYPE ] = ZTypeRegistry::singleton()->getZObjectTypeFromKey( $type );
		// TODO: If this is a wiki-defined type, fetch the extra arguments passed and affix
		// them to the $data representation.
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
