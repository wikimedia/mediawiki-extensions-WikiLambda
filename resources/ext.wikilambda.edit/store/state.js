/*!
 * WikiLambda Vue editor: Application state
 *
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

module.exports = {

	/**
	 * User selected language and fallback chain
	 */
	zLangs: [],

	/**
	 * Collection of zKey information
	 */
	zKeys: {},

	/**
	 * Collection of zKey labels in the user selected language
	 */
	zKeyLabels: {},

	/**
	 * ZKeys being fetched, awaiting for API response
	 */
	fetchingZKeys: [],

	/**
	 * Collection of MediaWiki language information
	 */
	allLangs: {},

	/**
	 * Status of allLangs being fetched
	 */
	fetchingAllLangs: false
};
