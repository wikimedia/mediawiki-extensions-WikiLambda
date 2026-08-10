<?php

/**
 * WikiLambda CommunityConfiguration UI schema for the client-mode list of
 * recommended Wikifunctions.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Config;

use MediaWiki\Extension\CommunityConfiguration\Schema\UISchema;

/**
 * The list holds ZIDs, so the data schema alone gives a plain chip list of strings, and a sysop
 * has to type ZIDs blind. Ask for our own control instead, which searches functions by label.
 *
 * The stored value does not change. It stays a flat list of ZID strings.
 *
 * @see SuggestedFunctionsSchema
 */
class SuggestedFunctionsUISchema extends UISchema {

	public const ROOT = [
		self::ELEMENTS => [
			[
				self::TYPE => self::TYPE_CONTROL,
				self::SCOPE => '#/properties/SuggestedFunctions',
				self::CONTROL => 'WikiLambda.FunctionLookup',
			],
		],
	];
}
