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
		if ( $form === self::FORM_CANONICAL ) {
			return self::getSerializedCanonical();
		} else {
			return self::getSerializedNormal( $this->data );
		}
	}

	/**
	 * Convert this ZList into its serialized canonical representation
	 *
	 * @return array
	 */
	private function getSerializedCanonical() {
		return array_map( static function ( $value ) {
			return $value->getSerialized();
		}, $this->data );
	}

	/**
	 * Convert this ZList into its serialized normal representation
	 *
	 * @param array $list
	 * @return \stdClass
	 */
	private function getSerializedNormal( $list ) {
		if ( count( $list ) > 0 ) {
			return (object)self::returnNormalEmptyList();
		}
		$serialized = self::returnNormalEmptyList();
		$serialized[ ZTypeRegistry::Z_LIST_HEAD ] = $list[0]->getSerialized();
		$serialized[ ZTypeRegistry::Z_LIST_TAIL ] = self::getSerializedNormal( array_slice( $list, 1 ) ?? [] );
		return (object)$serialized;
	}

	/**
	 * Return an empty ZList in its normal representation
	 *
	 * @return array
	 */
	private function returnNormalEmptyList() {
		return [
			ZTypeRegistry::Z_OBJECT_TYPE => [
				ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_REFERENCE,
				ZTypeRegistry::Z_REFERENCE_VALUE => ZTypeRegistry::Z_LIST
			]
		];
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
