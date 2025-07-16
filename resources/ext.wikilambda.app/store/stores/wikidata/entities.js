/*!
 * WikiLambda Pinia store: Wikidata Entities module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const { searchWikidataEntities } = require( '../../../utils/apiUtils.js' );
const Constants = require( '../../../Constants.js' );

module.exports = {
	state: {},

	getters: {
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
			const getWikidataEntityDataAsync = ( type, id ) => {
				switch ( type ) {
					case Constants.Z_WIKIDATA_LEXEME:
					case Constants.Z_WIKIDATA_REFERENCE_LEXEME: {
						return this.getLexemeDataAsync( id );
					}

					case Constants.Z_WIKIDATA_LEXEME_FORM:
					case Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM: {
						// For lexeme forms, we need to get the lexeme data and extract the form
						const [ lexemeId ] = id.split( '-' );
						return this.getLexemeDataAsync( lexemeId ).then( ( lexemeData ) => {
							if ( lexemeData && lexemeData.forms ) {
								const formData = lexemeData.forms.find( ( item ) => item.id === id );
								if ( formData ) {
									return formData;
								}
							}
							throw new Error( `Lexeme form ${ id } not found` );
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
			return getWikidataEntityDataAsync;
		}
	},

	actions: {
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
					payload.ids = payload.ids.map( ( id ) => id.split( '-' )[ 0 ] );
					return this.fetchLexemes( payload );

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
