/*!
 * WikiLambda Pinia store: Wikidata Lexemes module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const apiUtils = require( '../../../mixins/api.js' ).methods;
const Constants = require( '../../../Constants.js' );

module.exports = {
	state: {
		lexemes: {}
	},

	getters: {
		/**
		 * Returns the lexeme object of a given ID,
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
		 * Returns the lexeme form object of a given ID,
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
		}
	},

	actions: {
		/**
		 * Stores the lexeme data indexed by its Id
		 *
		 * @param {Object} payload
		 * @param {string} payload.id
		 * @param {Object} payload.data
		 * @return {void}
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
			const promise = apiUtils.fetchWikidataEntities( request )
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
