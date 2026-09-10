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
	 * Extract Wikidata Item IDs from a ZObject
	 *
	 * @param {Object} zobject
	 * @return {Array}
	 */
	extractWikidataItemIds: function ( zobject ) {
		const str = JSON.stringify( zobject );
		const regexp = /(Q[1-9]\d*)/g;
		const matches = [ ...str.matchAll( regexp ) ];
		const allMatches = matches.map( ( groups ) => groups[ 0 ] );
		return [ ...new Set( allMatches ) ];
	},
	/**
	 * Whether the input string is a valid Wikidata Entity ID
	 * (Qid, Lid, Pid, Lexeme form or Lexeme sense)
	 *
	 * @param {string} str
	 * @return {boolean}
	 */
	isWikidataEntityId: function ( str ) {
		const regexp = /^([QP][1-9]\d*|L[1-9]\d*(-[FS][1-9]\d*)?)$/;
		return regexp.test( str );
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
	},

	/**
	 * Select the best term from a Wikidata multilingual term map, such as
	 * the lemmas of a Lexeme, the representations of a Form or the glosses
	 * of a Sense.
	 *
	 * The Wikidata API filters labels, descriptions and aliases by the
	 * requested language, but it returns these maps in every language and
	 * with no fallback applied. So walk the fallback chain here, and use
	 * the first term of the map only if no language in the chain has one.
	 *
	 * @param {Object|undefined} terms Map of language code to { language, value }
	 * @param {Array<string>} langCodes Language codes to look for, best first
	 * @return {Object|undefined} The selected term, or undefined if there is none
	 */
	selectTermByLanguage: function ( terms, langCodes ) {
		const available = Object.keys( terms || {} );
		if ( available.length === 0 ) {
			return undefined;
		}
		const match = ( langCodes || [] ).find( ( code ) => available.includes( code ) );
		return terms[ match || available[ 0 ] ];
	}
};

module.exports = wikidataUtils;
