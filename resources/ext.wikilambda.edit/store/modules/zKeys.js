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
	typedListToArray = require( '../../mixins/typeUtils.js' ).methods.typedListToArray,
	debounceZKeyFetch = null,
	resolvePromiseList = [],
	zKeystoFetch = [],
	DEBOUNCE_FETCH_ZKEYS_TIMEOUT = 1;

function isZType( zidInfo ) {
	return ( typeof zidInfo[ Constants.Z_PERSISTENTOBJECT_VALUE ] === 'object' ) &&
		( zidInfo[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_OBJECT_TYPE ] === Constants.Z_TYPE );
}

module.exports = exports = {
	state: {
		/**
		 * Collection of zKey information
		 */
		zKeys: {},
		/**
		 * Collection of zKey labels in all languages
		 */
		zKeyAllLanguageLabels: [],
		/**
		 * Collection of arguments
		 */
		zArguments: {}
	},
	getters: {
		getZkeys: function ( state ) {
			return state.zKeys;
		},
		getZkeyLabels: function ( state, getters ) {
			var langLabels = state.zKeyAllLanguageLabels.filter( function ( item ) {
				return item.lang === getters.getCurrentZLanguage;
			} );

			var languageItem = {};
			for ( var label in langLabels ) {
				languageItem[ langLabels[ label ].zid ] = langLabels[ label ].label;
			}
			return languageItem;
		},
		getAllZKeyLanguageLabels: function ( state ) {
			return state.zKeyAllLanguageLabels;
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
			/**
			 * @param {boolean} zlang
			 * @return {Array}
			 */
			return function ( zlang ) {
				var lang = zlang || getters.getCurrentZLanguage;
				return Object.keys( getters.getZarguments )
					.map( function ( key ) {
						return {
							zid: getters.getZarguments[ key ].zid,
							type: getters.getZarguments[ key ].type,
							label: ( getters.getZarguments[ key ].labels.filter( function ( label ) {
								return label.lang === lang;
							} )[ 0 ] || getters.getZarguments[ key ].labels[ 0 ] ).label
						};
					} );
			};
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
		addAllZKeyLabels: function ( state, allKeyLanguageLabels ) {
			state.zKeyAllLanguageLabels = state.zKeyAllLanguageLabels.concat( allKeyLanguageLabels );
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
		 * Call the wikilambda_fetch api with debounce to get the information of a given
		 * of ZIds, and stores the ZId information and the ZKey labels
		 * in the state.
		 *
		 * @param {Object} context
		 * @param {Array} zids
		 * @return {Promise}
		 */
		fetchZKeyWithDebounce: function ( context, zids ) {
			return context.dispatch( 'fetchZKeys', zids, true );
		},
		/**
		 * Call the wikilambda_fetch api to get the information of a given
		 * of ZIds, and stores the ZId information and the ZKey labels
		 * in the state.
		 *
		 * @param {Object} context
		 * @param {Array} zids
		 * @param {boolean} debounce
		 * @return {Promise}
		 */
		fetchZKeys: function ( context, zids, debounce = false ) {
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

			function dispatchPerformZKeyFetch( payload ) {
				zKeystoFetch = [];
				return context.dispatch( 'performZKeyFetch', payload ).then( function () {
					resolvePromiseList.forEach( function ( performResolve ) {
						performResolve();
					} );
					resolvePromiseList = [];
				} );
			}

			// eslint-disable-next-line compat/compat
			return new Promise( function ( resolve ) {
				var payload = zKeystoFetch;
				resolvePromiseList.push( resolve );
				if ( debounce ) {
					clearTimeout( debounceZKeyFetch );
					debounceZKeyFetch = setTimeout( dispatchPerformZKeyFetch( payload ), DEBOUNCE_FETCH_ZKEYS_TIMEOUT );
				} else {
					dispatchPerformZKeyFetch( payload );
				}
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
					multilingualStr = zidInfo[
						Constants.Z_PERSISTENTOBJECT_LABEL
					][ Constants.Z_MULTILINGUALSTRING_VALUE ];

					// State mutation:
					// Add zObject label in all languages
					var allLabels = [];
					for ( var language in multilingualStr ) {
						var monoStr = multilingualStr[ language ];
						allLabels.push(
							{
								zid,
								label: monoStr.Z11K2,
								lang: monoStr.Z11K1
							}
						);
					}
					context.commit( 'addAllZKeyLabels', allLabels );
					var zTypeallLabels = [];
					if ( isZType( zidInfo ) ) {
						keys = zidInfo[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_TYPE_KEYS ];
						// TODO(T300082): once Z10 is deprecated, this should be default behavior
						var result = keys;
						if ( !Array.isArray( keys ) ) {
							result = typedListToArray( keys );
						}

						result.forEach( function ( key ) {
							multilingualStr = key[
								Constants.Z_KEY_LABEL ][
								Constants.Z_MULTILINGUALSTRING_VALUE ];

							var langsList = key[
								Constants.Z_KEY_LABEL
							][
								Constants.Z_MULTILINGUALSTRING_VALUE
							];

							langsList.forEach( function ( languageItem ) {
								zTypeallLabels.push(
									{
										zid: key[ Constants.Z_KEY_ID ],
										label: languageItem[ Constants.Z_MONOLINGUALSTRING_VALUE ],
										lang: languageItem[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]
									}
								);
							} );
						} );
						context.commit( 'addAllZKeyLabels', zTypeallLabels );
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
