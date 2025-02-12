/**
 * WikiLambda Vue editor: API calls mixin
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../Constants.js' ),
	ApiError = require( '../store/classes/ApiError.js' ),
	hybridToCanonical = require( './schemata.js' ).methods.hybridToCanonical;

/* eslint-disable camelcase */
module.exports = exports = {
	methods: {
		/**
		 * Calls the wikilambda_function_call internal API
		 * https://www.mediawiki.org/wiki/Extension:WikiLambda/API#wikilambda_function_call
		 *
		 * Needs error handling.
		 *
		 * @param {Object} zobject
		 * @return {Promise}
		 */
		performFunctionCall: function ( zobject ) {
			const api = new mw.Api();
			const canonicalJson = JSON.stringify( hybridToCanonical( zobject ) );
			return api.post( {
				action: 'wikilambda_function_call',
				wikilambda_function_call_zobject: canonicalJson,
				uselang: mw.config.get( 'wgWikiLambda' ).zlang
			} ).then( ( data ) => {
				const maybeNormalResponse = JSON.parse( data.wikilambda_function_call.data );
				const response = hybridToCanonical( maybeNormalResponse );
				const result = response[ Constants.Z_RESPONSEENVELOPE_VALUE ];
				const metadata = response[ Constants.Z_RESPONSEENVELOPE_METADATA ];
				return { response, result, metadata };
			} ).catch( ApiError.fromMwApiRejection );
		},
		/**
		 * Calls the wikilambda_edit internal API
		 * https://www.mediawiki.org/wiki/Extension:WikiLambda/API#wikilambda_edit
		 *
		 * Needs error handling.
		 *
		 * @param {Object} payload
		 * @param {Object} payload.zobject The canonical ZObject to update
		 * @param {Object} payload.zid The zid of the object to update or undefined if new object
		 * @param {Object} payload.summary The update summary
		 * @return {Promise}
		 */
		saveZObject: function ( payload ) {
			const api = new mw.Api();
			return api.postWithEditToken( {
				action: 'wikilambda_edit',
				summary: payload.summary || '',
				zid: payload.zid,
				zobject: JSON.stringify( payload.zobject ),
				uselang: mw.config.get( 'wgWikiLambda' ).zlang
			} )
				.then( ( data ) => data.wikilambda_edit )
				.catch( ApiError.fromMwApiRejection );
		},
		/**
		 * Calls the wikilambdaload_zobjects internal API
		 * https://www.mediawiki.org/wiki/Extension:WikiLambda/API#wikilambdaload_zobjects
		 *
		 * Doesn't need error handling.
		 *
		 * @param {Object} payload
		 * @param {string} payload.zids The zids to request, separated by pipes. E.g. 'Z1|Z2'
		 * @param {string|undefined} payload.revisions The revisions to request, separated by pipes. E.g. '100|101'
		 * @param {string|undefined} payload.language The preferred language code or none
		 * @param {boolean|undefined} payload.dependencies Whether to fetch their dependencies too
		 * @return {Promise}
		 */
		fetchZObjects: function ( payload ) {
			const api = new mw.Api();
			return api.get( {
				action: 'query',
				list: 'wikilambdaload_zobjects',
				format: 'json',
				wikilambdaload_zids: payload.zids,
				wikilambdaload_revisions: payload.revisions,
				wikilambdaload_language: payload.language,
				wikilambdaload_get_dependencies: payload.dependencies ? 'true' : 'false'
			} ).then( ( data ) => data.query.wikilambdaload_zobjects );
		},
		/**
		 * Calls the wikilambdasearch_labels internal API
		 * https://www.mediawiki.org/wiki/Extension:WikiLambda/API#wikilambdasearch_labels
		 *
		 * Doesn't need error handling.
		 *
		 * @param {Object} payload
		 * @param {string} payload.input Substring to search by
		 * @param {string} payload.type Type of objects to retrieve
		 * @param {string} payload.returnType Retrieve also functions of a given output type
		 * @param {boolean} payload.strictType Exclude functions that return anything/Z1
		 * @param {string} payload.language The user language code
		 * @param {number} payload.searchContinue When more results are available, use this to continue
		 * @param {number} payload.limit The maximum number of results to return
		 * @return {Promise<Object>|undefined}
		 * - Promise resolving to an object with 'labels' and 'continue'
		 */
		searchLabels: function ( payload ) {
			const api = new mw.Api();
			return api.get( {
				action: 'query',
				list: 'wikilambdasearch_labels',
				wikilambdasearch_search: payload.input,
				wikilambdasearch_type: payload.type,
				wikilambdasearch_return_type: payload.returnType,
				wikilambdasearch_strict_return_type: payload.strictType,
				wikilambdasearch_language: payload.language,
				wikilambdasearch_limit: payload.limit,
				wikilambdasearch_continue: payload.searchContinue
			} ).then( ( data ) => ( {
				labels: data.query ? data.query.wikilambdasearch_labels : [],
				searchContinue: data.continue ? Number( data.continue.wikilambdasearch_continue ) : null
			} ) );
		},
		/**
		 * Calls the wikilambda_perform_test internal API
		 * https://www.mediawiki.org/wiki/Extension:WikiLambda/API#wikilambda_perform_test
		 *
		 * @param {Object} payload
		 * @param {string} payload.functionZid Zid of the function to test
		 * @param {boolean} payload.nocache Request the orchestrator to not cache the results
		 * @param {Array} payload.implementations List of implementations to test
		 * @param {Array} payload.testers List of tests to run
		 * @return {Promise}
		 */
		performTests: function ( payload ) {
			const api = new mw.Api();
			return api.get( {
				action: 'wikilambda_perform_test',
				wikilambda_perform_test_zfunction: payload.functionZid,
				wikilambda_perform_test_zimplementations: payload.implementations.join( '|' ),
				wikilambda_perform_test_ztesters: payload.testers.join( '|' ),
				wikilambda_perform_test_nocache: payload.nocache || false,
				uselang: mw.config.get( 'wgWikiLambda' ).zlang
			} )
				.then( ( data ) => data.query.wikilambda_perform_test )
				.catch( ApiError.fromMwApiRejection );
		},
		/**
		 * Calls the wikilambdafn_search internal API
		 * https://www.mediawiki.org/wiki/Extension:WikiLambda/API#wikilambdafn_search
		 *
		 * Doesn't need error handling.
		 *
		 * @param {Object} payload
		 * @param {string} payload.functionZid Zid of the function to test
		 * @param {string} payload.type What type of object to fetch (Z20 or Z14)
		 * @return {Promise}
		 */
		fetchFunctionObjects: function ( payload ) {
			const api = new mw.Api();
			return api.get( {
				action: 'query',
				list: 'wikilambdafn_search',
				format: 'json',
				wikilambdafn_zfunction_id: payload.functionZid,
				wikilambdafn_type: payload.type,
				wikilambdafn_limit: Constants.API_LIMIT_MAX
			} ).then( ( data ) => data.query.wikilambdafn_search );
		},
		/**
		 * Calls the wbsearchentities Wikidata Action API
		 * https://www.wikidata.org/w/api.php?action=help&modules=wbsearchentities
		 *
		 * @param {Object} payload
		 * @param {string} payload.language user language code
		 * @param {string} payload.type type of Wikidata entity
		 * @param {string} payload.search search term
		 * @param {number} payload.searchContinue When more results are available, use this to continue
		 * @return {Promise}
		 */
		searchWikidataEntities: function ( payload ) {
			const params = new URLSearchParams( {
				origin: '*',
				action: 'wbsearchentities',
				format: 'json',
				language: payload.language,
				uselang: payload.language,
				search: payload.search,
				type: payload.type,
				limit: '10',
				props: 'url'
			} );
			// Append the 'continue' parameter only if it's set
			if ( payload.searchContinue ) {
				params.append( 'continue', payload.searchContinue );
			}
			return fetch( `${ Constants.WIKIDATA_BASE_URL }/w/api.php?${ params.toString() }` )
				.then( ( response ) => response.json() )
				.then( ( data ) => ( {
					search: data.search ? data.search : [],
					searchContinue: data[ 'search-continue' ] ? Number( data[ 'search-continue' ] ) : null
				} ) );
		},
		/**
		 * Calls the wbgetentities Wikidata Action API
		 * https://www.wikidata.org/w/api.php?action=help&modules=wbgetentities
		 *
		 * @param {Object} payload
		 * @param {string} payload.language user language code
		 * @param {Array} payload.ids entity Ids to fetch
		 * @return {Promise}
		 */
		fetchWikidataEntities: function ( payload ) {
			const params = new URLSearchParams( {
				origin: '*',
				action: 'wbgetentities',
				format: 'json',
				languages: [ payload.language ],
				languagefallback: true,
				ids: payload.ids
			} );
			return fetch( `${ Constants.WIKIDATA_BASE_URL }/w/api.php?${ params.toString() }` )
				.then( ( response ) => response.json() );
		}
	}
};
