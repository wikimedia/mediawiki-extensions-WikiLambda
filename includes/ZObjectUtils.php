<?php
/**
 * WikiLambda ZObject utilities class
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use JsonException;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunction;
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZType;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;
use MediaWiki\Html\Html;
use MediaWiki\Language\Language;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Title\Title;
use Normalizer;
use stdClass;
use Transliterator;

class ZObjectUtils {
	/**
	 * Render a language 'Chip' of a language code with a hover-title of the language's label.
	 *
	 * TODO (T309039): use the actual Vue Chip component from Codex and ZID language object here instead
	 *
	 * @param string $code The BCP47 language code, e.g. 'fr' or 'en-US'.
	 * @param string $label The plain text label of the language, e.g. 'français' or 'American English'
	 * @param string $class The name of the class for the HTML element in which to wrap the label
	 * @return string The HTML of the element to be rendered
	 */
	public static function wrapBCP47CodeInFakeCodexChip(
		string $code,
		string $label,
		string $class
	) {
		$attributes = [
			'title' => $label,
			'class' => $class,
		];
		return Html::element(
			'span',
			$attributes,
			$code
		);
	}

	/**
	 * Get the CSS class name for the BCP47 code based on the type and language codes.
	 *
	 * @param string $type
	 * @param string $langCode
	 * @param string $userLangCode
	 * @return string
	 */
	public static function getBCP47ClassName( string $type, string $langCode, string $userLangCode ) {
		$baseClass = 'ext-wikilambda-editpage-header__bcp47-code';
		$modifierClass = $type === 'name'
			? 'ext-wikilambda-editpage-header__bcp47-code-name'
			: 'ext-wikilambda-editpage-header__bcp47-code-type';
		$className = $baseClass . ' ' . $modifierClass;
		if ( $langCode === $userLangCode ) {
			$className .= ' ext-wikilambda-editpage-header__bcp47-code--hidden';
		}
		return $className;
	}

	/**
	 * @param string $input
	 * @return bool
	 */
	public static function isValidSerialisedZObject( string $input ): bool {
		// ZObject := String | List | Record
		// String  := "Character*" // to be specific, as in JSON / ECMA-404
		// List    := [(ZObject(,ZObject)*)]
		// Record  := { "Z1K1": ZObject(, "Key": ZObject)* }
		// Key     := ZNumberKNumber | KNumber
		$status = true;

		// Encoded inputs which don't start with {, or [, are instead read as strings.
		if ( $input !== '' && ( $input[0] === '{' || $input[0] === '[' ) ) {
			try {
				$evaluatedInput = json_decode( $input, false, 512, JSON_THROW_ON_ERROR );
			} catch ( JsonException ) {
				return false;
			}

			try {
				$status = self::isValidZObject( $evaluatedInput );
			} catch ( ZErrorException ) {
				$status = false;
			}
		}

		return $status;
	}

	/**
	 * @param string|array|stdClass $input
	 * @return bool
	 * @throws ZErrorException
	 */
	public static function isValidZObject( $input ): bool {
		if ( is_string( $input ) ) {
			return true;
		}

		if ( is_array( $input ) ) {
			return self::isValidZObjectList( $input );
		}

		if ( is_object( $input ) ) {
			return self::isValidZObjectRecord( $input );
		}

		// Fall through: invalid format error
		throw new ZErrorException(
			ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_INVALID_FORMAT,
				[
					'data' => $input
				]
			)
		);
	}

	/**
	 * @param array $input
	 * @return bool
	 * @throws ZErrorException
	 */
	public static function isValidZObjectList( array $input ): bool {
		if ( !$input ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_UNDEFINED_LIST_TYPE,
					[
						'data' => $input
					]
				)
			);
		}

		$listType = array_shift( $input );

		if ( !self::isValidZObjectResolver( $listType ) ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_WRONG_LIST_TYPE,
					[
						'data' => $listType
					]
				)
			);
		}

		foreach ( $input as $index => $value ) {
			try {
				self::isValidZObject( $value );
			} catch ( ZErrorException $e ) {
				throw new ZErrorException(
					ZErrorFactory::createArrayElementZError( (string)$index, $e->getZError() )
				);
			}
		}
		return true;
	}

	/**
	 * @param mixed $input
	 * @return bool
	 * @throws ZErrorException
	 */
	public static function isValidZObjectResolver( $input ): bool {
		if ( is_string( $input ) ) {
			return self::isValidZObjectReference( $input );
		}

		if ( is_object( $input ) ) {
			try {
				self::isValidZObjectRecord( $input );
			} catch ( ZErrorException ) {
				return false;
			}
			$resolverType = $input->{ ZTypeRegistry::Z_OBJECT_TYPE };
			if ( ( $resolverType === ZTypeRegistry::Z_REFERENCE ) ||
				( $resolverType === ZTypeRegistry::Z_FUNCTIONCALL ) ||
				( $resolverType === ZTypeRegistry::Z_ARGUMENTREFERENCE ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * @param stdClass $input
	 * @return bool
	 * @throws ZErrorException
	 */
	public static function isValidZObjectRecord( stdClass $input ): bool {
		$objectVars = get_object_vars( $input );

		if ( !array_key_exists( ZTypeRegistry::Z_OBJECT_TYPE, $objectVars ) ) {
			// Each ZObject must define its type.
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_MISSING_TYPE,
					[
						'data' => $input
					]
				)
			);
		}

		foreach ( $input as $key => $value ) {
			// Check wellformedness of the key
			if ( !self::isValidZObjectKey( $key ) ) {
				throw new ZErrorException(
					ZErrorFactory::createZErrorInstance(
						ZErrorTypeRegistry::Z_ERROR_INVALID_KEY,
						[
							'dataPointer' => [ $key ]
						]
					)
				);
			}
			// Check general wellformedness of the value
			try {
				self::isValidZObject( $value );
			} catch ( ZErrorException $e ) {
				throw new ZErrorException( ZErrorFactory::createKeyValueZError( $key, $e->getZError() ) );
			}
		}
		return true;
	}

	/**
	 * Canonicalizes a ZObject.
	 *
	 * @param string|array|stdClass $input decoded JSON object for a valid ZObject
	 * @return string|array|stdClass canonical decoded JSON object of same ZObject
	 */
	public static function canonicalize( $input ) {
		if ( is_array( $input ) ) {
			return array_map( [ self::class, 'canonicalize' ], $input );
		}

		if ( is_object( $input ) ) {
			$outputObj = self::canonicalizeZRecord( $input );
			$output = get_object_vars( $outputObj );

			if ( array_key_exists( ZTypeRegistry::Z_OBJECT_TYPE, $output ) ) {
				$type = self::canonicalize( $output[ ZTypeRegistry::Z_OBJECT_TYPE ] );

				if ( is_string( $type ) ) {
					// Type is ZString
					if ( $type === ZTypeRegistry::Z_STRING
						&& array_key_exists( ZTypeRegistry::Z_STRING_VALUE, $output )
						&& !self::isValidZObjectReference( $output[ ZTypeRegistry::Z_STRING_VALUE ] ) ) {
						return self::canonicalize( $output[ ZTypeRegistry::Z_STRING_VALUE ] );
					}

					// Type is a ZReference
					if ( $type === ZTypeRegistry::Z_REFERENCE
						&& array_key_exists( ZTypeRegistry::Z_REFERENCE_VALUE, $output )
						&& self::isValidZObjectReference( $output[ ZTypeRegistry::Z_REFERENCE_VALUE ] ) ) {
						return self::canonicalize( $output[ ZTypeRegistry::Z_REFERENCE_VALUE ] );
					}
				}

				// Type is a Typed list
				if ( is_object( $type ) ) {
					$typeVars = get_object_vars( $type );
					if (
						array_key_exists( ZTypeRegistry::Z_OBJECT_TYPE, $typeVars )
						&& $typeVars[ ZTypeRegistry::Z_OBJECT_TYPE ] === ZTypeRegistry::Z_FUNCTIONCALL
						&& array_key_exists( ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION, $typeVars )
						&& $typeVars[ ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION ] === ZTypeRegistry::Z_FUNCTION_TYPED_LIST
					) {
						$itemType = $typeVars[ ZTypeRegistry::Z_FUNCTION_TYPED_LIST_TYPE ];
						$typedListArray = [ $itemType ];
						if ( array_key_exists( 'K1', $output ) ) {
							array_push( $typedListArray, $output['K1'], ...array_slice( $output['K2'], 1 ) );
						}
						return $typedListArray;
					}
				}
			}
			return $outputObj;
		}

		return $input;
	}

	/**
	 * Compares IDs of ZKeys in an order.
	 *
	 * First come global ZIDs, then local ones. The globals are sorted first
	 * numerically by the Z-Number, and then by the K-Number.
	 *
	 * @param string $left left key for comparision
	 * @param string $right right key for comparision
	 * @return int whether left is smaller (-1) than right or not (+1)
	 */
	public static function orderZKeyIDs( string $left, string $right ): int {
		if ( $left === $right ) {
			return 0;
		}
		if ( $left[0] === 'Z' && $right[0] === 'K' ) {
			return -1;
		}
		if ( $left[0] === 'K' && $right[0] === 'Z' ) {
			return 1;
		}
		$leftkpos = strpos( $left, 'K' );
		$rightkpos = strpos( $right, 'K' );
		if ( $leftkpos === 0 ) {
			$leftzid = 0;
		} else {
			$leftzid = intval( substr( $left, 1, $leftkpos - 1 ) );
		}
		if ( $rightkpos === 0 ) {
			$rightzid = 0;
		} else {
			$rightzid = intval( substr( $right, 1, $rightkpos - 1 ) );
		}
		if ( $leftzid < $rightzid ) {
			return -1;
		}
		if ( $leftzid > $rightzid ) {
			return 1;
		}
		$leftkid = intval( substr( $left, $leftkpos + 1 ) );
		$rightkid = intval( substr( $right, $rightkpos + 1 ) );
		if ( $leftkid < $rightkid ) {
			return -1;
		}
		return 1;
	}

	/**
	 * Canonicalizes a record-like ZObject.
	 *
	 * This trims and sorts the keys.
	 *
	 * @param stdClass $input The decoded JSON object of a well-formed ZObject
	 * @return stdClass Canonical decoded JSON object representing the same ZObject
	 */
	public static function canonicalizeZRecord( stdClass $input ): stdClass {
		$record = get_object_vars( $input );
		$record = array_combine( array_map( 'trim', array_keys( $record ) ), $record );

		$type = self::canonicalize( $record[ ZTypeRegistry::Z_OBJECT_TYPE ] ?? null );

		uksort( $record, [ self::class, 'orderZKeyIDs' ] );
		$record = array_map( [ self::class, 'canonicalize' ], $record );
		return (object)$record;
	}

	/**
	 * Normalise and down-cast a label for database comparison by normalising Unicode, lower-casing,
	 * and collapsing accents.
	 *
	 * TODO (T362250): To consider further changes; is this sufficient for all use cases and languages?
	 *
	 * @param string $input The input
	 * @return string
	 */
	public static function comparableString( string $input ): string {
		// First, lower-case the input (in a multi-byte-aware manner)
		$output = mb_strtolower( $input );

		// This Transliterator removes Latin accents but e.g. retains Han characters as-is.
		// Specifically, it does canonical decomposition (NFD); removes non-spacing marks like accents;
		// then recomposes, e.g. for Korean Hangul syllables.
		// TODO (T362250): Replace with a language-aware transliterator?
		$transliterator = Transliterator::create( 'NFD; [:Nonspacing Mark:] Remove; NFC;' );
		$output = $transliterator->transliterate( mb_strtolower( Normalizer::normalize( $output ) ) );

		return $output;
	}

	/**
	 * Filters ZObject to preferred language.
	 *
	 * Given a ZObject, reduces all its ZMultilingualStrings to
	 * only the preferred language or fallbacks.
	 *
	 * @param array|stdClass|string $input decoded JSON object for a ZObject
	 * @param string[] $languages array of language Zids
	 * @return string|array|stdClass same ZObject with only selected Monolingual
	 * string for each of its Multilingual strings
	 */
	public static function filterZMultilingualStringsToLanguage( $input, array $languages = [] ) {
		if ( is_string( $input ) ) {
			return $input;
		}

		if ( is_array( $input ) ) {
			return array_map( function ( $item ) use ( $languages ) {
				return self::filterZMultilingualStringsToLanguage( $item, $languages );
			}, $input );
		}

		// For each key of the input ZObject
		foreach ( $input as $index => $value ) {
			// Apply language filter to every item of the array or object
			$input->$index = self::filterZMultilingualStringsToLanguage( $value, $languages );

			// If the value is a string, and the type is ZMonolingualString,
			// select the preferred language out of the available ZMonolingualStrings
			if (
				is_string( $value ) &&
				$index === ZTypeRegistry::Z_OBJECT_TYPE &&
				$value === ZTypeRegistry::Z_MULTILINGUALSTRING
			) {
				$input->{ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE} = self::getPreferredMonolingualObject(
					$input->{ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE},
					$languages,
					ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE
				);
				break;
			}

			// If the value is a string, and the type is ZMonolingualStringSet,
			// select the preferred language out of the available ZMonolingualStringSets
			if (
				is_string( $value ) &&
				$index === ZTypeRegistry::Z_OBJECT_TYPE &&
				$value === ZTypeRegistry::Z_MULTILINGUALSTRINGSET
			) {
				$input->{ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE} = self::getPreferredMonolingualObject(
					$input->{ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE},
					$languages,
					ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE
				);
				break;
			}
		}
		return $input;
	}

	/**
	 * Filters Monolingual Strings and Stringsets to the preferred language.
	 *
	 * Returns the preferred Monolingual String/Stringset of a Multilingual
	 * String/Stringset given an array of preferred languages.
	 *
	 * @param array $multilingual decoded JSON for a Multilingual String/Stringset value
	 * @param string[] $languages array of language Zids
	 * @param string $key Identifies the key that contains the language in the monolingual object, Z11K1 or Z31K1
	 * @return array same Multilingual String/Stringset value with only one item of the preferred language
	 */
	private static function getPreferredMonolingualObject( array $multilingual, array $languages, string $key ): array {
		// Ignore first item in the canonical form array; this is a string representing the type
		$itemType = array_shift( $multilingual );

		$availableLangs = [];
		$selectedIndex = 0;

		if ( !$multilingual ) {
			return [ $itemType ];
		}

		foreach ( $multilingual as $value ) {
			$availableLangs[] = $value->{$key};
		}

		foreach ( $languages as $lang ) {
			$index = array_search( $lang, $availableLangs );
			if ( $index !== false ) {
				$selectedIndex = $index;
				break;
			}
		}

		return [ $itemType, $multilingual[ $selectedIndex ] ];
	}

	/**
	 * Asserts whether two types are equivalent
	 *
	 * @param stdClass|string $type1
	 * @param stdClass|string $type2
	 * @return bool
	 */
	public static function isTypeEqualTo( $type1, $type2 ) {
		// Not the same type
		if ( gettype( $type1 ) !== gettype( $type2 ) ) {
			return false;
		}

		// If they are both strings, return identity
		if ( is_string( $type1 ) ) {
			return $type1 === $type2;
		}

		// If they are both objects, compare their keys
		$typeArr1 = (array)$type1;
		$typeArr2 = (array)$type2;
		if ( count( $typeArr1 ) !== count( $typeArr2 ) ) {
			return false;
		}
		foreach ( $typeArr1 as $key => $value ) {
			if ( !array_key_exists( $key, $typeArr2 ) ) {
				return false;
			}
			if ( !self::isTypeEqualTo( $value, $typeArr2[ $key ] ) ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Is the input a ZObject reference key (e.g. Z1 or Z12345)?
	 *
	 * @param string $input
	 * @return bool
	 */
	public static function isValidZObjectReference( string $input ): bool {
		return preg_match( "/^Z[1-9]\d*$/", $input );
	}

	/**
	 * Is the input a null reference (Z0)?
	 *
	 * @param string $input
	 * @return bool
	 */
	public static function isNullReference( string $input ): bool {
		return ( $input === ZTypeRegistry::Z_NULL_REFERENCE );
	}

	/**
	 * Is the input a ZObject reference key (e.g. Z1 or Z12345)?
	 *
	 * @param string $input
	 * @return bool
	 */
	public static function isValidOrNullZObjectReference( string $input ): bool {
		return ( self::isValidZObjectReference( $input ) || self::isNullReference( $input ) );
	}

	/**
	 * Is the input a valid possible identifier across WMF projects?
	 *
	 * @param string $input
	 * @return bool
	 */
	public static function isValidId( string $input ): bool {
		return preg_match( "/^[A-Z][1-9]\d*$/", $input );
	}

	/**
	 * Is the input a ZObject reference key (e.g. Z1K1 or K12345)?
	 *
	 * @param string $input
	 * @return bool
	 */
	public static function isValidZObjectKey( string $input ): bool {
		return preg_match( "/^\s*(Z[1-9]\d*)?K\d+\s*$/", $input );
	}

	/**
	 * Is the input a global ZObject reference key (e.g. Z1K1)?
	 *
	 * @param string $input
	 * @return bool
	 */
	public static function isValidZObjectGlobalKey( string $input ): bool {
		return preg_match( "/^\s*Z[1-9]\d*K\d+\s*$/", $input );
	}

	/**
	 * Split out the ZObject reference from a given global reference key (e.g. 'Z1' from 'Z1K1').
	 *
	 * @param string $input
	 * @return string
	 */
	public static function getZObjectReferenceFromKey( string $input ): string {
		preg_match( "/^\s*(Z[1-9]\d*)?(K\d+)\s*$/", $input, $matches );
		return $matches[1] ?? '';
	}

	/**
	 * Given an array or a ZTypedList, returns an array that can be iterated over
	 *
	 * @param array|ZTypedList $list
	 * @return array
	 */
	public static function getIterativeList( $list ): array {
		if ( $list instanceof ZTypedList ) {
			return $list->getAsArray();
		}
		return $list;
	}

	/**
	 * @param string|array|\stdClass $zobject
	 * @return array
	 */
	public static function getRequiredZids( $zobject ): array {
		$zids = [];

		// If $zobject is a reference, add to the array
		if ( is_string( $zobject ) ) {
			if ( self::isValidZObjectReference( $zobject ) ) {
				$zids[] = $zobject;
			}
		}

		// If $zobject is an array, get required Zids from each element
		if ( is_array( $zobject ) ) {
			foreach ( $zobject as $item ) {
				$zids = array_merge( $zids, self::getRequiredZids( $item ) );
			}
		}

		// If $zobject is an object, get required Zids from keys and values
		if ( is_object( $zobject ) ) {
			foreach ( $zobject as $key => $value ) {
				// Add the reference part of the key. Do not add empty string if local key.
				$ref = self::getZObjectReferenceFromKey( $key );
				if ( $ref ) {
					$zids[] = $ref;
				}
				// Recursively add other references in the value
				$zids = array_merge( $zids, self::getRequiredZids( $value ) );
			}
		}

		return array_values( array_unique( $zids ) );
	}

	/**
	 * Returns the natural language label of a given Zid in the language
	 * passed as parameter or available fallback languages. If not available,
	 * returns the non-translated Zid.
	 *
	 * @param string $zid
	 * @param ZPersistentObject $zobject
	 * @param Language $lang
	 * @return string
	 */
	public static function getLabelOfReference( $zid, $zobject, $lang ): string {
		$labels = $zobject->getLabels();
		$label = $labels->buildStringForLanguage( $lang )->fallbackWithEnglish()->getString();

		if ( $label === null ) {
			return $zid;
		}

		return $label;
	}

	/**
	 * Returns the natural language label of a given type key, function argument or error key
	 * in the language passed as parameter or available fallback languages. If not available,
	 * returns the untranslated key Id.
	 *
	 * @param string $key
	 * @param ZPersistentObject $zobject
	 * @param Language $lang
	 * @return string
	 */
	public static function getLabelOfGlobalKey( $key, $zobject, $lang ): string {
		$ztype = $zobject->getInternalZType();

		if ( $ztype === ZTypeRegistry::Z_TYPE ) {
			return self::getLabelOfTypeKey( $key, $zobject, $lang );
		}

		if ( $ztype === ZTypeRegistry::Z_FUNCTION ) {
			return self::getLabelOfFunctionArgument( $key, $zobject, $lang );
		}

		if ( $ztype === ZTypeRegistry::Z_ERRORTYPE ) {
			return self::getLabelOfErrorTypeKey( $key, $zobject, $lang );
		}

		// Not a type nor an error type, return untranslated key Id
		return $key;
	}

	/**
	 * @param string $key
	 * @param \stdClass $zobject
	 * @param ZPersistentObject[] $data
	 * @param Language $lang
	 * @return string
	 */
	public static function getLabelOfLocalKey( $key, $zobject, $data, $lang ): string {
		$type = $zobject->{ ZTypeRegistry::Z_OBJECT_TYPE };

		// If type is a reference, desambiguate and find the key in its type definition
		if ( is_string( $type ) && ( array_key_exists( $type, $data ) ) ) {
			$globalKey = "$type$key";
			$translatedKey = self::getLabelOfGlobalKey( $globalKey, $data[ $type ], $lang );
			if ( $translatedKey !== $globalKey ) {
				return $translatedKey;
			}
		}

		// If type is a function call,
		if ( is_object( $type ) && property_exists( $type, ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION ) ) {
			$function = $type->{ ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION };

			// Builtin Z885: we can build the global keys with error type Zid
			if ( is_string( $function ) && ( $function === ZTypeRegistry::Z_FUNCTION_ERRORTYPE_TO_TYPE ) ) {
				$errorType = $type->{ ZTypeRegistry::Z_FUNCTION_ERRORTYPE_TYPE };
				if ( array_key_exists( $errorType, $data ) ) {
					$globalKey = "$errorType$key";
					$translatedKey = self::getLabelOfErrorTypeKey( $globalKey, $data[ $errorType ], $lang );
					if ( $translatedKey !== $globalKey ) {
						return $translatedKey;
					}
				}
			}

			// Builtin Z881: we don't need to translate keys
			// TODO (T301451): Non builtins, request function call execution from the orchestrator
		}

		return $key;
	}

	/**
	 * Returns the natural language label of a given ZKey in the language
	 * passed as parameter or available fallback languages. If not available,
	 * returns the non-translated ZKey.
	 *
	 * @param string $key
	 * @param ZPersistentObject $zobject
	 * @param Language $lang
	 * @return string
	 */
	public static function getLabelOfErrorTypeKey( $key, $zobject, $lang ): string {
		$keys = $zobject->getInnerZObject()->getValueByKey( ZTypeRegistry::Z_ERRORTYPE_KEYS );

		if ( !is_array( $keys ) && !( $keys instanceof ZTypedList ) ) {
			return $key;
		}

		foreach ( self::getIterativeList( $keys ) as $zkey ) {
			if ( $zkey->getKeyId() === $key ) {
				$labels = $zkey->getKeyLabel();

				if ( $labels === null ) {
					return $key;
				}

				$label = $labels->buildStringForLanguage( $lang )->fallbackWithEnglish()->getString();
				if ( $label === null ) {
					return $key;
				}

				return $label;
			}
		}

		// Key not found
		return $key;
	}

	/**
	 * Returns the natural language label of a given ZKey in the language
	 * passed as parameter or available fallback languages. If not available,
	 * returns the non-translated ZKey.
	 *
	 * @param string $key
	 * @param ZPersistentObject $zobject
	 * @param Language $lang
	 * @return string
	 */
	public static function getLabelOfTypeKey( $key, $zobject, $lang ): string {
		$ztype = $zobject->getInnerZObject();
		if ( !( $ztype instanceof ZType ) ) {
			return $key;
		}

		$zkey = $ztype->getZKey( $key );
		if ( $zkey === null ) {
			return $key;
		}

		$labels = $zkey->getKeyLabel();
		if ( $labels === null ) {
			return $key;
		}

		$label = $labels->buildStringForLanguage( $lang )->fallbackWithEnglish()->getString();
		if ( $label === null ) {
			return $key;
		}

		return $label;
	}

	/**
	 * Returns the natural language label of a given ZArgument in the language
	 * passed as parameter or available fallback languages. If not available,
	 * returns the non-translated ZKey.
	 *
	 *
	 * @param string $key
	 * @param ZPersistentObject $zobject
	 * @param Language $lang
	 * @return string
	 */
	public static function getLabelOfFunctionArgument( $key, $zobject, $lang ): string {
		$zfunction = $zobject->getInnerZObject();
		if ( !( $zfunction instanceof ZFunction ) ) {
			return $key;
		}

		$zargs = $zfunction->getArgumentDeclarations();
		foreach ( $zargs as $zarg ) {
			$zargid = $zarg->getValueByKey( ZTypeRegistry::Z_ARGUMENTDECLARATION_ID );

			if ( $key === $zargid->getZValue() ) {
				$labels = $zarg->getValueByKey( ZTypeRegistry::Z_ARGUMENTDECLARATION_LABEL );
				$label = $labels->buildStringForLanguage( $lang )->fallbackWithEnglish()->getString();
				if ( $label === null ) {
					return $key;
				}
				return $label;
			}
		}

		// key not found in argument list
		return $key;
	}

	/**
	 * Translates a serialized ZObject from Zids and ZKeys to natural language in the
	 * language passed as parameter or available fallback languages.
	 *
	 * @param stdClass|array|string $zobject
	 * @param ZPersistentObject[] $data
	 * @param Language $lang
	 * @return stdClass|array|string
	 * @throws ZErrorException
	 */
	public static function extractHumanReadableZObject( $zobject, $data, $lang ) {
		if ( is_string( $zobject ) ) {
			if ( self::isValidZObjectReference( $zobject ) ) {
				if ( array_key_exists( $zobject, $data ) ) {
					return self::getLabelOfReference( $zobject, $data[ $zobject ], $lang );
				}
			}
			return $zobject;
		}

		if ( is_array( $zobject ) ) {
			return array_map( function ( $item ) use ( $data, $lang ) {
				return self::extractHumanReadableZObject( $item, $data, $lang );
			}, $zobject );
		}

		if ( !is_object( $zobject ) ) {
			// Fall through: invalid syntax error
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_INVALID_SYNTAX,
					[
						'data' => $zobject
					]
				)
			);
		}

		$labelized = [];
		foreach ( $zobject as $key => $value ) {
			// Labelize key:
			if ( self::isValidZObjectGlobalKey( $key ) ) {
				// If $key is a global key (ZnK1, ZnK2...), typeZid contains the
				// Zid where we can find the key definition.
				$typeZid = self::getZObjectReferenceFromKey( $key );
				if ( array_key_exists( $typeZid, $data ) ) {
					$labelizedKey = self::getLabelOfGlobalKey( $key, $data[ $typeZid ], $lang );
				} else {
					$labelizedKey = $key;
				}
			} else {
				// If $key is local, get the type from $zobject[ Z1K1 ]
				$labelizedKey = self::getLabelOfLocalKey( $key, $zobject, $data, $lang );
			}

			// Labelize value:
			$labelizedValue = in_array( $key, ZTypeRegistry::IGNORE_KEY_VALUES_FOR_LABELLING )
				? $value
				: self::extractHumanReadableZObject( $value, $data, $lang );

			// Exception: labelized key already exists
			if ( array_key_exists( $labelizedKey, $labelized ) ) {
				$labelized[ "$labelizedKey ($key)" ] = $labelizedValue;
			} else {
				$labelized[ $labelizedKey ] = $labelizedValue;
			}

		}
		return (object)$labelized;
	}

	/**
	 * @param ZObject $accepted The ZObject we accept (typically a ZReference)
	 * @param ZObject $input A ZObject we're looking to evaluate whether it's compatible
	 * @return bool True if the types are compatible
	 */
	public static function isCompatibleType( ZObject $accepted, ZObject $input ): bool {
		// Do we accept anything? If so, go ahead.
		if ( $accepted->getZValue() === 'Z1' ) {
			return true;
		}

		// Are we being given a reference? If so, go ahead.
		// TODO (T318588): Dereference this to see if it is actually to an allowed object?
		if ( $input instanceof ZReference ) {
			return true;
		}

		// Are we being given a function call? If so, go ahead.
		// TODO (T318588): Execute this to see if it is actually to an allowed object?
		if ( $input instanceof ZFunctionCall ) {
			return true;
		}

		// Do we exactly match by type what's accepted? If so, go ahead.
		if ( $accepted->getZValue() === $input->getZTypeObject()->getZValue() ) {
			return true;
		}

		// Otherwise, no.
		return false;
	}

	/**
	 * Get the ZID of the input if it's a persistent ZObject or a reference to one.
	 *
	 * @param mixed $zobject The ZObject to examine for
	 * @return string The ZID of the given ZObject, or Z0
	 */
	public static function getZid( $zobject ): string {
		if ( $zobject instanceof ZObject ) {
			if ( $zobject instanceof ZReference || $zobject->getZType() === ZTypeRegistry::Z_REFERENCE ) {
				return $zobject->getValueByKey( ZTypeRegistry::Z_REFERENCE_VALUE );
			}
			if ( $zobject instanceof ZPersistentObject || $zobject->getZType() === ZTypeRegistry::Z_PERSISTENTOBJECT ) {
				return $zobject
					->getValueByKey( ZTypeRegistry::Z_PERSISTENTOBJECT_ID )
					->getValueByKey( ZTypeRegistry::Z_STRING_VALUE );
			}
		}

		// Use placeholder ZID for non-persisted objects.
		return ZTypeRegistry::Z_NULL_REFERENCE;
	}

	/**
	 * Walk a given input ZObject, and make a cache key constructed of its keys and values, with any
	 * ZObject referenced being expanded to also include its revision ID.
	 *
	 * E.g. { "Z1K1": "Z7", "Z7K1": "Z801", "Z801K1": "Hey" } => 'Z1K1|Z7#1,Z7K1|Z801#2,Z801K1|Hey'
	 *
	 * TODO (T338245): Is this cache key too broad? Can we simplify?
	 *
	 * TODO (T338246): When a Z7/Function call, we also need to poison the key with the revision ID of the
	 * relevant implementation, but we don't know which was selected, as that's the call of the
	 * function orchestrator.
	 *
	 * @param \stdClass|array $query
	 * @return string response object returned by orchestrator
	 */
	public static function makeCacheKeyFromZObject( $query ): string {
		$accumulator = '';

		foreach ( $query as $key => $value ) {
			$accumulator .= $key . '|';
			if ( is_array( $value ) || is_object( $value ) ) {
				$accumulator .= self::makeCacheKeyFromZObject( $value );
			} elseif ( is_scalar( $value ) ) {
				$accumulator .= $value;
				// Special-case: If this is a ZObject reference, also append the object's revision ID to cache-bust
				if ( is_string( $value ) && self::isValidZObjectReference( $value ) ) {
					$accumulator .= '#' . Title::newFromDBkey( $value )->getLatestRevID();
				}
			}
			$accumulator .= ',';
		}

		return $accumulator;
	}

	/**
	 * Reads file contents from test data directory.
	 * @param string $fileName
	 * @return string file contents
	 * @codeCoverageIgnore
	 */
	public static function readTestFile( $fileName ): string {
		$baseDir = __DIR__ .
			DIRECTORY_SEPARATOR .
			'..' .
			DIRECTORY_SEPARATOR .
			'tests' .
			DIRECTORY_SEPARATOR .
			'phpunit' .
			DIRECTORY_SEPARATOR .
			'test_data';
		$fullFile = $baseDir . DIRECTORY_SEPARATOR . $fileName;
		return file_get_contents( $fullFile );
	}

	/**
	 * Given a ZObject representing a type, return a string encoding of the type.
	 *
	 * N.B. Currently this only works for ZIDs and Z7s (Z_FUNCTIONCALL). It returns null
	 * for anything else.
	 *
	 * @param stdClass|string $typeStringOrObject
	 * @return string|null
	 */
	public static function makeTypeFingerprint( $typeStringOrObject ): ?string {
		if ( is_string( $typeStringOrObject ) ) {
			return $typeStringOrObject;
		}

		$logger = LoggerFactory::getInstance( 'WikiLambda' );
		if ( !is_object( $typeStringOrObject ) ||
			!property_exists( $typeStringOrObject, ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION ) ) {
			$logger->warning(
				__METHOD__ . ' Unable to make fingerprint for given type',
				[ 'typeStringOrObject' => $typeStringOrObject ]
			);
			return null;
		}

		// We're in a function call-defined type, not a reference
		$callInputTypes = [];
		foreach ( $typeStringOrObject as $key => $value ) {
			if ( $key === ZTypeRegistry::Z_OBJECT_TYPE || $key === ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION ) {
				continue;
			}
			// Call ourselves in case the inner value is also a function call
			$callInputTypes[$key] = static::makeTypeFingerprint( $value );
			if ( $callInputTypes[$key] === null ) {
				return null;
			}
		}
		// Ensure that keys are re-ordered to the logical sequence regardless of input order
		rsort( $callInputTypes, SORT_NATURAL );
		return $typeStringOrObject->{ ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION }
		   . '(' . implode( ',', $callInputTypes ) . ')';
	}

	/**
	 * Replaces all the instances of "Z0" references and keys with the newly assigned
	 * Zid. If the ZObject has a code key/Z16K2, it also replaces instances of unquoted
	 * Z0s inside of the submitted code.
	 *
	 * @param string $data
	 * @param string $zid
	 * @return string
	 */
	public static function replaceNullReferencePlaceholder( $data, $zid ): string {
		// Replace references and keys:
		$zPlaceholderRegex = '/\"' . ZTypeRegistry::Z_NULL_REFERENCE . '(K[1-9]\d*)?\"/';
		$zObjectString = preg_replace( $zPlaceholderRegex, "\"$zid$1\"", $data );

		// Match code
		$codeRegex = '/\"' . ZTypeRegistry::Z_CODE_CODE . '\":\\s*\"((\\\\\"|[^\"])*)\"/';
		$codeMatches = [];
		preg_match( $codeRegex, $zObjectString, $codeMatches );

		// Match and replace Z0s inside of the code
		if ( $codeMatches ) {
			$code = $codeMatches[ 0 ];
			$z0Regex = '/' . ZTypeRegistry::Z_NULL_REFERENCE . '(K[1-9]\d*)?/';
			$newCode = preg_replace( $z0Regex, "$zid$1", $code );
			$zObjectString = preg_replace( $codeRegex, $newCode, $zObjectString );
		}

		return $zObjectString;
	}

	public static function encodeStringParamForNetwork( string $input ): string {
		return str_replace( [ '+', '/', '=' ], [ '-', '_', '' ], base64_encode( $input ) );
	}

	public static function decodeStringParamFromNetwork( string $input ): string {
		return base64_decode( str_replace( [ '-', '_' ], [ '+', '/' ], $input ) );
	}
}
