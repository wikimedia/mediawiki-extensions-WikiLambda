<?php

/**
 * WikiLambda CommunityConfiguration schema for the abstract-client-mode list of
 * opted-in articles to show in place of the local article when the local article
 * is missing. Each element contains the local title mapped to the Qid that identifies
 * the Abstract Wikipedia page that powers the page.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Config;

use MediaWiki\Extension\CommunityConfiguration\Schema\JsonSchema;

// phpcs:disable Generic.NamingConventions.UpperCaseConstantName.ClassConstantNotUpperCase
class AbstractWikiOptedInArticlesSchema extends JsonSchema {
	public const OptedInArticles = [
		self::TYPE => self::TYPE_ARRAY,
		self::ITEMS => [
			self::TYPE => self::TYPE_OBJECT,
			self::PROPERTIES => [
				'title' => [
					self::TYPE => self::TYPE_ARRAY,
					self::ITEMS => [
						self::TYPE => self::TYPE_STRING
					],
					self::MIN_ITEMS => 1
				],
				'qid' => [
					self::TYPE => self::TYPE_STRING,
					self::PATTERN => '^Q[1-9]\\d*$',
				],
			],
			self::REQUIRED => [ 'title', 'qid' ],
			self::ADDITIONAL_PROPERTIES => false,
		],
		self::DEFAULT => [],
	];
}
