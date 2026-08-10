<?php

/**
 * WikiLambda CommunityConfiguration UI schema for the list of articles opted in to
 * Abstract Wikipedia content.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Config;

use MediaWiki\Extension\CommunityConfiguration\Schema\UISchema;

/**
 * Each entry of this list pairs a Wikidata item with the local titles that show its Abstract
 * Wikipedia content. From the data schema alone the form gives a generic list of objects with a
 * plain text field for the Qid, so a sysop has no way to tell whether a Qid is the right topic.
 *
 * Ask for our own control, which searches Wikidata by name.
 *
 * The control takes the whole list rather than the Qid field alone, because the first iteration of
 * the UI schema places top-level properties only. The Qid sits at
 * `#/properties/OptedInArticles/items/properties/qid`, and a scope below the top level is rejected,
 * on purpose: a layout of the form cannot describe the subschema of a nested object, and every
 * scope of it would miss. When the UI schema reaches into a nested property, this can become a
 * plain item lookup on the Qid field and leave the shape of the list to the generic array control.
 *
 * The stored value does not change, and neither does what counts as valid: the pattern on the Qid
 * and the one-title minimum stay in the data schema.
 *
 * @see AbstractWikiOptedInArticlesSchema
 */
class AbstractWikiOptedInArticlesUISchema extends UISchema {

	public const ROOT = [
		self::ELEMENTS => [
			[
				self::TYPE => self::TYPE_CONTROL,
				self::SCOPE => '#/properties/OptedInArticles',
				self::CONTROL => 'WikiLambda.OptedInArticles',
			],
		],
	];
}
