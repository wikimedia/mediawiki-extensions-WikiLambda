/*!
 * WikiLambda Vue editor: Application state
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

module.exports = {
	/**
	 * A Regex validation for a zObject
	 */
	zRegex: new RegExp( /Z[1-9]\d*(K[1-9]\d*)?/ ),
	/**
	 * Store whether the user is in 'expert' mode
	 */
	expertMode: mw.storage.get( 'aw-expert-mode' ) === 'true' || false
};
