module.exports = {
	state: {
		orchestrationResult: '',
		orchestrationResultId: null
	},
	getters: {
		/**
		 * Returns the result of orchestration.
		 *
		 * @param {Object} state
		 * @return {string} orchestrationResult
		 */
		getOrchestrationResult: function ( state ) {
			return state.orchestrationResult;
		},
		getOrchestrationResultId: function ( state ) {
			return state.orchestrationResultId;
		}
	},
	mutations: {
		/**
		 * Sets orchestrationResult after invoking orchestrator.
		 *
		 * @param {Object} state
		 * @param {Object} payload
		 */
		setOrchestrationResult: function ( state, payload ) {
			state.orchestrationResult = payload;
		},
		setOrchestrationResultId: function ( state, id ) {
			state.orchestrationResultId = id;
		}
	},
	actions: {
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
				context.commit( 'setOrchestrationResult', result.query.wikilambda_function_call.Orchestrated.data );
				context.dispatch(
					'addZFunctionResultToTree',
					JSON.parse( result.query.wikilambda_function_call.Orchestrated.data )
				);
			} ).catch( function ( error ) {
				context.commit( 'setOrchestrationResult', error );
				context.dispatch( 'addZFunctionResultToTree', error );
			} );
		},
		addZFunctionResultToTree: function ( context, payload ) {
			if ( !context.getters.getOrchestrationResultId ) {
				context.commit( 'setOrchestrationResultId', context.getters.getNextObjectId );
				context.commit( 'addZObject', { id: context.getters.getOrchestrationResultId, key: undefined, parent: -1, value: 'object' } );
			}

			context.dispatch( 'injectZObject', {
				zobject: payload,
				key: '',
				id: context.getters.getOrchestrationResultId,
				parent: ''
			} );
		}
	}
};
