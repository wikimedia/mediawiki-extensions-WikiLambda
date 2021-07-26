/*!
 * WikiLambda Vue editor: Handle generating records in the ZObject list and storing records of function calls.
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

var performFunctionCall = require( '../../mixins/callZFunction.js' ).methods.performFunctionCall;

module.exports = {
	actions: {
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
