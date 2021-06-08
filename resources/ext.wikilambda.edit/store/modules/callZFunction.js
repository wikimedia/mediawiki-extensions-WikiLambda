var Constants = require( '../../Constants.js' );

module.exports = {
	actions: {
		initializeResultId: function ( context, payload ) {
			var resultId = payload || context.getters.getNextObjectId;
			if ( resultId === context.getters.getNextObjectId ) {
				context.commit( 'addZObject', { id: resultId, key: undefined, parent: -1, value: 'object' } );
			}

			return resultId;
		},
		/**
		 * Calls orchestrator and sets orchestrationResult
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 */
		callZFunction: function ( context, payload ) {
			var api = new mw.Api();
			api.post( {
				action: 'wikilambda_function_call',
				wikilambda_function_call_zobject: JSON.stringify( payload.zobject ) // eslint-disable-line camelcase
			} ).then( function ( result ) {
				context.dispatch(
					'addZFunctionResultToTree',
					{
						result: JSON.parse(
							result.query.wikilambda_function_call.Orchestrated.data
						)[ Constants.Z_PAIR_FIRST ],
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
