<?php
/**
 * WikiLambda ZFunctionCall
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

class ZFunctionCall extends ZObject {

	/**
	 * Construct a ZFunctionCall instance, can take a referenced or derreferenced function.
	 *
	 * @param ZObject $function
	 * @param array $args
	 */
	public function __construct( $function, $args = [] ) {
		$this->data[ ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION ] = $function;
		$functionZid = '';
		if ( $function instanceof ZFunction ) {
			$functionZid = $function->getIdentity() ?? '';
		}
		if ( $function instanceof ZReference ) {
			$functionZid = $function->getZValue() ?? '';
		}
		foreach ( $args as $key => $value ) {
			// Save as additional keys only if the key reference belongs to the function Zid
			if ( ZObjectUtils::getZObjectReferenceFromKey( $key ) === $functionZid ) {
				$this->data[ $key ]	= $value;
			}
		}
	}

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
		return [
			'type' => [
				'type' => ZTypeRegistry::Z_REFERENCE,
				'value' => ZTypeRegistry::Z_FUNCTIONCALL,
			],
			'keys' => [
				ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION => [
					'type' => ZTypeRegistry::Z_REFERENCE,
				],
			],
			'additionalKeys' => true
		];
	}

	/**
	 * @inheritDoc
	 */
	public function isValid(): bool {
		// Check Z7K1 is either a valid reference or a valid function
		$function = $this->data[ ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION ];
		if (
			!( $this->data[ ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION ] instanceof ZReference ) &&
			!( $this->data[ ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION ] instanceof ZFunction ) ) {
			return false;
		}
		return $this->data[ ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION ]->isValid();
	}

	/**
	 * Returns Function Zid
	 *
	 * @return string
	 */
	public function getZValue(): string {
		return (string)( $this->data[ ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION ]->getZValue() );
	}

	/**
	 * Resulting type of this ZFunctionCall. If the ZFunction is not available, returns null.
	 * When Z7K1 is a reference to a persisted function, its type should be extracted from the
	 * secondary labels database for better performance.
	 *
	 * @return string|null
	 */
	public function getReturnType() {
		if ( $this->data[ ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION ] instanceof ZReference ) {
			$zObjectStore = WikiLambdaServices::getZObjectStore();
			return $zObjectStore->fetchZFunctionReturnType( $this->getZValue() );
		}

		if ( $this->data[ ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION ] instanceof ZFunction ) {
			return $this->data[ ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION ]->getReturnType();
		}

		return null;
	}
}
