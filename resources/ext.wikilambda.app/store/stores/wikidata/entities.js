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
		isWikidataEntity: function () {
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
		},

		/**
		 * Returns the Wikidata entity ID string for a given rowId and Wikidata type.
		 *
		 * @return {Function}
		 */
		getWikidataEntityId: function () {
			/**
			 * @param {number} rowId
			 * @param {string} wikidataType
			 * @return {string|null}
			 */
			const findWikidataEntityId = ( rowId, wikidataType ) => {
				const entityIdRow = this.getWikidataEntityIdRow( rowId, wikidataType );
				return entityIdRow ?
					this.getZStringTerminalValue( entityIdRow.id ) || null :
					null;
			};
			return findWikidataEntityId;
		},

		/**
		 * Returns the label data for a Wikidata entity by type and id.
		 *
		 * @param {string} type - The Wikidata entity type.
		 * @param {string} id - The Wikidata entity id.
		 * @return {LabelData|undefined} The label data object, or undefined if not found.
		 */
		getWikidataEntityLabelData: function () {
			/**
			 * @param {string} type
			 * @param {string} id
			 * @return {LabelData|undefined}
			 */
			const findWikidataaEntityLabelData = ( type, id ) => {
				switch ( type ) {
					case Constants.Z_WIKIDATA_LEXEME:
					case Constants.Z_WIKIDATA_REFERENCE_LEXEME:
						return this.getLexemeLabelData( id );

					case Constants.Z_WIKIDATA_LEXEME_FORM:
					case Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM:
						return this.getLexemeFormLabelData( id );

					case Constants.Z_WIKIDATA_ITEM:
					case Constants.Z_WIKIDATA_REFERENCE_ITEM:
						return this.getItemLabelData( id );

					case Constants.Z_WIKIDATA_PROPERTY:
					case Constants.Z_WIKIDATA_REFERENCE_PROPERTY:
						return this.getPropertyLabelData( id );

					default:
						return undefined;
				}
			};
			return findWikidataaEntityLabelData;
		},

		/**
		 * Returns the URL for a Wikidata entity by type and id.
		 *
		 * @return {Function}
		 */
		getWikidataEntityUrl: function () {
			/**
			 * @param {string} type
			 * @param {string} id
			 * @return {LabelData|undefined}
			 */
			const findWikidataEntityUrl = ( type, id ) => {
				switch ( type ) {
					case Constants.Z_WIKIDATA_LEXEME:
					case Constants.Z_WIKIDATA_REFERENCE_LEXEME:
						return this.getLexemeUrl( id );

					case Constants.Z_WIKIDATA_LEXEME_FORM:
					case Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM:
						return this.getLexemeFormUrl( id );

					case Constants.Z_WIKIDATA_ITEM:
					case Constants.Z_WIKIDATA_REFERENCE_ITEM:
						return this.getItemUrl( id );

					case Constants.Z_WIKIDATA_PROPERTY:
					case Constants.Z_WIKIDATA_REFERENCE_PROPERTY:
						return this.getPropertyUrl( id );

					default:
						return undefined;
				}
			};
			return findWikidataEntityUrl;
		}
	},

	actions: {
		/**
		 * Fetches Wikidata entities by type.
		 *
		 * For lexeme forms, transforms form IDs into lexeme IDs before fetching.
		 * Dispatches to the appropriate fetch action based on the entity type.
		 *
		 * @param {Object} payload
		 * @param {string} payload.type - The Wikidata entity type.
		 * @param {Array} payload.ids - The list of entity IDs to fetch.
		 * @return {Promise|undefined} A promise resolving to the fetched entities, or undefined for unknown types.
		 */
		fetchWikidataEntitiesByType: function ( payload ) {
			switch ( payload.type ) {
				case Constants.Z_WIKIDATA_LEXEME:
				case Constants.Z_WIKIDATA_REFERENCE_LEXEME:
					return this.fetchLexemes( payload );

				case Constants.Z_WIKIDATA_LEXEME_FORM:
				case Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM:
					// Transform lexeme form IDs into lexeme IDs:
					payload.ids = payload.ids.map( ( id ) => id.split( '-' )[ 0 ] );
					return this.fetchLexemes( payload );

				case Constants.Z_WIKIDATA_ITEM:
				case Constants.Z_WIKIDATA_REFERENCE_ITEM:
					return this.fetchItems( payload );

				case Constants.Z_WIKIDATA_PROPERTY:
				case Constants.Z_WIKIDATA_REFERENCE_PROPERTY:
					return this.fetchProperties( payload );

				default:
					return undefined;
			}
		},

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
