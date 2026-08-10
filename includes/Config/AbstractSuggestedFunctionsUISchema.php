<?php

/**
 * WikiLambda CommunityConfiguration UI schema for the abstract-mode list of
 * suggested HTML-returning Wikifunctions.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Config;

use MediaWiki\Extension\CommunityConfiguration\Schema\UISchema;

/**
 * As with the client-mode list, ask for the function lookup control instead of a plain chip list
 * of strings.
 *
 * This list has one more rule: Abstract Wikipedia puts the result of the function straight into an
 * article, so the function has to return HTML (Z89). The data schema cannot express that, because
 * it only knows that the value is a ZID. The option tells the control to filter the search, which
 * keeps a sysop from picking a function that cannot work here.
 *
 * The option is a presentation setting only. It does not decide which values are valid, and the
 * validator never sees it. A ZID that returns something else still passes validation, exactly as
 * it does today.
 *
 * The single field sits in a Group, so that the form can explain the HTML rule in a section
 * heading and description.
 *
 * @see AbstractSuggestedFunctionsSchema
 */
class AbstractSuggestedFunctionsUISchema extends UISchema {

	/** @var string ZID of the HTML fragment type, the only return type this list accepts. */
	private const HTML_FRAGMENT_TYPE = 'Z89';

	/** @var string Message that tells the sysop why the search shows fewer functions here. */
	private const HINT_MESSAGE = 'wikilambda-abstractsuggestedfunctions-outputtype-hint';

	public const ROOT = [
		self::ELEMENTS => [
			[
				self::TYPE => self::TYPE_GROUP,
				self::LABEL => 'functions',
				self::ELEMENTS => [
					[
						self::TYPE => self::TYPE_CONTROL,
						self::SCOPE => '#/properties/SuggestedFunctions',
						self::CONTROL => 'WikiLambda.FunctionLookup',
						self::OPTIONS => [
							'outputType' => self::HTML_FRAGMENT_TYPE,
							'hintMessage' => self::HINT_MESSAGE,
						],
						// The module of the control lists the messages it always needs. This one
						// belongs to this list rather than to the control, so the UI schema has to
						// ask for it. Without this the client would only get the key back.
						self::MESSAGES => [ self::HINT_MESSAGE ],
					],
				],
			],
		],
	];
}
