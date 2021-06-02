/*!
 * WikiLambda Vue editor: Store module for language-related state, actions, mutations and getters
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

module.exports = {
	state: {
		/**
		 * User selected language and fallback chain
		 */
		zLangs: [],

		/**
		 * Collection of MediaWiki language information
		 */
		allLangs: {},

		/**
		 * Status of allLangs being fetched
		 */
		fetchingAllLangs: false
	},
	getters: {
		/**
		 * Get the user preferred language, which is also the first element of zLangs.
		 *
		 * @param {Object} state
		 * @return {string}
		 */
		getZLang: function ( state ) {
			if ( state.zLangs.length > 0 ) {
				return state.zLangs[ 0 ];
			} else {
				return 'en';
			}
		},

		/**
		 * Get all available languages
		 *
		 * @param {Object} state
		 * @return {Object} allLangs
		 */
		getAllLangs: function ( state ) {
			return state.allLangs;
		}
	},
	mutations: {
		/**
		 * setZLangs
		 *
		 * @param {Object} state
		 * @param {string[]} zlangs
		 */
		setZLangs: function ( state, zlangs ) {
			state.zLangs = zlangs;
		},

		/**
		 * setAllLangs
		 *
		 * @param {Object} state
		 * @param {Object} allLangs
		 */
		setAllLangs: function ( state, allLangs ) {
			state.allLangs = allLangs;
		},

		/**
		 * setFetchingAllLangs
		 *
		 * @param {Object} state
		 * @param {boolean} fetchingAllLangs
		 */
		setFetchingAllLangs: function ( state, fetchingAllLangs ) {
			state.fetchingAllLangs = fetchingAllLangs;
		}
	},
	actions: {
		/**
		 * Call the mediawiki api to get and store the list of languages in the state.
		 *
		 * @param {Object} context
		 * @return {Promise}
		 */
		fetchAllLangs: function ( context ) {
			var api = new mw.Api(),
				queryType = 'wikilambdasearch_labels',
				allLangs = {};

			if ( $.isEmptyObject( context.state.allLangs ) && !context.state.fetchingAllLangs ) {
				context.commit( 'setFetchingAllLangs', true );

				return api.get( {
					action: 'query',
					format: 'json',
					list: queryType,
					// eslint-disable-next-line camelcase
					wikilambdasearch_search: '',
					// eslint-disable-next-line camelcase
					wikilambdasearch_type: 'Z60',
					// eslint-disable-next-line camelcase
					wikilambdasearch_language: context.getters.getZLang,
					// eslint-disable-next-line camelcase
					wikilambdasearch_limit: 5000
				} ).then( function ( response ) {
					if ( ( 'query' in response ) && ( queryType in response.query ) ) {
						response.query[ queryType ].forEach(
							function ( result ) {
								allLangs[ result.page_title ] = result.label;
							}
						);
					}
					context.commit( 'setAllLangs', allLangs );
				} );
			}
		}
	}
};
