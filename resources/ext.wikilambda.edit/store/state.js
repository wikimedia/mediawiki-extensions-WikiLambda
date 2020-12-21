/*!
 * WikiLambda Vue editor: Application state
 *
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

module.exports = {

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
	fetchingZKeys: []
};
