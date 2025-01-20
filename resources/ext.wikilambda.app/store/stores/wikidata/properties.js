/*!
 * WikiLambda Vue editor: Vuex Wikidata Properties module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const Constants = require( '../../../Constants.js' );
const apiUtils = require( '../../../mixins/api.js' ).methods;

module.exports = {
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
			return ( id ) => state.properties[ id ];
		},

		/**
		 * Given the rowId of the Wikidata Property entity
		 * returns the rowId of the Wikidata Property Id string.
		 *
		 * @return {Function}
		 */
		getPropertyIdRow: function () {
			/**
			 * @param {number} rowId
			 * @return {Object|undefined}
			 */
			return ( rowId ) => this.getWikidataEntityIdRow( rowId, Constants.Z_WIKIDATA_PROPERTY );
		}
	},
	actions: {
		/**
		 * Stores the Wikidata Property data indexed by its Id
		 *
		 * @param {Object} payload
		 * @param {string} payload.id
		 * @param {Object} payload.data
		 */
		setPropertyData: function ( payload ) {
			// Select only subset of Wikidata Property data; title and labels
			const unwrap = ( ( { title, labels } ) => ( { title, labels } ) );
			this.properties[ payload.id ] = unwrap( payload.data );
		},

		/**
		 * Removes the properties for the given IDs
		 *
		 * @param {Object} payload
		 * @param {Array<string>} payload.ids - An array of Wikidata Property IDs
		 */
		resetPropertyData: function ( payload ) {
			payload.ids.forEach( ( id ) => delete this.items[ id ] );
		},

		/**
		 * Calls Wikidata Action API to fetch Wikidata Properties
		 * given their Ids.
		 *
		 * @param {Object} payload
		 * @param {Array} payload.ids
		 * @return {Promise | undefined}
		 */
		fetchProperties: function ( payload ) {
			// Filter out the fetched or fetching Wikidata Property Ids
			const ids = payload.ids.filter( ( id ) => this.getPropertyData( id ) === undefined );
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
					// Once received, store Wikidata Property Ids with their data
					const fetched = data.entities ? Object.keys( data.entities ) : [];
					fetched.forEach( ( id ) => this.setPropertyData( { id, data: data.entities[ id ] } ) );
					return data;
				} )
				.catch( () => {
					// If fetch fails, remove the Property Ids from the state
					this.resetPropertyData( { ids } );
				} );

			// Store Wikidata Property Ids with their resolving promise
			ids.forEach( ( id ) => this.setPropertyData( { id, data: promise } ) );
			return promise;
		}
	}
};
