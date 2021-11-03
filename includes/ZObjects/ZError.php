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
		// FIXME HACK: When an error is created, its type must be tracked by the
		// ZErrorTypeRegistry or else it will generate another error.
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
		// 1. Get the label of this ZType error
		$serialized = ZErrorTypeRegistry::singleton()->getZErrorTypeLabel( $this->getZErrorType() );

		// 2. If $value is a ZError, call its getMessage() and append
		// FIXME: The value might not be a ZError but a ZErrorType instance,
		// in which case we also want to recursively grab its message
		$errorValue = $this->getZValue();
		if ( $errorValue instanceof ZError ) {
			'@phan-var ZError $errorValue';
			$serialized .= $errorValue->getMessage();
		}

		return $serialized;
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
			'zerror' => $this->serialize(),
			// TODO: T294827 Labelize ZObject to return human-readable error
			// 'labelized' => ''
		];
	}
}
