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
								// eslint-disable-next-line no-case-declarations
								const zkey = typeUtils.getKeyFromKeyList( key, zobject[ Constants.Z_TYPE_KEYS ] );
								type = zkey ? zkey[ Constants.Z_KEY_TYPE ] : Constants.Z_OBJECT;
								break;

							// Return the argument type if the zid belongs to a function
							case Constants.Z_FUNCTION:
								// eslint-disable-next-line no-case-declarations
								const zarg = typeUtils.getArgFromArgList(
									key,
									zobject[ Constants.Z_FUNCTION_ARGUMENTS ]
								);
								type = zarg ? zarg[ Constants.Z_ARGUMENT_TYPE ] : Constants.Z_OBJECT;
								break;

							// If not found, return Z1/ZObject (any) type
							default:
								return Constants.Z_OBJECT;
						}
						return type;
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
		 * Returns the array of implementations or tests connected to a persisted
		 * Function stored in the library, given the Function Zid and the key
		 * identifying the object list (tests or implementations)
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getConnectedObjects: function ( state ) {
			/**
			 * @param {string} zid
			 * @param {string} key
			 * @return {Array}
			 */
			function findConnectedObjects( zid, key ) {
				const func = state.objects[ zid ];
				if ( func ) {
					const imps = func[ Constants.Z_PERSISTENTOBJECT_VALUE ][ key ];
					return imps ? imps.slice( 1 ) : [];
				}
				return [];
			}
			return findConnectedObjects;
		},
		/**
		 * Returns the type of an implementation stored in the
		 * global state, given its Zid. The type will be
		 * composition/Z14K2, built-in/Z14K4, or code/Z14K3.
		 * If the implementation Zid is unknown returns undefined.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getTypeOfImplementation: function ( state ) {
			/**
			 * @param {string} zid
			 * @return {string | undefined}
			 */
			function findImplementationType( zid ) {
				let implementation = state.objects[ zid ];
				if ( !implementation ) {
					return undefined;
				}

				implementation = implementation[ Constants.Z_PERSISTENTOBJECT_VALUE ];
				if ( Constants.Z_IMPLEMENTATION_COMPOSITION in implementation ) {
					return Constants.Z_IMPLEMENTATION_COMPOSITION;
				}
				if ( Constants.Z_IMPLEMENTATION_BUILT_IN in implementation ) {
					return Constants.Z_IMPLEMENTATION_BUILT_IN;
				}
				return Constants.Z_IMPLEMENTATION_CODE;
			}
			return findImplementationType;
		},
		/**
		 * Returns the language code of an implementation stored
		 * in the global state, given its Zid. If the implementation
		 * is not of type code (but composition or built-in) returns
		 * undefined.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getLanguageOfImplementation: function ( state ) {
			/**
			 * @param {string} zid
			 * @return {string | undefined}
			 */
			function findImplementationLanguage( zid ) {
				let implementation = state.objects[ zid ];
				if ( !implementation ) {
					return undefined;
				}
				implementation = implementation[ Constants.Z_PERSISTENTOBJECT_VALUE ];
				if ( Constants.Z_IMPLEMENTATION_CODE in implementation ) {
					// If code is literal: return literal
					if (
						typeUtils.isTruthyOrEqual( implementation, [
							Constants.Z_IMPLEMENTATION_CODE,
							Constants.Z_CODE_LANGUAGE,
							Constants.Z_PROGRAMMING_LANGUAGE_CODE
						] )
					) {
						return implementation[ Constants.Z_IMPLEMENTATION_CODE ][
							Constants.Z_CODE_LANGUAGE ][ Constants.Z_PROGRAMMING_LANGUAGE_CODE ];
					}
					// Else, code is reference: return zid
					return implementation[ Constants.Z_IMPLEMENTATION_CODE ][
						Constants.Z_CODE_LANGUAGE ];
				}
				return undefined;
			}
			return findImplementationLanguage;
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
			if ( !( payload.zid in state.objects ) ) {
				state.objects[ payload.zid ] = payload.info;
			}
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
					const currentPromiseName = generateRequestName( fetchedZids );
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
				const dependentZids = [];

				returnedZids.forEach( ( zid ) => {
					// If the requested zid returned error, do nothing
					if ( !( 'success' in response.query.wikilambdaload_zobjects[ zid ] ) ) {
						return;
					}

					// 1. State mutation:
					// Add zObject to the state objects array
					const persistentObject = response.query.wikilambdaload_zobjects[ zid ].data;

					context.commit( 'setStoredObject', {
						zid: zid,
						info: persistentObject
					} );

					// 2. State mutation:
					// Add zObject label in user's selected language
					const multiStr = persistentObject[
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
						dependentZids.push( multiStr[ 0 ][ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] );
						context.commit( 'setLabel', labelData );
					}

					// 3. State mutation:
					// Add the key or argument labels from the selected language to the store
					let objects;
					const objectValue = persistentObject[ Constants.Z_PERSISTENTOBJECT_VALUE ];
					const zType = ( typeof objectValue === 'object' ) ?
						objectValue[ Constants.Z_OBJECT_TYPE ] :
						undefined;

					switch ( zType ) {

						case Constants.Z_TYPE:
							// If the zObject is a type, get all key labels
							// and commit to the store
							objects = objectValue[ Constants.Z_TYPE_KEYS ].slice( 1 );

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
									dependentZids.push( keyLabels[ 0 ][ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] );
									context.commit( 'setLabel', labelData );
								}
							} );

							// If the zObject is a type, get all parser and renderer functions
							// and commit to the store
							if ( Constants.Z_TYPE_RENDERER in objectValue ) {
								const renderer = objectValue[ Constants.Z_TYPE_RENDERER ];
								dependentZids.push( renderer );
								context.commit( 'setRenderer', { type: zid, renderer } );
							}
							if ( Constants.Z_TYPE_PARSER in objectValue ) {
								const parser = objectValue[ Constants.Z_TYPE_PARSER ];
								dependentZids.push( parser );
								context.commit( 'setParser', { type: zid, parser } );
							}
							break;

						case Constants.Z_FUNCTION:
							// If the zObject is a function, get all argument
							// declaration labels and commit to the store
							objects = objectValue[ Constants.Z_FUNCTION_ARGUMENTS ].slice( 1 );

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
									dependentZids.push( argLabels[ 0 ][ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] );
									context.commit( 'setLabel', labelData );
								}
							} );
							break;

						default:
							// Do nothing
					}

					// Make sure that we fetch all languages stored in the labels library
					context.dispatch( 'fetchZids', { zids: [ ...new Set( dependentZids ) ] } );
				} );

				// performFetch must resolve to the list of requested zids
				return requestedZids;
			} );
		}
	}
};
