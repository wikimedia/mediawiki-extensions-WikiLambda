/*!
 * WikiLambda Vector 2022 search integration for Repo mode
 * Searches ZObject labels via wikilambdasearch_labels API
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
( function ( mw ) {

	'use strict';

	const utils = require( './utils.js' );

	const DEFAULT_LIMIT = 10;
	const DEFAULT_SHOW_DESCRIPTION = true;

	/**
	 * Show a 'match string' explaining to the user how we chose this result, …
	 *
	 * @param {Object} options
	 * @param {string} options.label Shown label
	 * @param {string} options.ZID ZID
	 * @param {boolean} options.matchIsPrimary Whether match is primary
	 * @param {string} options.matchLang Match language
	 * @param {string} options.matchLabel Match label
	 * @return {string|undefined} Match string or undefined
	 */
	const constructMatchString = function ( { label, ZID, matchIsPrimary, matchLang, matchLabel } ) {

		// But don't add an explainer if  …
		if (
			// … the match is the same as the shown label,
			matchLabel === label ||
			// … the match is the same as the shown ZID (direct search by ZID),
			matchLabel === ZID ||
			// … or is the primary label (so this isn't an alias)
				(
					matchIsPrimary &&
					// … and the label found is in the same language as searched
					matchLang === ( mw.config.get( 'wgWikiLambda' ) && mw.config.get( 'wgWikiLambda' ).zlangZid || 'Z1002' )
				)
		) {
			return undefined;
		}
		// Wrap the match in quotation marks to separate it from the actual label, for clarity
		return mw.msg( 'quotation-marks', [ matchLabel ] );
	};

	/**
	 * Construct description string for ZObject result
	 * Show a 'description' of what kind of object the user has found.
	 * In the main case, this will be a type label and ZID, e.g. "Type (Z4)".
	 * In special cases like Functions, this might also have the return type ZID.
	 *
	 * @param {Object} options
	 * @param {string} options.pageType Page type ZID
	 * @param {string} options.typeLabel Type label
	 * @param {string|undefined} options.returnType Return type ZID
	 * @return {string} Description string
	 */
	const constructDescriptionString = ( { pageType, typeLabel, returnType } ) => {
		// TODO (TKTKTK): Show the Wikidata short description as well // instead if available?
		// In the main case, this will be a type label and ZID, e.g. "Type (Z4)"
		const baseDescription = utils.formatLabelWithId( typeLabel, pageType );
		// In special cases like Functions, this might also have the return type ZID
		// TODO (TKTKTK): Show the input types as well as the output type where appropriate.
		return returnType ?
			`${ baseDescription }${ mw.msg( 'word-separator' ) }\u21D2${ mw.msg( 'word-separator' ) }${ returnType }` :
			baseDescription;
	};

	/**
	 * Transform ZObject label result to search result
	 *
	 * @param {Object} options
	 * @param {Object} options.item ZObject label result
	 * @param {string} options.language Language code
	 * @param {boolean} options.showDescription Whether to show description
	 * @return {Object} Search result object
	 */
	const transformZObjectResult = ( { item, language, showDescription } ) => {
		const {
			page_title: pageTitle,
			page_type: pageType,
			return_type: returnType,
			match_is_primary: matchIsPrimary,
			match_lang: matchLang,
			match_label: matchLabel,
			label,
			type_label: typeLabel
		} = item;

		return {
			value: utils.formatLabelWithId( label, pageTitle ),
			match: constructMatchString( {
				label,
				ZID: pageTitle,
				matchIsPrimary,
				matchLang,
				matchLabel
			} ),
			description: showDescription ?
				constructDescriptionString( {
					pageType,
					typeLabel,
					returnType
				} ) :
				undefined,
			url: utils.buildViewUrl( language, pageTitle )
		};
	};

	/**
	 * Fetch ZObject search results (repo mode)
	 *
	 * @param {Object} options
	 * @param {string} options.query Search query
	 * @param {number} [options.limit=10] Number of results
	 * @param {boolean} [options.showDescription=true] Whether to show description
	 * @param {number|null} [options.offset] Number of results loaded (from Vector); used as offset/limit for continue
	 * @param {string} [options.language] Language code (default from config)
	 * @return {Object} Object with fetch promise and abort function
	 */
	const fetchZObjectResults = ( {
		query,
		limit = DEFAULT_LIMIT,
		showDescription = DEFAULT_SHOW_DESCRIPTION,
		offset = null,
		language = utils.getRequestLanguage()
	} = {} ) => {
		const api = new mw.Api();

		// API uses offset-based pagination: continue = page index = offset/limit
		const searchContinue = offset && limit > 0 ? Math.floor( offset / limit ) : null;

		const data = {
			action: 'query',
			list: 'wikilambdasearch_labels',
			// eslint-disable-next-line camelcase
			wikilambdasearch_search: query,
			// eslint-disable-next-line camelcase
			wikilambdasearch_language: language,
			// eslint-disable-next-line camelcase
			wikilambdasearch_limit: limit,
			// eslint-disable-next-line camelcase
			wikilambdasearch_continue: searchContinue,
			format: 'json',
			formatversion: '2',
			errorformat: 'plaintext'
		};

		const searchResponsePromise = api.get( data )
			.then( ( res ) => {
				const labels = res.query ? res.query.wikilambdasearch_labels : [];
				const searchContinueResponse = res.continue ? res.continue.wikilambdasearch_continue : null;
				const transform = ( item ) => transformZObjectResult( {
					item,
					language,
					showDescription
				} );
				return utils.buildSearchResultPayload( query, labels, searchContinueResponse, transform );
			} );

		return {
			fetch: searchResponsePromise,
			abort: () => api.abort()
		};
	};

	const vectorSearchClient = utils.createVectorSearchClient( fetchZObjectResults );

	module.exports = {
		vectorSearchClient
	};

}( mw ) );
