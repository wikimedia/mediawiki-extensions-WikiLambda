/* eslint-disable camelcase */
/*!
 * WikiLambda Vue editor: zKeys Vuex module
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

var Vue = require( 'vue' ),
	Constants = require( '../../Constants.js' ),
	canonicalize = require( '../../mixins/schemata.js' ).methods.canonicalizeZObject;
function isZType( zidInfo ) {
	return ( typeof zidInfo[ Constants.Z_PERSISTENTOBJECT_VALUE ] === 'object' ) &&
		( zidInfo[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_OBJECT_TYPE ] === Constants.Z_TYPE );
}

function filterPresentZids( rootState ) {
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
		zImplementations: [],
		/**
		 * List of tester keys
		 */
		zTesters: []
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
		getZargumentsString: function ( state, getters ) {
			return Object.keys( getters.getZarguments )
				.map( function ( key ) {
					return getters.getZarguments[ key ];
				} )
				.reduce( function ( argumentString, argument ) {
					var key = argument.key,
						type = argument.type;

					if ( type === undefined ) {
						return argumentString;
					}

					return argumentString.length ?
						argumentString + ', ' + key + type :
						argumentString + key + type;
				}, '' );
		},
		getZImplementations: function ( state, getters, rootState ) {
			return state.zImplementations.filter( filterPresentZids( rootState ) );
		},
		getZTesters: function ( state, getters, rootState ) {
			return state.zTesters.filter( filterPresentZids( rootState ) );
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
		},
		setZTesters: function ( state, zTesters ) {
			state.zTesters = zTesters;
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
		setAvailableZArguments: function ( context, zFunctionId ) {
			context.commit( 'resetZArgumentInfo' );

			if ( context.getters.getCurrentZObjectId === zFunctionId ||
					context.getters.getZkeys[ zFunctionId ] ) {
				var zobject,
					missingTypes = [];

				if ( context.getters.getCurrentZObjectId === zFunctionId ) {
					zobject = canonicalize(
						JSON.parse( JSON.stringify( context.getters.getZObjectAsJson ) )
					);
				} else {
					zobject = context.getters.getZkeys[ zFunctionId ];
				}

				zobject[
					Constants.Z_PERSISTENTOBJECT_VALUE ][
					Constants.Z_FUNCTION_ARGUMENTS ]
					.forEach( function ( argument ) {
						var argumentLabels = argument[ Constants.Z_ARGUMENT_LABEL ][
								Constants.Z_MULTILINGUALSTRING_VALUE ],
							userLang = argumentLabels.filter( function ( label ) {
								return label[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] ===
								context.getters.getUserZlangZID ||
							label[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ][ Constants.Z_STRING_VALUE ] ===
								context.getters.getUserZlangZID;
							} )[ 0 ] || argumentLabels[ 0 ],
							userLangLabel = userLang[ Constants.Z_MONOLINGUALSTRING_VALUE ],
							type = context.getters.getZkeyLabels[ argument[ Constants.Z_ARGUMENT_TYPE ] ],
							key = userLangLabel ?
								( userLangLabel ) + ': ' :
								'',
							zid = argument[ Constants.Z_ARGUMENT_KEY ];

						if ( typeof zid === 'object' ) {
							zid = zid[ Constants.Z_STRING_VALUE ];
						}
						if ( !type ) {
							missingTypes.push( argument[ Constants.Z_ARGUMENT_TYPE ] );
						}

						context.commit( 'addZArgumentInfo', {
							label: userLangLabel,
							zid: zid,
							key: key,
							type: type
						} );
					} );

				// If any argument types are not available, fetch them and rerun the function
				if ( missingTypes.filter( Boolean ).length ) {
					context.dispatch( 'fetchZKeys', missingTypes ).then( function () {
						context.dispatch( 'setAvailableZArguments', zFunctionId );
					} );
				}
			}
		},
		fetchZImplementations: function ( context, zFunctionId ) {
			var api = new mw.Api();

			return api.get( {
				action: 'query',
				list: 'wikilambdafn_search',
				format: 'json',
				wikilambdafn_zfunction_id: zFunctionId,
				wikilambdafn_type: Constants.Z_IMPLEMENTATION
			} ).then( function ( response ) {
				context.commit( 'setZImplementations', response.query.wikilambdafn_search );
				return context.dispatch( 'fetchZKeys', response.query.wikilambdafn_search );
			} );
		},
		fetchZTesters: function ( context, zFunctionId ) {
			var api = new mw.Api();

			return api.get( {
				action: 'query',
				list: 'wikilambdafn_search',
				format: 'json',
				wikilambdafn_zfunction_id: zFunctionId,
				wikilambdafn_type: Constants.Z_TESTER
			} ).then( function ( response ) {
				context.commit( 'setZTesters', response.query.wikilambdafn_search );
				return context.dispatch( 'fetchZKeys', response.query.wikilambdafn_search );
			} );
		}
	}
};
