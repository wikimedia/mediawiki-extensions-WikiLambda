<?php

/**
 * WikiLambda CommunityConfiguration schema for the abstract-mode list of
 * suggested HTML-returning Wikifunctions shown in the Abstract Article
 * "Add fragment" menu.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Config;

use MediaWiki\Extension\CommunityConfiguration\Schema\JsonSchema;

// phpcs:disable Generic.NamingConventions.UpperCaseConstantName.ClassConstantNotUpperCase
class AbstractSuggestedFunctionsSchema extends JsonSchema {

	public const SuggestedFunctions = [
		self::TYPE => self::TYPE_ARRAY,
		self::ITEMS => [
			self::TYPE => self::TYPE_STRING,
			self::PATTERN => '^Z[1-9]\\d*$',
		],
		self::MAX_ITEMS => 10,
		self::DEFAULT => [ 'Z31465', 'Z32123', 'Z31331', 'Z31921', 'Z31870' ],
	];
}
