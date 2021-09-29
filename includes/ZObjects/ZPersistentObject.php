<?php
/**
 * WikiLambda generic ZPersistentObject class
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use Language;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

class ZPersistentObject extends ZObject {

	/** @var array */
	protected $data = [];

	/**
	 * Provide this ZObject's schema.
	 *
	 * @return array It's complicated.
	 */
	public static function getDefinition(): array {
		return [
			'type' => ZTypeRegistry::Z_PERSISTENTOBJECT,
			'keys' => [
				ZTypeRegistry::Z_PERSISTENTOBJECT_ID => [
					'type' => ZTypeRegistry::BUILTIN_REFERENCE_NULLABLE,
					'required' => true,
				],
				ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE => [
					'type' => ZTypeRegistry::Z_OBJECT,
					'required' => true,
				],
				ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL => [
					'type' => ZTypeRegistry::Z_MULTILINGUALSTRING,
					'required' => true,
				],
				ZTypeRegistry::Z_PERSISTENTOBJECT_ALIASES => [
					'type' => ZTypeRegistry::Z_MULTILINGUALSTRINGSET,
					'required' => false,
				],
			],
		];
	}

	/**
	 * Construct a new ZObject instance. This top-level class has a number of Type-specific sub-
	 * classes for built-in representations, and is mostly intended to represent instances of
	 * wiki-defined types.
	 *
	 * @param string|\stdClass $zid
	 * @param string|array|ZObject|\stdClass $value The item to turn into the internal ZObject
	 * @param array|ZObject $label The item to turn into this ZPersistentObject's label
	 * @param array|ZObject|null $aliases The item to turn into this ZPersistentObject's aliases
	 */
	public function __construct( $zid, $value, $label, $aliases = null ) {
		$aliases = $aliases ?? new ZMultiLingualStringSet( [] );
		$this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_ID  ] = $zid;
		$this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ] = $value;
		$this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL ] = $label;
		$this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_ALIASES ] = $aliases;
	}

	/**
	 * @return string The persisted (or null) ZID
	 */
	public function getZid(): string {
		return $this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_ID ]->getZValue();
	}

	/**
	 * @return string The type of the internal ZObject
	 */
	public function getInternalZType(): string {
		return $this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ]->getZType();
	}

	/**
	 * @return ZMultilingualString The mulilingual string object with the label
	 */
	public function getLabels(): ZMultilingualString {
		return $this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL ];
	}

	/**
	 * @return ZMultilingualStringSet The mulilingual stringset object with the aliases
	 */
	public function getAliases(): ZMultiLingualStringSet {
		return $this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_ALIASES ];
	}

	/**
	 * @return ZObject The inner ZObject wrapped by this ZPersistentObject
	 */
	public function getInnerZObject(): ZObject {
		return $this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ];
	}

	/**
	 * @return mixed The generic content of this ZObject; most ZObject types will implement specific
	 *   accessors specific to that type.
	 */
	public function getZValue() {
		return $this->getInnerZObject()->getZValue();
	}

	/**
	 * Fetch the label for a given Language (or its fallback).
	 *
	 * @param Language $language Language in which to provide the label.
	 * @return string
	 */
	public function getLabel( $language ): string {
		return $this->getLabels()->getStringForLanguage( $language );
	}

	/**
	 * Validate this ZObject against our schema, to prevent creation and saving of invalid items.
	 *
	 * @return bool Whether content is valid
	 */
	public function isValid(): bool {
		// FIXME: we acept ZStrings and ZReferences for now because functions-schemata/data files
		// are incorrect (Z2K1 contains reference instead of string)
		if (
			!( $this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_ID ] instanceof ZString ) &&
			!( $this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_ID ] instanceof ZReference )
		) {
			return false;
		}
		$zid = $this->getZid();
		if ( !ZObjectUtils::isValidOrNullZObjectReference( $zid ) ) {
			return false;
		}
		if ( !( $this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ] instanceof ZObject ) ) {
			return false;
		}
		if ( !( $this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL ] instanceof ZMultiLingualString ) ) {
			return false;
		}
		if ( !( $this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_ALIASES ] instanceof ZMultiLingualStringSet ) ) {
			return false;
		}
		return true;
	}
}
