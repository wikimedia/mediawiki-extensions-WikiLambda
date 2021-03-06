/* eslint-disable camelcase */
/*!
 * WikiLambda Vue editor: zKeys Vuex module
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

var Vue = require( 'vue' ),
	Constants = require( '../../Constants.js' );
function isZType( zidInfo ) {
	return ( typeof zidInfo[ Constants.Z_PERSISTENTOBJECT_VALUE ] === 'object' ) &&
		( zidInfo[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_OBJECT_TYPE ] === Constants.Z_TYPE );
}

module.exports = {
	state: {
		/**
		 * Collection of zKey information
		 */
		zKeys: {},
		/**
		 * Collection of zKey labels in the user selected language
		 */
		zKeyLabels: {},
		/**
		 * Collection of arguments
		 */
		zArguments: {},
		/**
		 * List of implementation keys
		 */
		zImplementations: []
	},
	getters: {
		getZkeys: function ( state ) {
			return state.zKeys;
		},
		getZkeyLabels: function ( state ) {
			return state.zKeyLabels;
		},
		getZarguments: function ( state ) {
			return state.zArguments;
		},
		getZImplementations: function ( state, getters, rootState ) {
			return state.zImplementations.filter( function ( zid ) {
				var zobject;
				for ( zobject in rootState.zobjectModule.zobject ) {
					if ( rootState.zobjectModule.zobject[ zobject ].value === zid ) {
						return false;
					}
				}

				return true;
			} );
		}
	},
	mutations: {
		/**
		 * Add zid info to the state
		 *
		 * @param {Object} state
		 * @param {Object} payload
		 */
		addZKeyInfo: function ( state, payload ) {
			Vue.set( state.zKeys, payload.zid, payload.info );
		},
		/**
		 * Add zkey label in the user selected language
		 *
		 * @param {Object} state
		 * @param {Object} payload
		 */
		addZKeyLabel: function ( state, payload ) {
			Vue.set( state.zKeyLabels, payload.key, payload.label );
		},
		addZArgumentInfo: function ( state, payload ) {
			state.zArguments[ payload.zid ] = payload;
		},
		resetZArgumentInfo: function ( state ) {
			state.zArguments = {};
		},
		setZImplementations: function ( state, zImplementations ) {
			state.zImplementations = zImplementations;
		}
	},
	actions: {
		/**
		 * Call the wikilambda_fetch api to get the information of a given
		 * of ZIds, and stores the ZId information and the ZKey labels
		 * in the state.
		 *
		 * @param {Object} context
		 * @param {Array} zids
		 * @return {Promise}
		 */
		fetchZKeys: function ( context, zids ) {
			var zKeystoFetch = [],
				api = new mw.Api();
			zids.forEach( function ( zId ) {
				// Zid has already been fetched
				// or
				// Zid is in the process of being fetched
				if ( !zId || ( zId in context.state.zKeys ) ) {
					return;
				}
				zKeystoFetch.push( zId );
			} );

			if ( zKeystoFetch.length === 0 ) {
				return Promise.resolve();
			}
			return api.get( {
				action: 'query',
				list: 'wikilambdaload_zobjects',
				format: 'json',
				wikilambdaload_zids: zKeystoFetch.join( '|' ),
				wikilambdaload_language: context.rootGetters.zLang,
				wikilambdaload_canonical: 'true'
			} ).then( function ( response ) {
				var keys,
					multilingualStr,
					zidInfo;
				zKeystoFetch.forEach( function ( zid ) {
					if ( !( 'success' in response.query.wikilambdaload_zobjects[ zid ] ) ) {
						// TODO add error into error notification pool
						return;
					}

					zidInfo = response.query.wikilambdaload_zobjects[ zid ].data;

					context.commit( 'addZKeyInfo', {
						zid: zid,
						info: zidInfo
					} );

					// State mutation:
					// Add zObject label in user's selected language
					// eslint-disable-next-line max-len
					multilingualStr = zidInfo[ Constants.Z_PERSISTENTOBJECT_LABEL ][ Constants.Z_MULTILINGUALSTRING_VALUE ];

					if ( multilingualStr && multilingualStr[ 0 ] ) {
						context.commit( 'addZKeyLabel', {
							key: zid,
							label: multilingualStr[ 0 ][ Constants.Z_MONOLINGUALSTRING_VALUE ]
						} );
					}

					if ( isZType( zidInfo ) ) {
						keys = zidInfo[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_TYPE_KEYS ];
						keys.forEach( function ( key ) {
							multilingualStr = key[ Constants.Z_KEY_LABEL ][ Constants.Z_MULTILINGUALSTRING_VALUE ];
							context.commit( 'addZKeyLabel', {
								key: key[ Constants.Z_KEY_ID ],
								label: multilingualStr[ 0 ][ Constants.Z_MONOLINGUALSTRING_VALUE ]
							} );
						} );
					}
				} );
			} );
		},
		setAvailableZArguments: function ( context, payload ) {
			context.commit( 'resetZArgumentInfo' );

			payload.forEach( function ( arg ) {
				context.commit( 'addZArgumentInfo', arg );
			} );
		},
		fetchZImplementations: function ( context, zFunctionId ) {
			var api = new mw.Api();

			api.get( {
				action: 'query',
				list: 'wikilambdafn_search',
				format: 'json',
				wikilambdafn_zfunction_id: zFunctionId,
				wikilambdafn_type: 'Z14'
			} ).then( function ( response ) {
				context.commit( 'setZImplementations', response.query.wikilambdafn_search );
				context.dispatch( 'fetchZKeys', response.query.wikilambdafn_search );
			} );
		}
	}
};
