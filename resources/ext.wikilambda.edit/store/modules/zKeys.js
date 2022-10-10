/*!
 * WikiLambda Vue editor: zKeys Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

var Constants = require( '../../Constants.js' ),
	resolvePromiseList = {},
	zKeystoFetch = [];

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
		 * @param {Object} getters
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
			state.zKeys[ payload.zid ] = payload.info;
		},
		/**
		 * Add labels info to the state
		 *
		 * @param {Object} state
		 * @param {Array} allKeyLanguageLabels
		 */
		addAllZKeyLabels: function ( state, allKeyLanguageLabels ) {
			state.zKeyAllLanguageLabels = state.zKeyAllLanguageLabels.concat( allKeyLanguageLabels );
		}
	},
	actions: {
		/**
		 * Call the wikilambdaload_zobjects api to get the information of a
		 * given set of ZIds, and stores the ZId information and the ZKey labels
		 * in the state.
		 *
		 * @param {Object} context
		 * @param {Object} payload with the keys 'zids'
		 * @return {Promise}
		 */
		fetchZKeys: function ( context, payload ) {
			const {
				zids = []
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

			function dispatchPerformZKeyFetch( fetchZids ) {
				zKeystoFetch = [];
				return context.dispatch(
					'performZKeyFetch',
					{
						zids: fetchZids
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
				dispatchPerformZKeyFetch( zKeystoFetch );
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
			const api = new mw.Api();
			return api.get( {
				action: 'query',
				list: 'wikilambdaload_zobjects',
				format: 'json',
				wikilambdaload_zids: payload.zids.join( '|' ),
				wikilambdaload_language: context.getters.getZLang,
				wikilambdaload_canonical: 'true'
			} ).then( function ( response ) {

				const zIds = Object.keys( response.query.wikilambdaload_zobjects );
				zIds.forEach( function ( zid ) {

					if ( !( 'success' in response.query.wikilambdaload_zobjects[ zid ] ) ) {
						// TODO (T315002) add error into error notification pool
						return;
					}

					// 1. State mutation:
					// Add filtered zObject to zKeys state object
					// TODO (T315004) Fix terminology, this should not be addZkeyInfo but addZObjectInfo
					const zidInfo = response.query.wikilambdaload_zobjects[ zid ].data;
					context.commit( 'addZKeyInfo', {
						zid: zid,
						info: zidInfo
					} );

					// 2. State mutation:
					// Add zObject label in user's selected language
					const zObjectLabels = [];
					const multiStr = zidInfo[
						Constants.Z_PERSISTENTOBJECT_LABEL
					][ Constants.Z_MULTILINGUALSTRING_VALUE ].slice( 1 );

					// The returned multilingual strings will only contain one monolingual string
					// (or none) as they have already been filtered by the back-end to the given
					// language or any of its available fallbacks.
					if ( multiStr.length === 1 ) {
						zObjectLabels.push( {
							zid,
							label: multiStr[ 0 ][ Constants.Z_MONOLINGUALSTRING_VALUE ],
							lang: multiStr[ 0 ][ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]
						} );
					}

					// FIXME shall we factorize this mmutationn with the next?
					context.commit( 'addAllZKeyLabels', zObjectLabels );

					// 3. State mutation:
					// Add the key or argument labels from the selected language to the store
					let zKeys;
					const zKeyLabels = [];
					const zType = ( typeof zidInfo[ Constants.Z_PERSISTENTOBJECT_VALUE ] === 'object' ) ?
						zidInfo[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_OBJECT_TYPE ] :
						undefined;

					switch ( zType ) {

						case Constants.Z_TYPE:
							// If the zObject is a type, get all key labels
							// and commit to the store
							zKeys = zidInfo[
								Constants.Z_PERSISTENTOBJECT_VALUE
							][ Constants.Z_TYPE_KEYS ].slice( 1 );

							zKeys.forEach( function ( key ) {
								const keyLabels = key[
									Constants.Z_KEY_LABEL
								][ Constants.Z_MULTILINGUALSTRING_VALUE ].slice( 1 );

								if ( keyLabels.length === 1 ) {
									zKeyLabels.push( {
										zid: key[ Constants.Z_KEY_ID ],
										label: keyLabels[ 0 ][ Constants.Z_MONOLINGUALSTRING_VALUE ],
										lang: keyLabels[ 0 ][ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]
									} );
								}
							} );
							break;

						case Constants.Z_FUNCTION:
							// If the zObject is a function, get all argument
							// declaration labels and commit to the store
							zKeys = zidInfo[
								Constants.Z_PERSISTENTOBJECT_VALUE
							][ Constants.Z_FUNCTION_ARGUMENTS ].slice( 1 );

							zKeys.forEach( function ( arg ) {
								const argLabels = arg[
									Constants.Z_ARGUMENT_LABEL
								][ Constants.Z_MULTILINGUALSTRING_VALUE ].slice( 1 );

								if ( argLabels.length === 1 ) {
									zKeyLabels.push( {
										zid: arg[ Constants.Z_ARGUMENT_KEY ],
										label: argLabels[ 0 ][ Constants.Z_MONOLINGUALSTRING_VALUE ],
										lang: argLabels[ 0 ][ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]
									} );
								}
							} );
							break;

						default:
							// Do nothing
					}

					context.commit( 'addAllZKeyLabels', zKeyLabels );

				} );

				// performFetch resolves to the list of zIds fetched.
				return zIds;
			} );
		}
	}
};
