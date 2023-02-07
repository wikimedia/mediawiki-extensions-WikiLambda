<?php
/**
 * WikiLambda ZObject Authorization Filter interface
 *
 * @file
 * @ingroup Extensions
 * @copyright 2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Authorization;

use MediaWiki\Extension\WikiLambda\ZObjectContent;
use Title;

interface ZObjectFilter {

	/**
	 * ZObject filter method interface.
	 *
	 * @param ZObjectContent $fromContent
	 * @param ZObjectContent $toContent
	 * @param Title $title
	 * @param array $args
	 * @return bool
	 */
	public static function pass(
		$fromContent,
		$toContent,
		$title,
		$args = []
	): bool;
}
