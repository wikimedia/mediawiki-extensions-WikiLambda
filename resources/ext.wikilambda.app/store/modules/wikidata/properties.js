/*!
 * WikiLambda Vue editor: Vuex Wikidata Properties module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const Constants = require( '../../../Constants.js' ),
	apiUtils = require( '../../../mixins/api.js' ).methods;

module.exports = exports = {
	state: {
		properties: {}
	},
	getters: {
		/**
		 * Returns the Wikidata Property data given its Id,
		 * the fetch Promise if the fetch request is on the fly,
		 * or undefined if it hasn't been requested yet.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getPropertyData: function ( state ) {
			/**
			 * @param {string} id
			 * @return {Object|Promise|undefined}
			 */
			function findPropertyData( id ) {
				return state.properties[ id ];
			}
			return findPropertyData;
		},

		/**
		 * Given the rowId of the Wikidata Property entity
		 * returns the rowId of the Wikidata Property Id string.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getPropertyIdRow: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {Object|undefined}
			 */
			function findPropertyId( rowId ) {
				return getters.getWikidataEntityIdRow( rowId, Constants.Z_WIKIDATA_PROPERTY );
			}
			return findPropertyId;
		}
	},
	mutations: {
		/**
		 * Stores the Wikidata Property data indexed by its Id
		 *
		 * @param {Object} state
		 * @param {Object} payload
		 * @param {string} payload.id
		 * @param {Object} payload.data
		 */
		setPropertyData: function ( state, payload ) {
			// Select only subset of Wikidata Property data; title and labels
			const unwrap = ( ( { title, labels } ) => ( { title, labels } ) );
			state.properties[ payload.id ] = unwrap( payload.data );
		}
	},
	actions: {
		/**
		 * Calls Wikidata Action API to fetch Wikidata Properties
		 * given their Ids.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {Array} payload.ids
		 * @return {Promise | undefined}
		 */
		fetchProperties: function ( context, payload ) {
			// Filter out the fetched or fetching Wikidata Property Ids
			const ids = payload.ids.filter( ( id ) => context.getters.getPropertyData( id ) === undefined );
			if ( ids.length === 0 ) {
				// If list is empty, do nothing
				return;
			}
			const request = {
				language: context.getters.getUserLangCode,
				ids: ids.join( '|' )
			};
			const promise = apiUtils.fetchWikidataEntities( request )
				.then( ( data ) => {
					// Once received, store Wikidata Property Ids with their data
					const fetched = data.entities ? Object.keys( data.entities ) : [];
					fetched.forEach( ( id ) => context.commit( 'setPropertyData', { id, data: data.entities[ id ] } ) );
					return data;
				} );

			// Store Wikidata Property Ids with their resolving promise
			ids.forEach( ( id ) => context.commit( 'setPropertyData', { id, data: promise } ) );
			return promise;
		}
	}
};
