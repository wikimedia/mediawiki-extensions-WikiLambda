/*!
 * WikiLambda Vuex code to manipulate the ZTesters of a ZFunction object.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
var Constants = require( '../../Constants.js' );

module.exports = exports = {
	state: {
		newTester: null,
		/**
		 * List of ZIDs for all testers (attached and unattached)
		 */
		zTesters: []
	},
	getters: {
		getZTesters: function ( state ) {
			return state.zTesters;
		},
		getTestInputOutputByZIDs: function ( state, getters ) {
			/**
			 * @param {Array} zIDs
			 * @return {Array}
			 */
			return function ( zIDs ) {
				var inputOutput = [];
				for ( let index = 0; index < zIDs.length; index++ ) {
					const zid = zIDs[ index ];
					if ( getters.getZkeyLabels[ zid ] ) {
						const zObjectValue = getters.getZkeyLabels[ zid ].split( ' -> ' );
						inputOutput.push( {
							input: zObjectValue[ 0 ],
							output: zObjectValue[ 1 ]
						} );
					}
				}

				return inputOutput;
			};
		},
		getPaginatedTesters: function ( state, getters ) {
			return getters.paginateList( state.zTesters );
		}
	},
	mutations: {
		/**
		 * Set the zTesters in the store
		 *
		 * @param {Object} state
		 * @param {Object} zTesters
		 */
		setZTesters: function ( state, zTesters ) {
			state.zTesters = zTesters;
		}
	},
	actions: {
		/**
		 * Triggers the fetch of all (attached and unattached) testers for the specified zFunctionId.
		 * Also fetches relevant zKeys
		 *
		 * Note that this stores a raw array, not a canonical ZList.
		 *
		 * @param {Object} context
		 * @param {string} zFunctionId
		 * @return {Promise}
		 */
		fetchZTesters: function ( context, zFunctionId ) {
			var api = new mw.Api();
			return api.get( {
				action: 'query',
				list: 'wikilambdafn_search',
				format: 'json',
				wikilambdafn_zfunction_id: zFunctionId,
				wikilambdafn_type: Constants.Z_TESTER,
				wikilambdafn_limit: Constants.API_LIMIT_MAX
			} ).then( function ( response ) {
				var zidList = response.query.wikilambdafn_search.map( function ( zidItem ) {
					return zidItem.zid;
				} );
				context.commit( 'setZTesters', zidList );
				return context.dispatch( 'fetchZKeys', { zids: zidList } );
			} );
		}
	}
};
