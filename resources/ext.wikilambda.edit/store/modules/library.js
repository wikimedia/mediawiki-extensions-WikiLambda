/*!
 * WikiLambda Vue editor:  Vuex library module: fetch, store and
 * provide auxiliary data from other ZObejcts (labels, keys, etc.).
 * It also contains other helper getters to retrieve details of other
 * stored auxiliary objects such as functions, languages, etc.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ).methods,
	LabelData = require( '../classes/LabelData.js' ),
	resolvePromiseList = {};

let zidsToFetch = [];

module.exports = exports = {
	state: {
		/**
		 * Collection of ZPersistent objects fetched
		 * and indexed by their ZID.
		 */
		objects: {},
		/**
		 * Collection of LabelData object indexed by the identifier of
		 * the ZKey, ZPersistentObject or ZArgumentDeclaration.
		 */
		labels: {}
	},
	getters: {
		/**
		 * Returns the string value of the language Iso code if the object
		 * has been fetched and is stored in the state.
		 * If not available, returns the input zid.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getLanguageIsoCodeOfZLang: function ( state ) {
			/**
			 * @param {string} zid
			 * @return {string}
			 */
			function findLanguageCode( zid ) {
				if ( state.objects[ zid ] ) {
					const zobject = state.objects[ zid ][ Constants.Z_PERSISTENTOBJECT_VALUE ];
					const ztype = zobject[ Constants.Z_OBJECT_TYPE ];
					if ( ztype === Constants.Z_NATURAL_LANGUAGE ) {
						return zobject[ Constants.Z_NATURAL_LANGUAGE_ISO_CODE ];
					}
				}
				return zid;
			}
			return findLanguageCode;
		},
		/**
		 * Given a global ZKey (ZnKm) it returns a string that reflects
		 * its expected value type (if any). Else it returns Z1.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getExpectedTypeOfKey: function ( state ) {
			/**
			 * @param {string} key
			 * @return {string}
			 */
			return function ( key ) {

				// If the key is undefined, then this is the root object,
				// the expected type is always Z2/Persistent object type
				if ( key === undefined ) {
					return Constants.Z_PERSISTENTOBJECT;
				}

				// TODO (T324251): if this is an array index, (an integer),
				// should we return the expected type for the typed list?
				if ( typeUtils.isGlobalKey( key ) ) {
					let type;
					const zid = typeUtils.getZidOfGlobalKey( key );

					if ( state.objects[ zid ] ) {
						const zobject = state.objects[ zid ][ Constants.Z_PERSISTENTOBJECT_VALUE ];
						const ztype = zobject[ Constants.Z_OBJECT_TYPE ];

						switch ( ztype ) {
							// Return the key value type if zid belongs to a type
							case Constants.Z_TYPE:
								var zkey = typeUtils.getKeyFromKeyList( key, zobject[ Constants.Z_TYPE_KEYS ] );
								type = zkey ? zkey[ Constants.Z_KEY_TYPE ] : Constants.Z_OBJECT;
								break;

							// Return the argument type if the zid belongs to a function
							case Constants.Z_FUNCTION:
								var zarg = typeUtils.getArgFromArgList(
									key,
									zobject[ Constants.Z_FUNCTION_ARGUMENTS ]
								);
								type = zarg ? zarg[ Constants.Z_ARGUMENT_TYPE ] : Constants.Z_OBJECT;
								break;

							// If not found, return Z1/ZObject (any) type
							default:
								return Constants.Z_OBJECT;
						}
						return typeUtils.typeToString( type );
					}
				}

				// If key is a not found, a list index or a local key, return Z1/Object (any) type
				return Constants.Z_OBJECT;
			};
		},
		/**
		 * Returns the persisted object for a given ZID if that was
		 * fetched from the DB and saved in the state. Else returns undefined
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getStoredObject: function ( state ) {
			/**
			 * @param {string} zid of the ZPersistentObject
			 * @return {Object|undefined} persisted ZObject
			 */
			function findPersistedObject( zid ) {
				return state.objects[ zid ];
			}
			return findPersistedObject;
		},
		/**
		 * Returns the LabelData of the ID of a ZKey, ZPersistentObject or ZArgumentDeclaration.
		 * The label is in the user selected language, if available, or else in the closest fallback.
		 * If not available, returns undefined.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getLabelData: function ( state ) {
			/**
			 * @param {string} id of the ZPersistentObject, ZKey or ZArgumentDeclaration
			 * @return {LabelData|undefined} contains zid, label and lang properties
			 */
			function findLabelData( id ) {
				return state.labels[ id ];
			}
			return findLabelData;
		},
		/**
		 * Returns the string label of the ID of a ZKey, ZPersistentObject or ZArgumentDeclaration
		 * or the string ID if the label is not available.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getLabel: function ( _state, getters ) {
			/**
			 * @param {string} id of the ZPersistentObject, ZKey or ZArgumentDeclaration
			 * @return {string} label or id
			 */
			function findLabel( id ) {
				const labelData = getters.getLabelData( id );
				return labelData ? labelData.label : id;
			}
			return findLabel;
		},
		/**
		 * Returns the array of implementations of a persisted Function
		 * stored in the global state, given its Function Zid
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getAttachedImplementations: function ( state ) {
			/**
			 * @param {string} zid
			 * @return {Array}
			 */
			function findImplementations( zid ) {
				const func = state.objects[ zid ];
				if ( func ) {
					const imps = func[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_IMPLEMENTATIONS ];
					return imps ? imps.slice( 1 ) : [];
				}
				return [];
			}
			return findImplementations;
		},
		/**
		 * Given a function Zid, it inspects its function definition
		 * stored in the state and returns an array of its arguments.
		 * It returns undefined if the function is not available or the
		 * zid does not belong to a valid function.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getInputsOfFunctionZid: function ( state ) {
			/**
			 * @param {string} zid
			 * @return {Array}
			 */
			function findInputs( zid ) {
				const func = state.objects[ zid ];
				if ( func === undefined ) {
					return [];
				}
				const obj = func[ Constants.Z_PERSISTENTOBJECT_VALUE ];
				if ( obj[ Constants.Z_OBJECT_TYPE ] !== Constants.Z_FUNCTION ) {
					return [];
				}
				// Remove benjamin type item
				return obj[ Constants.Z_FUNCTION_ARGUMENTS ].slice( 1 );
			}
			return findInputs;
		}
	},
	mutations: {
		/**
		 * Add zid info to the state
		 *
		 * @param {Object} state
		 * @param {Object} payload
		 */
		setStoredObject: function ( state, payload ) {
			state.objects[ payload.zid ] = payload.info;
		},
		/**
		 * Save the LabelData object for a given ID
		 * of a ZPersistentObject, ZKey or ZArgumentDeclaration.
		 *
		 * @param {Object} state
		 * @param {LabelData} labelData
		 */
		setLabel: function ( state, labelData ) {
			state.labels[ labelData.zid ] = labelData;
		}
	},
	actions: {
		/**
		 * Call the wikilambdaload_zobjects api to get the information of a
		 * given set of ZIds, and stores the ZId information and the ZKey labels
		 * in the state.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {Array} payload.zids array of zids to fetch
		 * @return {Promise}
		 */
		fetchZids: function ( context, payload ) {
			const {
				zids = []
			} = payload;

			/**
			 * Generates a request name for the fetch promise
			 *
			 * @param {Array} zidsList
			 * @return {string}
			 */
			function generateRequestName( zidsList ) {
				const sortedKeys = zidsList.sort();
				return sortedKeys.join( '-' );
			}

			/**
			 * Dispatch the fetch promise
			 *
			 * @param {Array} fetchZids
			 * @return {Promise}
			 */
			function dispatchFetchZids( fetchZids ) {
				zidsToFetch = [];
				return context.dispatch(
					'performFetchZids',
					{ zids: fetchZids }
				).then( ( fetchedZids ) => {
					if ( !fetchedZids || fetchedZids.length === 0 ) {
						return;
					}
					// we replicate the name defined when the promise was set
					var currentPromiseName = generateRequestName( fetchedZids );
					resolvePromiseList[ currentPromiseName ].resolve();
					delete resolvePromiseList[ currentPromiseName ];
				} );
			}

			zids.forEach( ( zid ) => {
				// Zid has already been fetched or
				// Zid is in the process of being fetched
				if ( zid &&
					zid !== Constants.NEW_ZID_PLACEHOLDER &&
					!( zid in context.state.objects ) &&
					( !zidsToFetch.includes( zid ) )
				) {
					zidsToFetch.push( zid );
				}
			} );

			if ( zidsToFetch.length === 0 ) {
				return Promise.resolve();
			}

			// we provide an unique name to the promise, to be able to resolve the correct one later.
			const promiseName = generateRequestName( zidsToFetch );

			// if a promise with the same name already exist, do not fetch again
			if ( resolvePromiseList[ promiseName ] ) {
				return resolvePromiseList[ promiseName ].promise;
			} else {
				resolvePromiseList[ promiseName ] = {};
			}

			resolvePromiseList[ promiseName ].promise = new Promise( ( resolve ) => {
				resolvePromiseList[ promiseName ].resolve = resolve;
				dispatchFetchZids( zidsToFetch );
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
		 * Once received the response, stores the full object in the objects
		 * array and the labels for the Zids, ZKey and ZArgument ids in the
		 * labels store object. The labels returned are already in the
		 * preferred language (or closest fallback available).
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @return {Promise}
		 */
		performFetchZids: function ( context, payload ) {
			const api = new mw.Api();
			return api.get( {
				action: 'query',
				list: 'wikilambdaload_zobjects',
				format: 'json',
				wikilambdaload_zids: payload.zids.join( '|' ),
				wikilambdaload_language: context.getters.getUserLangCode,
				wikilambdaload_get_dependencies: 'true'
			} ).then( ( response ) => {
				const requestedZids = payload.zids;
				const returnedZids = Object.keys( response.query.wikilambdaload_zobjects );
				const languageZids = [];

				returnedZids.forEach( ( zid ) => {
					// If the requested zid returned error, do nothing
					if ( !( 'success' in response.query.wikilambdaload_zobjects[ zid ] ) ) {
						return;
					}

					// 1. State mutation:
					// Add zObject to the state objects array
					const fetchedObject = response.query.wikilambdaload_zobjects[ zid ].data;
					context.commit( 'setStoredObject', {
						zid: zid,
						info: fetchedObject
					} );

					// 2. State mutation:
					// Add zObject label in user's selected language
					const multiStr = fetchedObject[
						Constants.Z_PERSISTENTOBJECT_LABEL
					][ Constants.Z_MULTILINGUALSTRING_VALUE ].slice( 1 );

					// The returned multilingual strings will only contain one monolingual string
					// (or none) as they have already been filtered by the back-end to the given
					// language or any of its available fallbacks.
					if ( multiStr.length === 1 ) {
						const labelData = new LabelData(
							zid,
							multiStr[ 0 ][ Constants.Z_MONOLINGUALSTRING_VALUE ],
							multiStr[ 0 ][ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]
						);
						languageZids.push( multiStr[ 0 ][ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] );
						context.commit( 'setLabel', labelData );
					}

					// 3. State mutation:
					// Add the key or argument labels from the selected language to the store
					let objects;
					const zType = ( typeof fetchedObject[ Constants.Z_PERSISTENTOBJECT_VALUE ] === 'object' ) ?
						fetchedObject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_OBJECT_TYPE ] :
						undefined;

					switch ( zType ) {

						case Constants.Z_TYPE:
							// If the zObject is a type, get all key labels
							// and commit to the store
							objects = fetchedObject[
								Constants.Z_PERSISTENTOBJECT_VALUE
							][ Constants.Z_TYPE_KEYS ].slice( 1 );

							objects.forEach( function ( key ) {
								const keyLabels = key[
									Constants.Z_KEY_LABEL
								][ Constants.Z_MULTILINGUALSTRING_VALUE ].slice( 1 );

								if ( keyLabels.length === 1 ) {

									const labelData = new LabelData(
										key[ Constants.Z_KEY_ID ],
										keyLabels[ 0 ][ Constants.Z_MONOLINGUALSTRING_VALUE ],
										keyLabels[ 0 ][ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]
									);
									languageZids.push( keyLabels[ 0 ][ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] );
									context.commit( 'setLabel', labelData );
								}
							} );
							break;

						case Constants.Z_FUNCTION:
							// If the zObject is a function, get all argument
							// declaration labels and commit to the store
							objects = fetchedObject[
								Constants.Z_PERSISTENTOBJECT_VALUE
							][ Constants.Z_FUNCTION_ARGUMENTS ].slice( 1 );

							objects.forEach( function ( arg ) {
								const argLabels = arg[
									Constants.Z_ARGUMENT_LABEL
								][ Constants.Z_MULTILINGUALSTRING_VALUE ].slice( 1 );

								if ( argLabels.length === 1 ) {

									const labelData = new LabelData(
										arg[ Constants.Z_ARGUMENT_KEY ],
										argLabels[ 0 ][ Constants.Z_MONOLINGUALSTRING_VALUE ],
										argLabels[ 0 ][ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]
									);
									languageZids.push( argLabels[ 0 ][ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] );
									context.commit( 'setLabel', labelData );
								}
							} );
							break;

						default:
							// Do nothing
					}

					// Make sure that we fetch all languages stored in the labels library
					context.dispatch( 'fetchZids', { zids: [ ...new Set( languageZids ) ] } );
				} );

				// performFetch must resolve to the list of requested zids
				return requestedZids;
			} );
		}
	}
};