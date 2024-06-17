<?php
/**
 * WikiLambda ZObject Authorization Filter: Object is instance of an enum type
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
use MediaWiki\Extension\WikiLambda\ZObjects\ZType;
use MediaWiki\Title\Title;

class ZObjectFilterIsEnumValue implements ZObjectFilter {

	/**
	 * ZObject filter that checks whether the edited object is an instance
	 * of an Enum type
	 *
	 * @param ZObjectContent $fromContent
	 * @param ZObjectContent $toContent
	 * @param Title $title
	 * @param array $args
	 * @return bool
	 */
	public static function pass( $fromContent, $toContent, $title, $args = [] ): bool {
		$type = $fromContent->getZType();

		if ( in_array( $type, ZTypeRegistry::EXCLUDE_TYPES_FROM_ENUMS ) ) {
			// Type has identity key but excluded from enum; return false
			return false;
		}

		$typeTitle = Title::newFromText( $type, NS_MAIN );
		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$typeObject = $zObjectStore->fetchZObjectByTitle( $typeTitle );

		if ( $typeObject === false ) {
			// Type not found; return false
			return false;
		}

		$typeInnerObject = $typeObject->getInnerZObject();
		return ( $typeInnerObject instanceof ZType ) && $typeInnerObject->isEnumType();
	}
}
