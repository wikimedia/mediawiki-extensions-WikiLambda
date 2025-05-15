<?php
/**
 * WikiLambda ZNaturalLanguage
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;

class ZNaturalLanguage extends ZObject {

	/**
	 * Create a ZNaturalLanguage instance given a code and list of aliases
	 *
	 * @param ZString $code
	 * @param ZTypedList|null $aliases
	 */
	public function __construct( $code, $aliases = null ) {
		$this->data[ ZTypeRegistry::Z_LANGUAGE_CODE ] = $code;
		if ( $aliases ) {
			$this->data[ ZTYpeRegistry::Z_LANGUAGE_SECONDARYCODES ] = $aliases;
		}
	}

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
		return [
			'type' => [
				'type' => ZTypeRegistry::Z_REFERENCE,
				'value' => ZTypeRegistry::Z_LANGUAGE,
			],
			'keys' => [
				ZTypeRegistry::Z_LANGUAGE_CODE => [
					'type' => ZTypeRegistry::BUILTIN_STRING,
					'required' => true
				],
				ZTypeRegistry::Z_LANGUAGE_SECONDARYCODES => [
					'type' => ZTypeRegistry::HACK_ARRAY_Z_STRING,
					'required' => false
				],
			],
		];
	}

	/**
	 * @inheritDoc
	 */
	public function isValid(): bool {
		if ( !( $this->data[ZTypeRegistry::Z_LANGUAGE_CODE] instanceof ZString ) ) {
			return false;
		}

		if ( isset( $this->data[ZTypeRegistry::Z_LANGUAGE_SECONDARYCODES] ) ) {
			$aliases = $this->data[ZTypeRegistry::Z_LANGUAGE_SECONDARYCODES];
			if ( $aliases instanceof ZTypedList ) {
				if ( $aliases->getElementType()->getZValue() !== ZTypeRegistry::Z_STRING ) {
					return false;
				}
				$aliases = $aliases->getAsArray();
			}

			if ( is_array( $aliases ) ) {
				foreach ( $aliases as $alias ) {
					if ( !( $alias instanceof ZString ) ) {
						return false;
					}
				}
			} else {
				return false;
			}
		}
		return true;
	}

	/**
	 * @return string
	 */
	public function getZValue() {
		return $this->data[ ZTypeRegistry::Z_LANGUAGE_CODE ]->getZValue();
	}
}
