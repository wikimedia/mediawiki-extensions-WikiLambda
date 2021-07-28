<?php
/**
 * WikiLambda generic ZObject class
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;

class ZObject {

	/** @var array */
	protected $data = [];

	/**
	 * Provide this ZObject's schema.
	 *
	 * @return array It's complicated.
	 */
	public static function getDefinition(): array {
		return [
			'type' => ZTypeRegistry::Z_OBJECT,
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
		// If this is a wiki-defined type, fetch the extra arguments passed and affix
		// them to the $data representation.
		$args = func_get_args();
		if ( count( $args ) === 1 ) {
			$this->data[ ZTypeRegistry::Z_OBJECT_TYPE ] = $type;
		} else {
			$this->data = [ ZTypeRegistry::Z_OBJECT_TYPE => $type ] + $args[ 1 ];
		}
	}

	/**
	 * Fetch value of given key from the current ZObject.
	 *
	 * @param string $keyQuery The key to search for.
	 * @return ZObject|null The value of the supplied key as a ZObject, null if key is undefined.
	 */
	public function getValueByKey( string $keyQuery ) {
		$keys = $this->data;
		if ( array_key_exists( $keyQuery, $keys ) ) {
			$value = $keys[ $keyQuery ];
			if ( $value instanceof ZObject ) {
				return $value;
			}
			return ZObjectFactory::create( $value );
		} else {
			return null;
		}
	}

	/**
	 * @return string The type of this ZObject
	 */
	public function getZType(): string {
		return $this->data[ ZTypeRegistry::Z_OBJECT_TYPE ] ?? static::getDefinition()['type'];
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
	public function isValid(): bool {
		// TODO: Right now these are uneditable and guaranteed valid on creation, but when we
		// add model (API and UX) editing, this will need to actually evaluate.
		return true;
	}
}
