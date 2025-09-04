/*!
 * WikiLambda Pinia store: Wikidata Entities module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const { searchWikidataEntities, fetchWikidataEntities } = require( '../../../utils/apiUtils.js' );
const Constants = require( '../../../Constants.js' );

module.exports = {
	state: {},
	getters: {
		/**
		 * Returns the batch size for Wikidata API requests
		 *
		 * @return {number}
		 */
		getWikidataBatchSize: function () {
			return Constants.API_LIMIT_WIKIDATA;
		},
		/**
		 * Returns the label data for a Wikidata entity by type and id.
		 *
		 * @param {string} type - The Wikidata entity type.
		 * @param {string} id - The Wikidata entity id.
		 * @return {LabelData|undefined} The label data object, or undefined if not found.
		 */
		getWikidataEntityLabelData: function () {
			/**
			 * @param {string} type
			 * @param {string} id
			 * @return {LabelData|undefined}
			 */
			const findWikidataEntityLabelData = ( type, id ) => {
				switch ( type ) {
					case Constants.Z_WIKIDATA_LEXEME:
					case Constants.Z_WIKIDATA_REFERENCE_LEXEME:
						return this.getLexemeLabelData( id );

					case Constants.Z_WIKIDATA_LEXEME_FORM:
					case Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM:
						return this.getLexemeFormLabelData( id );

					case Constants.Z_WIKIDATA_LEXEME_SENSE:
					case Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE:
						return this.getLexemeSenseLabelData( id );

					case Constants.Z_WIKIDATA_ITEM:
					case Constants.Z_WIKIDATA_REFERENCE_ITEM:
						return this.getItemLabelData( id );

					case Constants.Z_WIKIDATA_PROPERTY:
					case Constants.Z_WIKIDATA_REFERENCE_PROPERTY:
						return this.getPropertyLabelData( id );

					default:
						return undefined;
				}
			};
			return findWikidataEntityLabelData;
		},

		/**
		 * Returns the URL for a Wikidata entity by type and id.
		 *
		 * @return {Function}
		 */
		getWikidataEntityUrl: function () {
			/**
			 * @param {string} type
			 * @param {string} id
			 * @return {LabelData|undefined}
			 */
			const findWikidataEntityUrl = ( type, id ) => {
				switch ( type ) {
					case Constants.Z_WIKIDATA_LEXEME:
					case Constants.Z_WIKIDATA_REFERENCE_LEXEME:
						return this.getLexemeUrl( id );

					case Constants.Z_WIKIDATA_LEXEME_FORM:
					case Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM:
						return this.getLexemeFormUrl( id );

					case Constants.Z_WIKIDATA_LEXEME_SENSE:
					case Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE:
						return this.getLexemeSenseUrl( id );

					case Constants.Z_WIKIDATA_ITEM:
					case Constants.Z_WIKIDATA_REFERENCE_ITEM:
						return this.getItemUrl( id );

					case Constants.Z_WIKIDATA_PROPERTY:
					case Constants.Z_WIKIDATA_REFERENCE_PROPERTY:
						return this.getPropertyUrl( id );

					default:
						return undefined;
				}
			};
			return findWikidataEntityUrl;
		},

		/**
		 * Returns a promise that resolves to the Wikidata entity data by type and id.
		 * If the entity is already cached, returns a resolved promise.
		 * If the entity is being fetched, returns the existing promise.
		 * If the entity hasn't been requested, returns a rejected promise.
		 *
		 * @return {Function}
		 */
		getWikidataEntityDataAsync: function () {
			/**
			 * @param {string} type
			 * @param {string} id
			 * @return {Promise<Object>}
			 */
			const findWikidataEntityDataAsync = ( type, id ) => {
				switch ( type ) {
					case Constants.Z_WIKIDATA_LEXEME:
					case Constants.Z_WIKIDATA_REFERENCE_LEXEME: {
						return this.getLexemeDataAsync( id );
					}

					case Constants.Z_WIKIDATA_LEXEME_FORM:
					case Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM: {
						const [ lexemeId ] = id.split( '-' );
						return this.getLexemeDataAsync( lexemeId ).then( () => {
							const lexemeData = this.getLexemeData( lexemeId );

							if ( lexemeData && lexemeData.forms ) {
								const formData = lexemeData.forms.find( ( item ) => item.id === id );
								if ( formData ) {
									return formData;
								}
							}
							throw new Error( `Lexeme form ${ id } not found` );
						} );
					}

					case Constants.Z_WIKIDATA_LEXEME_SENSE:
					case Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE: {
						const [ lexemeId ] = id.split( '-' );
						return this.getLexemeSensesDataAsync( lexemeId ).then( () => {
							const sensesData = this.getLexemeSensesData( lexemeId );

							if ( sensesData && Array.isArray( sensesData ) ) {
								const senseData = sensesData.find( ( item ) => item.id === id );
								if ( senseData ) {
									return senseData;
								}
							}
							throw new Error( `Lexeme sense ${ id } not found` );
						} );
					}

					case Constants.Z_WIKIDATA_ITEM:
					case Constants.Z_WIKIDATA_REFERENCE_ITEM: {
						return this.getItemDataAsync( id );
					}

					case Constants.Z_WIKIDATA_PROPERTY:
					case Constants.Z_WIKIDATA_REFERENCE_PROPERTY: {
						return this.getPropertyDataAsync( id );
					}
					default:
						return Promise.reject( new Error( `Unknown entity type: ${ type }` ) );
				}
			};
			return findWikidataEntityDataAsync;
		}
	},

	actions: {
		/**
		 * Generic batching method for Wikidata entity fetching.
		 * Splits IDs into batches and makes parallel requests.
		 *
		 * @param {Object} payload
		 * @param {Array<string>} payload.ids - Array of Wikidata entity IDs to fetch
		 * @param {Function} payload.getData - Function to get cached data for an ID
		 * @param {Function} payload.setData - Function to set data for an ID
		 * @param {Function} payload.resetData - Function to reset data for IDs
		 * @return {Promise} - A promise that resolves when all batches complete
		 */
		fetchWikidataEntitiesBatched: function ( { ids, getData, setData, resetData } ) {
			// Filter out the fetched or fetching entity IDs
			const filteredIds = ids.filter( ( id ) => getData( id ) === undefined );

			if ( filteredIds.length === 0 ) {
				// If list is empty, do nothing
				return Promise.resolve();
			}

			// Split into batches of up to Wikidata API limit
			const BATCH_SIZE = this.getWikidataBatchSize;
			const batches = [];
			for ( let i = 0; i < filteredIds.length; i += BATCH_SIZE ) {
				batches.push( filteredIds.slice( i, i + BATCH_SIZE ) );
			}

			const batchRequests = batches.map( ( batchIds ) => {
				const request = {
					language: this.getUserLangCode,
					ids: batchIds.join( '|' )
				};
				return fetchWikidataEntities( request )
					.then( ( data ) => {
						// It might return an error for invalid IDs
						if ( data.error ) {
							resetData( { ids: batchIds } );
							return data;
						}
						// Once received, store entity IDs with their data
						const fetched = data.entities ? Object.keys( data.entities ) : [];
						fetched.forEach( ( id ) => {
							const entity = data.entities[ id ];
							// If entity is undefined, do nothing
							if ( !entity ) {
								return;
							}
							// If entity has a 'missing' property, reset the data
							if ( typeof entity === 'object' && 'missing' in entity ) {
								resetData( { ids: [ id ] } );
								return;
							}
							// Otherwise, store the entity data
							setData( { id, data: entity } );
						} );
						return data;
					} )
					.catch( () => {
						// If fetch fails, remove the IDs from the state
						resetData( { ids: batchIds } );
					} );
			} );

			// If only one batch, return that directly, otherwise wait for all
			const resultPromise = batchRequests.length === 1 ? batchRequests[ 0 ] : Promise.all( batchRequests );

			// Store entity IDs with their resolving promise
			filteredIds.forEach( ( id ) => setData( { id, data: resultPromise } ) );
			return resultPromise;
		},

		/**
		 * Fetches Wikidata entities by type.
		 *
		 * For lexeme forms, transforms form IDs into lexeme IDs before fetching.
		 * Dispatches to the appropriate fetch action based on the entity type.
		 *
		 * @param {Object} payload
		 * @param {string} payload.type - The Wikidata entity type.
		 * @param {Array} payload.ids - The list of entity IDs to fetch.
		 * @return {Promise|undefined} A promise resolving to the fetched entities, or undefined for unknown types.
		 */
		fetchWikidataEntitiesByType: function ( payload ) {
			switch ( payload.type ) {
				case Constants.Z_WIKIDATA_LEXEME:
				case Constants.Z_WIKIDATA_REFERENCE_LEXEME:
					return this.fetchLexemes( payload );

				case Constants.Z_WIKIDATA_LEXEME_FORM:
				case Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM:
					// Transform lexeme form IDs into lexeme IDs:
					payload.ids = payload.ids
						.filter( ( id ) => typeof id === 'string' )
						.map( ( id ) => id.split( '-' )[ 0 ] );
					return this.fetchLexemes( payload );

				case Constants.Z_WIKIDATA_LEXEME_SENSE:
				case Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE:
					// Transform lexeme sense IDs into lexeme IDs:
					payload.ids = payload.ids
						.filter( ( id ) => typeof id === 'string' )
						.map( ( id ) => id.split( '-' )[ 0 ] );
					this.fetchLexemes( payload );
					return this.fetchLexemeSenses( { lexemeIds: payload.ids } );

				case Constants.Z_WIKIDATA_ITEM:
				case Constants.Z_WIKIDATA_REFERENCE_ITEM:
					return this.fetchItems( payload );

				case Constants.Z_WIKIDATA_PROPERTY:
				case Constants.Z_WIKIDATA_REFERENCE_PROPERTY:
					return this.fetchProperties( payload );

				default:
					return undefined;
			}
		},

		/**
		 * Calls Wikidata Action API to search entities by
		 * matching the given searchTerm and entity type.
		 *
		 * @param {Object} payload
		 * @param {string} search
		 * @param {number} searchContinue
		 * @param {string|undefined} type
		 * @param {AbortSignal} [signal] Optional AbortSignal to cancel the request
		 * @return {Promise}
		 */
		lookupWikidataEntities: function ( payload ) {
			const request = Object.assign(
				{},
				payload,
				{ language: this.getUserLangCode }
			);
			return searchWikidataEntities( request );
		}
	}
};
