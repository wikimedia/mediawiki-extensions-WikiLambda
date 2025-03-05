/**
 * WikiLambda Vue editor: Wikidata utilities
 * Utility functions to handle wikidata entities
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const wikidataUtils = {
	/**
	 * Extract Wikidata Lexeme IDs from a ZObject
	 *
	 * @param {Object} zobject
	 * @return {Array}
	 */
	extractWikidataLexemeIds: function ( zobject ) {
		const str = JSON.stringify( zobject );
		const regexp = /(L[1-9]\d*)/g;
		const matches = [ ...str.matchAll( regexp ) ];
		const allMatches = matches.map( ( groups ) => groups[ 0 ] );
		return [ ...new Set( allMatches ) ];
	}
};

module.exports = wikidataUtils;
