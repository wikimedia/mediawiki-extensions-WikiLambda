<?php
/**
 * WikiLambda ZList
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;

class ZGenericList extends ZObject {

	/** @var ZReference */
	protected $type;

	/**
	 * Create a new ZGenericList instance given an array (canonical form)
	 * or an object with K1 (head) and K2 (tail)
	 *
	 * @param ZFunctionCall $functionCall
	 * @param array|ZObject|null $head
	 * @param ZGenericList|null $tail
	 */
	public function __construct( $functionCall, $head = null, $tail = null ) {
		$this->type = $functionCall;

		if ( $head === null ) {
			$this->data = [];
		} elseif ( is_array( $head ) && ( $tail === null ) ) {
			$this->data = $head;
		} else {
			$tailAsArray = ( $tail === null ) ? [] : $tail->getZGenericListAsArray();
			$this->data = array_merge( [ $head ], $tailAsArray );
		}
	}

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
		return [
			'type' => ZTypeRegistry::Z_FUNCTIONCALL,
			'keys' => [
				'K1' => [
					'type' => ZTypeRegistry::Z_OBJECT,
				],
				'K2' => [
					'type' => ZTypeRegistry::Z_FUNCTION_GENERIC_LIST,
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
			if (
				( self::getElementType() !== ZTypeRegistry::Z_OBJECT )
				&& ( self::getElementType() !== $value->getZType() )
			) {
				return false;
			}
		}
		return true;
	}

	/**
	 * @inheritDoc
	 */
	public function getSerialized( $form = self::FORM_CANONICAL ) {
		return self::getSerializedGeneric( $form, $this->data );
	}

	/**
	 * Convert this ZGenericList into its serialized generic representation
	 *
	 * @param int $form
	 * @param array $list
	 * @return \stdClass
	 */
	private function getSerializedGeneric( $form, $list ) {
		if ( count( $list ) === 0 ) {
			return (object)self::returnEmptyGenericList( $form );
		}

		$serialized = self::returnEmptyGenericList( $form );
		$serialized[ 'K1' ] = $list[0]->getSerialized( $form );
		$serialized[ 'K2' ] = self::getSerializedGeneric( $form, array_slice( $list, 1 ) ?? [] );
		return (object)$serialized;
	}

	/**
	 * Return an empty ZGenericList
	 *
	 * @param int $form
	 * @return array
	 */
	private function returnEmptyGenericList( $form ): array {
		return [
			ZTypeRegistry::Z_OBJECT_TYPE => $this->type->getSerialized( $form )
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
	public function getZGenericListAsArray(): array {
		return $this->getZValue();
	}

	/**
	 * Returns the type of the elements of this ZGenericList
	 *
	 * @return string The type of this ZObject
	 */
	public function getElementType(): string {
		return $this->type->getValueByKey( ZTypeRegistry::Z_FUNCTION_GENERIC_LIST_TYPE )->getZValue();
	}
}
