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
		zAttachedImplementations: [],
		zUnattachedImplementations: []
	},
	getters: {
		getAttachedZImplementations: function ( state ) {
			return state.zAttachedImplementations;
		},
		getUnattachedZImplementations: function ( state ) {
			return state.zUnattachedImplementations;
		},
		getAllZImplementations: function ( state ) {
			return state.zAttachedImplementations.concat( state.zUnattachedImplementations );
		},
		getPaginatedImplementations: function ( state, getters ) {
			var allImplementations = state.zAttachedImplementations.concat( state.zUnattachedImplementations );
			return getters.paginateList( allImplementations );
		}
	},
	mutations: {
		setAttachedZImplementations: function ( state, zImplementations ) {
			state.zAttachedImplementations = zImplementations;
		},
		setUnattachedZImplementations: function ( state, zImplementations ) {
			state.zUnattachedImplementations = zImplementations;
		}
	},
	actions: {
		/**
		 * Parses out attached implementations from zFunction
		 * Also fetches relevant zKeys
		 *
		 * Note that this returns a raw array, not a canonical ZList.
		 *
		 * @param {Object} context
		 * @param {string} id
		 * @return {Promise}
		 */
		// TODO(T314928): This should be a simple lookup after data layer refactoring
		// ex: zObject.get( Constants.Z_FUNCTION_IMPLEMENTATIONS );
		fetchAttachedZImplementations: function ( context, id ) {
			var attachedImplementations = [];

			const zObject = context.getters.getZObjectChildrenById( id );
			const zImplementationId = zObject.filter( function ( item ) {
				return item.key === Constants.Z_FUNCTION_IMPLEMENTATIONS;
			} )[ 0 ].id;

			const zImplementationList = context.getters.getZObjectChildrenById( zImplementationId );
			// remove the list type (we want to return a raw array, not a canonical ZList)
			zImplementationList.shift();

			for ( var zid in zImplementationList ) {
				const zImplementation = context.getters.getZObjectChildrenById(
					zImplementationList[ zid ].id );

				attachedImplementations.push( zImplementation[ 1 ].value );
			}

			context.commit( 'setAttachedZImplementations', attachedImplementations );
			return context.dispatch( 'fetchZKeys', { zids: attachedImplementations } );
		},
		/**
		 * Fetches all implementations for specified function ID
		 * Filter out to only unattached implementations - attached ones are populated from the zObject directly
		 * Also fetches relevant zKeys
		 *
		 * Note that this returns a raw array, not a canonical ZList.
		 *
		 * @param {Object} context
		 * @param {string} zFunctionId
		 * @return {Promise}
		 */
		fetchUnattachedZImplementations: function ( context, zFunctionId ) {
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
				var zidList = response.query.wikilambdafn_search.map( function ( zidItem ) {
					return zidItem.zid;
				} );
				zidList = zidList.filter( filterOutPresentZids( context.rootState ) );
				context.commit( 'setUnattachedZImplementations', zidList );
				return context.dispatch( 'fetchZKeys', { zids: zidList } );
			} );
		},
		/**
		 * Triggers the fetch of attached and unattached implementations for the specified zFunctionId.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 *
		 */
		fetchZImplementations: function ( context, payload ) {
			context.dispatch( 'fetchUnattachedZImplementations', payload.zFunctionId );
			context.dispatch( 'fetchAttachedZImplementations', payload.id );
		}
	}
};
