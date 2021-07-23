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
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZTypeRegistry;

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
			],
		];
	}

	/**
	 * Construct a new ZObject instance. This top-level class has a number of Type-specific sub-
	 * classes for built-in representations, and is mostly intended to represent instances of
	 * wiki-defined types.
	 *
	 * @param string $zid
	 * @param string|array|ZObject|\stdClass $value The item to turn into the internal ZObject
	 * @param array|ZObject $label The item to turn into this ZPersistentObject label
	 */
	public function __construct( $zid, $value, $label ) {
		$this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_ID ] = $zid;
		$this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ] = ZObjectFactory::create( $value );
		$this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL ] = ZObjectFactory::create( $label );
	}

	/**
	 * @return string The persisted (or null) ZID
	 */
	public function getZid() {
		return $this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_ID ];
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
	public function getLabels() {
		return $this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL ];
	}

	/**
	 * @return ZObject The inner ZObject wrapped by this ZPersistentObject
	 */
	public function getInnerZObject() {
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
	public function getLabel( $language ) {
		return $this->getLabels()->getStringForLanguage( $language );
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
