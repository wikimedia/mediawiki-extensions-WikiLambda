/*!
 * WikiLambda Vue editor: Vuex Wikidata Entities module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const Constants = require( '../../../Constants.js' ),
	apiUtils = require( '../../../mixins/api.js' ).methods;

module.exports = exports = {
	getters: {
		/**
		 * Returns whether the rowId contains a literal Wikidata Entity.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		isWikidataLiteral: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {boolean}
			 */
			function findWikidataLiteral( rowId ) {
				const type = getters.getZObjectTypeByRowId( rowId );
				return Constants.WIKIDATA_TYPES.includes( type );
			}
			return findWikidataLiteral;
		},
		/**
		 * Returns whether the rowId contains a fetched Wikidata Entity, which
		 * will be shaped as a Function call to one of the Wikidata Fetch
		 * Functions (Z6820-Z6826).
		 * Assumes that the object represented under the given rowId is
		 * a function, but returns false if it's not.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		isWikidataFetch: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {boolean}
			 */
			function findWikidataFetch( rowId ) {
				const functionCallFunction = getters.getZFunctionCallFunctionId( rowId );
				return Object.keys( Constants.WIKIDATA_FETCH_FUNCTIONS )
					.some( ( k ) => Constants.WIKIDATA_FETCH_FUNCTIONS[ k ] === functionCallFunction );
			}
			return findWikidataFetch;
		},
		/**
		 * Returns whether the rowId contains a Wikidata Reference, which
		 * will be a literal object of one of the Wikidata Reference types
		 * (Z6091-Z6096).
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
				return Object.keys( Constants.WIKIDATA_REFERENCE_TYPES )
					.some( ( k ) => Constants.WIKIDATA_REFERENCE_TYPES[ k ] === type );
			}
			return findWikidataReference;
		},
		/**
		 * Given the rowId of the Wikidata entity, returns
		 * the rowId of the Wikidata entity Id string.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getWikidataEntityIdRow: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @param {string} wikidataType
			 * @return {Object|undefined}
			 */
			function findEntityId( rowId, wikidataType ) {
				let wdReferenceRowId = rowId;
				// Type is either Z7/Function call, a Wikidata reference type or a Wikidata type:
				const type = getters.getZObjectTypeByRowId( rowId );

				// If Wikidata type: The Wikidata entity reference is in the first key
				if ( Constants.WIKIDATA_TYPES.includes( type ) ) {
					const identityKey = `${ type }K1`;
					const children = getters.getChildrenByParentRowId( rowId );
					const identityRow = children.find( ( row ) => row.key === identityKey );
					wdReferenceRowId = identityRow ? identityRow.id : rowId;
				}

				// If Function call: The Wikidata entity reference is in the first argument
				if ( type === Constants.Z_FUNCTION_CALL ) {
					const children = getters.getChildrenByParentRowId( rowId );
					const fetchFunction = Constants.WIKIDATA_FETCH_FUNCTIONS[ wikidataType ];
					const fetchFunctionRefKey = `${ fetchFunction }K1`;
					const identityRow = children.find( ( row ) => row.key === fetchFunctionRefKey );
					wdReferenceRowId = identityRow ? identityRow.id : rowId;
				}

				// Once we have the Wikidata lexeme reference, return its ID key
				const referenceType = Constants.WIKIDATA_REFERENCE_TYPES[ wikidataType ];
				const referenceTypeIdKey = `${ referenceType }K1`;
				return getters.getRowByKeyPath( [ referenceTypeIdKey ], wdReferenceRowId );
			}
			return findEntityId;
		}
	},
	actions: {
		/**
		 * Calls Wikidata Action API to search entities by
		 * matching the given searchTerm and entity type.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {string} search
		 * @param {number} searchContinue
		 * @param {string|undefined} type
		 * @return {Promise}
		 */
		lookupWikidataEntities: function ( context, payload ) {
			const { search, searchContinue, type = undefined } = payload;
			const request = {
				language: context.getters.getUserLangCode,
				search,
				type,
				searchContinue
			};
			return apiUtils.searchWikidataEntities( request );
		}
	}
};
