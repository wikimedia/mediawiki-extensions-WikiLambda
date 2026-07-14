/*!
 * WikiLambda Pinia store: Wikidata Items module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../../Constants.js' );
const LabelData = require( '../../classes/LabelData.js' );
const { isWikidataQid } = require( '../../../utils/wikidataUtils.js' );
const { fetchWikidataEntities } = require( '../../../utils/apiUtils.js' );

module.exports = {
	state: {
		items: {},
		scheduledItems: [],
		scheduledItemsPromise: null
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
			 * @param {string} [langCode] The language code to prefer; defaults to the user language
			 * @return {LabelData} The `LabelData` object containing label, language code, and directionality.
			 */
			const findItemLabelData = ( id, langCode ) => {
				// If no selected item, return undefined
				if ( !id ) {
					return undefined;
				}
				// If no itemData yet, return item Id
				// Get best label from labels (if any)
				const itemData = this.getItemData( id );
				const langs = itemData ? Object.keys( itemData.labels || {} ) : {};
				if ( langs.length > 0 ) {
					const requestedLangCode = langCode || this.getUserLangCode;
					const label = langs.includes( requestedLangCode ) ?
						itemData.labels[ requestedLangCode ] :
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
			const findItemUrl = ( id ) => isWikidataQid( id ) ?
				`${ Constants.WIKIDATA_BASE_URL }/wiki/${ id }` :
				undefined;
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
			// Otherwise, unwrap the data to select only subset of Wikidata Item data; title, labels and descriptions
			const unwrap = ( { title, labels, descriptions } ) => ( { title, labels, descriptions } );
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
		 * Ensures a Wikidata item's label is available in a specific language,
		 * fetching it from the Wikidata API if it isn't already cached.
		 *
		 * `fetchItems` only fetches and caches one label per item: whatever the
		 * reader's interface language is. For ex, the Abstract preview lets
		 * the reader choose a language separately from their interface language.
		 * This action fetches that specific language and adds it to the cached
		 * item, without erasing any languages already fetched for it.
		 *
		 * Only called after the item itself is already cached, so request
		 * restricts the response to `props: 'labels'` instead of re-fetching the
		 * whole entity.
		 *
		 *
		 * @param {Object} payload
		 * @param {string} payload.id The Wikidata Item ID
		 * @param {string} payload.langCode The language code to ensure is available
		 * @return {Promise}
		 */
		fetchItemLabelInLanguage: function ( { id, langCode } ) {
			if ( !id || !langCode ) {
				return Promise.resolve();
			}
			// First check the item data from cache; if it's missing this
			// language's label, fetch it directly for just this language.
			return this.getItemDataAsync( id )
				.catch( () => undefined )
				.then( ( itemData ) => {
					if ( itemData && itemData.labels && itemData.labels[ langCode ] ) {
						// Already have this language's label; nothing to do.
						return undefined;
					}
					return fetchWikidataEntities( { language: langCode, ids: id, props: 'labels' } );
				} )
				.then( ( data ) => {
					const entity = data && data.entities && data.entities[ id ];
					if ( !entity || !entity.labels || !entity.labels[ langCode ] ) {
						return;
					}
					// Merge the newly fetched label into whatever is cached now,
					// rather than replacing it, so labels already fetched for
					// other languages are preserved.
					const cached = this.getItemData( id );
					const current = ( cached && typeof cached.then !== 'function' ) ?
						cached : { title: id, labels: {}, descriptions: {} };
					this.items[ id ] = Object.assign( {}, current, {
						labels: Object.assign( {}, current.labels, entity.labels )
					} );
				} )
				.catch( () => {
					// Ignore failures: nothing awaits this fetch, so an unhandled rejection
					// here would just be console noise for an optional enhancement.
				} );
		},

		/**
		 * Calls Wikidata Action API to fetch Wikidata Items
		 * given their Ids.
		 *
		 * @param {Object} payload
		 * @param {Array<string>} payload.ids - An array of Wikidata Item IDs to fetch.
		 * @return {Promise} - A promise that resolves to the fetched data.
		 */
		fetchItems: function ( { ids } ) {
			this.scheduledItems = [ ... new Set( [ ...this.scheduledItems, ...ids ] ) ];

			if ( !this.scheduledItemsPromise ) {
				this.scheduledItemsPromise = new Promise( ( resolve, reject ) => {
					setTimeout( () => {
						this.fetchWikidataEntitiesBatched( {
							ids: this.scheduledItems,
							getData: this.getItemData,
							setData: this.setItemData,
							resetData: this.resetItemData
						} ).then( resolve, reject );
						this.scheduledItems = [];
						this.scheduledItemsPromise = null;
					}, Constants.WIKIDATA_REQUEST_TIME_WINDOW );
				} );
			}

			return this.scheduledItemsPromise;
		}
	}
};
