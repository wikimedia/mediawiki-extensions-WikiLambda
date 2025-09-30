/*!
 * WikiLambda Vue editor: Wikidata Properties store module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const Constants = require( '../../../Constants.js' );
const LabelData = require( '../../classes/LabelData.js' );

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
			const findPropertyData = ( id ) => state.properties[ id ];
			return findPropertyData;
		},

		/**
		 * Returns a promise that resolves to the Wikidata Property data given its Id.
		 * If the property is already cached, returns a resolved promise.
		 * If the property is being fetched, returns the existing promise.
		 * If the property hasn't been requested, returns a rejected promise.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getPropertyDataAsync: function () {
			/**
			 * @param {string} id
			 * @return {Promise<Object>}
			 */
			const getPropertyDataAsync = ( id ) => {
				const propertyData = this.getPropertyData( id );

				// If property is already cached (not a promise), return resolved promise
				if ( propertyData && typeof propertyData.then !== 'function' ) {
					return Promise.resolve( propertyData );
				}

				// If property is being fetched (is a promise), return that promise
				if ( propertyData && typeof propertyData.then === 'function' ) {
					return propertyData;
				}

				// If property hasn't been requested, return rejected promise
				return Promise.reject( new Error( `Property ${ id } not found` ) );
			};
			return getPropertyDataAsync;
		},

		/**
		 * Returns the LabelData object built from the available
		 * labels in the data object of the selected Wikidata Property.
		 * If an Property is selected but it has no labels, returns
		 * LabelData object with the Wikidata Property id as its label.
		 * If no Wikidata Property is selected, returns undefined.
		 *
		 * @return {LabelData|undefined}
		 */
		getPropertyLabelData: function () {
			/**
			 * @param {string} id The item ID
			 * @return {LabelData} The `LabelData` object containing label, language code, and directionality.
			 */
			const findPropertyLabelData = ( id ) => {
				// If no selected Property, return undefined
				if ( !id ) {
					return undefined;
				}
				// If no propertyData yet, return Property Id
				// Get best label from labels (if any)
				const propertyData = this.getPropertyData( id );
				const langs = propertyData ? Object.keys( propertyData.labels || {} ) : {};
				if ( langs.length > 0 ) {
					const label = langs.includes( this.getUserLangCode ) ?
						propertyData.labels[ this.getUserLangCode ] :
						propertyData.labels[ langs[ 0 ] ];
					return new LabelData( id, label.value, null, label.language );
				}
				// Else, return Property Id as label
				return new LabelData( id, id, null );
			};
			return findPropertyLabelData;

		},

		/**
		 * Returns the URL for a given property ID.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getPropertyUrl: function () {
			/**
			 * @param {string} id
			 * @return {string|undefined}
			 */
			const findPropertyUrl = ( id ) => id ? `${ Constants.WIKIDATA_BASE_URL }/wiki/Property:${ id }` : undefined;
			return findPropertyUrl;
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
			// If payload.data is a promise, store it directly
			if ( payload.data && typeof payload.data.then === 'function' ) {
				this.properties[ payload.id ] = payload.data;
				return;
			}

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
			payload.ids.forEach( ( id ) => delete this.properties[ id ] );
		},

		/**
		 * Calls Wikidata Action API to fetch Wikidata Properties
		 * given their Ids.
		 *
		 * @param {Object} payload
		 * @param {Array} payload.ids - An array of Wikidata Property IDs to fetch.
		 * @return {Promise | undefined} - A promise that resolves to the fetched data.
		 */
		fetchProperties: function ( { ids } ) {
			return this.fetchWikidataEntitiesBatched( {
				ids,
				getData: this.getPropertyData,
				setData: this.setPropertyData,
				resetData: this.resetPropertyData
			} );
		}
	}
};
