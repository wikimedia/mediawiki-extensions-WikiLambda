/*!
 * WikiLambda Vue editor: Handle the request of function calls to the orchestrator.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const Constants = require( '../../Constants.js' ),
	Row = require( '../classes/Row.js' ),
	extractZIDs = require( '../../mixins/schemata.js' ).methods.extractZIDs,
	apiUtils = require( '../../mixins/api.js' ).methods;

module.exports = exports = {
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

				// Success, we inject the response object in the resultRowId
				context.dispatch( 'injectZObjectFromRowId', {
					rowId: payload.resultRowId,
					value: data.response
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
