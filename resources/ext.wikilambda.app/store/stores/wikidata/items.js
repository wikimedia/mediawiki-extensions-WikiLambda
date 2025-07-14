/*!
 * WikiLambda Pinia store: Wikidata Items module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { fetchWikidataEntities } = require( '../../../utils/apiUtils.js' );
const Constants = require( '../../../Constants.js' );
const LabelData = require( '../../classes/LabelData.js' );

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
		 * Returns a promise that resolves to the Wikidata Item data given its Id.
		 * If the item is already cached, returns a resolved promise.
		 * If the item is being fetched, returns the existing promise.
		 * If the item hasn't been requested, returns a rejected promise.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getItemDataAsync: function () {
			/**
			 * @param {string} id
			 * @return {Promise<Object>}
			 */
			const getItemDataAsync = ( id ) => {
				const itemData = this.getItemData( id );

				// If item is already cached (not a promise), return resolved promise
				if ( itemData && typeof itemData.then !== 'function' ) {
					return Promise.resolve( itemData );
				}

				// If item is being fetched (is a promise), return that promise
				if ( itemData && typeof itemData.then === 'function' ) {
					return itemData;
				}

				// If item hasn't been requested, return rejected promise
				return Promise.reject( new Error( `Item ${ id } not found` ) );
			};
			return getItemDataAsync;
		},

		/**
		 * Returns the LabelData object built from the available
		 * labels in the data object of the selected Wikidata Item.
		 * If an Item is selected but it has no labels, returns
		 * LabelData object with the Wikidata Item id as its label.
		 * If no Wikidata Item is selected, returns undefined.
		 *
		 * @param {Object} state
		 * @return {LabelData|undefined}
		 */
		getItemLabelData: function () {
			/**
			 * @param {string} id The item ID
			 * @return {LabelData} The `LabelData` object containing label, language code, and directionality.
			 */
			const findItemLabelData = ( id ) => {
				// If no selected item, return undefined
				if ( !id ) {
					return undefined;
				}
				// If no itemData yet, return item Id
				// Get best label from labels (if any)
				const itemData = this.getItemData( id );
				const langs = itemData ? Object.keys( itemData.labels || {} ) : {};
				if ( langs.length > 0 ) {
					const label = langs.includes( this.getUserLangCode ) ?
						itemData.labels[ this.getUserLangCode ] :
						itemData.labels[ langs[ 0 ] ];
					return new LabelData( id, label.value, null, label.language );
				}
				// Else, return item Id as label
				return new LabelData( id, id, null );
			};
			return findItemLabelData;
		},

		/**
		 * Returns the URL for a given item ID.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getItemUrl: function () {
			/**
			 * @param {string} id
			 * @return {string|undefined}
			 */
			const findItemUrl = ( id ) => id ? `${ Constants.WIKIDATA_BASE_URL }/wiki/${ id }` : undefined;
			return findItemUrl;
		}
	},

	actions: {
		/**
		 * Stores the Wikidata item data indexed by its Id
		 *
		 * @param {Object} payload
		 * @param {string} payload.id
		 * @param {Object} payload.data
		 * @return {undefined}
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
			const promise = fetchWikidataEntities( request )
				.then( ( data ) => {
					// It might return an error for an invalid item Id,
					// in that case, remove the Item Ids from the state
					if ( data.error ) {
						this.resetItemData( { ids } );
						return data;
					}
					// Once received, store Wikidata Item Ids with their data
					const fetched = data.entities ? Object.keys( data.entities ) : [];
					fetched.forEach( ( id ) => {
						const entity = data.entities[ id ];
						// Check if entity exists and has a 'missing' property
						if ( entity && typeof entity === 'object' && 'missing' in entity ) {
							this.resetItemData( { ids: [ id ] } );
						} else if ( entity ) {
							this.setItemData( { id, data: entity } );
						}
					} );
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
