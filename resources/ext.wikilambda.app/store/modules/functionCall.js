/*!
 * WikiLambda Vue editor: Handle the request of function calls to the orchestrator.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const Constants = require( '../../Constants.js' ),
	Row = require( '../classes/Row.js' ),
	{ extractZIDs, hybridToCanonical } = require( '../../mixins/schemata.js' ).methods,
	apiUtils = require( '../../mixins/api.js' ).methods;

module.exports = exports = {
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
	mutations: {
		setMetadata: function ( state, metadata ) {
			state.metadata = metadata;
		}
	},
	actions: {
		/**
		 * Create a new result record, that is detached from the main zObject.
		 * If the given record exists, it resets it by removing all children.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 *
		 * @return {number} resultId
		 */
		initializeResultId: function ( context, payload ) {
			let rowId;
			const row = context.getters.getRowById( payload );
			if ( row ) {
				// payload is a valid row Id, remove its children
				rowId = row.id;
				context.dispatch( 'removeRowChildren', { rowId } );
			} else {
				// payload is not a row ID, add new rowId
				rowId = context.getters.getNextRowId;
				const rootRow = new Row( rowId, undefined, Constants.ROW_VALUE_OBJECT, undefined );
				context.commit( 'pushRow', rootRow );
			}
			return rowId;
		},
		/**
		 * Calls orchestrator and sets orchestrationResult
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {Object} payload.functionCall
		 * @param {Object} payload.resultRowId
		 * @return {Promise}
		 */
		callZFunction: function ( context, payload ) {
			return apiUtils.performFunctionCall( payload.functionCall ).then( ( data ) => {
				// Asynchronously collect the necessary labels
				const zids = extractZIDs( data.response );
				context.dispatch( 'fetchZids', { zids } );

				// Success:
				// We save the metadata JSON object, and
				const metadata = hybridToCanonical( data.response.Z22K2 );
				context.commit( 'setMetadata', metadata );
				// We inject the response object in the resultRowId
				context.dispatch( 'injectZObjectFromRowId', {
					rowId: payload.resultRowId,
					value: data.response.Z22K1
				} );

			} ).catch( ( /* ApiError */ error ) => {
				context.commit( 'setError', {
					rowId: payload.resultRowId,
					errorType: Constants.errorTypes.ERROR,
					errorMessage: error.messageOrFallback( Constants.errorCodes.UNKNOWN_EXEC_ERROR )
				} );
			} );
		}
	}
};
