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
	 * Construct a ZFunctionCall instance, bypassing the internal ZString formally contained.
	 *
	 * @param ZObject $function
	 * @param array $args
	 */
	public function __construct( $function, $args = [] ) {
		$this->data[ ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION ] = $function;
		// TODO (T300509) Allow for a dereferenced function instead of a reference
		// If function is a Zid, then the keys will be Global keys.
		// If the function is a literal function, the keys will be Local ones.
		$functionZid = $function->getZValue();
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
		// TODO (T300509) function can be something else than a reference E.g. a literal function
		return ZObjectUtils::isValidZObjectReference(
			$this->data[ ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION ]->getZValue()
		);
	}

	/**
	 * Returns Function Zid
	 *
	 * @return string
	 */
	public function getZValue(): string {
		return $this->data[ ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION ]->getZValue();
	}

	/**
	 * Resulting type of this ZFunctionCall. If the ZFunction is not available, returns null.
	 * This can be extracted from the secondary labels database (we have return type in this table)
	 * or from the persisted ZObjects.
	 *
	 * TODO (T300509) In the future, the function in Z_FUNCTIONCALL_FUNCTION (Z7) can be a literal
	 * as well, so we can directly return Z7K1.Z8K2
	 *
	 * @return string|null
	 */
	public function getReturnType() {
		$zObjectStore = WikiLambdaServices::getZObjectStore();
		return $zObjectStore->fetchZFunctionReturnType( $this->getZValue() );
	}

}
