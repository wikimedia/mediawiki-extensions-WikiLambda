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
	apiUtils = require( '../../mixins/api.js' ).methods,
	typeUtils = require( '../../mixins/typeUtils.js' ).methods,
	LabelData = require( '../classes/LabelData.js' ),
	convertTableToJson = require( '../../mixins/zobjectUtils.js' ).methods.convertTableToJson,
	hybridToCanonical = require( '../../mixins/schemata.js' ).methods.hybridToCanonical;

const DEBOUNCE_ZOBJECT_LOOKUP_TIMEOUT = 300;
let debounceZObjectLookup = null;

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
		labels: {},
		/**
		 * Collection of the requested zids and the resolving promises
		 * zid: promise
		 */
		requests: {},
		/**
		 * Collection of enum types with all their selectable values
		 */
		enums: {},
		/**
		 * Map of the available language zids in the store indexed by language code
		 */
		languages: {}
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
		 * Returns the language zid given a language Iso code if the
		 * object has been fetched and is stored in the state.
		 * If not available, returns undefined.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getLanguageZidOfCode: function ( state ) {
			/**
			 * @param {string} code
			 * @return {string|undefined}
			 */
			function findLanguageZid( code ) {
				return state.languages[ code ];
			}
			return findLanguageZid;
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
			 * @param {string|undefined} key
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
		 * Given a key, returns whether it is set to be an identity key
		 * (Z3K4 field is set to true/Z41)
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		isIdentityKey: function ( state ) {
			/**
			 * @param {string|undefined} key
			 * @return {boolean}
			 */
			return function ( key ) {
				if ( key === undefined ) {
					return false;
				}

				if ( !typeUtils.isGlobalKey( key ) ) {
					return false;
				}

				const zid = typeUtils.getZidOfGlobalKey( key );
				if ( !state.objects[ zid ] ) {
					return false;
				}

				const zobject = state.objects[ zid ][ Constants.Z_PERSISTENTOBJECT_VALUE ];
				if ( zobject[ Constants.Z_OBJECT_TYPE ] !== Constants.Z_TYPE ) {
					return false;
				}

				const zkey = typeUtils.getKeyFromKeyList( key, zobject[ Constants.Z_TYPE_KEYS ] );
				const isIdentity = zkey[ Constants.Z_KEY_IS_IDENTITY ];
				if ( !isIdentity ) {
					return false;
				}

				return (
					( isIdentity === Constants.Z_BOOLEAN_TRUE ) ||
					( isIdentity[ Constants.Z_BOOLEAN_IDENTITY ] === Constants.Z_BOOLEAN_TRUE )
				);
			};
		},
		/**
		 * Given a type zid, returns whether it has an identity key
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		isEnumType: function ( state ) {
			/**
			 * @param {string} zid
			 * @return {boolean}
			 */
			return function ( zid ) {
				if ( ( zid === undefined ) ||
					( Constants.EXCLUDE_FROM_ENUMS.includes( zid ) ) ||
					( !state.objects[ zid ] ) ) {
					return false;
				}

				const zobject = state.objects[ zid ][ Constants.Z_PERSISTENTOBJECT_VALUE ];
				if ( zobject[ Constants.Z_OBJECT_TYPE ] !== Constants.Z_TYPE ) {
					return false;
				}

				const keys = zobject[ Constants.Z_TYPE_KEYS ].slice( 1 );
				for ( const key of keys ) {
					const isIdentity = key[ Constants.Z_KEY_IS_IDENTITY ];
					if ( isIdentity && (
						( isIdentity === Constants.Z_BOOLEAN_TRUE ) ||
						( isIdentity[ Constants.Z_BOOLEAN_IDENTITY ] === Constants.Z_BOOLEAN_TRUE )
					) ) {
						return true;
					}
				}
				return false;
			};
		},
		/**
		 * Given a type zid, returns whether it has an identity key,
		 * excluding the builtin enum types (Boolean/Z40), as they
		 * have builtin components that require special cases.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		isCustomEnum: function ( _state, getters ) {
			/**
			 * @param {string} zid
			 * @return {boolean}
			 */
			return function ( zid ) {
				return getters.isEnumType( zid ) && !Constants.BUILTIN_ENUMS.includes( zid );
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
		 * If not available, returns a new LabelData object with the input zid as the label.
		 *
		 * This getter must make sure that there's always a LabelData object return, so that the
		 * caller components can safely access the LabelData properties.
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getLabelData: function ( state, getters ) {
			/**
			 * @param {string} id
			 * @return {LabelData}
			 */
			function findLabel( id ) {
				// If the requested language is 'qqx', return (zid) as the label
				if ( getters.getUserRequestedLang === 'qqx' && id ) {
					return new LabelData( id, `(${ id })`, getters.getUserLangZid, getters.getUserLangCode );
				}

				// If label data is still not present in the library, return zid as the label
				const labelData = state.labels[ id ];
				if ( !labelData ) {
					return new LabelData( id, id, getters.getUserLangZid, getters.getUserLangCode );
				}

				// Enrich label data with language code and directionality
				labelData.setLangCode( getters.getLanguageIsoCodeOfZLang( labelData.lang ) );
				return labelData;
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
		 * Returns the function zid given an implementation zid
		 * by returning the value in its Z14K1 field
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getFunctionZidOfImplementation: function ( state ) {
			/**
			 * @param {string} zid
			 * @return {string|undefined}
			 */
			function findImplementationFunction( zid ) {
				const implementation = state.objects[ zid ];
				if ( !implementation ) {
					return undefined;
				}
				return implementation[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_IMPLEMENTATION_FUNCTION ];
			}
			return findImplementationFunction;
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
				if ( Constants.Z_IMPLEMENTATION_CODE in implementation ) {
					return Constants.Z_IMPLEMENTATION_CODE;
				}
				return undefined;
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
		},
		/**
		 * Returns the values of an enum with a given ZID
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getEnumValues: function ( state ) {
			/**
			 * @param {string} zid
			 * @return {Array}
			 */
			function findEnum( zid ) {
				const enumObj = state.enums[ zid ];
				return enumObj && enumObj.data instanceof Array ? enumObj.data : [];
			}
			return findEnum;
		},
		/**
		 * Returns the enum of a given ZID
		 *
		 * @param {Object} state
		 * @return {Object}
		 */
		getEnum: function ( state ) {
			/**
			 * @param {string} zid
			 * @return {Array}
			 */
			function findEnum( zid ) {
				return state.enums[ zid ];
			}
			return findEnum;
		}
	},
	mutations: {
		/**
		 * Set request state for each zid
		 *
		 * @param {Object} state
		 * @param {Object} payload
		 * @param {string} payload.zid
		 * @param {Promise} payload.request
		 */
		setZidRequest: function ( state, payload ) {
			if ( payload.request ) {
				state.requests[ payload.zid ] = payload.request;
			} else {
				delete state.requests[ payload.zid ];
			}
		},
		/**
		 * Add zid info to the state
		 *
		 * @param {Object} state
		 * @param {Object} payload
		 */
		setStoredObject: function ( state, payload ) {
			if ( !( payload.zid in state.objects ) || payload.forceUpdate ) {
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
		},
		/**
		 * @param {Object} state
		 * @param {Object} payload
		 * @param {string} payload.zid
		 * @param {Array | Promise} payload.data
		 * @param {number | undefined} payload.searchContinue
		 */
		setEnumData: function ( state, payload ) {
			const zid = payload.zid;
			const data = payload.data;
			const searchContinue = payload.searchContinue;

			// Initialize the enum object if it does not exist with a Promise or Array
			if ( !state.enums[ zid ] ) {
				state.enums[ zid ] = { data };
				return;
			}

			// Ensure data is an array before concatenation
			if ( !Array.isArray( state.enums[ zid ].data ) ) {
				state.enums[ zid ].data = [];
			}

			// Append new data and update continuation value
			state.enums[ zid ].data = state.enums[ zid ].data.concat( data );
			state.enums[ zid ].searchContinue = searchContinue;
		},
		/**
		 * @param {Object} state
		 * @param {Object} payload
		 * @param {string} payload.code
		 * @param {string} payload.zid
		 */
		setLanguageCode: function ( state, payload ) {
			state.languages[ payload.code ] = payload.zid;
		}
	},
	actions: {
		/**
		 * Updates the stored object in the Library with the current ZObject
		 *
		 * @param {Object} context
		 */
		updateStoredObject: function ( context ) {
			const zobject = hybridToCanonical( convertTableToJson( context.getters.getZObjectTable ) );
			const zid = context.getters.getCurrentZObjectId;

			context.commit( 'setStoredObject', {
				zid,
				info: zobject,
				forceUpdate: true
			} );
		},
		/**
		 * Performs a Lookup call to the database to retrieve all
		 * ZObject references that match a given input and type.
		 * This is used in selectors such as ZObjectSelector or the
		 * language selector of the About widget.
		 *
		 * @param {Object} context Vuex context object
		 * @param {number} payload Object containing input(string) and type
		 * @return {Promise}
		 * @property {Array<Object>} labels - The search results
		 * @property {number|null} searchContinue - The token to continue the search or null if no more results
		 */
		lookupZObjectLabels: function ( context, payload ) {
			// Add user language code to the payload
			payload.language = context.getters.getUserLangCode;
			return new Promise( ( resolve ) => {
				clearTimeout( debounceZObjectLookup );
				debounceZObjectLookup = setTimeout(
					() => apiUtils.searchLabels( payload ).then( ( data ) => resolve( data ) ),
					DEBOUNCE_ZOBJECT_LOOKUP_TIMEOUT
				);
			} );
		},

		/**
		 * Fetches all values stored of a given enum type.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {string} payload.type - The ZID of the enum type
		 * @return {Promise<Object>|undefined} - Promise resolving to:
		 * @property {Array<Object>} labels - The search results
		 * @property {number|null} searchContinue - The token to continue the search or null if no more results
		 */
		fetchEnumValues: function ( context, payload ) {
			const { type } = payload;
			const enumObject = context.getters.getEnum( type );
			const searchContinue = enumObject ? enumObject.searchContinue : undefined;

			// If no continuation token and the enum is already fetched, do nothing
			if ( enumObject && !searchContinue ) {
				return;
			}
			const promise = apiUtils.searchLabels( {
				input: '',
				type,
				limit: Constants.API_ENUMS_LIMIT,
				language: context.getters.getUserLangCode,
				searchContinue
			} ).then( ( data ) => {
				// Set values when the request is completed
				context.commit( 'setEnumData', { zid: payload.type, data: data.labels, searchContinue: data.searchContinue } );
				return data;
			} ).catch( () => {
				// Set empty array when the request fails, so we could retry
				context.commit( 'setEnumData', { zid: payload.type, data: [] } );
			} );

			// Initialize the enum with the pending promise when it's the first request
			if ( !searchContinue ) {
				context.commit( 'setEnumData', { zid: payload.type, data: promise } );
			}

			return promise;

		},
		/**
		 * Orchestrates the calls to wikilambdaload_zobject api to fetch
		 * a given set of ZIDs. This method takes care of the following requirements:
		 *
		 * * Zids are requested in batches of max 50 items.
		 * * Zids are only requested once.
		 * * Every zid is stored along with their request while it's being fetched.
		 * * Once it's fetched, the request is cleared.
		 * * The returning promise only resolves when all of the batches have returned.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {Array} payload.zids array of zids to fetch
		 * @return {Promise}
		 */
		fetchZids: function ( context, payload ) {
			let requestZids = [];
			const allPromises = [];
			const {
				zids = []
			} = payload;

			zids.forEach( ( zid ) => {
				// Ignore if:
				// * Zid is Z0
				// * Zid has already been fetched
				if ( zid &&
					( zid !== Constants.NEW_ZID_PLACEHOLDER ) &&
					!( zid in context.state.objects ) &&
					!( zid in context.state.requests )
				) {
					requestZids.push( zid );
				}
				// Capture pending promise to await if:
				// * Zid is waiting to be fetched
				if ( zid in context.state.requests ) {
					allPromises.push( context.state.requests[ zid ] );
				}
			} );

			// Keep only unique values
			requestZids = [ ...new Set( requestZids ) ];

			// Batch zids in groups of max 50 items
			const batches = [];
			for ( let i = 0; i < requestZids.length; i += Constants.API_REQUEST_ITEMS_LIMIT ) {
				batches.push( requestZids.slice( i, i + Constants.API_REQUEST_ITEMS_LIMIT ) );
			}

			// For each batch, generate a Promise
			for ( const batch of batches ) {
				const batchPromise = context.dispatch( 'performFetchZids', { zids: batch } ).then( () => {
					// Once it's back, unset active request
					batch.forEach( ( zid ) => {
						context.commit( 'setZidRequest', { zid, request: null } );
					} );
				} );
				// Set active request
				batch.forEach( ( zid ) => {
					context.commit( 'setZidRequest', { zid, request: batchPromise } );
				} );
				// Collect batch promises
				allPromises.push( batchPromise );
			}

			// Return pending and new promises for all the requested zids
			return Promise.all( allPromises );
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
			return new Promise( ( resolve ) => {
				apiUtils.fetchZObjects( {
					zids: payload.zids.join( '|' ),
					language: context.getters.getUserLangCode,
					dependencies: true
				} ).then( ( response ) => {
					const requestedZids = payload.zids;
					const returnedZids = Object.keys( response );
					const dependentZids = [];

					returnedZids.forEach( ( zid ) => {
						// If the requested zid returned error, do nothing
						if ( !( 'success' in response[ zid ] ) ) {
							return;
						}

						// 1. State mutation:
						// Add zObject to the state objects array
						const persistentObject = response[ zid ].data;
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

								objects.forEach( ( key ) => {
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

								objects.forEach( ( arg ) => {
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

							case Constants.Z_NATURAL_LANGUAGE:
								// If the zObject is a natural langugae, save the
								// code and the zid in the store for easy access
								context.commit( 'setLanguageCode', {
									code: objectValue[ Constants.Z_NATURAL_LANGUAGE_ISO_CODE ],
									zid
								} );
								break;

							default:
								// Do nothing
						}

						// Make sure that we fetch all languages stored in the labels library
						context.dispatch( 'fetchZids', { zids: [ ...new Set( dependentZids ) ] } );
					} );

					// performFetch must resolve to the list of requested zids
					resolve( requestedZids );
				} );
			} );
		},
		/**
		 * Pre-fetch information of the Zids most commonly used within the UI
		 *
		 * @param {Object} context
		 * @return {Promise}
		 */
		prefetchZids: function ( context ) {
			const zids = [
				Constants.Z_OBJECT,
				Constants.Z_PERSISTENTOBJECT,
				Constants.Z_MULTILINGUALSTRING,
				Constants.Z_MONOLINGUALSTRING,
				Constants.Z_KEY,
				Constants.Z_TYPE,
				Constants.Z_STRING,
				Constants.Z_FUNCTION,
				Constants.Z_FUNCTION_CALL,
				Constants.Z_REFERENCE,
				Constants.Z_BOOLEAN,
				Constants.Z_BOOLEAN_TRUE,
				Constants.Z_BOOLEAN_FALSE,
				Constants.Z_IMPLEMENTATION,
				context.getters.getUserLangZid,
				Constants.Z_TYPED_LIST,
				Constants.Z_ARGUMENT_REFERENCE,
				Constants.Z_NATURAL_LANGUAGE,
				... Constants.SUGGESTIONS.LANGUAGES,
				... Constants.SUGGESTIONS.TYPES
			];
			return context.dispatch( 'fetchZids', { zids: zids } );
		}
	}
};
