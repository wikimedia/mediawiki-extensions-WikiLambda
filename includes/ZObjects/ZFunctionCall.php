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
		// TODO Allow for a dereferenced function instead of a reference
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
			'type' => ZTypeRegistry::Z_FUNCTIONCALL,
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
		// TODO function can be something else than a reference E.g. a literal function
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
	 * Resulting type of this ZFunctionCall.
	 * This can be extracted from the secondary labels database (we have return type in this table)
	 * or from the persisted ZObjects.
	 * In the future, the function in Z_FUNCTIONCALL_FUNCTION (Z7) can be a literal as well, so we
	 * can directly return Z7K1.Z8K2
	 *
	 * @return string
	 */
	public function getReturnType(): string {
		// FIXME this is currently hardcoded, this should look up the DB to see what return type
		// is associated to the function in Z_FUNCTIONCALL_FUNCTION
		return ZTypeRegistry::Z_TYPE;
	}

}
