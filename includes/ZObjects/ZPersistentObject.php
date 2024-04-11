<?php
/**
 * WikiLambda generic ZPersistentObject class
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
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
	 * Construct a ZPersistentObject instance
	 *
	 * @param ZObject $zid ZString representing the Zid that identifies this ZPersistentObject
	 * @param ZObject $value ZObject to be wrapped in this ZPersistentObject
	 * @param ZObject $label ZMultiLingualString that contains this ZPersistentObject's label
	 * @param ZObject|null $aliases ZMultiLingualStringSet with this ZPersistentObject's aliases or null
	 * @param ZObject|null $description ZMultiLingualString that contains this ZPersistentObject's description
	 */
	public function __construct( $zid, $value, $label, $aliases = null, $description = null ) {
		$aliases ??= new ZMultiLingualStringSet( [] );
		$this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_ID ] = $zid;
		$this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ] = $value;
		$this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL ] = $label;
		$this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_ALIASES ] = $aliases;
		$this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_DESCRIPTION ] = $description;
	}

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
		return [
			'type' => [
				'type' => ZTypeRegistry::Z_REFERENCE,
				'value' => ZTypeRegistry::Z_PERSISTENTOBJECT,
			],
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
				ZTypeRegistry::Z_PERSISTENTOBJECT_DESCRIPTION => [
					'type' => ZTypeRegistry::Z_MULTILINGUALSTRING,
					'required' => false,
				],
			],
		];
	}

	/**
	 * @inheritDoc
	 */
	public function isValid(): bool {
		// TODO (T296724): we accept ZStrings and ZReferences for now because functions-schemata/data
		// files are incorrect (Z2K1 contains reference instead of string)
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
		if ( ( $this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_DESCRIPTION ] !== null ) &&
			!( $this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_DESCRIPTION ] instanceof ZMultiLingualString ) ) {
			return false;
		}
		return true;
	}

	/**
	 * Get the generic content of the inner ZObject wrapped by this ZPersistentObject.
	 *
	 * @return mixed The generic content of the ZObject wrapped by this ZPersistentObject.
	 */
	public function getZValue() {
		return $this->getInnerZObject()->getZValue();
	}

	/**
	 * Get the Zid that identifies this ZPersistentObject.
	 *
	 * @return string The persisted (or null) ZID
	 */
	public function getZid(): string {
		return $this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_ID ]->getZValue();
	}

	/**
	 * Get the inner ZObject wrapped by this ZPersistentObject.
	 *
	 * @return ZObject The inner ZObject wrapped by this ZPersistentObject
	 */
	public function getInnerZObject(): ZObject {
		return $this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ];
	}

	/**
	 * Get the type Zid of the ZObject wrapped by this ZPersistentObject.
	 * TODO (T296822): The type can also be a function call.
	 *
	 * @return string The type of the internal ZObject
	 */
	public function getInternalZType(): string {
		return $this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ]->getZType();
	}

	/**
	 * Get the ZMultilingualString that contains the label of this ZPersistentObject.
	 *
	 * @return ZMultilingualString The mulilingual string object with the label
	 */
	public function getLabels(): ZMultilingualString {
		return $this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL ];
	}

	/**
	 * Get the label for a given Language (or its fallback).
	 *
	 * @param Language $language Language in which to provide the label.
	 * @param bool $defaultToEnglish
	 * @return ?string
	 */
	public function getLabel( $language, $defaultToEnglish = false ): ?string {
		if ( $defaultToEnglish ) {
			return $this->getLabels()
				->buildStringForLanguage( $language )
				->fallbackWithEnglish()
				->getString();
		}
		return $this->getLabels()->getStringForLanguage( $language );
	}

	/**
	 * Get the ZMultilingualStringSet that contains the aliases for this ZPersistentObject.
	 *
	 * @return ZMultilingualStringSet The mulilingual stringset object with the aliases
	 */
	public function getAliases(): ZMultiLingualStringSet {
		return $this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_ALIASES ];
	}

	/**
	 * Get the ZMultilingualString that contains the description of this ZPersistentObject.
	 *
	 * @return ?ZMultilingualString The mulilingual string object with the description
	 */
	public function getDescriptions(): ?ZMultilingualString {
		return $this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_DESCRIPTION ];
	}

	/**
	 * Get the description for a given Language (or its fallback).
	 *
	 * @param Language $language Language in which to provide the description.
	 * @param bool $defaultToEnglish
	 * @return ?string
	 */
	public function getDescription( $language, $defaultToEnglish = false ): ?string {
		if ( !$this->getDescriptions() ) {
			return null;
		}
		if ( $defaultToEnglish ) {
			return $this->getDescriptions()
				->buildStringForLanguage( $language )
				->fallbackWithEnglish()
				->getString();
		}
		return $this->getDescriptions()->getStringForLanguage( $language );
	}
}
