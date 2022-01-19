/*!
 * WikiLambda Vue editor: Handle generating records in the ZObject list and storing records of function calls.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

var performFunctionCall = require( '../../mixins/api.js' ).methods.performFunctionCall;

module.exports = exports = {
	actions: {
		/**
		 * Create a new result record, that is detached from the main zObject (using parent -1)
		 * if a record exist, it reset it by removing all childrens
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 *
		 * @return {number} resultId
		 */
		initializeResultId: function ( context, payload ) {
			var resultId = payload || context.getters.getNextObjectId;
			if ( resultId === context.getters.getNextObjectId ) {
				context.commit( 'addZObject', { id: resultId, key: undefined, parent: -1, value: 'object' } );
			} else {
				context.dispatch( 'removeZObjectChildren', resultId );
			}

			return resultId;
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
