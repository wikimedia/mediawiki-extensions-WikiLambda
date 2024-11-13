<?php
/**
 * WikiLambda ZBoolean
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;

class ZBoolean extends ZObject {

	/**
	 * @inheritDoc
	 */
	public function __construct( $value = '' ) {
		if ( is_bool( $value ) ) {
			$this->data[ ZTypeRegistry::Z_BOOLEAN_VALUE ] = new ZReference( $value
				? ZTypeRegistry::Z_BOOLEAN_TRUE
				: ZTypeRegistry::Z_BOOLEAN_FALSE
			);
			return;
		}

		if ( $value instanceof ZReference ) {
			$this->data[ZTypeRegistry::Z_BOOLEAN_VALUE] = $value;
			return;
		}

		// Otherwise give up and have it as null
		$this->data[ ZTypeRegistry::Z_BOOLEAN_VALUE ] = null;
	}

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
		return [
			'type' => [
				'type' => ZTypeRegistry::Z_REFERENCE,
				'value' => ZTypeRegistry::Z_BOOLEAN,
			],
			'keys' => [
				ZTypeRegistry::Z_BOOLEAN_VALUE => [
					'type' => ZTypeRegistry::BUILTIN_REFERENCE,
					'required' => true
				],
			],
		];
	}

	/**
	 * @inheritDoc
	 */
	public function isValid(): bool {
		if ( $this->data[ZTypeRegistry::Z_BOOLEAN_VALUE] === null ) {
			return false;
		}
		if (
			$this->data[ZTypeRegistry::Z_BOOLEAN_VALUE] instanceof ZReference &&
			$this->data[ZTypeRegistry::Z_BOOLEAN_VALUE]->isValid() &&
			(
				$this->data[ZTypeRegistry::Z_BOOLEAN_VALUE]->getZValue() === ZTypeRegistry::Z_BOOLEAN_TRUE ||
				$this->data[ZTypeRegistry::Z_BOOLEAN_VALUE]->getZValue() === ZTypeRegistry::Z_BOOLEAN_FALSE
			)
		) {
			return true;
		}

		return false;
	}

	/**
	 * @return ZReference|null
	 */
	public function getZValue() {
		return $this->data[ ZTypeRegistry::Z_BOOLEAN_VALUE ];
	}
}
