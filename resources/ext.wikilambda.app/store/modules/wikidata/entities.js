/*!
 * WikiLambda Vue editor: Vuex Wikidata Entities module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const Constants = require( '../../../Constants.js' );

module.exports = exports = {
	getters: {
		/**
		 * Returns whether the rowId contains a Wikidata Entity, which
		 * will be shaped as a Function call to one of the Wikidata Fetch
		 * Functions (Z6820-Z6826).
		 * Assumes that the object represented under the given rowId is
		 * a function, but returns false if it's not.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		isWikidataEntity: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {boolean}
			 */
			function findWikidataEntity( rowId ) {
				const functionCallFunction = getters.getZFunctionCallFunctionId( rowId );
				return Constants.WIKIDATA_FETCH_FUNCTIONS.includes( functionCallFunction );
			}
			return findWikidataEntity;
		},
		/**
		 * Returns whether the rowId contains a Wikidata Reference, which
		 * will be a literal object of one of the Wikidata Reference types
		 * (Z6691-Z6696).
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		isWikidataReference: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {boolean}
			 */
			function findWikidataReference( rowId ) {
				const type = getters.getZObjectTypeByRowId( rowId );
				return Constants.WIKIDATA_REFERENCE_TYPES.includes( type );
			}
			return findWikidataReference;
		}
	}
};
