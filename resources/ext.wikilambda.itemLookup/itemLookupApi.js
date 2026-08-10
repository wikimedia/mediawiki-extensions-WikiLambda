/**
 * WikiLambda item lookup: the Wikidata calls the form control needs.
 *
 * This is a small copy of a Wikidata helper in ext.wikilambda.app/utils/apiUtils.js, not a
 * move of that file, for the same reason as functionLookupApi.js: a control that a community
 * configuration form loads has to stay small, and apiUtils.js pulls in ApiError, Constants and
 * schemata.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

// Kept in step with Constants.WIKIDATA_BASE_URL in ext.wikilambda.app, which this module must not
// require, because that would pull the whole editor app into a community configuration form.
const WIKIDATA_BASE_URL = 'https://www.wikidata.org';

const itemLookupApi = {
	/**
	 * Create the API object that answers a Wikidata query.
	 *
	 * Anonymous, because the wiki that shows the form is not Wikidata and the reader of a label
	 * needs no account there.
	 *
	 * @return {mw.ForeignApi}
	 */
	newWikidataApi: function () {
		return new mw.ForeignApi( `${ WIKIDATA_BASE_URL }/w/api.php`, { anonymous: true } );
	},

	/**
	 * Fetch the label of each of a list of items, in as few requests as the API allows.
	 *
	 * @param {Object} payload
	 * @param {string[]} payload.ids Item ids, for example `[ 'Q42', 'Q64' ]`
	 * @param {string} payload.language The language code to take the labels from
	 * @param {AbortSignal} [payload.signal] Signal to cancel the request with
	 * @return {Promise<Object>} Map of item id to label, holding only the items that have one
	 */
	fetchItemLabels: function ( payload ) {
		const ids = payload.ids || [];
		if ( ids.length === 0 ) {
			return Promise.resolve( {} );
		}
		const api = itemLookupApi.newWikidataApi();
		const requests = [];
		// The API takes at most fifty items in a request.
		for ( let start = 0; start < ids.length; start += 50 ) {
			requests.push( api.get( {
				action: 'wbgetentities',
				format: 'json',
				formatversion: '2',
				props: 'labels',
				languages: payload.language,
				languagefallback: true,
				ids: ids.slice( start, start + 50 ).join( '|' )
			}, {
				signal: payload.signal
			} ) );
		}

		return Promise.all( requests ).then( ( responses ) => responses.reduce( ( labels, data ) => {
			const entities = ( data && data.entities ) || {};
			Object.keys( entities ).forEach( ( id ) => {
				const label = ( ( entities[ id ].labels || {} )[ payload.language ] || {} ).value;
				if ( label ) {
					labels[ id ] = label;
				}
			} );
			return labels;
		}, {} ) );
	}
};

module.exports = exports = itemLookupApi;
