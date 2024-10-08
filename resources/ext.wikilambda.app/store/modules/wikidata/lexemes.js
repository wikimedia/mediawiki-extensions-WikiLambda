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
		 * Given the rowId of the function call fetchLexeme
		 * returns the Id of the selected lexeme
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
				let wdReferenceRowId = rowId;

				// Type is either Z7/Function call or Z6095/Wikidata lexeme reference:
				// * If Z7: The wikidata lexeme reference is in the first argument
				const type = getters.getZObjectTypeByRowId( rowId );
				if ( type === Constants.Z_FUNCTION_CALL ) {
					const children = getters.getChildrenByParentRowId( rowId );
					const identityRow = children.find( ( row ) => row.key === Constants.Z_WIKIDATA_FETCH_LEXEME_ID );
					wdReferenceRowId = identityRow ? identityRow.id : rowId;
				}

				// Once we have the Wikidata lexeme reference, return its ID key
				return getters.getRowByKeyPath( [ Constants.Z_WIKIDATA_REFERENCE_LEXEME_ID ], wdReferenceRowId );
			}
			return findLexemeId;
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
		 */
		setLexemeData: function ( state, payload ) {
			// Select only subset of Lexeme Data; keep only title and lemmas
			const unwrap = ( ( { title, lemmas } ) => ( { title, lemmas } ) );
			state.lexemes[ payload.id ] = unwrap( payload.data );
		}
	},
	actions: {
		/**
		 * Calls Wikidata Action API to search lexemes
		 * by matching a the given searchTerm.
		 *
		 * @param {Object} context
		 * @param {string} searchTerm
		 * @return {Promise}
		 */
		lookupLexemes: function ( context, searchTerm ) {
			const request = {
				language: context.getters.getUserLangCode,
				search: searchTerm,
				type: 'lexeme'
			};
			return apiUtils.searchWikidataEntities( request );
		},
		/**
		 * Calls Wikidata Action API to fetch the lexemes
		 * given lexemes by their Ids.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {Array} payload.ids
		 * @return {Promise}
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
