/*!
 * WikiLambda Vuex code to manipulate the ZImplementations of a ZFunction object.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
var Constants = require( '../../Constants.js' );

module.exports = exports = {
	state: {
		/**
		 * List of ZIDs for all implementation (attached and unattached)
		 */
		zImplementations: []
	},
	getters: {
		getZImplementations: function ( state ) {
			return state.zImplementations;
		},
		getPaginatedImplementations: function ( state, getters ) {
			return getters.paginateList( state.zImplementations );
		}
	},
	mutations: {
		setZImplementations: function ( state, zImplementations ) {
			state.zImplementations = zImplementations;
		}
	},
	actions: {
		/**
		 * Triggers the fetch of all (attached and unattached) implementations for the specified zFunctionId.
		 * Also fetches relevant zKeys
		 *
		 * Note that this stores a raw array, not a canonical ZList.
		 *
		 * @param {Object} context
		 * @param {string} zFunctionId
		 * @return {Promise}
		 */
		fetchZImplementations: function ( context, zFunctionId ) {
			var api = new mw.Api();
			return api.get( {
				action: 'query',
				list: 'wikilambdafn_search',
				format: 'json',
				wikilambdafn_zfunction_id: zFunctionId,
				wikilambdafn_type: Constants.Z_IMPLEMENTATION,
				wikilambdafn_limit: Constants.API_LIMIT_MAX
			} ).then( function ( response ) {
				var zidList = response.query.wikilambdafn_search.map( function ( zidItem ) {
					return zidItem.zid;
				} );
				context.commit( 'setZImplementations', zidList );
				return context.dispatch( 'fetchZKeys', { zids: zidList } );
			} );
		}
	}
};
