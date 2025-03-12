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
		 * Returns whether the rowId contains a literal Wikidata Entity.
		 *
		 * @return {Function}
		 */
		isWikidataLiteral: function () {
			/**
			 * @param {number} rowId
			 * @return {boolean}
			 */
			const findIsWikidataLiteral = ( rowId ) => {
				const type = this.getZObjectTypeByRowId( rowId );
				return Constants.WIKIDATA_TYPES.includes( type );
			};
			return findIsWikidataLiteral;
		},
		/**
		 * Returns whether the rowId contains a fetched Wikidata Entity, which
		 * will be shaped as a Function call to one of the Wikidata Fetch
		 * Functions (Z6820-Z6826).
		 * Assumes that the object represented under the given rowId is
		 * a function, but returns false if it's not.
		 *
		 * @return {Function}
		 */
		isWikidataFetch: function () {
			/**
			 * @param {number} rowId
			 * @return {boolean}
			 */
			const findIsWikidataFetch = ( rowId ) => {
				const functionCallFunction = this.getZFunctionCallFunctionId( rowId );
				return Object.keys( Constants.WIKIDATA_FETCH_FUNCTIONS )
					.some( ( k ) => Constants.WIKIDATA_FETCH_FUNCTIONS[ k ] === functionCallFunction );
			};
			return findIsWikidataFetch;
		},
		/**
		 * Returns whether the rowId contains a Wikidata Reference, which
		 * will be a literal object of one of the Wikidata Reference types
		 * (Z6091-Z6096).
		 *
		 * @return {Function}
		 */
		isWikidataReference: function () {
			/**
			 * @param {number} rowId
			 * @return {boolean}
			 */
			const findIsWikidataReference = ( rowId ) => {
				const type = this.getZObjectTypeByRowId( rowId );
				return Object.keys( Constants.WIKIDATA_REFERENCE_TYPES )
					.some( ( k ) => Constants.WIKIDATA_REFERENCE_TYPES[ k ] === type );
			};
			return findIsWikidataReference;
		},

		/**
		 * Returns whether the rowId contains a Wikidata entity.
		 *
		 * @return {boolean}
		 */
		isWikidataEntity() {
			const checkWikidataEntity = ( rowId ) => (
				this.isWikidataFetch( rowId ) ||
				this.isWikidataReference( rowId ) ||
				this.isWikidataLiteral( rowId )
			);
			return checkWikidataEntity;
		},

		/**
		 * Given the rowId of the Wikidata entity, returns
		 * the rowId of the Wikidata entity Id string.
		 *
		 * @return {Function}
		 */
		getWikidataEntityIdRow: function () {
			/**
			 * @param {number} rowId
			 * @param {string} wikidataType
			 * @return {Object|undefined}
			 */
			const findWikidataEntityIdRow = ( rowId, wikidataType ) => {
				let wdReferenceRowId = rowId;
				// Type is either Z7/Function call, a Wikidata reference type or a Wikidata type:
				const type = this.getZObjectTypeByRowId( rowId );

				// If Wikidata type: The Wikidata entity reference is in the first key
				if ( Constants.WIKIDATA_TYPES.includes( type ) ) {
					const identityKey = `${ type }K1`;
					const children = this.getChildrenByParentRowId( rowId );
					const identityRow = children.find( ( row ) => row.key === identityKey );
					wdReferenceRowId = identityRow ? identityRow.id : rowId;
				}

				// If Function call: The Wikidata entity reference is in the first argument
				if ( type === Constants.Z_FUNCTION_CALL ) {
					const children = this.getChildrenByParentRowId( rowId );
					const fetchFunction = Constants.WIKIDATA_FETCH_FUNCTIONS[ wikidataType ];
					const fetchFunctionRefKey = `${ fetchFunction }K1`;
					const identityRow = children.find( ( row ) => row.key === fetchFunctionRefKey );
					wdReferenceRowId = identityRow ? identityRow.id : rowId;
				}

				// Once we have the Wikidata lexeme reference, return its ID key
				const referenceType = Constants.WIKIDATA_REFERENCE_TYPES[ wikidataType ];
				const referenceTypeIdKey = `${ referenceType }K1`;
				return this.getRowByKeyPath( [ referenceTypeIdKey ], wdReferenceRowId );
			};
			return findWikidataEntityIdRow;
		}
	},

	actions: {
		/**
		 * Calls Wikidata Action API to search entities by
		 * matching the given searchTerm and entity type.
		 *
		 * @param {Object} payload
		 * @param {string} search
		 * @param {number} searchContinue
		 * @param {string|undefined} type
		 * @return {Promise}
		 */
		lookupWikidataEntities: function ( payload ) {
			const { search, searchContinue, type = undefined } = payload;
			const request = {
				language: this.getUserLangCode,
				search,
				type,
				searchContinue
			};
			return searchWikidataEntities( request );
		}
	}
};
