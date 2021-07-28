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
		if ( $this->getZValue()->getZType() == ZTypeRegistry::Z_STRING ) {
			return $this->getZValue()->getZValue();
		}
		return ZErrorTypeRegistry::singleton()->getZErrorTypeLabel( $this->getZErrorType() );
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
		if ( !ZErrorTypeRegistry::singleton()->isZErrorTypeKnown( $errorType ) ) {
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
}
