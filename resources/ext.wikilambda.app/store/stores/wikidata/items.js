/*!
 * WikiLambda Pinia store: Wikidata Items module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const apiUtils = require( '../../../mixins/api.js' ).methods;
const Constants = require( '../../../Constants.js' );

module.exports = {
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
			const findItemData = ( id ) => state.items[ id ];
			return findItemData;
		},

		/**
		 * Given the rowId of the Wikidata Item entity
		 * returns the rowId of the Wikidata Item Id string.
		 *
		 * @return {Function}
		 */
		getItemIdRow: function () {
			/**
			 * @param {number} rowId
			 * @return {Object|undefined}
			 */
			const findItemIdRow = ( rowId ) => this.getWikidataEntityIdRow( rowId, Constants.Z_WIKIDATA_ITEM );
			return findItemIdRow;
		}

	},

	actions: {
		/**
		 * Stores the Wikidata item data indexed by its Id
		 *
		 * @param {Object} payload
		 * @param {string} payload.id
		 * @param {Object} payload.data
		 * @return {void}
		 */
		setItemData: function ( payload ) {
			// If payload.data is a promise, store it directly
			if ( payload.data && typeof payload.data.then === 'function' ) {
				this.items[ payload.id ] = payload.data;
				return;
			}

			// Otherwise, unwrap the data to select only subset of Wikidata Item data; title and labels
			const unwrap = ( { title, labels } ) => ( { title, labels } );
			this.items[ payload.id ] = unwrap( payload.data );
		},

		/**
		 * Removes the items for the given IDs
		 *
		 * @param {Object} payload
		 * @param {Array<string>} payload.ids - An array of Wikidata Item IDs
		 */
		resetItemData: function ( payload ) {
			payload.ids.forEach( ( id ) => delete this.items[ id ] );
		},

		/**
		 * Calls Wikidata Action API to fetch Wikidata Items
		 * given their Ids.
		 *
		 * @param {Object} payload
		 * @param {Array<string>} payload.ids - An array of Wikidata Item IDs to fetch.
		 * @return {Promise} - A promise that resolves to the fetched data.
		 */
		fetchItems: function ( payload ) {
			// Filter out the fetched or fetching Wikidata Item Ids
			const ids = payload.ids.filter( ( id ) => this.getItemData( id ) === undefined );
			if ( ids.length === 0 ) {
				// If list is empty, do nothing
				return Promise.resolve();
			}
			const request = {
				language: this.getUserLangCode,
				ids: ids.join( '|' )
			};
			const promise = apiUtils.fetchWikidataEntities( request )
				.then( ( data ) => {
					// Once received, store Wikidata Item Ids with their data
					const fetched = data.entities ? Object.keys( data.entities ) : [];
					fetched.forEach( ( id ) => this.setItemData( { id, data: data.entities[ id ] } ) );
					return data;
				} )
				.catch( () => {
					// If fetch fails, remove the Item Ids from the state
					this.resetItemData( { ids } );
				} );

			// Store Wikidata Item Ids with their resolving promise
			ids.forEach( ( id ) => this.setItemData( { id, data: promise } ) );
			return promise;
		}
	}
};
