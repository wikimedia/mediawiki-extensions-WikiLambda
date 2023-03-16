<?php
/**
 * WikiLambda ZObject Authorization Filter: Is Running Function
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

class ZObjectFilterIsAttached implements ZObjectFilter {

	/**
	 * ZObject filter that checks whether the edited implementation or tester is
	 * attached to a function.
	 *
	 * @param ZObjectContent $fromContent
	 * @param ZObjectContent $toContent
	 * @param Title $title
	 * @param array $args
	 * @return bool
	 */
	public static function pass( $fromContent, $toContent, $title, $args = [] ): bool {
		$functionId = '';
		$arrayKey = '';

		$type = $fromContent->getZType();
		switch ( $type ) {
			// For Implementation:
			// * get Implementation ZID from $title
			// * get function ID from Z_IMPLEMENTATION_FUNCTION
			// * retrieve function from DB
			// * and check that the function has this ZID in Z_FUNCTION_IMPLEMENTATIONS
			case ZTypeRegistry::Z_IMPLEMENTATION:
				$functionId = $fromContent
					->getInnerZObject()
					->getValueByKey( ZTypeRegistry::Z_IMPLEMENTATION_FUNCTION )
					->getZValue();
				$arrayKey = ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS;
				break;

			// For Tester:
			// * get Tester ZID from $title
			// * get function ID from Z_TESTER_FUNCTION
			// * retrieve function from DB
			// * and check that the function has this ZID in Z_FUNCTION_TESTERS
			case ZTypeRegistry::Z_TESTER:
				$functionId = $fromContent
					->getInnerZObject()
					->getValueByKey( ZTypeRegistry::Z_TESTER_FUNCTION )
					->getZValue();
				$arrayKey = ZTypeRegistry::Z_FUNCTION_TESTERS;
				break;

			default:
				return false;
		}

		$functionTitle = Title::newFromText( $functionId, NS_MAIN );
		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$function = $zObjectStore->fetchZObjectByTitle( $functionTitle );

		if ( $function === false ) {
			// Function not found; return false
			return false;
		}
		if ( $function->getZType() !== ZTypeRegistry::Z_FUNCTION ) {
			// Object of wrong type; return false
			return false;
		}
		$array = $function->getInnerZObject()->getValueByKey( $arrayKey )->getSerialized();
		return in_array( $title->getText(), $array );
	}
}
