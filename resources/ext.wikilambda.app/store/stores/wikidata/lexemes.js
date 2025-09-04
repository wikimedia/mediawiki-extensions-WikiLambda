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

module.exports = {
	state: {
		lexemes: {},
		senses: {}
	},

	getters: {
		/**
		 * Returns the Lexeme object of a given ID,
		 * the fetch Promise if the fetch request is on the fly,
		 * or undefined if it hasn't been requested yet.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getLexemeData: function ( state ) {
			/**
			 * @param {string} id
			 * @return {Object|Promise|undefined}
			 */
			const findLexemeData = ( id ) => state.lexemes[ id ];
			return findLexemeData;
		},

		/**
		 * Returns a promise that resolves to the Lexeme data given its Id.
		 * If the lexeme is already cached, returns a resolved promise.
		 * If the lexeme is being fetched, returns the existing promise.
		 * If the lexeme hasn't been requested, returns a rejected promise.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getLexemeDataAsync: function () {
			/**
			 * @param {string} id
			 * @return {Promise<Object>}
			 */
			const findLexemeDataAsync = ( id ) => {
				const lexemeData = this.getLexemeData( id );

				// If lexeme is already cached (not a promise), return resolved promise
				if ( lexemeData && typeof lexemeData.then !== 'function' ) {
					return Promise.resolve( lexemeData );
				}

				// If lexeme is being fetched (is a promise), return that promise
				if ( lexemeData && typeof lexemeData.then === 'function' ) {
					return lexemeData;
				}

				// If lexeme hasn't been requested, return rejected promise
				return Promise.reject( new Error( `Lexeme ${ id } not found` ) );
			};
			return findLexemeDataAsync;
		},
		/**
		 * Returns the processed senses data for a given lexeme ID,
		 * the processing Promise if the processing is on the fly,
		 * or undefined if it hasn't been requested yet.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getLexemeSensesData: function ( state ) {
			/**
			 * @param {string} lexemeId
			 * @return {Array|Promise|undefined}
			 */
			const findLexemeSensesData = ( lexemeId ) => state.senses[ lexemeId ];
			return findLexemeSensesData;
		},

		/**
		 * Returns a promise that resolves to the processed senses data for a given lexeme ID.
		 * If the senses are already processed, returns a resolved promise.
		 * If the senses are being processed, returns the existing promise.
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

				// If senses are already processed (not a promise), return resolved promise
				if ( sensesData && typeof sensesData.then !== 'function' ) {
					return Promise.resolve( sensesData );
				}

				// If senses are being processed (is a promise), return that promise
				if ( sensesData && typeof sensesData.then === 'function' ) {
					return sensesData;
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
				const langs = lexemeData ? Object.keys( lexemeData.lemmas || {} ) : {};
				if ( langs.length > 0 ) {
					const lemma = langs.includes( this.getUserLangCode ) ?
						lexemeData.lemmas[ this.getUserLangCode ] :
						lexemeData.lemmas[ langs[ 0 ] ];
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
				const langs = lexemeFormData ? Object.keys( lexemeFormData.representations || {} ) : {};
				if ( langs.length > 0 ) {
					const rep = langs.includes( this.getUserLangCode ) ?
						lexemeFormData.representations[ this.getUserLangCode ] :
						lexemeFormData.representations[ langs[ 0 ] ];
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
			const findLexemeUrl = ( id ) => id ? `${ Constants.WIKIDATA_BASE_URL }/wiki/Lexeme:${ id }` : undefined;
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
				if ( !id ) {
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

				// Get best label from representations (if any)
				const langs = lexemeSenseData ? Object.keys( lexemeSenseData.glosses || {} ) : {};
				if ( langs.length > 0 ) {
					const rep = langs.includes( this.getUserLangCode ) ?
						lexemeSenseData.glosses[ this.getUserLangCode ] :
						lexemeSenseData.glosses[ langs[ 0 ] ];
					return new LabelData( id, rep.value, null, rep.language );
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
				if ( !id ) {
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
			// If payload.data is a promise, store it directly
			if ( payload.data && typeof payload.data.then === 'function' ) {
				this.lexemes[ payload.id ] = payload.data;
				return;
			}

			// Otherwise, unwrap the data to select only subset of Lexeme data; title, forms, senses and lemmas
			const unwrap = ( { title, forms, senses, lemmas } ) => ( { title, forms, senses, lemmas } );
			this.lexemes[ payload.id ] = unwrap( payload.data );
		},

		/**
		 * Removes the lexems for the given IDs
		 *
		 * @param {Object} payload
		 * @param {Array<string>} payload.ids - An array of Wikidata Lexeme IDs
		 */
		resetLexemeData: function ( payload ) {
			payload.ids.forEach( ( id ) => delete this.lexemes[ id ] );
			// Also reset the corresponding senses data
			this.resetLexemeSensesData( { lexemeIds: payload.ids } );
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

			// We do nothing if:
			// - there is already a gloss in the user's language for this sense
			// - there is no 'item for this sense' to fetch for this sense
			if ( sense.glosses[ this.getUserLangCode ] || !itemId ) {
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
		 * @return {Promise} - A promise that resolves to the fetched data.
		 */
		fetchLexemes: function ( { ids } ) {
			return this.fetchWikidataEntitiesBatched( {
				ids,
				getData: this.getLexemeData,
				setData: this.setLexemeData,
				resetData: this.resetLexemeData
			} );
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
				return this.getLexemeDataAsync( id )
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
						// If getting the lexeme data fails, remove the Lexeme Ids from the senses
						this.resetLexemeSensesData( { lexemeIds } );
					} );
			} );

			return Promise.all( sensePromises );
		}
	}
};
