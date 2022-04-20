/*!
 * WikiLambda Vue editor: zKeys Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

var Vue = require( 'vue' ),
	Constants = require( '../../Constants.js' ),
	typedListToArray = require( '../../mixins/typeUtils.js' ).methods.typedListToArray,
	debounceZKeyFetch = null,
	resolvePromiseList = {},
	zKeystoFetch = [],
	DEBOUNCE_FETCH_ZKEYS_TIMEOUT = 1;

function isZType( zidInfo ) {
	return ( typeof zidInfo[ Constants.Z_PERSISTENTOBJECT_VALUE ] === 'object' ) &&
		( zidInfo[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_OBJECT_TYPE ] === Constants.Z_TYPE );
}

function generateRequestName( keysList ) {
	const sortedKeys = keysList.sort();
	return sortedKeys.join( '-' );
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
		zKeyAllLanguageLabels: []
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
		addAllZKeyLabels: function ( state, allKeyLanguageLabels ) {
			state.zKeyAllLanguageLabels = state.zKeyAllLanguageLabels.concat( allKeyLanguageLabels );
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
				return context.dispatch( 'performZKeyFetch', payload ).then( function ( fetchedZids ) {

					if ( !fetchedZids || fetchedZids.length === 0 ) {
						return;
					}
					// we replicate the name defined when the promise was set
					var currentPromiseName = generateRequestName( fetchedZids );
					resolvePromiseList[ currentPromiseName ].resolve();
					delete resolvePromiseList[ currentPromiseName ];
				} );
			}

			// we provide an unique name to the promise, to be able to resolve the correct one later.
			var promiseName = generateRequestName( zKeystoFetch );

			// if a promise with the same name already exist, do not fetch again
			if ( resolvePromiseList[ promiseName ] ) {
				return resolvePromiseList[ promiseName ].promise;
			} else {
				resolvePromiseList[ promiseName ] = {};
			}

			// eslint-disable-next-line compat/compat
			resolvePromiseList[ promiseName ].promise = new Promise( function ( resolve ) {
				var payload = zKeystoFetch;
				resolvePromiseList[ promiseName ].resolve = resolve;

				if ( debounce ) {
					clearTimeout( debounceZKeyFetch );
					debounceZKeyFetch = setTimeout( dispatchPerformZKeyFetch( payload ), DEBOUNCE_FETCH_ZKEYS_TIMEOUT );
				} else {
					dispatchPerformZKeyFetch( payload );
				}
			} );

			return resolvePromiseList[ promiseName ].promise;
		},
		performZKeyFetch: function ( context, payload ) {
			var api = new mw.Api();

			return api.get( {
				action: 'query',
				list: 'wikilambdaload_zobjects',
				format: 'json',
				// eslint-disable-next-line camelcase
				wikilambdaload_zids: payload.join( '|' ),
				// Fetch all labels when initially loading the ZObject, otherwise get only the user's languages
				// eslint-disable-next-line camelcase
				wikilambdaload_language:
					context.getters.getCurrentZObjectId !== Constants.NEW_ZID_PLACEHOLDER ?
						context.getters.getZLang :
						undefined,
				// eslint-disable-next-line camelcase
				wikilambdaload_canonical: 'true'
			} ).then( function ( response ) {

				var keys,
					multilingualStr,
					zidInfo,
					zIds;

				zIds = Object.keys( response.query.wikilambdaload_zobjects );
				zIds.forEach( function ( zid ) {
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
				return zIds;
			} );
		}
	}
};
