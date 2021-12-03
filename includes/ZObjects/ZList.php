<?php
/**
 * WikiLambda ZList
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;

class ZList extends ZObject {

	/**
	 * Create a new ZList instance given an array (canonical form)
	 *
	 * @param array $list
	 */
	public function __construct( $list = [] ) {
		$this->data = $list;
	}

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
		return [
			'type' => ZTypeRegistry::Z_LIST,
			'keys' => [
				ZTypeRegistry::Z_LIST_HEAD => [
					'type' => ZTypeRegistry::Z_OBJECT,
				],
				ZTypeRegistry::Z_LIST_TAIL => [
					'type' => ZTypeRegistry::BUILTIN_ARRAY,
				],
			],
		];
	}

	/**
	 * @inheritDoc
	 */
	public function isValid(): bool {
		foreach ( $this->data as $key => $value ) {
			if ( !( $value instanceof ZObject ) ) {
				return false;
			}
			if ( !$value->isValid() ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * @inheritDoc
	 */
	public function getSerialized( $form = self::FORM_CANONICAL ) {
		// TODO: (T296737) fix different serialization modes, only returning FORM_CANONICAL
		$list = $this->getZListAsArray();
		return array_map( static function ( $value ) use ( $form ) {
			return ( $value instanceof ZObject ) ? $value->getSerialized( $form ) : $value;
		}, $list );
	}

	/**
	 * Get a pair that represent the head and tail of this ZList
	 *
	 * @return array
	 */
	public function getZValue() {
		return $this->data;
	}

	/**
	 * Get the array of ZObjects represented by this ZList
	 *
	 * @return array
	 */
	public function getZListAsArray(): array {
		return $this->getZValue();
	}
}
