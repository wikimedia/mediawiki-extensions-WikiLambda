/*!
 * WikiLambda Pinia store: Wikidata Lexemes module
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
		lexemes: {}
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
			const getLexemeDataAsync = ( id ) => {
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
			return getLexemeDataAsync;
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

			// Otherwise, unwrap the data to select only subset of Lexeme data; title, forms and lemmas
			const unwrap = ( { title, forms, lemmas } ) => ( { title, forms, lemmas } );
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
		},
		/**
		 * Calls Wikidata Action API to fetch Wikidata Lexemes
		 * given their Ids.
		 *
		 * @param {Object} payload
		 * @param {Array} payload.ids
		 * @return {Promise}
		 */
		fetchLexemes: function ( payload ) {
			// Filter out the fetched or fetching lexeme Ids
			const ids = payload.ids.filter( ( id ) => this.getLexemeData( id ) === undefined );

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
					// It might return an error for an invalid lexeme Id,
					// in that case, remove the Lexeme Ids from the state
					// const fetched = data.entities ? Object.keys( data.entities ) : [];
					// const isMissing =fetched.so
					if ( data.error ) {
						this.resetLexemeData( { ids } );
						return data;
					}
					// Once received, store lexeme Ids with their data
					const fetched = data.entities ? Object.keys( data.entities ) : [];
					fetched.forEach( ( id ) => {
						const entity = data.entities[ id ];
						// Check if entity exists and has a 'missing' property
						if ( entity && typeof entity === 'object' && 'missing' in entity ) {
							this.resetLexemeData( { ids: [ id ] } );
						} else if ( entity ) {
							this.setLexemeData( { id, data: entity } );
						}
					} );
					return data;
				} )
				.catch( () => {
					// If fetch fails, remove the Lexeme Ids from the state
					this.resetLexemeData( { ids } );
				} );
			// Store lexeme Ids with their resolving promise
			ids.forEach( ( id ) => this.setLexemeData( { id, data: promise } ) );
			return promise;
		}
	}
};
