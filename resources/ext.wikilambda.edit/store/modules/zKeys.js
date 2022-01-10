/* eslint-disable camelcase */
/*!
 * WikiLambda Vue editor: zKeys Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

var Vue = require( 'vue' ),
	Constants = require( '../../Constants.js' ),
	canonicalize = require( '../../mixins/schemata.js' ).methods.canonicalizeZObject,
	debounceZKeyFetch = null,
	resolvePromiseList = [],
	zKeystoFetch = [],
	DEBOUNCE_FETCH_ZKEYS_TIMEOUT = 1;

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
		zArguments: {}
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
		/**
		 * Generates a comma separated string of the available arguments.
		 * This is used for visualization on the editor.
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {string}
		 */
		getZargumentsString: function ( state, getters ) {
			return Object.keys( getters.getZarguments )
				.map( function ( key ) {
					return {
						zid: getters.getZarguments[ key ].zid,
						type: getters.getZarguments[ key ].type,
						label: getters.getZarguments[ key ].labels.filter( function ( label ) {
							return label.lang === getters.getCurrentZLanguage;
						} )[ 0 ] || getters.getZarguments[ key ].labels[ 0 ]
					};
				} )
				.reduce( function ( argumentString, argument ) {
					var key = argument.label.key,
						type = argument.type;

					if ( type === undefined ) {
						return argumentString;
					}

					return argumentString.length ?
						argumentString + ', ' + key + type :
						argumentString + key + type;
				}, '' );
		},

		// TODO(T299031): cleanup this code to be more performant
		/**
		 * Returns an array of objects with key and type of the available arguments.
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Array}
		 */
		getZargumentsArray: function ( state, getters ) {
			return Object.keys( getters.getZarguments )
				.map( function ( key ) {
					return {
						zid: getters.getZarguments[ key ].zid,
						type: getters.getZarguments[ key ].type,
						label: ( getters.getZarguments[ key ].labels.filter( function ( label ) {
							return label.lang === getters.getCurrentZLanguage;
						} )[ 0 ] || getters.getZarguments[ key ].labels[ 0 ] ).label
					};
				} );
		}
		// TODO(T299031): cleanup this code to be more performant
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
		/**
		 * Add a specific argument to the zArgument object.
		 *
		 * @param {Object} state
		 * @param {Object} payload
		 * @param {string} payload.zid
		 */
		addZArgumentInfo: function ( state, payload ) {
			Vue.set( state.zArguments, payload.zid, payload );
		},
		/**
		 * Reset the zArguments object in the state
		 *
		 * @param {Object} state
		 */
		resetZArgumentInfo: function ( state ) {
			state.zArguments = {};
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
			zids.forEach( function ( zId ) {
				// Zid has already been fetched
				// or
				// Zid is in the process of being fetched
				if ( zId &&
					zId !== Constants.NEW_ZID_PLACEHOLDER &&
					!( zId in context.state.zKeys ) &&
					( zKeystoFetch.indexOf( zId ) === -1 )
				) {
					zKeystoFetch.push( zId );
				}
			} );

			if ( zKeystoFetch.length === 0 ) {
				return Promise.resolve();
			}

			// eslint-disable-next-line compat/compat
			return new Promise( function ( resolve ) {
				clearTimeout( debounceZKeyFetch );
				resolvePromiseList.push( resolve );
				debounceZKeyFetch = setTimeout( function () {
					var payload = zKeystoFetch;
					zKeystoFetch = [];
					return context.dispatch( 'performZKeyFetch', payload ).then( function () {
						resolvePromiseList.forEach( function ( performResolve ) {
							performResolve();
						} );
						resolvePromiseList = [];
					} );
				}, DEBOUNCE_FETCH_ZKEYS_TIMEOUT );
			} );
		},
		performZKeyFetch: function ( context, payload ) {
			var api = new mw.Api();

			return api.get( {
				action: 'query',
				list: 'wikilambdaload_zobjects',
				format: 'json',
				wikilambdaload_zids: payload.join( '|' ),
				// Fetch all labels when initially loading the ZObject, otherwise get only the user's languages
				wikilambdaload_language:
					context.getters.getCurrentZObjectId !== Constants.NEW_ZID_PLACEHOLDER ?
						context.getters.getZLang :
						undefined,
				wikilambdaload_canonical: 'true'
			} ).then( function ( response ) {
				var keys,
					multilingualStr,
					zidInfo;
				payload.forEach( function ( zid ) {
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
						var userLanguageFilteredLabels = multilingualStr.filter( function ( data ) {
							return context.getters.getUserZlangZID === data[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ];
						} );
						// If the user's language isn't set, fall back to the first set label
						var label = (
							( userLanguageFilteredLabels && userLanguageFilteredLabels[ 0 ] ) ?
								userLanguageFilteredLabels : multilingualStr
						)[ 0 ][ Constants.Z_MONOLINGUALSTRING_VALUE ];

						context.commit( 'addZKeyLabel', {
							key: zid,
							label: label
						} );
					}

					if ( isZType( zidInfo ) ) {
						keys = zidInfo[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_TYPE_KEYS ];
						keys.forEach( function ( key ) {
							multilingualStr = key[
								Constants.Z_KEY_LABEL ][
								Constants.Z_MULTILINGUALSTRING_VALUE ];

							var userLanguageFilteredKeyLabels = multilingualStr.filter( function ( data ) {
								return context.getters.getUserZlangZID ===
									data[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ];
							} );

							var keyLabel = (
								( userLanguageFilteredKeyLabels && userLanguageFilteredKeyLabels[ 0 ] ) ?
									userLanguageFilteredKeyLabels : multilingualStr
							)[ 0 ][ Constants.Z_MONOLINGUALSTRING_VALUE ];

							context.commit( 'addZKeyLabel', {
								key: key[ Constants.Z_KEY_ID ],
								label: keyLabel
							} );
						} );
					}
				} );
			} );
		},
		/**
		 * reset and repopulate the zArguments in the store. This method also
		 * fetches any missing types.
		 *
		 * @param {Object} context
		 * @param {Object} zFunctionId
		 */
		setAvailableZArguments: function ( context, zFunctionId ) {
			context.commit( 'resetZArgumentInfo' );

			if ( context.getters.getCurrentZObjectId === zFunctionId ||
					context.getters.getZkeys[ zFunctionId ] ) {
				var zobject,
					missingTypes = [];

				if ( !context.getters.getZObjectAsJson ) {
					return;
				}

				if ( context.getters.getCurrentZObjectId === zFunctionId ) {
					zobject = canonicalize(
						JSON.parse( JSON.stringify( context.getters.getZObjectAsJson ) )
					);
				} else {
					zobject = context.getters.getZkeys[ zFunctionId ];
				}

				if ( !zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ] ) {
					return;
				}

				zobject[
					Constants.Z_PERSISTENTOBJECT_VALUE ][
					Constants.Z_FUNCTION_ARGUMENTS ]
					.forEach( function ( argument ) {
						var argumentLabels = argument[ Constants.Z_ARGUMENT_LABEL ][
								Constants.Z_MULTILINGUALSTRING_VALUE ],
							labels = argumentLabels.map( function ( label ) {
								return {
									lang: label[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ][ Constants.Z_STRING_VALUE ] ||
										label[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ],
									label: label[ Constants.Z_MONOLINGUALSTRING_VALUE ],
									key: label[ Constants.Z_MONOLINGUALSTRING_VALUE ] + ': '
								};
							} ),
							zid = argument[ Constants.Z_ARGUMENT_KEY ],
							typeZid,
							typeLabel;

						// We can either return an object or a straight string.
						if ( typeof argument[ Constants.Z_ARGUMENT_TYPE ] === 'object' ) {
							typeZid = argument[ Constants.Z_ARGUMENT_TYPE ][ Constants.Z_OBJECT_TYPE ];
							typeLabel = context.getters.getZkeyLabels[ typeZid ];
						} else {
							typeZid = argument[ Constants.Z_ARGUMENT_TYPE ];
							typeLabel = context.getters.getZkeyLabels[ typeZid ];
						}

						if ( typeof zid === 'object' ) {
							zid = zid[ Constants.Z_STRING_VALUE ];
						}
						if ( !typeLabel ) {
							missingTypes.push( argument[ Constants.Z_ARGUMENT_TYPE ] );
						}

						context.commit( 'addZArgumentInfo', {
							zid: zid,
							type: {
								label: typeLabel,
								zid: typeZid
							},
							labels: labels
						} );
					} );

				// If any argument types are not available, fetch them and rerun the function
				if ( missingTypes.filter( Boolean ).length ) {
					context.dispatch( 'fetchZKeys', missingTypes ).then( function () {
						context.dispatch( 'setAvailableZArguments', zFunctionId );
					} );
				}
			}
		}
	}
};
