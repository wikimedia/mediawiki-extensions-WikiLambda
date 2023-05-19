/*!
 * WikiLambda Vue editor: Handle generating records in the ZObject list and storing records of function calls.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

var Constants = require( '../../Constants.js' ),
	performFunctionCall = require( '../../mixins/api.js' ).methods.performFunctionCall;

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
				context.dispatch( 'removeZObjectChildren', rowId );
			} else {
				// payload is not a row ID, add new rowId
				rowId = context.getters.getNextRowId;
				context.commit( 'addZObject', {
					id: rowId,
					key: undefined,
					parent: undefined,
					value: Constants.ROW_VALUE_OBJECT
				} );
			}
			return rowId;
		},
		/**
		 * Calls orchestrator and sets orchestrationResult
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @return {Promise}
		 */
		callZFunction: function ( context, payload ) {
			return performFunctionCall( payload.zobject ).then( function ( data ) {

				var canonicalZObject = data.response;

				context.dispatch(
					'addZFunctionResultToTree',
					{
						result: canonicalZObject,
						resultId: payload.resultId
					}
				);
			} ).catch( function ( error ) {
				context.dispatch( 'addZFunctionResultToTree', {
					result: error,
					resultId: payload.resultId
				} );
			} );
		},
		/**
		 * attach a function result to the zObject tree.
		 * The result can either be a zObject or an error.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 */
		addZFunctionResultToTree: function ( context, payload ) {
			context.dispatch( 'injectZObject', {
				zobject: payload.result,
				key: '',
				id: payload.resultId,
				parent: ''
			} );
		}
	}
};
