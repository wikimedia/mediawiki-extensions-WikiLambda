/*!
 * WikiLambda Vue editor: Pinia store: fetch, store and
 * provide auxiliary data from other ZObjects (labels, keys, etc.).
 * It also contains other helper getters to retrieve details of other
 * stored auxiliary objects such as functions, languages, etc.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../Constants.js' );
const { searchLabels, searchFunctions, fetchZObjects } = require( '../../utils/apiUtils.js' );
const LabelData = require( '../classes/LabelData.js' );
const { getZObjectType } = require( '../../utils/zobjectUtils.js' );
const {
	isGlobalKey,
	getZidOfGlobalKey,
	getKeyFromKeyList,
	getArgFromArgList,
	isTruthyOrEqual
} = require( '../../utils/typeUtils.js' );
const { hybridToCanonical } = require( '../../utils/schemata.js' );

const DEBOUNCE_ZOBJECT_LOOKUP_TIMEOUT = 300;
let debounceZObjectLookup = null;

module.exports = {
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
		 * @return {Function}
		 */
		getLanguageIsoCodeOfZLang: function () {
			/**
			 * @param {string} zid
			 * @return {string}
			 */
			const findLanguageIsoCode = ( zid ) => {
				const storedObject = this.getStoredObject( zid );
				if ( storedObject ) {
					const zobject = storedObject[ Constants.Z_PERSISTENTOBJECT_VALUE ];
					if ( zobject[ Constants.Z_OBJECT_TYPE ] === Constants.Z_NATURAL_LANGUAGE ) {
						return zobject[ Constants.Z_NATURAL_LANGUAGE_ISO_CODE ];
					}
				}
				return zid;
			};
			return findLanguageIsoCode;
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
			const findLanguageZid = ( code ) => state.languages[ code ];
			return findLanguageZid;
		},

		/**
		 * Given a global ZKey (ZnKm) it returns a string that reflects
		 * its expected value type (if any). Else it returns Z1.
		 *
		 * @return {Function}
		 */
		getExpectedTypeOfKey: function () {
			/**
			 * @param {string|undefined} key
			 * @return {string}
			 */
			const findExpectedType = ( key ) => {
				// If the key is undefined, then this is the root object,
				// the expected type is always Z2/Persistent object type
				if ( key === undefined ) {
					return Constants.Z_PERSISTENTOBJECT;
				}

				if ( isGlobalKey( key ) ) {
					const zid = getZidOfGlobalKey( key );
					const storedObject = this.getStoredObject( zid );

					if ( storedObject ) {
						const zobject = storedObject[ Constants.Z_PERSISTENTOBJECT_VALUE ];
						const ztype = zobject[ Constants.Z_OBJECT_TYPE ];

						switch ( ztype ) {
							// Return the key value type if zid belongs to a type
							case Constants.Z_TYPE: {
								const zkey = getKeyFromKeyList( key, zobject[ Constants.Z_TYPE_KEYS ] );
								return zkey ? zkey[ Constants.Z_KEY_TYPE ] : Constants.Z_OBJECT;
							}

							// Return the argument type if the zid belongs to a function
							case Constants.Z_FUNCTION: {
								const zarg = getArgFromArgList( key, zobject[ Constants.Z_FUNCTION_ARGUMENTS ] );
								if ( zarg ) {
									const type = zarg[ Constants.Z_ARGUMENT_TYPE ];
									return type;
								}
								return Constants.Z_OBJECT;
							}

							// If not found, return Z1/ZObject (any) type
							default:
								return Constants.Z_OBJECT;
						}
					}
				}

				// If key is not found, a list index, or a local key, return Z1/Object (any) type
				return Constants.Z_OBJECT;
			};

			return findExpectedType;
		},

		/**
		 * Given a key, returns whether it is set to be an identity key
		 * (Z3K4 field is set to true/Z41)
		 *
		 * @return {Function}
		 */
		isIdentityKey: function () {
			/**
			 * @param {string|undefined} key
			 * @return {boolean}
			 */
			const checkIdentityKey = ( key ) => {
				if ( key === undefined ) {
					return false;
				}

				if ( !isGlobalKey( key ) ) {
					return false;
				}

				const zid = getZidOfGlobalKey( key );
				const storedObject = this.getStoredObject( zid );
				if ( !storedObject ) {
					return false;
				}

				const zobject = storedObject[ Constants.Z_PERSISTENTOBJECT_VALUE ];
				if ( zobject[ Constants.Z_OBJECT_TYPE ] !== Constants.Z_TYPE ) {
					return false;
				}

				const zkey = getKeyFromKeyList( key, zobject[ Constants.Z_TYPE_KEYS ] );
				const isIdentity = zkey[ Constants.Z_KEY_IS_IDENTITY ];
				if ( !isIdentity ) {
					return false;
				}

				return (
					( isIdentity === Constants.Z_BOOLEAN_TRUE ) ||
					( isIdentity[ Constants.Z_BOOLEAN_IDENTITY ] === Constants.Z_BOOLEAN_TRUE )
				);
			};
			return checkIdentityKey;
		},

		/**
		 * Given a type zid, returns whether it has an identity key
		 *
		 * @return {Function}
		 */
		isEnumType: function () {
			/**
			 * @param {string} zid
			 * @return {boolean}
			 */
			const checkEnumType = ( zid ) => {
				const storedObject = this.getStoredObject( zid );
				// If the zid is undefined, excluded from enums or the object is not found,
				// return false
				if (
					( zid === undefined ) ||
					( Constants.EXCLUDE_FROM_ENUMS.includes( zid ) ) ||
					( !storedObject )
				) {
					return false;
				}

				const zobject = storedObject[ Constants.Z_PERSISTENTOBJECT_VALUE ];

				// If the zObject is not a type, return false
				if ( !zobject || zobject[ Constants.Z_OBJECT_TYPE ] !== Constants.Z_TYPE ) {
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
			return checkEnumType;
		},

		/**
		 * Given a type zid, returns whether it is an instance of a Wikidata enum/Z6884
		 *
		 * @return {Function}
		 */
		isWikidataEnum: function () {
			/**
			 * @param {string} zid
			 * @return {boolean}
			 */
			const checkWikidataEnumType = ( zid ) => {
				const storedObject = this.getStoredObject( zid );
				// If the zid is undefined or the object is not found,
				// return false
				if (
					( zid === undefined ) ||
					( !storedObject )
				) {
					return false;
				}
				const zobject = storedObject[ Constants.Z_PERSISTENTOBJECT_VALUE ];
				// If the zObject is a function call and it is a Wikidata enum/Z6884, return true
				return (
					zobject &&
					zobject[ Constants.Z_OBJECT_TYPE ] === Constants.Z_FUNCTION_CALL &&
					zobject[ Constants.Z_FUNCTION_CALL_FUNCTION ] === Constants.Z_WIKIDATA_ENUM
				);
			};
			return checkWikidataEnumType;
		},

		/**
		 * Returns the values of  an instance of a Wikidata enum/Z6884 given its Zid.
		 * The values are extracted from the references of the enum object.
		 *
		 * @return {Function}
		 */
		getReferencesOfWikidataEnum: function () {
			/**
			 * @param {string} zid - The Zid of the Wikidata enum.
			 * @return {Array|undefined} - An array of values or undefined if not found.
			 */
			const findReferencesOfWikidataEnum = ( zid ) => {
				const storedObject = this.getStoredObject( zid );
				if (
					zid === undefined ||
					!storedObject
				) {
					return undefined;
				}
				return storedObject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_WIKIDATA_ENUM_REFERENCES ];
			};
			return findReferencesOfWikidataEnum;
		},

		/**
		 * Returns the type of an instance of a Wikidata enum/Z6884 given its Zid.
		 * The type is determined based on the first value in the enum's references.
		 *
		 * @return {Function}
		 */
		getTypeOfWikidataEnum: function () {
			/**
			 * @param {string} zid - The Zid of the Wikidata enum.
			 * @return {string|undefined} - The type of the Wikidata enum or undefined if not found.
			 */
			const findTypeOfWikidataEnum = ( zid ) => {
				const storedObject = this.getStoredObject( zid );
				if (
					zid === undefined ||
					!storedObject
				) {
					return undefined;
				}
				return storedObject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_WIKIDATA_ENUM_TYPE ];
			};
			return findTypeOfWikidataEnum;
		},

		/**
		 * Given a type zid, returns the list of items in an instance of a Wikidata enum/Z6884
		 *
		 * @return {Function}
		 */
		getReferencesIdsOfWikidataEnum: function () {
			/**
			 * @param {string} zid
			 * @return {Array}
			 */
			const findReferencesIdsOfWikidataEnum = ( zid ) => {
				const values = this.getReferencesOfWikidataEnum( zid );
				if ( !values ) {
					return [];
				}
				const type = values[ 0 ];
				return values
					.slice( 1 )
					.map( ( row ) => row[ `${ type }K1` ] )
					.filter( ( id ) => !!id );

			};
			return findReferencesIdsOfWikidataEnum;

		},

		/**
		 * Given a type zid, returns whether it has an identity key,
		 * excluding the builtin enum types (Boolean/Z40), as they
		 * have builtin components that require special cases.
		 *
		 * @return {Function}
		 */
		isCustomEnum: function () {
			/**
			 * @param {string} zid
			 * @return {boolean}
			 */
			const checkCustomEnum = ( zid ) => this.isEnumType( zid ) && !Constants.BUILTIN_ENUMS.includes( zid );
			return checkCustomEnum;
		},
		/**
		 * Returns the persisted object for a given ZID if that was successfully
		 * fetched from the DB and saved in the state. Else returns undefined.
		 *
		 * If the function Zid returned an error (e.g. Zid not found), the
		 * error was stored, but this getter will return undefined.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getStoredObject: function ( state ) {
			/**
			 * @param {string} zid of the ZPersistentObject
			 * @return {Object|undefined} persisted ZObject
			 */
			const findStoredObject = ( zid ) => {
				const objectData = state.objects[ zid ];
				return ( !objectData || !objectData.success ) ? undefined : objectData.data;
			};
			return findStoredObject;
		},
		/**
		 * Returns the object for a given ZID that was fetched using fetchZids.
		 * If the object was not fetched, returns undefined.
		 * If the object was fetched but returned an error (e.g. Zid not found),
		 * returns the error object.
		 *
		 * This getter is specially designed to be used from Visual Editor,
		 * as we need to use the returned error data.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getFetchedObject: function ( state ) {
			/**
			 * @param {string} zid of the ZPersistentObject
			 * @return {Object|undefined} persisted ZObject
			 */
			const findFetchedObject = ( zid ) => {
				const objectData = state.objects[ zid ];
				return objectData || undefined;
			};
			return findFetchedObject;
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
		 * @return {Function}
		 */
		getLabelData: function ( state ) {
			/**
			 * @param {string} id
			 * @return {LabelData}
			 */
			const findLabelData = ( id ) => {
				// If the requested language is 'qqx', return (zid) as the label
				if ( this.getUserRequestedLang === 'qqx' && id ) {
					return new LabelData( id, `(${ id })`, this.getUserLangZid, this.getUserLangCode );
				}

				// If label data is still not present in the library, return zid as the label
				const labelData = state.labels[ id ];
				if ( !labelData ) {
					return new LabelData( id, id, this.getUserLangZid, this.getUserLangCode );
				}

				// Enrich label data with language code and directionality
				labelData.setLangCode( this.getLanguageIsoCodeOfZLang( labelData.lang ) );
				return labelData;
			};
			return findLabelData;
		},

		/**
		 * Returns the array of implementations or tests connected to a persisted
		 * Function stored in the library, given the Function Zid and the key
		 * identifying the object list (tests or implementations)
		 *
		 * @return {Function}
		 */
		getConnectedObjects: function () {
			/**
			 * @param {string} zid
			 * @param {string} key
			 * @return {Array}
			 */
			const findConnectedObjects = ( zid, key ) => {
				const func = this.getStoredObject( zid );
				if ( func ) {
					const imps = func[ Constants.Z_PERSISTENTOBJECT_VALUE ][ key ];
					return imps ? imps.slice( 1 ) : [];
				}
				return [];
			};
			return findConnectedObjects;
		},

		/**
		 * Returns the function zid given an implementation zid
		 * by returning the value in its Z14K1 field
		 *
		 * @return {Function}
		 */
		getFunctionZidOfImplementation: function () {
			/**
			 * @param {string} zid
			 * @return {string|undefined}
			 */
			const findFunctionZid = ( zid ) => {
				const implementation = this.getStoredObject( zid );
				return implementation ?
					implementation[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_IMPLEMENTATION_FUNCTION ] :
					undefined;
			};
			return findFunctionZid;
		},

		/**
		 * Returns the type of an implementation stored in the
		 * global state, given its Zid. The type will be
		 * composition/Z14K2, built-in/Z14K4, or code/Z14K3.
		 * If the implementation Zid is unknown returns undefined.
		 *
		 * @return {Function}
		 */
		getTypeOfImplementation: function () {
			/**
			 * @param {string} zid
			 * @return {string | undefined}
			 */
			const findTypeOfImplementation = ( zid ) => {
				const storedObject = this.getStoredObject( zid );
				if ( !storedObject ) {
					return undefined;
				}
				const implementation = storedObject[ Constants.Z_PERSISTENTOBJECT_VALUE ];
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
			};
			return findTypeOfImplementation;
		},

		/**
		 * Returns the language code of an implementation stored
		 * in the global state, given its Zid. If the implementation
		 * is not of type code (but composition or built-in) returns
		 * undefined.
		 *
		 * @return {Function}
		 */
		getLanguageOfImplementation: function () {
			/**
			 * @param {string} zid
			 * @return {string | undefined}
			 */
			const findLanguageOfImplementation = ( zid ) => {
				const storedObject = this.getStoredObject( zid );
				if ( !storedObject ) {
					return undefined;
				}
				const implementation = storedObject[ Constants.Z_PERSISTENTOBJECT_VALUE ];
				if ( Constants.Z_IMPLEMENTATION_CODE in implementation ) {
					// If code is literal: return literal
					if (
						isTruthyOrEqual( implementation, [
							Constants.Z_IMPLEMENTATION_CODE,
							Constants.Z_CODE_LANGUAGE,
							Constants.Z_PROGRAMMING_LANGUAGE_CODE
						] )
					) {
						return implementation[ Constants.Z_IMPLEMENTATION_CODE ][
							Constants.Z_CODE_LANGUAGE
						][ Constants.Z_PROGRAMMING_LANGUAGE_CODE ];
					}
					// Else, code is reference: return zid
					return implementation[ Constants.Z_IMPLEMENTATION_CODE ][ Constants.Z_CODE_LANGUAGE ];
				}
				return undefined;
			};
			return findLanguageOfImplementation;
		},

		/**
		 * Given a function Zid, it inspects its function definition
		 * stored in the state and returns an array of its arguments.
		 * It returns undefined if the function is not available or the
		 * zid does not belong to a valid function.
		 *
		 * @return {Function}
		 */
		getInputsOfFunctionZid: function () {
			/**
			 * @param {string} zid
			 * @return {Array}
			 */
			const findInputsOfFunction = ( zid ) => {
				const func = this.getStoredObject( zid );
				if ( !func ) {
					return [];
				}
				const obj = func[ Constants.Z_PERSISTENTOBJECT_VALUE ];
				if ( obj[ Constants.Z_OBJECT_TYPE ] !== Constants.Z_FUNCTION ) {
					return [];
				}
				// Remove benjamin type item
				return obj[ Constants.Z_FUNCTION_ARGUMENTS ].slice( 1 );
			};
			return findInputsOfFunction;
		},

		/**
		 * Returns the values of an enum with a given ZID.
		 * If the request includes a selected Id, check that it appears
		 * in the returned collection, and if not, manually include it
		 * (only if it's the zid of a valid instance of the enum type)
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getEnumValues: function ( state ) {
			/**
			 * @param {string} zid
			 * @param {string|undefined} selected
			 * @return {Array}
			 */
			const findEnumValues = ( zid, selected = undefined ) => {
				const enumObj = state.enums[ zid ];
				const enums = enumObj && enumObj.data instanceof Array ? enumObj.data : [];

				// If there's a selected item and it is not in the initial enum collection:
				// get the object from the store, check that it's valid, and if so, add to list
				if ( selected ) {
					const selectedIndex = enums.findIndex( ( item ) => item.page_title === selected );
					if ( selectedIndex < 0 ) {
						// Get the object from the store: it will already be fetched
						// If selected zid does not exist: do nothing
						const selectedObject = this.getStoredObject( selected );
						if ( !selectedObject || !( Constants.Z_PERSISTENTOBJECT_VALUE in selectedObject ) ) {
							return enums;
						}

						// Get the selected object type.
						// If selected zid is not a valid instance of this enum: do nothing
						const selectedType = getZObjectType( selectedObject[ Constants.Z_PERSISTENTOBJECT_VALUE ] );
						if ( selectedType !== zid ) {
							return enums;
						}

						const selectedItem = {
							page_title: selected,
							label: this.getLabelData( selected ).label
						};
						return [ selectedItem, ...enums ];
					}
				}

				return enums;
			};
			return findEnumValues;
		},

		/**
		 * Returns the enum of a given ZID
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getEnum: function ( state ) {
			/**
			 * @param {string} zid
			 * @return {Array}
			 */
			const findEnum = ( zid ) => state.enums[ zid ];
			return findEnum;
		},

		/**
		 * Returns the object with the selected description and its language
		 * information. Returns undefined if:
		 * * no stored object with this zid
		 * * stored object has no description
		 *
		 * @return {Function}
		 */
		getDescription: function () {
			/**
			 * @param {string} zid
			 * @return {LabelData|undefined}
			 */
			const findDescription = ( zid ) => {
				const persistentObject = this.getStoredObject( zid );
				if ( !persistentObject ) {
					// No stored object
					return undefined;
				}
				const multiStr = persistentObject[ Constants.Z_PERSISTENTOBJECT_DESCRIPTION ];
				if ( !multiStr ) {
					// No description key
					return undefined;
				}
				if ( multiStr[ Constants.Z_MULTILINGUALSTRING_VALUE ].length <= 1 ) {
					// No description items
					return undefined;
				}

				// First monolingual string is the userlang, fallback or first added lang:
				const description = multiStr[ Constants.Z_MULTILINGUALSTRING_VALUE ][ 1 ];
				return new LabelData(
					zid,
					description[ Constants.Z_MONOLINGUALSTRING_VALUE ],
					description[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ],
					this.getLanguageIsoCodeOfZLang( description[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] )
				);
			};
			return findDescription;
		},

		/**
		 * Returns the output type of a function given its Zid.
		 * If the object is not a function or not available, returns undefined.
		 *
		 * @return {Function}
		 */
		getOutputTypeOfFunctionZid: function () {
			/**
			 * @param {string} zid
			 * @return {string|undefined}
			 */
			const findOutputTypeOfFunctionZid = ( zid ) => {
				const func = this.getStoredObject( zid );
				if ( !func ) {
					return;
				}
				const obj = func[ Constants.Z_PERSISTENTOBJECT_VALUE ];
				if ( obj[ Constants.Z_OBJECT_TYPE ] !== Constants.Z_FUNCTION ) {
					return;
				}
				return obj[ Constants.Z_FUNCTION_RETURN_TYPE ];
			};
			return findOutputTypeOfFunctionZid;
		}
	},

	actions: {
		/**
		 * Set request state for each zid
		 *
		 * @param {Object} payload
		 * @param {string} payload.zid
		 * @param {Promise} payload.request
		 */
		setZidRequest: function ( payload ) {
			if ( payload.request ) {
				this.requests[ payload.zid ] = payload.request;
			} else {
				delete this.requests[ payload.zid ];
			}
		},

		/**
		 * Add zid info to the state
		 *
		 * @param {Object} payload
		 * @param {string} payload.zid
		 * @param {Object} payload.data
		 * @param {boolean|undefined} payload.success
		 * @param {boolean|undefined} payload.forceUpdate
		 */
		setStoredObject: function ( payload ) {
			const { zid, data, success = true, forceUpdate = false } = payload;
			if ( !( zid in this.objects ) || forceUpdate ) {
				this.objects[ zid ] = { success, data };
			}
		},

		/**
		 * Save the LabelData object for a given ID
		 * of a ZPersistentObject, ZKey or ZArgumentDeclaration.
		 *
		 * @param {LabelData} labelData
		 */
		setLabel: function ( labelData ) {
			this.labels[ labelData.zid ] = labelData;
		},

		/**
		 * @param {Object} payload
		 * @param {string} payload.zid
		 * @param {Array | Promise} payload.data
		 * @param {number | undefined} payload.searchContinue
		 */
		setEnumData: function ( payload ) {
			const zid = payload.zid;
			const data = payload.data;
			const searchContinue = payload.searchContinue;

			// Initialize the enum object if it does not exist with a Promise or Array
			if ( !this.enums[ zid ] ) {
				this.enums[ zid ] = { data };
				return;
			}

			// Ensure data is an array before concatenation
			if ( !Array.isArray( this.enums[ zid ].data ) ) {
				this.enums[ zid ].data = [];
			}

			// Append new data and update continuation value
			this.enums[ zid ].data = this.enums[ zid ].data.concat( data );
			this.enums[ zid ].searchContinue = searchContinue;
		},

		/**
		 * @param {Object} payload
		 * @param {string} payload.code
		 * @param {string} payload.zid
		 */
		setLanguageCode: function ( payload ) {
			this.languages[ payload.code ] = payload.zid;
		},

		/**
		 * Updates the stored object in the Library with the current ZObject
		 */
		updateStoredObject: function () {
			const zobject = hybridToCanonical( this.getJsonObject( Constants.STORED_OBJECTS.MAIN ) );
			const zid = this.getCurrentZObjectId;
			this.setStoredObject( {
				zid,
				data: zobject,
				forceUpdate: true
			} );
		},

		/**
		 * Performs a Lookup call to the database to retrieve all
		 * ZObject references that match a given input and type.
		 * This is used in selectors such as ZObjectSelector or the
		 * language selector of the About widget.
		 *
		 * @param {Object} payload
		 * @return {Promise}
		 * @property {Array<Object>} labels - The search results
		 * @property {number|null} searchContinue - The token to continue the search or null if no more results
		 */
		lookupZObjectLabels: function ( payload ) {
			payload.language = this.getUserLangCode;
			return new Promise( ( resolve ) => {
				clearTimeout( debounceZObjectLookup );
				debounceZObjectLookup = setTimeout(
					() => searchLabels( payload ).then( ( data ) => resolve( data ) ),
					DEBOUNCE_ZOBJECT_LOOKUP_TIMEOUT
				);
			} );
		},

		/**
		 * Performs a Lookup call to the database to retrieve all
		 * Functions that match a given input and type.
		 * This is used in the function selector for VisualEditor
		 *
		 * @param {Object} payload
		 * @param {string} payload.search
		 * @param {boolean} payload.renderable
		 * @return {Promise}
		 * @property {Array<Object>} labels - The search results
		 * @property {number|null} searchContinue - The token to continue the search or null if no more results
		 */
		lookupFunctions: function ( payload ) {
			payload.language = this.getUserLangCode;
			return new Promise( ( resolve ) => {
				clearTimeout( debounceZObjectLookup );
				debounceZObjectLookup = setTimeout(
					() => searchFunctions( payload ).then( ( data ) => resolve( data ) ),
					DEBOUNCE_ZOBJECT_LOOKUP_TIMEOUT
				);
			} );
		},

		/**
		 * Fetches all values stored of a given enum type.
		 *
		 * @param {Object} payload
		 * @param {string} payload.type - The ZID of the enum type
		 * @param {number} payload.limit - The amount of enums to fetch
		 * @return {Promise} - Promise resolving to:
		 * @property {Array<Object>} labels - The search results
		 * @property {number|null} searchContinue - The token to continue the search or null if no more results
		 */
		fetchEnumValues: function ( payload ) {
			const enumObject = this.getEnum( payload.type );
			const searchContinue = enumObject ? enumObject.searchContinue : undefined;

			// If no continuation token and the enum is already fetched, do nothing
			if ( enumObject && !searchContinue ) {
				return Promise.resolve();
			}
			const promise = searchLabels( {
				input: '',
				types: [ payload.type ],
				limit: payload.limit || Constants.API_ENUMS_LIMIT,
				language: this.getUserLangCode,
				searchContinue
			} ).then( ( data ) => {
				// Set values when the request is completed
				this.setEnumData( { zid: payload.type, data: data.labels, searchContinue: data.searchContinue } );
				return data;
			} ).catch( () => {
				this.setEnumData( { zid: payload.type, data: [] } );
			} );

			if ( !searchContinue ) {
				this.setEnumData( { zid: payload.type, data: promise } );
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
		 * @param {Object} payload
		 * @param {Array} payload.zids array of zids to fetch
		 * @return {Promise}
		 */
		fetchZids: function ( payload ) {
			let requestZids = [];
			const allPromises = [];
			const {
				zids = []
			} = payload;

			zids.forEach( ( zid ) => {
				// Ignore if:
				// * Zid is Z0
				// * Zid has already been fetched (success or failure)
				if (
					zid &&
					zid !== Constants.NEW_ZID_PLACEHOLDER &&
					!( zid in this.objects ) &&
					!( zid in this.requests )
				) {
					requestZids.push( zid );
				}
				// Capture pending promise to await if:
				// * Zid is waiting to be fetched
				if ( zid in this.requests ) {
					allPromises.push( this.requests[ zid ] );
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
				const batchPromise = this.performFetchZids( { zids: batch } ).then( () => {
					// Once it's back, unset active request
					batch.forEach( ( zid ) => {
						this.setZidRequest( { zid, request: null } );
					} );
				} );
				// Set active request
				batch.forEach( ( zid ) => {
					this.setZidRequest( { zid, request: batchPromise } );
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
		 * @param {Object} payload
		 * @return {Promise}
		 */
		performFetchZids: function ( payload ) {
			return new Promise( ( resolve, reject ) => {
				fetchZObjects( {
					zids: payload.zids.join( '|' ),
					language: this.getUserLangCode,
					dependencies: true
				} ).then( ( response ) => {
					const requestedZids = payload.zids;
					const returnedZids = Object.keys( response );
					const dependentZids = [];

					returnedZids.forEach( ( zid ) => {
						// success is true or false, we normalize it to boolean in case it is undefined somehow
						const { data, success } = response[ zid ];
						// 1. State mutation:
						// Add zObject or error data to the state objects array
						this.setStoredObject( {
							zid,
							data,
							success: !!success
						} );

						// If the requested zid returned error, exit
						if ( !success ) {
							return;
						}

						// 2. State mutation:
						// Add zObject label in user's selected language
						const multiStr = data[
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
							this.setLabel( labelData );
						}

						// 3. State mutation:
						// Add the key or argument labels from the selected language to the store
						let objects;
						const objectValue = data[ Constants.Z_PERSISTENTOBJECT_VALUE ];
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
										this.setLabel( labelData );
									}
								} );

								// If the zObject is a type, get all parser and renderer functions
								// and commit to the store
								if ( Constants.Z_TYPE_RENDERER in objectValue ) {
									const renderer = objectValue[ Constants.Z_TYPE_RENDERER ];
									dependentZids.push( renderer );
									this.setRenderer( { type: zid, renderer } );
								}
								if ( Constants.Z_TYPE_PARSER in objectValue ) {
									const parser = objectValue[ Constants.Z_TYPE_PARSER ];
									dependentZids.push( parser );
									this.setParser( { type: zid, parser } );
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
										this.setLabel( labelData );
									}
								} );
								break;

							case Constants.Z_NATURAL_LANGUAGE:
								// If the zObject is a natural langugae, save the
								// code and the zid in the store for easy access
								this.setLanguageCode( {
									code: objectValue[ Constants.Z_NATURAL_LANGUAGE_ISO_CODE ],
									zid
								} );
								break;

							default:
							// Do nothing
						}

						// Make sure that we fetch all languages stored in the labels library
						this.fetchZids( { zids: [ ...new Set( dependentZids ) ] } );
					} );

					// performFetch must resolve to the list of requested zids
					resolve( requestedZids );
				} ).catch( ( error ) => {
					reject( error );
				} );
			} );
		},
		/**
		 * Pre-fetch information of the Zids most commonly used within the UI
		 *
		 * @return {Promise}
		 */
		prefetchZids: function () {
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
				this.getUserLangZid,
				Constants.Z_TYPED_LIST,
				Constants.Z_ARGUMENT_REFERENCE,
				Constants.Z_NATURAL_LANGUAGE,
				... Constants.SUGGESTIONS.LANGUAGES,
				... Constants.SUGGESTIONS.TYPES
			];
			return this.fetchZids( { zids } );
		}
	}
};
