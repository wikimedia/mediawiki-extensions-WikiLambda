<?php
/**
 * WikiLambda generic ZObject class
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Json\FormatJson;
use MediaWiki\Language\Language;

class ZObject {

	public const FORM_CANONICAL = 1;
	public const FORM_NORMAL = 2;

	/** @var ZReference|ZFunctionCall|null */
	protected $type = null;

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
			'type' => [
				'type' => ZTypeRegistry::Z_REFERENCE,
				'value' => ZTypeRegistry::Z_OBJECT,
			],
			'keys' => [
				ZTypeRegistry::Z_OBJECT_TYPE => [
					'type' => ZTypeRegistry::HACK_REFERENCE_TYPE,
				],
			],
			'additionalKeys' => true
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
	 * @param ZObject $type ZReference or ZFunctionCall that resolves to the type of this ZObject
	 * @param array|null $extraArgs
	 */
	public function __construct( $type, $extraArgs = null ) {
		if ( $extraArgs === null ) {
			$this->data[ ZTypeRegistry::Z_OBJECT_TYPE ] = $type;
		} else {
			$this->data = [ ZTypeRegistry::Z_OBJECT_TYPE => $type ] + $extraArgs;
		}
	}

	/**
	 * Validate this ZObject against our schema, to prevent creation and saving of invalid items.
	 *
	 * @return bool Whether content is valid
	 */
	public function isValid(): bool {
		// A generic ZObject just needs a type key (Z1K1) to be present and valid.
		if ( !isset( $this->data[ ZTypeRegistry::Z_OBJECT_TYPE ] ) ) {
			return false;
		}

		// Validate if type is a Reference
		if ( self::isTypeReference() ) {
			return ZObjectUtils::isValidZObjectReference( $this->data[ ZTypeRegistry::Z_OBJECT_TYPE ]->getZValue() );
		}

		// Validate if type is a Function Call
		if ( self::isTypeFunctionCall() ) {
			$functionCallInner = $this->data[ ZTypeRegistry::Z_OBJECT_TYPE ];
			'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall $functionCallInner';
			if ( $functionCallInner->getReturnType() !== ZTypeRegistry::Z_TYPE ) {
				return false;
			}
			return ZObjectUtils::isValidZObjectReference( $functionCallInner->getZValue() );
		}

		// If type is neither reference or function call, not valid
		return false;
	}

	/**
	 * Fetch value of given key from the current ZObject.
	 *
	 * @param string $key The key to search for.
	 * @return ZObject|null The value of the supplied key as a ZObject, null if key is undefined.
	 */
	public function getValueByKey( string $key ) {
		return $this->data[ $key ] ?? null;
	}

	/**
	 * Set a value of given key in the current ZObject.
	 *
	 * @param string $key The key to set.
	 * @param ZObject $value The value to set.
	 */
	public function setValueByKey( string $key, ZObject $value ) {
		$this->data[ $key ] = $value;
	}

	/**
	 * Returns whether this ZObject is a builtin class.
	 *
	 * @return bool Whether this object is a built-in type or generic, or it's a direct instance of ZObject
	 */
	public function isBuiltin() {
		return ( get_class( $this ) !== self::class );
	}

	/**
	 * Returns whether the object type is a ZReference that points to a type
	 *
	 * @return bool Whether the object type is a reference to a type
	 */
	public function isTypeReference(): bool {
		$type = $this->isBuiltin()
			? $this->getDefinition()['type']['type']
			: $this->data[ ZTypeRegistry::Z_OBJECT_TYPE ]->getZType();
		return ( $type === ZTypeRegistry::Z_REFERENCE );
	}

	/**
	 * Returns whether the object type is a ZFunctionCall that resolves to a type
	 *
	 * @return bool Whether the object type is a function call to a type
	 */
	public function isTypeFunctionCall(): bool {
		$type = $this->isBuiltin()
			? $this->getDefinition()['type']['type']
			: $this->data[ ZTypeRegistry::Z_OBJECT_TYPE ]->getZType();
		return ( $type === ZTypeRegistry::Z_FUNCTIONCALL );
	}

	/**
	 * Returns either the ZReference or the ZFunctionCall that contain the type of this ZObject (Z1K1)
	 *
	 * @return ZReference|ZFunctionCall The ZObject representing the type of this ZObject
	 */
	public function getZTypeObject() {
		if ( $this->isBuiltin() ) {
			return $this->type ?? new ZReference( $this->getDefinition()['type']['value'] );
		}
		return $this->data[ ZTypeRegistry::Z_OBJECT_TYPE ];
	}

	/**
	 * Returns a string with the Zid representing the type of this ZObject. If it has an anonymous type
	 * given by a ZFunctionCall, this method returns the Function Zid
	 *
	 * TODO (T301553): Return the output type of the Function instead of its identifier
	 *
	 * @return string The type of this ZObject
	 */
	public function getZType(): string {
		if ( $this->isBuiltin() ) {
			return $this->getDefinition()['type']['value'];
		}
		return $this->getZTypeObject()->getZValue();
	}

	/**
	 * Return the untyped content of this ZObject.
	 *
	 * @return mixed The basic content of this ZObject; most ZObject types will implement specific
	 * accessors specific to that type.
	 */
	public function getZValue() {
		return $this->data;
	}

	/**
	 * Return all ZObject Zids that are linked to the current ZObject.
	 *
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
	 * Register in the linkedZObjects array a reference to a Zid to which
	 * this ZObject is linked.
	 *
	 * @param string $zReference for the linked ZObject
	 */
	private function addLinkedZObject( string $zReference ) {
		$this->linkedZObjects[ $zReference ] = 1;
	}

	/**
	 * Iterate through ZObject values to find reference links and register them
	 * locally.
	 *
	 * @param ZObject $value value to check for reference links
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
			// TODO (T296925): Revisit this (probably not needed) when
			// ZReferences are preserved/created correctly
			if ( ZObjectUtils::isValidZObjectReference( $value ) ) {
				$zobject->addLinkedZObject( $value );
			}
		}
	}

	/**
	 * Convert this ZObject into its serialized canonical representation
	 *
	 * @param int $form
	 * @return \stdClass|array|string
	 */
	public function getSerialized( $form = self::FORM_CANONICAL ) {
		$serialized = [
			ZTypeRegistry::Z_OBJECT_TYPE => $this->getZTypeObject()->getSerialized( $form )
		];

		foreach ( $this->data as $key => $value ) {
			if ( $key === ZTypeRegistry::Z_OBJECT_TYPE ) {
				continue;
			}

			if ( is_string( $value ) ) {
				$serialized[ $key ] = $value;
				continue;
			}

			if ( is_array( $value ) ) {
				$serialized[ $key ] = array_map( static function ( $element ) use ( $form ) {
					return ( $element instanceof ZObject ) ? $element->getSerialized( $form ) : $element;
				}, $value );
				continue;
			}

			if ( $value instanceof ZObject ) {
				$serialized[ $key ] = $value->getSerialized( $form );
			}
		}
		return (object)$serialized;
	}

	/**
	 * Convert this ZObject into human readable object by translating all keys and
	 * references into the preferred language or its fallbacks
	 *
	 * @param Language|null $language
	 * @return \stdClass|array|string
	 */
	public function getHumanReadable( $language = null ) {
		$serialized = $this->getSerialized();

		// Walk the ZObject tree to get all ZIDs that need to be fetched from the database
		// TODO (T296741): currently fetchBatchZObjects doesn't fetch them in batch, must fix or reconsider
		$zids = ZObjectUtils::getRequiredZids( $serialized );
		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$contents = $zObjectStore->fetchBatchZObjects( $zids );

		if ( $language === null ) {
			$language = RequestContext::getMain()->getLanguage();
		}

		return ZObjectUtils::extractHumanReadableZObject( $serialized, $contents, $language );
	}

	/**
	 * Over-ride the default __toString() method to serialise ZObjects into a JSON representation.
	 *
	 * @return string
	 */
	public function __toString() {
		return FormatJson::encode( $this->getSerialized( self::FORM_CANONICAL ), true, FormatJson::UTF8_OK );
	}
}
