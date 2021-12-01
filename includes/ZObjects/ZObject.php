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

use FormatJson;
use Language;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use RequestContext;

class ZObject {

	public const FORM_CANONICAL = 1;
	public const FORM_NORMAL = 2;

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
			// FIXME: why is this not being done by the constructor or by ZObjectFactory?
			return ZObjectFactory::createChild( $value );
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
		// A generic ZObject just needs a type key (Z1K1) to be present and valid.
		if ( !isset( $this->data[ ZTypeRegistry::Z_OBJECT_TYPE ] ) ) {
			return false;
		}
		// TODO: (T296822) Z1K1 can currently take a Z9 to a valid type, but we should
		// also contemplate validity of this value to be a literal Z4 or a function call.
		return ZObjectUtils::isValidZObjectReference( $this->data[ ZTypeRegistry::Z_OBJECT_TYPE ] );
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

	/**
	 * Over-ride the default __toString() method to serialise ZObjects into a JSON representation.
	 *
	 * @return string
	 */
	public function __toString() {
		return FormatJson::encode( $this->getSerialized( self::FORM_CANONICAL ), true, FormatJson::UTF8_OK );
	}

	/**
	 * Convert this ZObject into its serialized canonical representation
	 *
	 * @param int $form
	 * @return \stdClass|array|string
	 */
	public function getSerialized( $form = self::FORM_CANONICAL ) {
		$serialized = [
			// TODO (T296737) Z_OBJECT_TYPE in different forms, it's only being serialized as canonical
			ZTypeRegistry::Z_OBJECT_TYPE => $this->getZType()
		];

		foreach ( $this->data as $key => $value ) {
			if ( $key == ZTypeRegistry::Z_OBJECT_TYPE ) { continue;
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
		// FIXME: currently fetchBatchZObjects doesn't fetch them in batch, must fix or reconsider
		$zids = ZObjectUtils::getRequiredZids( $serialized );
		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$contents = $zObjectStore->fetchBatchZObjects( $zids );

		if ( $language === null ) {
			$language = RequestContext::getMain()->getLanguage();
		}

		return ZObjectUtils::extractHumanReadableZObject( $serialized, $contents, $language );
	}

}
