<?php
/**
 * WikiLambda ZObject Authorization Filter: Is Connected Converter
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Authorization;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Title\Title;

class ZObjectFilterIsConnectedConverter implements ZObjectFilter {

	/**
	 * ZObject filter that checks whether the edited converter (serialiser or deserialiser)
	 * is already connected to a type.
	 *
	 * @param ZObjectContent $fromContent
	 * @param ZObjectContent $toContent
	 * @param Title $title
	 * @param array $args
	 * @return bool
	 */
	public static function pass( $fromContent, $toContent, $title, $args = [] ): bool {
		$typeId = '';
		$arrayKey = '';

		$type = $fromContent->getZType();
		switch ( $type ) {
			// For Deserialisers:
			// * get deserialiser ZID from $title
			// * get type ZID from Z_DESERIALISER_TYPE
			// * retrieve type from DB
			// * check that the type has this ZID in Z_TYPE_DESERIALISERS
			case ZTypeRegistry::Z_DESERIALISER:
				$typeId = $fromContent
					->getInnerZObject()
					->getValueByKey( ZTypeRegistry::Z_DESERIALISER_TYPE )
					->getZValue();
				$arrayKey = ZTypeRegistry::Z_TYPE_DESERIALISERS;
				break;

			// For Serialisers:
			// * get serialiser ZID from $title
			// * get type ZID from Z_SERIALISER_TYPE
			// * retrieve type from DB
			// * check that the type has this ZID in Z_TYPE_SERIALISERS
			case ZTypeRegistry::Z_SERIALISER:
				$typeId = $fromContent
					->getInnerZObject()
					->getValueByKey( ZTypeRegistry::Z_SERIALISER_TYPE )
					->getZValue();
				$arrayKey = ZTypeRegistry::Z_TYPE_SERIALISERS;
				break;

			default:
				return false;
		}

		$typeTitle = Title::newFromText( $typeId, NS_MAIN );
		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$typeObject = $zObjectStore->fetchZObjectByTitle( $typeTitle );

		if ( $typeObject === false ) {
			// Type object not found; return false
			return false;
		}
		if ( $typeObject->getZType() !== ZTypeRegistry::Z_TYPE ) {
			// Object of wrong type; return false
			return false;
		}
		$array = $typeObject->getInnerZObject()->getValueByKey( $arrayKey )->getSerialized();
		return in_array( $title->getText(), $array );
	}
}
