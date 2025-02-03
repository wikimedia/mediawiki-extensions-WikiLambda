/*!
 * WikiLambda Vue editor: Vuex Wikidata Items module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const Constants = require( '../../../Constants.js' ),
	apiUtils = require( '../../../mixins/api.js' ).methods;

module.exports = exports = {
	state: {
		items: {}
	},
	getters: {
		/**
		 * Returns the Wikidata Item data given its Id,
		 * the fetch Promise if the fetch request is on the fly,
		 * or undefined if it hasn't been requested yet.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getItemData: function ( state ) {
			/**
			 * @param {string} id
			 * @return {Object|Promise|undefined}
			 */
			function findItemData( id ) {
				return state.items[ id ];
			}
			return findItemData;
		},

		/**
		 * Given the rowId of the Wikidata Item entity
		 * returns the rowId of the Wikidata Item Id string.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getItemIdRow: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {Object|undefined}
			 */
			function findItemId( rowId ) {
				return getters.getWikidataEntityIdRow( rowId, Constants.Z_WIKIDATA_ITEM );
			}
			return findItemId;
		}
	},
	mutations: {
		/**
		 * Stores the Wikidata item data indexed by its Id
		 *
		 * @param {Object} state
		 * @param {Object} payload
		 * @param {string} payload.id
		 * @param {Object} payload.data
		 * @return {void}
		 */
		setItemData: function ( state, payload ) {
			// Select only subset of Wikidata Item data; title and labels
			const unwrap = ( ( { title, labels } ) => ( { title, labels } ) );
			state.items[ payload.id ] = unwrap( payload.data );
		}
	},
	actions: {
		/**
		 * Calls Wikidata Action API to fetch Wikidata Items
		 * given their Ids.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {Array} payload.ids
		 * @return {Promise | undefined}
		 */
		fetchItems: function ( context, payload ) {
			// Filter out the fetched or fetching Wikidata Item Ids
			const ids = payload.ids.filter( ( id ) => context.getters.getItemData( id ) === undefined );
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
					// Once received, store Wikidata Item Ids with their data
					const fetched = data.entities ? Object.keys( data.entities ) : [];
					fetched.forEach( ( id ) => context.commit( 'setItemData', { id, data: data.entities[ id ] } ) );
					return data;
				} );

			// Store Wikidata Item Ids with their resolving promise
			ids.forEach( ( id ) => context.commit( 'setItemData', { id, data: promise } ) );
			return promise;
		}
	}
};
