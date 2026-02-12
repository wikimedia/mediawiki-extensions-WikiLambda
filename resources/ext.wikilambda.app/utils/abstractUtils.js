/**
 * WikiLambda Vue editor: Abstract Wikipedia utility functions
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const abstractUtils = {
	/**
	 * Build the fragment cache key from keyPath and language Zid.
	 *
	 * @param {string} keyPath
	 * @param {string} languageZid
	 * @return {string}
	 */
	getFragmentCacheKey: function ( keyPath, languageZid ) {
		return `${ keyPath }|${ languageZid }`;
	}
};

module.exports = abstractUtils;
