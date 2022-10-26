/*!
 * WikiLambda Vue editor: Store module for frontend error-related state, actions, mutations and getters
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

module.exports = exports = {
	state: {
		errors: {}
	},
	getters: {
		getErrors: function ( state ) {
			return state.errors;
		}
	},
	mutations: {
		setError: function ( state, payload ) {
			state.errors[ payload.internalId ] = {
				value: payload.errorState,
				message: payload.errorMessage
			};
		}
	},
	actions: {
		setError: function ( context, payload ) {
			context.commit( 'setError', payload );
		}
	}
};
