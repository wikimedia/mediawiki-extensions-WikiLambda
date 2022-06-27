/*!
 * WikiLambda Vuex code to manipulate the ZImplementations of a ZFunction object.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
var Constants = require( '../../Constants.js' );

function filterOutPresentZids( rootState ) {
	return function ( zid ) {
		var zobject;
		for ( zobject in rootState.zobjectModule.zobject ) {
			if ( rootState.zobjectModule.zobject[ zobject ].value === zid ) {
				return false;
			}
		}

		return true;
	};
}
module.exports = exports = {
	state: {
		/**
		 * List of implementation keys
		 */
		zImplementations: []
	},
	getters: {
		getZImplementations: function ( state ) {
			return state.zImplementations;
		},
		getUnattachedZImplementations: function ( state, getters, rootState ) {
			return state.zImplementations.filter( filterOutPresentZids( rootState ) );
		}
	},
	mutations: {
		/**
		 * Set the zImplementations in the store
		 *
		 * @param {Object} state
		 * @param {Object} zImplementations
		 */
		setZImplementations: function ( state, zImplementations ) {
			state.zImplementations = zImplementations;
		}
	},
	actions: {
		/**
		 * Fetches function implementation of a the specified zFunctionId.
		 * This methos will also fetch the zKeys in case of them are missing.
		 *
		 * @param {Object} context
		 * @param {string} zFunctionId
		 *
		 * @return {Promise}
		 */
		fetchZImplementations: function ( context, zFunctionId ) {
			var api = new mw.Api();
			return api.get( {
				action: 'query',
				list: 'wikilambdafn_search',
				format: 'json',
				// eslint-disable-next-line camelcase
				wikilambdafn_zfunction_id: zFunctionId,
				// eslint-disable-next-line camelcase
				wikilambdafn_type: Constants.Z_IMPLEMENTATION
			} ).then( function ( response ) {
				context.commit( 'setZImplementations', response.query.wikilambdafn_search );
				return context.dispatch( 'fetchZKeys', { zids: response.query.wikilambdafn_search } );
			} );
		}
	}
};
