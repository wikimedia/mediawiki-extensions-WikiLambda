/*!
 * WikiLambda Vue editor: zKeys Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

var Vue = require( 'vue' ),
	Constants = require( '../../Constants.js' ),
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
		/**
		 * Returns all fetched zids and their label, which will be in the
		 * user selected language if available, or in the closes fallback.
		 *
		 * @param {Object} state
		 * @param {Object} payload
		 * @param getters
		 * @return {Object} map of { zid, label } values
		 */
		getZkeyLabels: function ( state, getters ) {
			const allLabels = {};
			state.zKeyAllLanguageLabels.forEach( function ( label ) {
				if ( !allLabels[ label.zid ] || ( label.lang === getters.getCurrentZLanguage ) ) {
					allLabels[ label.zid ] = label.label;
				}
			} );
			return allLabels;
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
		 * Call the wikilambdaload_zobjects api with debounce to get the information
		 * of a given set of ZIds, and stores the ZId information and the ZKey labels
		 * in the state.
		 *
		 * @param {Object} context
		 * @param {Array} zids
		 * @return {Promise}
		 */
		fetchZKeyWithDebounce: function ( context, zids ) {
			return context.dispatch( 'fetchZKeys', {
				zids: zids,
				debounce: true
			} );
		},
		/**
		 * Call the wikilambdaload_zobjects api to get the information of a
		 * given set of ZIds, and stores the ZId information and the ZKey labels
		 * in the state.
		 *
		 * @param context
		 * @param {Object} payload with the keys 'zids', 'debounce' and 'main'
		 * @return {Promise}
		 */
		fetchZKeys: function ( context, payload ) {
			const {
				zids = [],
				debounce = false,
				main = false
			} = payload;

			zids.forEach( function ( zId ) {
				// Zid has already been fetched or
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

			function dispatchPerformZKeyFetch( fetchZids, isMainZid = false ) {
				zKeystoFetch = [];
				return context.dispatch(
					'performZKeyFetch',
					{
						zids: fetchZids,
						main: isMainZid
					}
				).then( function ( fetchedZids ) {
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
				resolvePromiseList[ promiseName ].resolve = resolve;

				if ( debounce ) {
					clearTimeout( debounceZKeyFetch );
					debounceZKeyFetch = setTimeout(
						dispatchPerformZKeyFetch( zKeystoFetch, main ),
						DEBOUNCE_FETCH_ZKEYS_TIMEOUT
					);
				} else {
					dispatchPerformZKeyFetch( zKeystoFetch, main );
				}
			} );

			return resolvePromiseList[ promiseName ].promise;
		},
		/**
		 * Calls the api wikilambdaload_zobjects with a set of Zids and
		 * with or without language property. The language will always be
		 * requested so that the backend takes care of the language ballback
		 * logic. The only moment in wich we will not specify a language
		 * property is when requesting the root ZObject on initialization
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @return {Promise}
		 */
		performZKeyFetch: function ( context, payload ) {

			var api = new mw.Api();

			return api.get( {
				action: 'query',
				list: 'wikilambdaload_zobjects',
				format: 'json',
				// eslint-disable-next-line camelcase
				wikilambdaload_zids: payload.zids.join( '|' ),
				// eslint-disable-next-line camelcase
				wikilambdaload_language: payload.main ? undefined : context.getters.getZLang,
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
						if ( typeof monoStr === 'object' ) {
							allLabels.push(
								{
									zid,
									label: monoStr[ Constants.Z_MONOLINGUALSTRING_VALUE ],
									lang: monoStr[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]
								}
							);
						}
					}
					context.commit( 'addAllZKeyLabels', allLabels );
					var zTypeallLabels = [];
					if ( isZType( zidInfo ) ) {
						keys = zidInfo[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_TYPE_KEYS ].slice( 1 );

						keys.forEach( function ( key ) {
							if ( typeof key === 'object' ) {
								multilingualStr = key[
									Constants.Z_KEY_LABEL
								][ Constants.Z_MULTILINGUALSTRING_VALUE ];

								var langsList = key[
									Constants.Z_KEY_LABEL
								][ Constants.Z_MULTILINGUALSTRING_VALUE ];

								langsList.forEach( function ( languageItem ) {
									zTypeallLabels.push(
										{
											zid: key[ Constants.Z_KEY_ID ],
											label: languageItem[ Constants.Z_MONOLINGUALSTRING_VALUE ],
											lang: languageItem[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]
										}
									);
								} );
							}
						} );
						context.commit( 'addAllZKeyLabels', zTypeallLabels );
					}
				} );
				return zIds;
			} );
		}
	}
};
