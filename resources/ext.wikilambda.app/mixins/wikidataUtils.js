/**
 * WikiLambda Vue editor: Wikidata utils mixin
 * Mixin with util functions to handle wikidata entities
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

// TODO: move this to a /utils directory
module.exports = exports = {
	methods: {
		/**
		 * Extract the array of wikidata Lexeme IDs referred
		 * in given ZObject
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
	}
};
