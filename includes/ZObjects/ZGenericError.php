<?php
/**
 * WikiLambda ZGenericError
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

class ZGenericError extends ZObject {

	/**
	 * Create a new ZGenericList instance given an array (canonical form)
	 * or an object with K1 (head) and K2 (tail)
	 *
	 * @param ZFunctionCall $functionCall
	 * @param ZObject[] $keys
	 */
	public function __construct( $functionCall, $keys = [] ) {
		$this->type = $functionCall;
		$nextLocalKey = 1;

		foreach ( $keys as $key => $value )	{
			if ( ZObjectUtils::isValidZObjectKey( $key ) ) {
				$this->data[ $key ] = $value;
			} else {
				$this->data[ "K$nextLocalKey" ] = $value;
				$nextLocalKey += 1;
			}
		}
	}

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
		return [
			'type' => [
				'type' => ZTypeRegistry::Z_FUNCTIONCALL,
				'value' => ZTypeRegistry::Z_FUNCTION_ERRORTYPE_TO_TYPE,
			],
			'keys' => [],
			'additionalKeys' => true,
		];
	}

	/**
	 * Build the function call that defines the type of this Generic Error
	 *
	 * @param string $errorType
	 * @return ZFunctionCall
	 */
	public static function buildType( $errorType ): ZFunctionCall {
		return new ZFunctionCall(
			new ZReference( ZTypeRegistry::Z_FUNCTION_ERRORTYPE_TO_TYPE ),
			[ ZTypeRegistry::Z_FUNCTION_ERRORTYPE_TYPE => new ZReference( $errorType ) ]
		);
	}

	/**
	 * @inheritDoc
	 */
	public function isValid(): bool {
		// To validate an instance of a generic error, we need to check
		// the keys and types of the errortype object
		return true;
	}

	/**
	 * @inheritDoc
	 */
	public function getSerialized( $form = self::FORM_CANONICAL ) {
		$serialized = parent::getSerialized( $form );
		$serialized->{ ZTypeRegistry::Z_OBJECT_TYPE } = $this->type->getSerialized( $form );
		return $serialized;
	}

	/**
	 * Returns the Zid of the errortype that represents this ZGenericError instance
	 *
	 * @return string The zid of the ZErrorType
	 */
	public function getErrorType(): string {
		return $this->type->getValueByKey( ZTypeRegistry::Z_FUNCTION_ERRORTYPE_TYPE )->getZValue();
	}

}
