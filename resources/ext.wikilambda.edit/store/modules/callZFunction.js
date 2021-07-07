var canonicalize = require( '../../mixins/schemata.js' ).methods.canonicalizeZObject;

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
			var api = new mw.Api();
			return api.post( {
				action: 'wikilambda_function_call',
				// eslint-disable-next-line camelcase
				wikilambda_function_call_zobject: JSON.stringify(
					canonicalize( payload.zobject )
				)
			} ).then( function ( result ) {
				var canonicalZObject = canonicalize(
					JSON.parse(
						result.query.wikilambda_function_call.Orchestrated.data
					)
				);

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
