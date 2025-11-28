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
	},
	/**
	 * Whether the input string is a valid Wikidata Item ID (Qid)
	 *
	 * @param {string} str
	 * @return {boolean}
	 */
	isWikidataQid: function ( str ) {
		const regexp = /^Q[1-9]\d*$/;
		return regexp.test( str );
	},
	/**
	 * Whether the input string is a valid Wikidata Lexeme ID
	 *
	 * @param {string} str
	 * @return {boolean}
	 */
	isWikidataLexemeId: function ( str ) {
		const regexp = /^L[1-9]\d*$/;
		return regexp.test( str );
	},
	/**
	 * Whether the input string is a valid Wikidata Lexeme Form ID
	 *
	 * @param {string} str
	 * @return {boolean}
	 */
	isWikidataLexemeFormId: function ( str ) {
		const regexp = /^L[1-9]\d*-F[1-9]\d*$/;
		return regexp.test( str );
	},
	/**
	 * Whether the input string is a valid Wikidata Lexeme Sense ID
	 *
	 * @param {string} str
	 * @return {boolean}
	 */
	isWikidataLexemeSenseId: function ( str ) {
		const regexp = /^L[1-9]\d*-S[1-9]\d*$/;
		return regexp.test( str );
	},
	/**
	 * Whether the input string is a valid Wikidata Property ID
	 *
	 * @param {string} str
	 * @return {boolean}
	 */
	isWikidataPropertyId: function ( str ) {
		const regexp = /^P[1-9]\d*$/;
		return regexp.test( str );
	}
};

module.exports = wikidataUtils;
