/**
 * WikiLambda function lookup: the search calls the form control needs.
 *
 * This is a small copy of the two helpers in ext.wikilambda.app/utils/apiUtils.js, not a move of
 * that file. apiUtils.js has twenty exports and pulls in ApiError, Constants and schemata, and
 * ext.wikilambda.app carries fourteen dependencies and 26 Codex components. A control that a
 * community configuration form loads must stay small.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const functionLookupApi = {
	/**
	 * Create the API object that answers a function search.
	 *
	 * The function data lives on the Wikifunctions repository. A client wiki has no function tables
	 * of its own, and the language parameter of the search only accepts the languages the
	 * repository knows, so a client wiki has to ask the repository itself.
	 *
	 * @return {mw.Api|mw.ForeignApi}
	 */
	newApi: function () {
		const foreignUrl = mw.config.get( 'wgWikifunctionsBaseUrl' );
		return foreignUrl ?
			new mw.ForeignApi( `${ foreignUrl }/w/api.php`, { anonymous: true } ) :
			new mw.Api();
	},

	/**
	 * Search for functions by label, or fetch one function by its ZID.
	 *
	 * The search matches on the ZID when the term is a ZID, so the same call both answers what the
	 * user types and finds the label of a ZID that is already in the configuration.
	 *
	 * Note that this never sends the renderable parameter. ZObjectStore::searchFunctions() lets
	 * renderable win over output_type, so asking for both would silently drop the output type.
	 *
	 * @param {Object} payload
	 * @param {string} payload.search The search term, a label fragment or a ZID
	 * @param {string} payload.language The language code to take the labels from
	 * @param {string} [payload.outputType] ZID of the type the function must return
	 * @param {number} [payload.limit] The maximum number of results
	 * @param {AbortSignal} [payload.signal] Signal to cancel the request with
	 * @return {Promise<Array>} The matching functions, each with a page_title and a label
	 */
	searchFunctions: function ( payload ) {
		// Called through the object, as apiUtils.js does, so that a test can replace it.
		const api = functionLookupApi.newApi();

		/* eslint-disable camelcase */
		return api.get( {
			action: 'query',
			list: 'wikilambdasearch_functions',
			format: 'json',
			formatversion: '2',
			wikilambdasearch_functions_search: payload.search,
			wikilambdasearch_functions_language: payload.language,
			wikilambdasearch_functions_output_type: payload.outputType,
			wikilambdasearch_functions_limit: payload.limit || 10
		}, {
			signal: payload.signal
		} ).then( ( data ) => (
			data && data.query ? data.query.wikilambdasearch_functions : []
		) );
		/* eslint-enable camelcase */
	}
};

module.exports = exports = functionLookupApi;
