/*!
 * WikiLambda Pinia store: Wikidata Lexemes module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../../Constants.js' );
const LabelData = require( '../../classes/LabelData.js' );
const { getNestedProperty } = require( '../../../utils/miscUtils.js' );
const {
	isWikidataLexemeId,
	isWikidataLexemeFormId,
	isWikidataLexemeSenseId,
	selectTermByLanguage
} = require( '../../../utils/wikidataUtils.js' );
const storeUtils = require( '../../../utils/storeUtils.js' );

module.exports = {
	state: {
		/**
		 * Cache of Lexeme data indexed by Lexeme ID.
		 *
		 * @type {Object<string, Object>}
		 */
		lexemes: {},
		/**
		 * Map of in-flight Lexeme requests, written by `storeUtils.doDeduplicatedBatchFetch`.
		 * Key: Lexeme ID
		 * Value: Promise of the request which fetches it
		 *
		 * @type {Map<string, Promise>}
		 */
		lexemePromises: new Map(),
		senses: {},
		scheduledLexemes: [],
		scheduledLexemesPromise: null
	},

	getters: {
		/**
		 * Returns the Lexeme object of a given ID,
		 * or undefined if it has not been fetched yet.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getLexemeData: function ( state ) {
			/**
			 * @param {string} id
			 * @return {Object|undefined}
			 */
			const findLexemeData = ( id ) => state.lexemes[ id ];
			return findLexemeData;
		},

		/**
		 * Returns a promise that resolves to the Lexeme data given its Id.
		 * If the lexeme is already cached, returns a resolved promise.
		 * If the lexeme is being fetched, waits for that request.
		 * If the lexeme hasn't been requested, returns a rejected promise.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getLexemeDataAsync: function () {
			/**
			 * @param {string} id
			 * @return {Promise<Object|undefined>} The lexeme data, or undefined if
			 *   the request which was fetching it did not return the lexeme
			 */
			const findLexemeDataAsync = ( id ) => {
				const lexemeData = this.getLexemeData( id );

				// If lexeme is already cached, return resolved promise
				if ( lexemeData !== undefined ) {
					return Promise.resolve( lexemeData );
				}

				// If lexeme is being fetched, wait for that request and then read
				// the cache: the request resolves with every lexeme it asked for,
				// not with this one
				const request = this.lexemePromises.get( id );
				if ( request ) {
					return request.then( () => this.getLexemeData( id ) );
				}

				// If lexeme hasn't been requested, return rejected promise
				return Promise.reject( new Error( `Lexeme ${ id } not found` ) );
			};
			return findLexemeDataAsync;
		},
		/**
		 * Returns the processed senses data for a given lexeme ID,
		 * or undefined if it has not been requested yet.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getLexemeSensesData: function ( state ) {
			/**
			 * @param {string} lexemeId
			 * @return {Array|undefined}
			 */
			const findLexemeSensesData = ( lexemeId ) => state.senses[ lexemeId ];
			return findLexemeSensesData;
		},

		/**
		 * Returns a promise that resolves to the processed senses data for a given lexeme ID.
		 * If the senses are already processed, returns a resolved promise.
		 * If the senses haven't been requested, returns a rejected promise.
		 *
		 * @return {Function}
		 */
		getLexemeSensesDataAsync: function () {
			/**
			 * @param {string} lexemeId
			 * @return {Promise<Array>}
			 */
			const findLexemeSensesDataAsync = ( lexemeId ) => {
				const sensesData = this.getLexemeSensesData( lexemeId );

				// If senses are already processed, return resolved promise
				if ( sensesData ) {
					return Promise.resolve( sensesData );
				}

				// If senses haven't been requested, return rejected promise
				return Promise.reject( new Error( `Senses for lexeme ${ lexemeId } not found` ) );
			};
			return findLexemeSensesDataAsync;
		},

		/**
		 * Returns the Lexeme form object of a given ID,
		 * or undefined if it hasn't been requested yet
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getLexemeFormData: function ( state ) {
			/**
			 * @param {string} id
			 * @return {Object|undefined}
			 */
			const findLexemeFormData = ( id ) => {
				const [ lexemeId ] = id.split( '-' );
				const lexemeData = state.lexemes[ lexemeId ];
				return ( lexemeData && lexemeData.forms ) ?
					lexemeData.forms.find( ( item ) => item.id === id ) :
					undefined;
			};
			return findLexemeFormData;
		},

		/**
		 * Returns the LabelData object built from the available
		 * lemmas in the data object of the selected Lexeme.
		 * If a Lexeme is selected but it has no lemmas, returns
		 * LabelData object with the Lexeme id as its display label.
		 * If no Lexeme is selected, returns undefined.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getLexemeLabelData: function () {
			/**
			 * @param {string} id The lexeme ID
			 * @return {LabelData|undefined} The `LabelData` object containing label, language code, and directionality.
			 */
			const findLexemeLabelData = ( id ) => {
				// If no selected Lexeme, return undefined
				if ( !id ) {
					return undefined;
				}
				// If no lexemeData yet, return Lexeme Id
				// Get best label from lemmas (if any)
				const lexemeData = this.getLexemeData( id );
				const lemma = selectTermByLanguage(
					lexemeData ? lexemeData.lemmas : undefined,
					this.getFallbackLanguageCodes
				);
				if ( lemma ) {
					return new LabelData( id, lemma.value, null, lemma.language );
				}
				// Else, return Lexeme Id as label
				return new LabelData( id, id, null );
			};
			return findLexemeLabelData;
		},

		/**
		 * Returns the LabelData object built from the available
		 * lemmas in the data object of the selected Lexeme.
		 * If a Lexeme is selected but it has no lemmas, returns
		 * LabelData object with the Lexeme id as its display label.
		 * If no Lexeme is selected, returns undefined.
		 *
		 * @return {Function}
		 */
		getLexemeFormLabelData: function () {
			/**
			 * @param {string} id The Lexeme form ID
			 * @return {LabelData|undefined} The `LabelData` object containing label, language code, and directionality.
			 */
			const findLexemeFormLabelData = ( id ) => {
				// If no selected Lexeme, return undefined
				if ( !id ) {
					return undefined;
				}
				// If no lexemeFormData yet, return Lexeme Id
				const lexemeFormData = this.getLexemeFormData( id );
				// Get best label from representations (if any)
				const rep = selectTermByLanguage(
					lexemeFormData ? lexemeFormData.representations : undefined,
					this.getFallbackLanguageCodes
				);
				if ( rep ) {
					return new LabelData( id, rep.value, null, rep.language );
				}
				// Else, return Lexeme Id as label
				return new LabelData( id, id, null );
			};
			return findLexemeFormLabelData;
		},

		/**
		 * Returns the URL for a given lexeme ID.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getLexemeUrl: function () {
			/**
			 * @param {string} id
			 * @return {string|undefined}
			 */
			const findLexemeUrl = ( id ) => isWikidataLexemeId( id ) ?
				`${ Constants.WIKIDATA_BASE_URL }/wiki/Lexeme:${ id }` :
				undefined;
			return findLexemeUrl;
		},

		/**
		 * Returns the URL for a given lexeme form ID.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getLexemeFormUrl: function () {
			/**
			 * @param {string} id
			 * @return {string|undefined}
			 */
			const findLexemeFormUrl = ( id ) => {
				if ( !isWikidataLexemeFormId( id ) ) {
					return undefined;
				}
				const [ lexemeId = '', formId = '' ] = id.split( '-' );
				return `${ Constants.WIKIDATA_BASE_URL }/wiki/Lexeme:${ lexemeId }#${ formId }`;
			};
			return findLexemeFormUrl;
		},

		/**
		 * Returns the Lexeme sense object of a given ID,
		 * or undefined if it hasn't been requested yet
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getLexemeSenseData: function ( state ) {
			/**
			 * @param {string} id
			 * @return {Object|undefined}
			 */
			const findLexemeSenseData = ( id ) => {
				const [ lexemeId ] = id.split( '-' );
				const sensesData = state.senses[ lexemeId ];
				return ( sensesData && Array.isArray( sensesData ) ) ?
					sensesData.find( ( item ) => item.id === id ) :
					undefined;
			};
			return findLexemeSenseData;
		},

		/**
		 * Returns the LabelData object built from the available
		 * representations in the data object of the selected Lexeme Sense.
		 * If a Lexeme Sense is selected but it has no representations, returns
		 * LabelData object with the Lexeme Sense id as its display label.
		 * If no Lexeme Sense is selected, returns undefined.
		 *
		 * @return {Function}
		 */
		getLexemeSenseLabelData: function () {
			/**
			 * @param {string} id The Lexeme sense ID
			 * @return {LabelData|undefined} The `LabelData` object containing label, language code, and directionality.
			 */
			const findLexemeSenseLabelData = ( id ) => {
				if ( !id ) {
					return undefined;
				}
				// If no lexemeSenseData yet, return Lexeme Sense Id
				const lexemeSenseData = this.getLexemeSenseData( id );

				// Get best label from glosses (if any)
				const gloss = selectTermByLanguage(
					lexemeSenseData ? lexemeSenseData.glosses : undefined,
					this.getFallbackLanguageCodes
				);
				if ( gloss ) {
					return new LabelData( id, gloss.value, null, gloss.language );
				}
				// Else, return Lexeme Id as label
				return new LabelData( id, id, null );
			};
			return findLexemeSenseLabelData;
		},

		/**
		 * Returns the URL for a given lexeme sense ID.
		 *
		 * @return {Function}
		 */
		getLexemeSenseUrl: function () {
			/**
			 * @param {string} id
			 * @return {string|undefined}
			 */
			const findLexemeSenseUrl = ( id ) => {
				if ( !isWikidataLexemeSenseId( id ) ) {
					return undefined;
				}
				const [ lexemeId = '', senseId = '' ] = id.split( '-' );
				return `${ Constants.WIKIDATA_BASE_URL }/wiki/Lexeme:${ lexemeId }#${ senseId }`;
			};
			return findLexemeSenseUrl;
		}
	},

	actions: {
		/**
		 * Stores the lexeme data indexed by its Id
		 *
		 * @param {Object} payload
		 * @param {string} payload.id
		 * @param {Object} payload.data
		 * @return {undefined}
		 */
		setLexemeData: function ( payload ) {
			// Unwrap the data to select only subset of Lexeme data; title, forms, senses and lemmas
			const unwrap = ( { title, forms, senses, lemmas } ) => ( { title, forms, senses, lemmas } );
			this.lexemes[ payload.id ] = unwrap( payload.data );
		},

		/**
		 * Stores the processed senses data for a given lexeme ID
		 *
		 * @param {Object} payload
		 * @param {string} payload.lexemeId
		 * @param {Array|Promise} payload.data
		 * @return {undefined}
		 */
		setLexemeSensesData: function ( payload ) {
			this.senses[ payload.lexemeId ] = payload.data;
		},

		/**
		 * Removes the processed senses data for the given lexeme IDs
		 *
		 * @param {Object} payload
		 * @param {Array<string>} payload.lexemeIds - An array of Wikidata Lexeme IDs
		 */
		resetLexemeSensesData: function ( payload ) {
			payload.lexemeIds.forEach( ( lexemeId ) => delete this.senses[ lexemeId ] );
		},

		/**
		 * Fetches the fallback labels for a single sense from its associated item.
		 *
		 * @param {Object} sense - The initial lexeme sense object
		 * @return {Promise<Object>} - Promise that resolves to a new sense object
		 */
		fetchLexemeSenseFallbackLabels: function ( sense ) {
			const claims = sense.claims;
			const itemId = getNestedProperty( claims, 'P5137.0.mainsnak.datavalue.value.id' );

			// Unlike the display getters, this must not accept a gloss in just any
			// language: a gloss the user cannot read is what we are replacing here.
			const hasReadableGloss = this.getFallbackLanguageCodes.some(
				( code ) => code in sense.glosses );

			// We do nothing if:
			// - there is already a gloss in one of the user's languages for this sense
			// - there is no 'item for this sense' to fetch for this sense
			if ( hasReadableGloss || !itemId ) {
				return Promise.resolve( sense );
			}

			// First try to get the item data from cache, then fetch if needed
			return this.getItemDataAsync( itemId )
				.catch( () => this.fetchItems( { ids: [ itemId ] } ).then( () => this.getItemDataAsync( itemId ) ) )
				.then( ( itemData ) => {
					// Check if the item has a label in the user's language
					const label = itemData.labels[ this.getUserLangCode ];
					const description = itemData.descriptions[ this.getUserLangCode ];
					// If there is no label, return the original sense
					if ( !label ) {
						return sense;
					}
					// Otherwise, create a new sense object with the fallback label and return it
					const processedSense = Object.assign( {}, sense );
					processedSense.glosses = Object.assign( {}, sense.glosses );
					processedSense.glosses[ this.getUserLangCode ] = {
						value: description ? `${ label.value } - ${ description.value }` : label.value,
						language: label.language
					};
					return processedSense;
				} )
				.catch( () => sense );
		},

		/**
		 * Calls Wikidata Action API to fetch Wikidata Lexemes
		 * given their Ids.
		 *
		 * @param {Object} payload
		 * @param {Array<string>} payload.ids - An array of Wikidata Lexeme IDs to fetch.
		 * @return {Promise} - A promise which resolves when every given Id has settled.
		 */
		fetchLexemes: function ( { ids } ) {
			return storeUtils.doDeduplicatedBatchFetch( {
				inFlight: this.lexemePromises,
				keys: ids,
				getCached: ( id ) => this.getLexemeData( id ),
				setCached: ( id, data ) => this.setLexemeData( { id, data } ),
				run: ( newIds ) => this.scheduleLexemesRequest( newIds )
			} );
		},

		/**
		 * Adds the given Lexeme Ids to the request which the open time window
		 * sends, and opens a window if there is none. (T429766) A page shows
		 * many Wikidata components, and each of them asks for one Id, so the
		 * window collects them into one request instead of one request each.
		 *
		 * @param {Array<string>} ids - An array of Wikidata Lexeme IDs to fetch.
		 * @return {Promise<Object>} - Resolves with the data of every Lexeme in the window
		 */
		scheduleLexemesRequest: function ( ids ) {
			this.scheduledLexemes = [ ... new Set( [ ...this.scheduledLexemes, ...ids ] ) ];

			if ( !this.scheduledLexemesPromise ) {
				this.scheduledLexemesPromise = new Promise( ( resolve, reject ) => {
					setTimeout( () => {
						this.fetchWikidataEntitiesBatched( {
							ids: this.scheduledLexemes
						} ).then( resolve, reject );
						this.scheduledLexemes = [];
						this.scheduledLexemesPromise = null;
					}, Constants.WIKIDATA_REQUEST_TIME_WINDOW );
				} );
			}

			return this.scheduledLexemesPromise;
		},

		/**
		 * Calls Wikidata Action API to fetch Wikidata Lexemes with their senses
		 * and processes sense fallback labels by fetching associated items.
		 * This is specifically for LexemeSense components that need the sense data.
		 *
		 * @param {Object} payload
		 * @param {Array<string>} payload.lexemeIds - An array of Wikidata Lexeme IDs to fetch.
		 * @return {Promise}
		 */
		fetchLexemeSenses: function ( payload ) {
			// Filter out lexemes that already have processed senses
			const lexemeIds = payload.lexemeIds.filter( ( id ) => this.getLexemeSensesData( id ) === undefined );

			if ( lexemeIds.length === 0 ) {
				// If list is empty, do nothing
				return Promise.resolve();
			}
			// Wait for the lexeme to be fetched
			// We need to wait for the lexeme to be fetched before fetching the items for each sense
			// because the items are not part of the lexeme data
			// eslint-disable-next-line arrow-body-style
			const sensePromises = lexemeIds.map( ( id ) => {
				// First try to get the lexeme data from cache, then fetch if needed
				return this.getLexemeDataAsync( id )
					.catch( () => this.fetchLexemes( { ids: [ id ] } ).then( () => this.getLexemeDataAsync( id ) ) )
					.then( () => {
						const lexemeData = this.getLexemeData( id );
						if ( !lexemeData || !lexemeData.senses ) {
							// Store empty array for lexemes with no senses
							this.setLexemeSensesData( { lexemeId: id, data: [] } );
							return;
						}

						// Fetch the fallback labels for each sense
						const processedSensePromises = lexemeData.senses.map(
							( sense ) => this.fetchLexemeSenseFallbackLabels( sense ) );

						return Promise.all( processedSensePromises ).then( ( processedSenses ) => {
							this.setLexemeSensesData( { lexemeId: id, data: processedSenses } );
						} );
					} )
					.catch( () => {
						// If getting the lexeme data fails, remove the Lexeme Id from the senses
						this.resetLexemeSensesData( { lexemeIds: [ id ] } );
					} );
			} );

			return Promise.all( sensePromises );
		}
	}
};
