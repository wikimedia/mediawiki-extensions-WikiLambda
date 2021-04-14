module.exports = {
	state: { orchestrationResult: '' },
	getters: {
		/**
		 * Returns the result of orchestration.
		 *
		 * @param {Object} state
		 * @return {string} orchestrationResult
		 */
		getOrchestrationResult: function ( state ) {
			return state.orchestrationResult;
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
			} ).catch( function ( error ) {
				context.commit( 'setOrchestrationResult', error );
			} );
		}
	}
};
