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
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

class ZObject {

	/** @var array */
	protected $data = [];

	/** @var array */
	protected $linkedZObjects = [];

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

	/**
	 * @return string[] An array of other ZObjects to which this ZObject links
	 * for injection into the MediaWiki system as if they were wiki links.
	 */
	public function getLinkedZObjects(): array {
		foreach ( array_values( $this->data ) as $value ) {
			self::extractLinkedZObjects( $value, $this );
		}
		return array_keys( $this->linkedZObjects );
	}

	/**
	 * @param string $zReference for the linked ZObject
	 */
	public function addLinkedZObject( string $zReference ) {
		$this->linkedZObjects[ $zReference ] = 1;
	}

	/**
	 * Iterate through ZObject values to find reference links
	 * @param mixed $value value to check for reference links
	 * @param ZObject $zobject original ZObject to add links
	 */
	private static function extractLinkedZObjects( $value, $zobject ) {
		if ( is_array( $value ) ) {
			foreach ( array_values( $value ) as $arrayItem ) {
				self::extractLinkedZObjects( $arrayItem, $zobject );
			}
		} elseif ( is_object( $value ) ) {
			if ( $value instanceof ZReference ) {
				$zobject->addLinkedZObject( $value->getZValue() );
			} else {
				$objectVars = get_object_vars( $value );
				foreach ( array_values( $objectVars ) as $objectItem ) {
					self::extractLinkedZObjects( $objectItem, $zobject );
				}
			}
		} elseif ( is_string( $value ) ) {
			// TODO: Revisit this (probably not needed) when
			// ZReferences are preserved/created correctly
			if ( ZObjectUtils::isValidZObjectReference( $value ) ) {
				$zobject->addLinkedZObject( $value );
			}
		}
	}
}
