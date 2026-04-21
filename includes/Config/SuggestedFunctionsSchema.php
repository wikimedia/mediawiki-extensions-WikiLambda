<?php

/**
 * WikiLambda CommunityConfiguration schema for the client-mode list of
 * recommended Wikifunctions shown in the VisualEditor function-call dialog.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Config;

use MediaWiki\Extension\CommunityConfiguration\Schema\JsonSchema;

// phpcs:disable Generic.NamingConventions.UpperCaseConstantName.ClassConstantNotUpperCase
class SuggestedFunctionsSchema extends JsonSchema {

	public const SuggestedFunctions = [
		self::TYPE => self::TYPE_ARRAY,
		self::ITEMS => [
			self::TYPE => self::TYPE_STRING,
			self::PATTERN => '^Z[1-9]\\d*$',
		],
		self::MAX_ITEMS => 5,
		self::DEFAULT => [ 'Z20756', 'Z18428' ],
	];
}
