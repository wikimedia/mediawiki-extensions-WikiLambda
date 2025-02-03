/*!
 * WikiLambda Vue editor: Vuex Wikidata Lexemes module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const Constants = require( '../../../Constants.js' ),
	apiUtils = require( '../../../mixins/api.js' ).methods;

module.exports = exports = {
	state: {
		lexemes: {}
	},
	getters: {
		/**
		 * Returns the lexeme object of a given ID,
		 * the fetch Promise if the fetch request is
		 * on the fly, or undefined if it hasn't been
		 * requested yet.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getLexemeData: function ( state ) {
			/**
			 * @param {string} id
			 * @return {Object|Promise|undefined}
			 */
			function findLexemeData( id ) {
				return state.lexemes[ id ];
			}
			return findLexemeData;
		},
		/**
		 * Returns the lexeme form object of a given ID,
		 * the fetch Promise if the fetch request is
		 * on the fly, or undefined if it hasn't been
		 * requested yet.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getLexemeFormData: function ( state ) {
			/**
			 * @param {string} id
			 * @return {Object|Promise|undefined}
			 */
			function findLexemeFormData( id ) {
				const [ lexemeId ] = id.split( '-' );
				const lexemeData = state.lexemes[ lexemeId ];
				return ( lexemeData && lexemeData.forms ) ?
					lexemeData.forms.find( ( item ) => item.id === id ) :
					undefined;
			}
			return findLexemeFormData;
		},
		/**
		 * Given the rowId of the Wikidata Lexeme entity
		 * returns the rowId of the Lexeme Id string.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getLexemeIdRow: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {Object|undefined}
			 */
			function findLexemeId( rowId ) {
				return getters.getWikidataEntityIdRow( rowId, Constants.Z_WIKIDATA_LEXEME );
			}
			return findLexemeId;
		},
		/**
		 * Given the rowId of the Wikidata Lexeme Form entity
		 * returns the rowId of the Lexeme Form Id string.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getLexemeFormIdRow: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {Object|undefined}
			 */
			function findLexemeFormId( rowId ) {
				return getters.getWikidataEntityIdRow( rowId, Constants.Z_WIKIDATA_LEXEME_FORM );
			}
			return findLexemeFormId;
		}
	},
	mutations: {
		/**
		 * Stores the lexeme data indexed by its Id
		 *
		 * @param {Object} state
		 * @param {Object} payload
		 * @param {string} payload.id
		 * @param {Object} payload.data
		 * @return {void}
		 */
		setLexemeData: function ( state, payload ) {
			// Select only subset of Lexeme data; title, forms and lemmas
			const unwrap = ( ( { title, forms, lemmas } ) => ( { title, forms, lemmas } ) );
			state.lexemes[ payload.id ] = unwrap( payload.data );
		}
	},
	actions: {
		/**
		 * Calls Wikidata Action API to fetch Wikidata Lexemes
		 * given their Ids.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {Array} payload.ids
		 * @return {Promise | undefined}
		 */
		fetchLexemes: function ( context, payload ) {
			// Filter out the fetched or fetching lexeme Ids
			const ids = payload.ids.filter( ( id ) => context.getters.getLexemeData( id ) === undefined );
			if ( ids.length === 0 ) {
				// If list is empty, do nothing
				return;
			}
			const request = {
				language: context.getters.getUserLangCode,
				ids: ids.join( '|' )
			};
			const promise = apiUtils.fetchWikidataEntities( request )
				.then( ( data ) => {
					// Once received, store lexeme Ids with their data
					const fetched = data.entities ? Object.keys( data.entities ) : [];
					fetched.forEach( ( id ) => context.commit( 'setLexemeData', { id, data: data.entities[ id ] } ) );
					return data;
				} );

			// Store lexeme Ids with their resolving promise
			ids.forEach( ( id ) => context.commit( 'setLexemeData', { id, data: promise } ) );
			return promise;
		}
	}
};
