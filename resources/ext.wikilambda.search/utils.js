'use strict';

/*!
 * Shared utilities for WikiLambda search (Abstract Wikipedia and Repo mode)
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const utils = {
	/**
	 * Get the language to use for search requests (zlang or user language).
	 *
	 * @return {string} Language code for search requests
	 */
	getRequestLanguage() {
		const wikiLambda = mw.config.get( 'wgWikiLambda' );
		return ( wikiLambda && wikiLambda.zlang ) || mw.config.get( 'wgUserLanguage' );
	},

	/**
	 * Format a label with an ID in parentheses, e.g. "Paris (Q90)" or "Type (Z4)".
	 *
	 * @param {string} label Display label
	 * @param {string} id Identifier (QID, ZID, etc.)
	 * @return {string} Formatted string
	 */
	formatLabelWithId( label, id ) {
		const sep = mw.msg( 'word-separator' );
		const parens = mw.msg( 'parentheses', id );
		return `${ label }${ sep }${ parens }`;
	},

	/**
	 * Build the view URL for a search result.
	 *
	 * @param {string} language Language code
	 * @param {string} idOrTitle Page ID or title (QID, ZID, or namespaced title)
	 * @return {string} URL path
	 */
	buildViewUrl( language, idOrTitle ) {
		return `/view/${ language }/${ idOrTitle }`;
	},

	/**
	 * Build the standard search result payload for Vector typeahead.
	 *
	 * @param {string} query Original search query
	 * @param {Array} items Raw result items from the API
	 * @param {number|null} searchContinue Continue offset for pagination, or null
	 * @param {Function} transformFn Function mapping each item to a result object
	 * @return {{ query: string, results: Array, searchContinue: number|null }}
	 */
	buildSearchResultPayload( query, items, searchContinue, transformFn ) {
		return {
			query,
			results: ( items || [] ).map( transformFn ),
			searchContinue
		};
	},

	/**
	 * Create a Vector search client that wraps a fetch function.
	 *
	 * @param {Function} fetchFn Function accepting { query, limit, showDescription, offset, language }
	 * @return {Object} Client with fetchByTitle and loadMore
	 */
	createVectorSearchClient( fetchFn ) {
		return {
			fetchByTitle: ( query, limit = 10, showDescription = true ) => fetchFn( {
				query,
				limit,
				showDescription,
				offset: null,
				language: this.getRequestLanguage()
			} ),
			loadMore: ( query, offset, limit = 10, showDescription = true ) => fetchFn( {
				query,
				limit,
				showDescription,
				offset,
				language: this.getRequestLanguage()
			} )
		};
	}
};

module.exports = utils;
