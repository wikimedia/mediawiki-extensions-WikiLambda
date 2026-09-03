/*!
 * WikiLambda Vue editor: Wikidata Properties store module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const Constants = require( '../../../Constants.js' );
const LabelData = require( '../../classes/LabelData.js' );
const { isWikidataPropertyId } = require( '../../../utils/wikidataUtils.js' );
const storeUtils = require( '../../../utils/storeUtils.js' );

module.exports = {
	state: {
		/**
		 * Cache of Wikidata Property data indexed by Property ID.
		 *
		 * @type {Object<string, Object>}
		 */
		properties: {},
		/**
		 * Map of in-flight Property requests, written by `storeUtils.doDeduplicatedBatchFetch`.
		 * Key: Property ID
		 * Value: Promise of the request which fetches it
		 *
		 * @type {Map<string, Promise>}
		 */
		propertyPromises: new Map(),
		scheduledProps: [],
		scheduledPropsPromise: null
	},
	getters: {
		/**
		 * Returns the Wikidata Property data given its Id,
		 * or undefined if it has not been fetched yet.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getPropertyData: function ( state ) {
			/**
			 * @param {string} id
			 * @return {Object|undefined}
			 */
			const findPropertyData = ( id ) => state.properties[ id ];
			return findPropertyData;
		},

		/**
		 * Returns a promise that resolves to the Wikidata Property data given its Id.
		 * If the property is already cached, returns a resolved promise.
		 * If the property is being fetched, waits for that request.
		 * If the property hasn't been requested, returns a rejected promise.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getPropertyDataAsync: function () {
			/**
			 * @param {string} id
			 * @return {Promise<Object|undefined>} The property data, or undefined
			 *   if the request which was fetching it did not return the property
			 */
			const getPropertyDataAsync = ( id ) => {
				const propertyData = this.getPropertyData( id );

				// If property is already cached, return resolved promise
				if ( propertyData !== undefined ) {
					return Promise.resolve( propertyData );
				}

				// If property is being fetched, wait for that request and then
				// read the cache: the request resolves with every property it
				// asked for, not with this one
				const request = this.propertyPromises.get( id );
				if ( request ) {
					return request.then( () => this.getPropertyData( id ) );
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
			const findPropertyUrl = ( id ) => isWikidataPropertyId( id ) ?
				`${ Constants.WIKIDATA_BASE_URL }/wiki/Property:${ id }` :
				undefined;
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
			// Select only subset of Wikidata Property data; title and labels
			const unwrap = ( ( { title, labels } ) => ( { title, labels } ) );
			this.properties[ payload.id ] = unwrap( payload.data );
		},

		/**
		 * Calls Wikidata Action API to fetch Wikidata Properties
		 * given their Ids.
		 *
		 * @param {Object} payload
		 * @param {Array} payload.ids - An array of Wikidata Property IDs to fetch.
		 * @return {Promise} - A promise which resolves when every given Id has settled.
		 */
		fetchProperties: function ( { ids } ) {
			return storeUtils.doDeduplicatedBatchFetch( {
				inFlight: this.propertyPromises,
				keys: ids,
				getCached: ( id ) => this.getPropertyData( id ),
				setCached: ( id, data ) => this.setPropertyData( { id, data } ),
				run: ( newIds ) => this.schedulePropertiesRequest( newIds )
			} );
		},

		/**
		 * Adds the given Property Ids to the request which the open time window
		 * sends, and opens a window if there is none. (T429766) A page shows
		 * many Wikidata components, and each of them asks for one Id, so the
		 * window collects them into one request instead of one request each.
		 *
		 * @param {Array<string>} ids - An array of Wikidata Property IDs to fetch.
		 * @return {Promise<Object>} - Resolves with the data of every Property in the window
		 */
		schedulePropertiesRequest: function ( ids ) {
			this.scheduledProps = [ ... new Set( [ ...this.scheduledProps, ...ids ] ) ];

			if ( !this.scheduledPropsPromise ) {
				this.scheduledPropsPromise = new Promise( ( resolve, reject ) => {
					setTimeout( () => {
						this.fetchWikidataEntitiesBatched( {
							ids: this.scheduledProps
						} ).then( resolve, reject );
						this.scheduledProps = [];
						this.scheduledPropsPromise = null;
					}, Constants.WIKIDATA_REQUEST_TIME_WINDOW );
				} );
			}

			return this.scheduledPropsPromise;
		}
	}
};
