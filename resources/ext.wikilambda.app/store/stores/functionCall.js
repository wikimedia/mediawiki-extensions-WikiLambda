/*!
 * WikiLambda Vue editor: Handle the request of function calls to the orchestrator. (Pinia)
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../Constants.js' );
const Row = require( '../classes/Row.js' );
const { performFunctionCall } = require( '../../utils/apiUtils.js' );
const { extractZIDs, hybridToCanonical } = require( '../../utils/schemata.js' );

module.exports = {
	state: {
		metadata: undefined
	},

	getters: {
		getMetadata: function ( state ) {
			return state.metadata;
		},
		getMetadataError: function ( state ) {
			if ( !state.metadata ) {
				return undefined;
			}
			const map = state.metadata[ Constants.Z_TYPED_OBJECT_ELEMENT_1 ].slice( 1 );
			return map.find( ( item ) => item[ Constants.Z_TYPED_OBJECT_ELEMENT_1 ] === 'errors' );
		}
	},

	actions: {
		/**
		 * Create a new result record, that is detached from the main zObject.
		 * If the given record exists, it resets it by removing all children.
		 *
		 * @param {Object} payload
		 * @return {number} resultId
		 */
		initializeResultId: function ( payload ) {
			const row = this.getRowById( payload );
			if ( row ) {
				// payload is a valid row Id, remove its children
				this.removeRowChildren( { rowId: row.id } );
				return row.id;
			}
			// payload is not a row ID, add new rowId
			const rowId = this.getNextRowId;
			this.pushRow( new Row( rowId, undefined, Constants.ROW_VALUE_OBJECT, undefined ) );
			return rowId;
		},

		/**
		 * Calls orchestrator and sets orchestrationResult
		 *
		 * @param {Object} payload
		 * @param {Object} payload.functionCall
		 * @param {Object} payload.resultRowId
		 * @return {Promise}
		 */
		callZFunction: function ( payload ) {
			return performFunctionCall( {
				functionCall: payload.functionCall,
				language: this.getUserLangCode
			} ).then( ( data ) => {
				// Asynchronously collect the necessary labels
				const zids = extractZIDs( data.response );
				this.fetchZids( { zids } );

				// Success:
				// We save the metadata JSON object, and
				this.metadata = hybridToCanonical( data.response.Z22K2 );

				// We inject the response object in the resultRowId
				this.injectZObjectFromRowId( {
					rowId: payload.resultRowId,
					value: data.response.Z22K1
				} );

			} ).catch( ( error ) => {
				this.setError( {
					rowId: payload.resultRowId,
					errorType: Constants.errorTypes.ERROR,
					errorMessage: error.messageOrFallback( Constants.errorCodes.UNKNOWN_EXEC_ERROR )
				} );
			} );
		}
	}
};
