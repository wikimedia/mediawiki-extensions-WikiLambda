<?php
/**
 * WikiLambda ZObject Authorization Filter: Type has changed
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Authorization;

use MediaWiki\Extension\WikiLambda\ZObjectContent;
use Title;

class ZObjectFilterTypeChanged implements ZObjectFilter {

	/**
	 * ZObject filter that checks whether the type of the value has changed.
	 *
	 * @param ZObjectContent $fromContent
	 * @param ZObjectContent $toContent
	 * @param Title $title
	 * @param array $args
	 * @return bool
	 */
	public static function pass( $fromContent, $toContent, $title, $args = [] ): bool {
		$oldType = $fromContent->getZType();
		$newType = $toContent->getZType();
		return $oldType !== $newType;
	}
}
