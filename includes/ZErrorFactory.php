<?php
/**
 * WikiLambda interface for validation error formatting
 *
 * @file
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZKeyReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZQuote;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedError;
use Symfony\Component\Yaml\Yaml;

class ZErrorFactory {

	/**
	 * @var array
	 */
	private static $errorDescriptors;

	/**
	 * Read and parse the yaml file with the error type descriptors
	 *
	 * @return array
	 */
	private static function getErrorDescriptors(): array {
		if ( !self::$errorDescriptors ) {
			try {
				$descriptor = json_decode(
					self::readYamlAsSecretJson(
						self::joinPath(
							self::joinPath( __DIR__, "..", "..", "function-schemata", "data" ),
							"errors",
							"error_types.yaml"
						)
					), true
				);
				if (
					array_key_exists( 'patterns', $descriptor ) &&
					array_key_exists( 'keywords', $descriptor['patterns'] )
				) {
					self::$errorDescriptors = $descriptor['patterns']['keywords'];
				} else {
					self::$errorDescriptors = [];
				}
			} catch ( \Exception $e ) {
				self::$errorDescriptors = [];
			}
		}
		return self::$errorDescriptors;
	}

	/**
	 * Joins an arbitrary number of path components via DIRECTORY_SEPARATOR.
	 * @return string
	 */
	private static function joinPath(): string {
		$components = [];
		foreach ( func_get_args() as $component ) {
			$component = rtrim( $component, DIRECTORY_SEPARATOR );
			array_push( $components, $component );
		}
		return implode( DIRECTORY_SEPARATOR, $components );
	}

	/**
	 * @param string $yamlFile File to read
	 * @return string
	 */
	public static function readYamlAsSecretJson( string $yamlFile ) {
		return json_encode( Yaml::parseFile( $yamlFile ) );
	}

	/**
	 * @param array $error
	 * @param array $descriptor
	 * @return bool
	 */
	public static function errorMatchesDescriptor( $error, $descriptor ): bool {
		// 1. The descriptor keyword must be the same as the error keyword
		if ( $error['keyword'] !== $descriptor['keyword'] ) {
			return false;
		}

		// 2. Every item from the descriptor keywordArgs must be present in the error
		foreach ( $descriptor['keywordArgs'] as $wantedArg => $wantedValue ) {
			if ( !array_key_exists( $wantedArg, $error['keywordArgs'] ) ) {
				return false;
			}

			if ( is_array( $wantedValue ) && !in_array( $error['keywordArgs'][ $wantedArg ], $wantedValue ) ) {
				return false;
			}

			if ( is_string( $wantedValue ) && ( $error['keywordArgs'][ $wantedArg ] !== $wantedValue ) ) {
				return false;
			}
		}

		// 3. The descriptor dataPointer must match the tail of the error dataPointer
		// 3.1. If the descriptor dataPointer is longer than the error dataPointer, not a match
		if ( count( $descriptor['dataPointer'] ) > count( $error['dataPointer'] ) ) {
			return false;
		}

		// 3.2 Get the tail of the error descriptor and check (with ===)
		// that both arrays contain the same elements in the same order
		if ( count( $descriptor['dataPointer'] ) > 0 ) {
			$tail = array_slice( $error['dataPointer'], -( count( $descriptor['dataPointer'] ) ) );
			return $descriptor['dataPointer'] === $tail;
		}
		// If the descriptor dataPointer is empty, return true
		return true;
	}

	/**
	 * Given an error data field, which is the partial ZObject in which
	 * the error has been found, returns its data type if available
	 *
	 * @param array $data
	 * @return string|bool
	 */
	public static function getDataType( $data ) {
		// $data = json_decode( json_encode( $errorData ), true);
		if ( !is_array( $data ) ) {
			return false;
		}

		if ( !array_key_exists( ZTypeRegistry::Z_OBJECT_TYPE, $data ) ) {
			return false;
		}

		if ( is_string( $data[ ZTypeRegistry::Z_OBJECT_TYPE ] ) ) {
			return $data[ ZTypeRegistry::Z_OBJECT_TYPE ];
		}

		if (
			array_key_exists( ZTypeRegistry::Z_OBJECT_TYPE, $data[ZTypeRegistry::Z_OBJECT_TYPE ] ) &&
			( $data[ ZTypeRegistry::Z_OBJECT_TYPE ][ ZTypeRegistry::Z_OBJECT_TYPE ] === ZTypeRegistry::Z_REFERENCE ) &&
			array_key_exists( ZTypeRegistry::Z_REFERENCE_VALUE, $data[ ZTypeRegistry::Z_OBJECT_TYPE  ] )
		) {
			return $data[ ZTypeRegistry::Z_OBJECT_TYPE ][ ZTypeRegistry::Z_REFERENCE_VALUE ];
		}

		return false;
	}

	/**
	 * Infers the type of the error data field and returns true if the
	 * missing key matches that type.
	 *
	 * @param array|string $error
	 * @return bool
	 */
	public static function errorMatchesType( $error ): bool {
		// Infer data type if we can
		$dataType = self::getDataType( $error['data'] );
		if ( !$dataType ) {
			return true;
		}

	  // If there's a missing key and an inferred type, match them
		if ( !array_key_exists( 'missing', $error['keywordArgs'] ) ) {
			return true;
		}

		$keyPrefix = $dataType . 'K';
		$missingKey = $error['keywordArgs']['missing'];
		return ( strpos( $missingKey, $keyPrefix ) === 0 );
	}

	/**
	 * Create a Z5/ZError of the type Z509/Multiple errors
	 *
	 * @param ZError[] $errorList
	 * @return ZError
	 */
	public static function createZErrorList( $errorList ): ZError {
		$errorsList = array_merge( [ new ZReference( ZTypeRegistry::Z_ERROR ) ], $errorList );
		return self::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_LIST,
			[
				// We don't need to catch the error thrown by ZObjectFactory::createChild because
				// we know that every item of the list is already an instance of ZObject
				'errorList' => ZObjectFactory::createChild( $errorsList )
			]
		);
	}

	/**
	 * Create a Z5/ZError of the type Z502/Not wellformed
	 *
	 * @param ZError $childError
	 * @return ZError
	 */
	public static function createValidationZError( ZError $childError ): ZError {
		return self::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED,
			[
				'subtype' => $childError->getZErrorType(),
				'childError' => $childError
			]
		);
	}

	/**
	 * Create a Z5/ZError of the type Z502/Not wellformed
	 *
	 * @param string $right
	 * @param ZObjectContent $content
	 * @param int $flags whether is edit EDIT_UPDATE or create EDIT_NEW
	 * @return ZError
	 */
	public static function createAuthorizationZError( $right, $content, $flags ): ZError {
		$error = null;

		switch ( $right ) {
			case 'edit':
			case 'wikilambda-create':
			case 'wikilambda-edit':
				$message = ( $flags === EDIT_NEW ) ? 'nocreatetext' : 'badaccess-group0';
				$error = self::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_EDIT,
					[ 'message' => wfMessage( $message )->text() ]
				);
				break;

			default:
				// Return descriptive error message using the right action message:
				$message = wfMessage( 'apierror-permissiondenied', wfMessage( "action-$right" ) )->text();
				$error = self::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_EDIT,
					[ 'message' => $message ]
				);
		}

		return $error;
	}

	/**
	 * Create a Z5/ZError of the type Z526/Key not wellformed
	 *
	 * @param string $key
	 * @param ZError $childError
	 * @return ZError
	 */
	public static function createKeyValueZError( $key, $childError ): ZError {
		return self::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_KEY_VALUE_NOT_WELLFORMED,
			[
				'key' => $key,
				'childError' => $childError
			]
		);
	}

	/**
	 * Create a Z5/ZError of the type Z522/Array element not wellformed
	 *
	 * @param string $index
	 * @param ZError $childError
	 * @return ZError
	 */
	public static function createArrayElementZError( $index, $childError ): ZError {
		return self::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_ARRAY_ELEMENT_NOT_WELLFORMED,
			[
				'index' => $index,
				'childError' => $childError
			]
		);
	}

	/**
	 * Create a ZError wrapping one or more label clashing errors
	 *
	 * @param array $clashes
	 * @return ZError
	 */
	public static function createLabelClashZErrors( $clashes ): ZError {
		$clashErrors = [];
		foreach ( $clashes as $language => $clashZid ) {
			$clashErrors[] = self::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_LABEL_CLASH,
				[
					'zid' => $clashZid,
					'language' => $language
				]
			);
		}

		if ( count( $clashErrors ) > 1 ) {
			return self::createZErrorList( $clashErrors );
		}
		return $clashErrors[0];
	}

	/**
	 * Create a Z5/ZError of a given Z50/ZErrorType
	 *
	 * @param string $zErrorType
	 * @param array $payload
	 * @return ZError
	 */
	public static function createZErrorInstance( $zErrorType, $payload ): ZError {
		$zErrorValue = [];

		switch ( $zErrorType ) {
			case ZErrorTypeRegistry::Z_ERROR_UNKNOWN:
				$zErrorValue[] = new ZString( $payload['message'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED:
				$zErrorValue[] = new ZString( $payload['subtype'] );
				$zErrorValue[] = $payload['childError'];
				break;

			case ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND:
				$zErrorValue[] = new ZString( $payload['data'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_EVALUATION:
				$zErrorValue[] = new ZQuote( $payload['functionCall'] );
				$zErrorValue[] = $payload['error'];
				break;

			case ZErrorTypeRegistry::Z_ERROR_LIST:
				$zErrorValue[] = $payload['errorList'];
				break;

			case ZErrorTypeRegistry::Z_ERROR_MISSING_KEY:
				$ref = array_key_exists( 'missing', $payload['keywordArgs'] ) ? $payload['keywordArgs']['missing'] : '';
				$zErrorValue[] = new ZKeyReference( $ref );
				$zErrorValue[] = new ZQuote( $payload['data'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_MISSING_PERSISTENT_VALUE:
				$zErrorValue[] = new ZQuote( $payload['data'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_UNDEFINED_LIST_TYPE:
				$zErrorValue[] = new ZQuote( $payload['data'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_WRONG_LIST_TYPE:
				$zErrorValue[] = new ZQuote( $payload['data'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_NOT_NUMBER_BOOLEAN_NULL:
				$zErrorValue[] = new ZQuote( $payload['data'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_ARRAY_ELEMENT_NOT_WELLFORMED:
				$zErrorValue[] = new ZString( $payload['index'] );
				$zErrorValue[] = $payload['childError'];
				break;

			case ZErrorTypeRegistry::Z_ERROR_MISSING_TYPE:
				$zErrorValue[] = new ZQuote( $payload['data'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_TYPE_NOT_STRING_ARRAY:
				$zErrorValue[] = $payload['data'];
				break;

			case ZErrorTypeRegistry::Z_ERROR_INVALID_KEY:
				$zErrorValue[] = new ZString( end( $payload['dataPointer'] ) );
				break;

			case ZErrorTypeRegistry::Z_ERROR_KEY_VALUE_NOT_WELLFORMED:
				$zErrorValue[] = new ZKeyReference( $payload['key'] );
				$zErrorValue[] = $payload['childError'];
				break;

			case ZErrorTypeRegistry::Z_ERROR_STRING_VALUE_MISSING:
				$zErrorValue[] = new ZQuote( $payload['data'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_STRING_VALUE_WRONG_TYPE:
				$zErrorValue[] = new ZQuote( $payload['data'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_REFERENCE_VALUE_MISSING:
				$zErrorValue[] = new ZQuote( $payload['data'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_REFERENCE_VALUE_WRONG_TYPE:
				$zErrorValue[] = new ZQuote( $payload['data'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_REFERENCE_VALUE_INVALID:
				$zErrorValue[] = new ZString( $payload['data'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_WRONG_NAMESPACE:
				$zErrorValue[] = new ZString( $payload['title'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_WRONG_CONTENT_TYPE:
				$zErrorValue[] = new ZString( $payload['title'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_INVALID_LANG_CODE:
				$zErrorValue[] = new ZString( $payload['lang'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_LANG_NOT_FOUND:
				$zErrorValue[] = new ZString( $payload['lang'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_UNEXPECTED_ZTYPE:
				$zErrorValue[] = new ZReference( $payload['expected'] );
				$zErrorValue[] = new ZReference( $payload['used'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_ZTYPE_NOT_FOUND:
				$zErrorValue[] = new ZString( $payload['type'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_CONFLICTING_TYPE_NAMES:
				$zErrorValue[] = new ZString( $payload['zid'] );
				$zErrorValue[] = new ZString( $payload['name'] );
				$zErrorValue[] = new ZString( $payload['existing'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_CONFLICTING_TYPE_ZIDS:
				$zErrorValue[] = new ZString( $payload['zid'] );
				$zErrorValue[] = new ZString( $payload['name'] );
				$zErrorValue[] = new ZString( $payload['existing'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_BUILTIN_TYPE_NOT_FOUND:
				$zErrorValue[] = new ZString( $payload['zid'] );
				$zErrorValue[] = new ZString( $payload['name'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_INVALID_FORMAT:
				$zErrorValue[] = new ZQuote( $payload['data'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_INVALID_JSON:
				$zErrorValue[] = new ZString( $payload['message'] );
				$zErrorValue[] = new ZQuote( $payload['data'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_INVALID_REFERENCE:
				$zErrorValue[] = new ZString( $payload['data'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_UNKNOWN_REFERENCE:
				$zErrorValue[] = new ZString( $payload['data'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_SCHEMA_TYPE_MISMATCH:
				$keyRef = end( $payload['dataPointer'] );
				$zErrorValue[] = new ZKeyReference( $keyRef ?: '' );
				$zErrorValue[] = new ZString( $payload['keywordArgs']['expected'] );
				$zErrorValue[] = new ZString( $payload['keywordArgs']['used'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_ARRAY_TYPE_MISMATCH:
				$zErrorValue[] = new ZKeyReference( $payload['key'] );
				$zErrorValue[] = new ZString( $payload['expected'] );
				$zErrorValue[] = new ZQuote( $payload['data'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_DISALLOWED_ROOT_ZOBJECT:
				$zErrorValue[] = new ZQuote( $payload['data'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_LABEL_CLASH:
				$zErrorValue[] = new ZString( $payload['zid'] );
				$zErrorValue[] = new ZString( $payload['language'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_UNMATCHING_ZID:
				$zErrorValue[] = new ZString( $payload['zid'] );
				$zErrorValue[] = new ZString( $payload['title'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_INVALID_TITLE:
				$zErrorValue[] = new ZString( $payload['title'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_EDIT:
				$zErrorValue[] = new ZString( $payload['message'] );
				break;

			case ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN:
				// No context.
				break;

			default:
				break;
		}

		return new ZError(
			new ZReference( $zErrorType ),
			self::createTypedError( $zErrorType, $zErrorValue )
		);
	}

	/**
	 * Create a ZTypedError instance given a errorType Zid and a set of values.
	 *
	 * @param string $errorType
	 * @param ZObject[] $errorValues
	 * @return ZTypedError
	 */
	private static function createTypedError( $errorType, $errorValues ) {
		return new ZTypedError( ZTypedError::buildType( $errorType ), $errorValues );
	}

	/**
	 * Create an unknown validation error
	 *
	 * @param string $message
	 * @return ZError
	 */
	public static function createUnknownValidationError( $message ): ZError {
		$zError = self::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
			[ 'message' => $message ]
		);
		return self::createValidationZError( $zError );
	}

	/**
	 * Convenience method to wrap a non-error in a Z507/Evaluation ZError
	 *
	 * @param string|ZObject $message The non-error to wrap.
	 * @param string $call The functional call context.
	 * @return ZError
	 */
	public static function wrapMessageInZError( $message, $call ): ZError {
		$wrappedError = self::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_UNKNOWN, [ 'message' => $message ]
		);
		$zerror = self::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_EVALUATION,
			[
				'functionCall' => $call,
				'error' => $wrappedError
			]
		);
		return $zerror;
	}
}
