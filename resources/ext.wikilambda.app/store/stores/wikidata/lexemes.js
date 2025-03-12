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
		 * Returns the Lexeme Id string value, if any Lexeme is selected.
		 * Else returns null.
		 *
		 * @return {Function}
		 */
		getLexemeId: function () {
			/**
			 * @param {number} rowId
			 * @return {string|null}
			 */
			const findLexemeId = ( rowId ) => {
				const lexemeIdRow = this.getLexemeIdRow( rowId );
				return lexemeIdRow ?
					this.getZStringTerminalValue( lexemeIdRow.id ) || null :
					null;
			};
			return findLexemeId;
		},

		/**
		 * Given the rowId of the Wikidata Lexeme entity
		 * returns the rowId of the Lexeme Id string.
		 *
		 * @return {Function}
		 */
		getLexemeIdRow: function () {
			/**
			 * @param {number} rowId
			 * @return {Object|undefined}
			 */
			const findLexemeIdRow = ( rowId ) => this.getWikidataEntityIdRow( rowId, Constants.Z_WIKIDATA_LEXEME );
			return findLexemeIdRow;
		},

		/**
		 * Returns the Lexeme Id string value, if any Lexeme is selected.
		 * Else returns null (required as empty value for CdxLookup).
		 *
		 * @return {Function}
		 */
		getLexemeFormId: function () {
			/**
			 * @param {number} rowId
			 * @return {Object|undefined}
			 */
			const findLexemeFormId = ( rowId ) => {
				const lexemeFormIdRow = this.getLexemeFormIdRow( rowId );
				return lexemeFormIdRow ?
					this.getZStringTerminalValue( lexemeFormIdRow.id ) || null :
					null;
			};
			return findLexemeFormId;
		},

		/**
		 * Given the rowId of the Wikidata Lexeme Form entity
		 * returns the rowId of the Lexeme Form Id string.
		 *
		 * @return {Function}
		 */
		getLexemeFormIdRow: function () {
			/**
			 * @param {number} rowId
			 * @return {Object|undefined}
			 */
			const findLexemeFormIdRow = ( rowId ) => this.getWikidataEntityIdRow(
				rowId,
				Constants.Z_WIKIDATA_LEXEME_FORM
			);
			return findLexemeFormIdRow;
		},

		/**
		 * Returns the LabelData object built from the available
		 * lemmas in the data object of the selected Lexeme.
		 * If a Lexeme is selected but it has no lemmas, returns
		 * LabelData object with the Lexeme id as its display label.
		 * If no Lexeme is selected, returns undefined.
		 *
		 * @param {Object} state
		 * @return {LabelData|undefined}
		 */
		getLexemeLabelData: function () {
			/**
			 * @param {string} id The lexeme ID
			 * @return {LabelData} The `LabelData` object containing label, language code, and directionality.
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
		 * @return {LabelData|undefined}
		 */
		getLexemeFormLabelData: function () {
			/**
			 * @param {string} id The Lexeme form ID
			 * @return {LabelData} The `LabelData` object containing label, language code, and directionality.
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
				const [ lexemeId = '', formId = '' ] = id.split( '-' );
				return id ? `${ Constants.WIKIDATA_BASE_URL }/wiki/Lexeme:${ lexemeId }#${ formId }` : undefined;
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
			payload.ids.forEach( ( id ) => delete this.items[ id ] );
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
					// Once received, store lexeme Ids with their data
					const fetched = data.entities ? Object.keys( data.entities ) : [];
					fetched.forEach( ( id ) => this.setLexemeData( { id, data: data.entities[ id ] } ) );
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
