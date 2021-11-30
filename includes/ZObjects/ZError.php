<?php
/**
 * WikiLambda ZError
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

class ZError extends ZObject {

	public static function getDefinition(): array {
		return [
			'type' => ZTypeRegistry::Z_ERROR,

			'keys' => [
				ZTypeRegistry::Z_ERROR_TYPE => [
					'type' => ZTypeRegistry::Z_ERRORTYPE,
					'required' => true,
				],
				ZTypeRegistry::Z_ERROR_VALUE => [
					'type' => ZTypeRegistry::Z_OBJECT_TYPE,
					'required' => true,
				],
			],
		];
	}

	/**
	 * @param string $type
	 * @param ZObject|\stdClass $value
	 */
	public function __construct( $type, $value ) {
		$this->data[ ZTypeRegistry::Z_ERROR_TYPE ] = $type;
		$this->data[ ZTypeRegistry::Z_ERROR_VALUE ] = $value;
	}

	public function getZValue(): ZObject {
		return $this->data[ ZTypeRegistry::Z_ERROR_VALUE ];
	}

	public function getZErrorType(): string {
		return $this->data[ ZTypeRegistry::Z_ERROR_TYPE ];
	}

	public function getMessage(): string {
		$messages = [];
		$messages[] = ZErrorTypeRegistry::singleton()->getZErrorTypeLabel( $this->getZErrorType() );

		$errorValue = $this->getZValue();
		$valueType = $errorValue->getZType();

		// If $valueType is Z502, concat message of Z502K2
		if ( $valueType === ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED ) {
			$subError = $errorValue->getValueByKey( 'Z502K2' );
			'@phan-var ZError $subError';
			$messages[] = $subError->getMessage();
		}

		// If $valueType is Z509, concat messages of list Z509K1
		if ( $valueType === ZErrorTypeRegistry::Z_ERROR_LIST ) {
			$subErrors = $errorValue->getValueByKey( 'Z509K1' );
			if ( is_array( $subErrors ) || ( $subErrors instanceof ZList ) ) {
				foreach ( ZObjectUtils::getIterativeList( $subErrors ) as $subError ) {
					$messages[] = $subError->getMessage();
				}
			}
		}

		return implode( ". ", $messages );
	}

	public function isValid(): bool {
		// Type must be a valid Zid that references a ZObject of type Z50
		if ( !isset( $this->data[ ZTypeRegistry::Z_ERROR_TYPE ] ) ) {
			return false;
		}
		$errorType = $this->data[ ZTypeRegistry::Z_ERROR_TYPE ];
		if ( !ZObjectUtils::isValidZObjectReference( $errorType ) ) {
			return false;
		}
		if ( !ZErrorTypeRegistry::singleton()->instanceOfZErrorType( $errorType ) ) {
			return false;
		}
		// TODO: should we validate that the ZError value has the keys specified in
		// the ZErrorType (Z50) definition?

		// Value must be a valid ZObject
		if ( !isset( $this->data[ ZTypeRegistry::Z_ERROR_VALUE ] ) ) {
			return false;
		}
		if ( !( $this->data[ ZTypeRegistry::Z_ERROR_VALUE ] instanceof ZObject ) ) {
			return false;
		}
		return $this->getZValue()->isValid();
	}

	public function getErrorData() {
		return [
			'message' => $this->getMessage(),
			'zerror' => $this->getSerialized(),
			'labelled' => $this->getHumanReadable()
		];
	}
}
