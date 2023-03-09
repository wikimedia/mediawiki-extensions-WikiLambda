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

use MediaWiki\Extension\WikiLambda\ZObjectContent;
use Title;

class ZObjectFilterInRange implements ZObjectFilter {

	/**
	 * ZObject filter that checks whether the edited function is within a certain
	 * Zid range. This determines whether the ZObject is built-in or user-contributed.
	 *
	 * @param ZObjectContent $fromContent
	 * @param ZObjectContent $toContent
	 * @param Title $title
	 * @param array $args
	 * @return bool
	 */
	public static function pass( $fromContent, $toContent, $title, $args = [] ): bool {
		$fromId = $args[0] === null ? 0 : (int)substr( $args[0], 1 );
		$toId = $args[1] === null ? PHP_INT_MAX : (int)substr( $args[1], 1 );
		$currentId = (int)substr( $title->getText(), 1 );
		return ( $currentId > $fromId ) && ( $currentId < $toId );
	}
}
