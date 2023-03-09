<?php
/**
 * WikiLambda ZObject Authorization Filter: Is Runnable Function
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Authorization;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;
use Title;

class ZObjectFilterIsRunnable implements ZObjectFilter {

	/**
	 * ZObject filter that checks whether the edited function is a running function.
	 * A running function is that which has attached implementations.
	 *
	 * @param ZObjectContent $fromContent
	 * @param ZObjectContent $toContent
	 * @param Title $title
	 * @param array $args
	 * @return bool
	 */
	public static function pass( $fromContent, $toContent, $title, $args = [] ): bool {
		$implementations = $fromContent
			->getInnerZObject()
			->getValueByKey( ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS );
		'@phan-var ZTypedList $implementations';
		return !$implementations->isEmpty();
	}
}
