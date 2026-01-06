/*!
 * WikiLambda Vue editor: ZObject Pinia store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../Constants.js' );
const { fetchZObjects } = require( '../../utils/apiUtils.js' );
const { getParameterByName } = require( '../../utils/urlUtils.js' );
const { extractWikidataLexemeIds } = require( '../../utils/wikidataUtils.js' );
const { extractZIDs, canonicalToHybrid } = require( '../../utils/schemata.js' );
const { isTruthyOrEqual, typeToString, isLocalKey } = require( '../../utils/typeUtils.js' );
const {
	getZMonolingualItemForLang,
	getZMonolingualLangValue,
	getZMonolingualStringsetForLang,
	getZMultilingualLangs,
	getZMultilingualStringsetLangs,
	getZObjectType,
	getZFunctionCallArgumentKeys,
	getZImplementationFunctionZid,
	getZImplementationContentType,
	getZTesterFunctionZid,
	getZReferenceTerminalValue,
	resolveZObjectByKeyPath,
	walkZObject
} = require( '../../utils/zobjectUtils.js' );

const zobjectStore = {
	state: {
		jsonObject: {
			main: {},
			call: {},
			response: {},
			abstractwiki: {}
		}
	},

	getters: {
		/**
		 * @param {Object} state
		 * @return {Function}
		 */
		getJsonObject: function ( state ) {
			/**
			 * @param {string} namespace
			 * @return {Object|undefined}
			 */
			const findJson = ( namespace ) => state.jsonObject[ namespace ];
			return findJson;
		},

		/**
		 * @param {Object} state
		 * @return {Function}
		 */
		getZObjectByKeyPath: function ( state ) {
			/**
			 * @param {Array} keyPath
			 * @return {Object|Array|string|undefined}
			 */
			const findValue = ( keyPath ) => {
				try {
					const { target, finalKey } = resolveZObjectByKeyPath( state.jsonObject, keyPath );
					return target[ finalKey ];
				} catch ( error ) {
					return undefined;
				}
			};
			return findValue;
		},

		/**
		 * Return the type of the root ZObject or undefined if not set.
		 * The ZObject type can be:
		 * * an object if defined as a function call
		 * * a string if defined as a reference
		 * It will always be in canonical form.
		 *
		 * @param {Object} state
		 * @return {string|Object|undefined}
		 */
		getCurrentZObjectType: function ( state ) {
			const objectValue = state.jsonObject[ Constants.STORED_OBJECTS.MAIN ][ Constants.Z_PERSISTENTOBJECT_VALUE ];
			if ( !objectValue ) {
				return undefined;
			}
			return getZObjectType( objectValue );
		},

		/**
		 * Get the terminal value of the function selected as target function for
		 * either tester of implementation pages (field Z14K1 for implementation,
		 * and field Z20K1 for a tester)
		 *
		 * @param {Object} state
		 * @return {string}
		 */
		getCurrentTargetFunctionZid: function ( state ) {
			if ( this.getAbstractWikiId ) {
				return Constants.Z_ABSTRACT_RENDER_FUNCTION;
			}

			const objectValue = state.jsonObject[ Constants.STORED_OBJECTS.MAIN ][ Constants.Z_PERSISTENTOBJECT_VALUE ];
			if ( !objectValue ) {
				return undefined;
			}
			const objectType = typeToString( objectValue[ Constants.Z_OBJECT_TYPE ] );
			switch ( objectType ) {
				case Constants.Z_IMPLEMENTATION:
					return getZImplementationFunctionZid( objectValue );
				case Constants.Z_TESTER:
					return getZTesterFunctionZid( objectValue );
				default:
					return undefined;
			}
		},

		/**
		 * Return the key indicating the content type of the current implementation:
		 * 'Z14K2' (composition), 'Z14K3' (code) or 'Z14K4' (builtin).
		 *
		 * @param {Object} state
		 * @return {string | undefined} currentZImplementationContentType
		 */
		getCurrentZImplementationType: function ( state ) {
			const objectValue = state.jsonObject[ Constants.STORED_OBJECTS.MAIN ][ Constants.Z_PERSISTENTOBJECT_VALUE ];
			if ( !objectValue ) {
				return undefined;
			}
			const objectType = typeToString( objectValue[ Constants.Z_OBJECT_TYPE ] );
			return ( objectType === Constants.Z_IMPLEMENTATION ) ?
				getZImplementationContentType( objectValue ) :
				undefined;
		},

		/**
		 * Returns the list of language Zids present in the parent multilingual
		 * string list/Z12 of the component located at the given keyPath string.
		 * Accepts both typed-list-item paths and inner-value paths, e.g.:
		 *  - main.Z2K2.Z12K1.2.Z11K1
		 *  - main.Z2K2.Z12K1.2
		 * If the keyPath is not within a Z12K1 list, returns an empty array.
		 *
		 * @return {Function}
		 */
		getLanguagesInParentMultilingualList: function () {
			/**
			 * @param {string} keyPath
			 * @return {Array<string>} language Zids
			 */
			const findLanguagesInParentMultilingualList = ( keyPath ) => {
				if ( !keyPath || typeof keyPath !== 'string' ) {
					return [];
				}
				const parts = keyPath.split( '.' );
				const index = parts.indexOf( Constants.Z_MULTILINGUALSTRING_VALUE );
				if ( index === -1 ) {
					return [];
				}
				// keyPath can point at the monolingual language value (…Z12K1.2.Z11K1)
				// or at the monolingual object index (…Z12K1.2), so we
				// slice the list of keys from the root till Z12K1.
				const listPath = parts.slice( 0, index + 1 );
				const list = this.getZObjectByKeyPath( listPath );
				if ( !Array.isArray( list ) || list.length === 0 ) {
					return [];
				}

				// slice 1 to exclude the benjamin item
				return list
					.slice( 1 )
					.map( ( item ) => getZMonolingualLangValue( item ) )
					.filter( Boolean );
			};
			return findLanguagesInParentMultilingualList;
		},

		/**
		 * Returns the length of the list located in the given key path
		 * If the list is a valid array and has more than one object (benjamin item):
		 * returns the number of real items (excluding benjamin item. Else, returns undefined.
		 *
		 * @return {Function}
		 */
		getParentListCount: function () {
			/**
			 * @param {Array} keyPath
			 * @return {number}
			 */
			const findParentListCount = ( keyPath ) => {
				const list = this.getZObjectByKeyPath( keyPath.slice( 0, -1 ) );
				return ( list && Array.isArray( list ) && list.length > 0 ) ? list.length - 1 : undefined;
			};
			return findParentListCount;
		},

		/**
		 * Returns the list of items in the parent list of a given key path
		 * If the list is a valid array and has more than one object (benjamin item):
		 * returns the number of real items (excluding benjamin item). Else, returns undefined.
		 *
		 * @return {Function}
		 */
		getParentListItems: function () {
			/**
			 * @param {Array} keyPath
			 * @return {Array|undefined}
			 */
			const findParentListItems = ( keyPath ) => {
				const list = this.getZObjectByKeyPath( keyPath.slice( 0, -1 ) );
				return ( list && Array.isArray( list ) && list.length > 0 ) ? list.slice( 1 ) : undefined;
			};
			return findParentListItems;
		},

		/**
		 * Returns a list of all the language Zids that are present in
		 * the multilingual data collection (must have at least a name,
		 * a description, a set of aliases and any input labels).
		 *
		 * @return {Object}
		 */
		getMultilingualDataLanguages: function () {
			const persistent = this.getJsonObject( Constants.STORED_OBJECTS.MAIN );

			// Get languages available in name, description and alias fields
			const nameLangs = getZMultilingualLangs( persistent[ Constants.Z_PERSISTENTOBJECT_LABEL ] );
			const descLangs = getZMultilingualLangs( persistent[ Constants.Z_PERSISTENTOBJECT_DESCRIPTION ] );
			const aliasLangs = getZMultilingualStringsetLangs( persistent[ Constants.Z_PERSISTENTOBJECT_ALIASES ] );

			// If function, get languages of all input labels
			const inputLangs = [];
			const allInputLangs = [];
			const inner = persistent[ Constants.Z_PERSISTENTOBJECT_VALUE ];
			if ( inner && Constants.Z_FUNCTION_ARGUMENTS in inner ) {
				const args = inner[ Constants.Z_FUNCTION_ARGUMENTS ].slice( 1 );
				args.forEach( ( arg ) => {
					const argLangs = getZMultilingualLangs( arg[ Constants.Z_ARGUMENT_LABEL ] );
					inputLangs.push( [ ...new Set( argLangs ) ] );
					allInputLangs.push( ...argLangs );
				} );
			}

			// Return unique languages for each category, plus unique languages globally
			return {
				name: [ ...new Set( nameLangs ) ],
				description: [ ...new Set( descLangs ) ],
				aliases: [ ...new Set( aliasLangs ) ],
				inputs: inputLangs,
				all: [ ...new Set( [ ...nameLangs, ...descLangs, ...aliasLangs, ...allInputLangs ] ) ]
			};
		},

		/**
		 * Returns the terminal text value of the ZPersistent
		 * object label for a given language.
		 * If there's no monolingual string for this language,
		 * returns undefined.
		 *
		 * @return {Function}
		 */
		getZPersistentName: function () {
			/**
			 * @param {string} langZid
			 * @return {Object|undefined}
			 */
			const findNameForLang = ( langZid ) => {
				const listPath = [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_LABEL,
					Constants.Z_MULTILINGUALSTRING_VALUE ];
				const tailPath = [
					Constants.Z_MONOLINGUALSTRING_VALUE,
					Constants.Z_STRING_VALUE ];

				const multilingual = this.getZObjectByKeyPath( listPath.slice( 0, -1 ) );
				const foundItem = getZMonolingualItemForLang( multilingual, langZid );

				return foundItem ? {
					keyPath: [ ...listPath, foundItem.index, ...tailPath ].join( '.' ),
					value: foundItem.value
				} : undefined;
			};
			return findNameForLang;
		},

		/**
		 * Returns the terminal text value of the ZPersistent
		 * object description for a given language.
		 * If there's no monolingual string for this language,
		 * returns undefined.
		 *
		 * @return {Function}
		 */
		getZPersistentDescription: function () {
			/**
			 * @param {string} langZid
			 * @return {Object|undefined}
			 */
			const findDescriptionForLang = ( langZid ) => {
				const listPath = [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_DESCRIPTION,
					Constants.Z_MULTILINGUALSTRING_VALUE ];
				const tailPath = [
					Constants.Z_MONOLINGUALSTRING_VALUE,
					Constants.Z_STRING_VALUE ];

				const multilingual = this.getZObjectByKeyPath( listPath.slice( 0, -1 ) );
				const foundItem = getZMonolingualItemForLang( multilingual, langZid );

				return foundItem ? {
					keyPath: [ ...listPath, foundItem.index, ...tailPath ].join( '.' ),
					value: foundItem.value
				} : undefined;
			};
			return findDescriptionForLang;
		},

		/**
		 * Returns the list of aliases for the ZPersistent object for a given
		 * lang Zid. If no alias exist for the given language, returns
		 * an empty array.
		 *
		 * @return {Function}
		 */
		getZPersistentAlias: function () {
			/**
			 * @param {string} langZid
			 * @return {Object|undefined}
			 */
			const findAliasesForLang = ( langZid ) => {
				const listPath = [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_ALIASES,
					Constants.Z_MULTILINGUALSTRINGSET_VALUE ];
				const tailPath = [
					Constants.Z_MONOLINGUALSTRINGSET_VALUE ];

				const multilingual = this.getZObjectByKeyPath( listPath.slice( 0, -1 ) );
				const foundItem = getZMonolingualStringsetForLang( multilingual, langZid );

				return foundItem ? {
					keyPath: [ ...listPath, foundItem.index, ...tailPath ].join( '.' ),
					value: foundItem.value
				} : undefined;
			};
			return findAliasesForLang;
		},

		/**
		 * Return the next key of the root ZObject. So if the current object is a Z408
		 * and there are currently 2 keys, it will return Z408K3. Internally this
		 * walks the whole tree and searches for Z6K1 terminal values that match the
		 * key regex. Finally returns the nest one to the ones found.
		 *
		 * @param {Object} state
		 * @return {string} nextKey
		 */
		getNextKey: function ( state ) {
			const zid = this.getCurrentZObjectId;
			const keyRegex = new RegExp( `^${ zid }K([0-9]+)$` );

			const findTerminalKeys = ( node ) => {
				const matches = [];

				if ( Array.isArray( node ) ) {
					for ( const item of node ) {
						matches.push( ...findTerminalKeys( item ) );
					}
				} else if ( node && typeof node === 'object' ) {
					const { [ Constants.Z_STRING_VALUE ]: stringValue } = node;

					if ( typeof stringValue === 'string' ) {
						const match = stringValue.match( keyRegex );
						if ( match ) {
							matches.push( parseInt( match[ 1 ] ) );
						}
					}
					for ( const key in node ) {
						matches.push( ...findTerminalKeys( node[ key ] ) );
					}
				}

				return matches;
			};

			const current = findTerminalKeys( state.jsonObject.main );
			const nextIndex = Math.max( 0, ...current ) + 1;

			return `${ zid }K${ nextIndex }`;
		},

		/**
		 * Returns true if the current keyPath is within a multilingual string list/Z12
		 * (i.e., its ancestor keys include Z12K1).
		 *
		 * @return {Function}
		 */
		isInMultilingualStringList: function () {
			/**
			 * @param {string} keyPath
			 * @return {boolean}
			 */
			const findIsInMultilingualStringList = ( keyPath ) => {
				if ( !keyPath || typeof keyPath !== 'string' ) {
					return undefined;
				}
				return keyPath.split( '.' ).includes( Constants.Z_MULTILINGUALSTRING_VALUE );
			};
			return findIsInMultilingualStringList;
		},

		/**
		 * Recursively walks a ZObject and returns all empty Z9K1 references.
		 *
		 * @param {Object} state - Application state containing jsonObject
		 * @return {Function} Finder function
		 */
		getEmptyReferencesKeyPaths: function ( state ) {
			/**
			 * @param {string} namespace - Namespace to search
			 * @return {Array} Array of key paths where empty Z9K1 references are found
			 */
			const findEmptyReferences = ( namespace = Constants.STORED_OBJECTS.MAIN ) => {
				const zobject = state.jsonObject[ namespace ];
				return walkZObject( zobject, [ namespace ], ( obj, path ) => {
					if ( getZObjectType( obj ) === Constants.Z_REFERENCE ) {
						const value = getZReferenceTerminalValue( obj );
						if ( !value ) {
							return [ path.join( '.' ) ];
						}
					}
					return [];
				} );
			};
			return findEmptyReferences;
		}
	},
	actions: {
		/**
		 * Set the zobject in the store under a given namespace.
		 * Currently there are three different namespaces:
		 * * main: Root ZObject represented in the page
		 * * call: Function call from the function evaluator widget
		 * * response: Function call response from the function evaluator widget
		 * Sets a deep copy to avoid unwanted mutations.
		 *
		 * @param {Object} payload
		 * @param {string} namespace
		 * @param {Object} zobject
		 */
		setJsonObject: function ( payload ) {
			this.jsonObject[ payload.namespace ] = JSON.parse( JSON.stringify( payload.zobject ) );
		},

		/**
		 * Handles converstion to Hybrid form
		 *
		 * @param {Object} payload
		 * @param {Array} payload.keyPath
		 * @param {Object|Array|string} payload.value
		 */
		setValueByKeyPath: function ( payload ) {
			const { keyPath, value } = payload;
			const { target, finalKey } = resolveZObjectByKeyPath( this.jsonObject, keyPath );

			// Convert to hybrid if necessary
			const isTerminal = finalKey === Constants.Z_REFERENCE_ID || finalKey === Constants.Z_STRING_VALUE;
			const hybrid = isTerminal && typeof value === 'string' ? value : canonicalToHybrid( value );

			// Perform mutation:
			target[ finalKey ] = hybrid;
		},

		/**
		 * @param {Object} payload
		 * @param {Array} payload.keyPath
		 */
		unsetPropertyByKeyPath: function ( payload ) {
			const { keyPath } = payload;
			const { target, finalKey } = resolveZObjectByKeyPath( this.jsonObject, keyPath );

			// Perform mutation:
			delete target[ finalKey ];
		},

		/**
		 * @param {Object} payload
		 * @param {Array} payload.keyPath
		 * @param {Array} payload.values
		 */
		pushItemsByKeyPath: function ( payload ) {
			const { keyPath, values } = payload;
			const { target, finalKey } = resolveZObjectByKeyPath( this.jsonObject, keyPath );

			if ( !Array.isArray( target[ finalKey ] ) ) {
				throw new Error( `Unable to mutate state: Target at path ${ keyPath.join( '.' ) } is not an array` );
			}

			if ( !Array.isArray( values ) ) {
				throw new Error( 'Unable to mutate state: Values must be an Array' );
			}

			// Perform mutation:
			target[ finalKey ].push( ...values );
		},

		/**
		 * Removes multiple items from a ZTypedList given the key path of the
		 * list and the list of indexes of the items to delete.
		 * It deletes items in order from highest to lowest index, to avoid
		 * index shifting during the deletion.
		 *
		 * @param {Object} payload
		 * @param {Array} payload.keyPath
		 * @param {Array<number>} payload.indexes
		 */
		deleteListItemsByKeyPath: function ( payload ) {
			const { keyPath, indexes } = payload;

			const { target, finalKey } = resolveZObjectByKeyPath( this.jsonObject, keyPath );
			const list = target[ finalKey ];

			if ( !Array.isArray( list ) ) {
				throw new Error( `Unable to mutate state: Expected Array at key path, found ${ typeof list }` );
			}

			if ( !Array.isArray( indexes ) ) {
				throw new Error( `Unable to mutate state: Expected Array of indexes, found ${ typeof indexes }` );
			}

			const indexList = indexes.map( Number );

			indexList.forEach( ( index ) => {
				if ( !Number.isInteger( index ) || index < 1 || index >= list.length ) {
					throw new Error( `Unable to mutate state: Invalid array index: "${ index }"` );
				}
			} );

			// Perform mutation:
			// Sort in descending order to avoid index shift during deletion
			indexList
				.sort( ( a, b ) => b - a )
				.forEach( ( index ) => {
					list.splice( index, 1 );
				} );
		},

		/**
		 * Clears the type, keeping the key Z1K1 and removing all other keys
		 *
		 * @param {Object} payload
		 * @param {Array} payload.keyPath
		 */
		clearTypeByKeyPath: function ( payload ) {
			const { keyPath } = payload;
			const { target, finalKey } = resolveZObjectByKeyPath( this.jsonObject, keyPath );
			const zobject = target[ finalKey ];

			if ( !zobject || typeof zobject !== 'object' || Array.isArray( zobject ) ) {
				throw new Error( 'Unable to mutate state: Expected Object at key path' );
			}

			const keys = Object.keys( zobject ).filter( ( key ) => key !== Constants.Z_OBJECT_TYPE );

			// Perform mutation:
			keys.forEach( ( key ) => {
				delete zobject[ key ];
			} );
		},

		/**
		 * Initializes a blank object of a given type and sets it at the
		 * given keyPath. Passes all payload properties to createObjectByType,
		 * for creating and initializing the blank object.
		 *
		 * @param {Object} payload
		 * @param {Array} payload.keyPath
		 * @param {string} payload.type
		 * @param {boolean} payload.literal
		 * @param {string} payload.value
		 */
		changeTypeByKeyPath: function ( payload ) {
			// Set isRoot flag if we are changing the type of Z2K2
			const lastKey = payload.keyPath[ payload.keyPath.length - 1 ];
			const params = Object.assign( {}, payload, {
				isRoot: lastKey === Constants.Z_PERSISTENTOBJECT_VALUE,
				keyPath: undefined
			} );

			// Build the blank object of the new type (in hybrid form)
			const value = canonicalToHybrid( this.createObjectByType( params ) );

			// Set the value
			this.setValueByKeyPath( {
				keyPath: payload.keyPath,
				value
			} );

			// Asynchronously fetch the necessary zids. We don't need to wait
			// to the fetch call because these will only be needed for labels.
			const zids = extractZIDs( value );
			this.fetchZids( { zids } );
		},

		/**
		 * Moves an item in a typed list to the given position
		 *
		 * @param {Object} payload
		 * @param {Array} payload.keyPath
		 * @param {number} payload.offset
		 */
		moveListItemByKeyPath: function ( payload ) {
			const { keyPath, offset } = payload;
			const { target, finalKey } = resolveZObjectByKeyPath( this.jsonObject, keyPath );

			if ( !Array.isArray( target ) ) {
				throw new Error( `Unable to mutate state: Expected Array at key path, found ${ typeof target }` );
			}

			const index = Number( finalKey );
			if ( !Number.isInteger( index ) || index < 0 || index >= target.length ) {
				throw new Error( `Unable to mutate state: Invalid array index: "${ finalKey }"` );
			}

			const newIndex = index + offset;
			if ( newIndex < 0 || newIndex >= target.length ) {
				throw new Error( `Unable to mutate state: New index "${ newIndex }" out of bounds` );
			}

			// Perform mutation:
			const [ item ] = target.splice( index, 1 );
			target.splice( newIndex, 0, item );
		},

		/**
		 * Adds the next available local key (K1, K2, ...Kn) to the given function call
		 *
		 * @param {Object} payload
		 * @param {Array} payload.keyPath - The key path of the function call function key
		 */
		addLocalArgumentToFunctionCall: function ( payload ) {
			const { keyPath } = payload;
			const { target } = resolveZObjectByKeyPath( this.jsonObject, keyPath );

			if ( !target || typeof target !== 'object' ||
				!( Constants.Z_FUNCTION_CALL_FUNCTION in target || Constants.Z_OBJECT_TYPE in target ) ) {
				throw new Error( 'Unable to mutate state: Expected Function call or Object type at parent path' );
			}

			// Get all local keys in the function call
			const localKeys = Object.keys( target ).filter( ( key ) => isLocalKey( key ) );

			// Extract the numeric part and find the maximum
			const maxIndex = localKeys.reduce( ( max, key ) => {
				const index = parseInt( key.slice( 1 ), 10 );
				return isNaN( index ) ? max : Math.max( max, index );
			}, 0 );

			// Construct the next key name
			const newLocalKey = `K${ maxIndex + 1 }`;

			// Construct the blank value
			const value = this.createObjectByType( {
				type: Constants.Z_OBJECT
			} );

			// Add the new key with value null
			const parentPath = keyPath.slice( 0, -1 );
			this.setValueByKeyPath( {
				keyPath: [ ...parentPath, newLocalKey ],
				value
			} );
		},

		/**
		 * Deletes the given local key from the given function call, and renumbers
		 * all the sequential ones.
		 *
		 * @param {Object} payload
		 * @param {Array} payload.keyPath - The key path of the function call argument to delete
		 */
		deleteLocalArgumentFromFunctionCall: function ( payload ) {
			const { keyPath } = payload;
			const { target, finalKey } = resolveZObjectByKeyPath( this.jsonObject, keyPath );

			if ( !target || typeof target !== 'object' ||
				!( Constants.Z_FUNCTION_CALL_FUNCTION in target || Constants.Z_OBJECT_TYPE in target ) ) {
				throw new Error( 'Unable to mutate state: Expected Function call or Object type at parent path' );
			}

			// Perform mutation:
			delete target[ finalKey ];

			const deletedIndex = parseInt( finalKey.slice( 1 ), 10 );

			const renumberKeys = Object.keys( target )
				.filter( ( key ) => isLocalKey( key ) )
				.filter( ( key ) => parseInt( key.slice( 1 ), 10 ) > deletedIndex );

			const parentPath = keyPath.slice( 0, -1 );

			renumberKeys.forEach( ( key ) => {
				const keyIndex = parseInt( key.slice( 1 ), 10 );
				const newKey = `K${ keyIndex - 1 }`;

				const value = target[ key ];
				delete target[ key ];
				this.setValueByKeyPath( {
					keyPath: [ ...parentPath, newKey ],
					value
				} );
			} );
		},

		/**
		 * Sets the type of the Wikidata enum typed list of references (Z6884K2) to the given value.
		 *
		 * @param {Object} payload
		 * @param {Array} payload.keyPath - The key path of the wikidata enum function call
		 * @param {string} payload.value - The new type to set in the list
		 */
		setWikidataEnumReferenceType: function ( payload ) {
			const { keyPath, value } = payload;

			const listKeyPath = [ ...keyPath, Constants.Z_WIKIDATA_ENUM_REFERENCES ];
			const { target } = resolveZObjectByKeyPath( this.jsonObject, listKeyPath );

			// Set the value of the first item
			const tailPath = [ '0', Constants.Z_REFERENCE_ID ];
			this.setValueByKeyPath( {
				keyPath: [ ...listKeyPath, ...tailPath ],
				value
			} );

			this.handleListTypeChange( {
				keyPath: listKeyPath.join( '.' ),
				objectValue: target[ Constants.Z_WIKIDATA_ENUM_REFERENCES ],
				newType: value
			} );
		},

		/**
		 * Sets the type of a given keyType
		 *
		 * @param {Object} payload
		 * @param {Array} payload.keyPath - The key path to Z3K4
		 * @param {string} payload.value - The new type to set in Z3K1
		 */
		setKeyType: function ( payload ) {
			const { keyPath, value } = payload;
			// target is key/Z3 object
			const { target } = resolveZObjectByKeyPath( this.jsonObject, keyPath );

			const keyTypeIsReference = Constants.Z_REFERENCE_ID in target[ Constants.Z_KEY_TYPE ];
			const parentPath = keyPath.slice( 0, -1 );
			const tailPath = keyTypeIsReference ?
				[ Constants.Z_KEY_TYPE, Constants.Z_REFERENCE_ID ] :
				[ Constants.Z_KEY_TYPE ];

			this.setValueByKeyPath( {
				keyPath: [ ...parentPath, ...tailPath ],
				value
			} );
		},

		/**
		 * Sets the argument keys to their initial blank values of a function call
		 * and removes the arguments of the old function Id.
		 * * If the function call is the value of a tester result validation (Z20K3)
		 *   the first argument should not be added.
		 * * If the functionZid is undefined, we clear the old arguments but set no
		 *   new ones.
		 *
		 * @param {Object} payload
		 * @param {Array} payload.keyPath
		 * @param {string|undefined} payload.functionZid
		 */
		setFunctionCallArguments: function ( payload ) {
			const { keyPath, functionZid } = payload;

			// target is key/Z3 object
			const { target, finalKey } = resolveZObjectByKeyPath( this.jsonObject, keyPath );

			let newArgs = [];
			let newKeys = [];

			// 1. Get new argument definitions from payload.functionZid
			if ( functionZid ) {
				newArgs = this.getInputsOfFunctionZid( functionZid );
				newKeys = newArgs.map( ( arg ) => arg[ Constants.Z_ARGUMENT_KEY ] );
			}

			// 2. Get function call arguments from parentId
			const oldKeys = getZFunctionCallArgumentKeys( target[ finalKey ] );

			// 3. For every current argument key: if it's not in new keys, remove it
			oldKeys.forEach( ( key ) => {
				if ( !newKeys.includes( key ) ) {
					this.unsetPropertyByKeyPath( {
						keyPath: [ ...keyPath, key ]
					} );
				}
			} );

			// 4. For every key of new arguments: if it's not set, set it to blank object
			// 4.a. Omit first argument if parent key is a tester validation call
			const parentKey = keyPath[ keyPath.length - 1 ];
			if ( parentKey === Constants.Z_TESTER_VALIDATION ) {
				newArgs.shift();
			}

			// If no args, exit early
			if ( newArgs.length === 0 ) {
				return;
			}

			// 4.b. Fetch all argument types before the creation of the blank objects
			const argTypes = newArgs.map( ( arg ) => typeToString( arg[ Constants.Z_ARGUMENT_TYPE ], true ) );
			this.fetchZids( { zids: [ ...new Set( argTypes ) ] } ).then( () => {

				// 4.c. Initialize all the new function call arguments
				let zids = [];
				newArgs.forEach( ( arg ) => {
					if ( oldKeys.includes( arg[ Constants.Z_ARGUMENT_KEY ] ) ) {
						return;
					}

					const key = arg[ Constants.Z_ARGUMENT_KEY ];
					const type = arg[ Constants.Z_ARGUMENT_TYPE ];

					// 4.d. If the key is a Wikidata enum identity, set it to the placeholder Z0
					const presetValue = key === Constants.Z_WIKIDATA_ENUM_IDENTITY ?
						Constants.NEW_ZID_PLACEHOLDER :
						undefined;

					const value = this.createObjectByType( {
						type,
						value: presetValue
					} );

					zids = zids.concat( extractZIDs( { [ key ]: value } ) );
					this.setValueByKeyPath( {
						keyPath: [ ...keyPath, key ],
						value
					} );
				} );

				// 5. Asynchronously fetch the necessary zids. We don't need to wait
				// to the fetch call because these will only be needed for labels.
				zids = [ ...new Set( zids ) ];

				if ( zids.length > 0 ) {
					this.fetchZids( { zids } );
				}
			} );
		},

		/**
		 * Sets the new implementation key and removes the previous one when changing
		 * an implementation content from code to composition or viceversa. These keys
		 * need to be exclusive and the content for the new key needs to be correctly
		 * initialized with either a ZCode/Z16 object or with a ZFunctionCall/Z7.
		 *
		 * @param {Object} payload
		 * @param {Array} payload.keyPath - path to the new implementation key to set
		 */
		setImplementationContentType: function ( payload ) {
			const { keyPath } = payload;
			const parentKeyPath = keyPath.slice( 0, -1 );

			// target is implementation object
			// finalKey is new content type
			const { target, finalKey } = resolveZObjectByKeyPath( this.jsonObject, keyPath );

			let oldKey;
			const allKeys = [
				Constants.Z_IMPLEMENTATION_CODE,
				Constants.Z_IMPLEMENTATION_COMPOSITION,
				Constants.Z_IMPLEMENTATION_BUILT_IN
			];

			// Remove unchecked implementation types
			allKeys.forEach( ( key ) => {
				if ( ( key !== finalKey ) && ( key in target ) ) {
					oldKey = key;
					this.unsetPropertyByKeyPath( {
						keyPath: [ ...parentKeyPath, key ]
					} );
				}
			} );

			// Get new implementation content
			const blankType = finalKey === Constants.Z_IMPLEMENTATION_CODE ?
				Constants.Z_CODE :
				Constants.Z_FUNCTION_CALL;
			const value = this.createObjectByType( { type: blankType } );

			// Add new key-value
			this.setValueByKeyPath( { keyPath, value } );

			// Clear errors from the old key
			if ( oldKey ) {
				const errorIds = this.getChildErrorKeys( [ ...parentKeyPath, oldKey ].join( '.' ) );
				errorIds.forEach( ( errorId ) => this.clearErrors( errorId ) );
			}
		},

		/**
		 * Persists ZMonolingualString changes in the store.
		 * These can be changes to the Name/Z2K3 and Description/Z2K5 fields,
		 * as well as the input labels if the object is a function.
		 *
		 * @param {Object} payload
		 * @param {Array} payload.parentKeyPath path to the parent multilingual string value
		 * @param {string|undefined} payload.itemKeyPath string path to the monolingual text value (if it exists)
		 * @param {string} payload.value
		 * @param {string} payload.lang
		 */
		setZMonolingualString: function ( payload ) {
			const { parentKeyPath, itemKeyPath, value, lang } = payload;

			if ( itemKeyPath ) {
				// If itemKeyPath exists, means the monolingual object for this language
				// already exists; we change the terminal value of its text.
				this.setValueByKeyPath( {
					keyPath: itemKeyPath.split( '.' ),
					value
				} );
			} else {
				// If itemKeyPath doesn't exist, we need to add a new monolingual
				// object into the parent multilingual string object.
				const type = Constants.Z_MONOLINGUALSTRING;
				const newItem = canonicalToHybrid( this.createObjectByType( { type, lang, value } ) );
				this.pushItemsByKeyPath( {
					keyPath: parentKeyPath,
					values: [ newItem ]
				} );
			}
		},

		/**
		 * Persists ZMonolingualStringset changes in the store.
		 * These can be changes to the Aliases/Z2K4 field.
		 *
		 * @param {Object} payload
		 * @param {Array} payload.parentKeyPath path to the parent multilingual stringset value
		 * @param {string|undefined} payload.itemKeyPath string path to the monolingual set value (if it exists)
		 * @param {string} payload.value
		 * @param {string} payload.lang
		 */
		setZMonolingualStringset: function ( payload ) {
			const { parentKeyPath, itemKeyPath, value, lang } = payload;

			if ( itemKeyPath ) {
				// If itemKeyPath exists, means the monolingual stringset object for this language
				// already exists; we change the terminal value of its text.
				this.setValueByKeyPath( {
					keyPath: itemKeyPath.split( '.' ),
					value: canonicalToHybrid( [ Constants.Z_STRING, ...value ] )
				} );
			} else {
				// If itemKeyPath doesn't exist, we need to add a new monolingual stringset
				// object into the parent multilingual string object.
				const type = Constants.Z_MONOLINGUALSTRINGSET;
				const newItem = canonicalToHybrid( this.createObjectByType( { type, lang, value } ) );
				this.pushItemsByKeyPath( {
					keyPath: parentKeyPath,
					values: [ newItem ]
				} );
			}
		},

		/**
		 * Handles the initialization of the pages given wgWikiLambda config
		 * The page can be:
		 * 1. A Create New ZObject page, when the flag createNewPage is true.
		 * 2. A Run Function page, when the flag runFunction is true or the
		 *    zid property is empty.
		 * 3. A View or Edit page of a persisted ZObject given its zid.
		 *
		 * @return {Promise}
		 */
		initializeView: function () {
			const { abstractContent, createNewPage, runFunction, zId } = this.getWikilambdaConfig;

			if ( abstractContent ) {
				// If abstractContent is true, fully initialize for abstract view
				return this.initializeAbstractWikiContent();

			} else if ( createNewPage ) {
				// If createNewPage is true, ignore runFunction and any specified ZID.
				return this.initializeCreateNewPage();

			} else if ( runFunction || !zId ) {
				// If runFunction is true, ignore any specified ZID.
				// If no ZID specified, assume runFunction is true.
				return this.initializeEvaluateFunction();

			} else {
				// Else, this is a view or edit page of an existing ZObject, so we
				// fetch the info and set the root ZObject with the persisted data.
				return this.initializeRootZObject( zId );
			}
		},

		/**
		 * Initializes an Evaluate Function Call page, setting the root blank
		 * function call object.
		 *
		 * @return {Promise}
		 */
		initializeEvaluateFunction: function () {
			// Set current Zid to empty placeholder (Z0)
			this.setCurrentZid( Constants.NEW_ZID_PLACEHOLDER );

			// Set emtpy object as function call
			this.setJsonObject( {
				namespace: Constants.STORED_OBJECTS.FUNCTION_CALL,
				zobject: {}
			} );

			// Set the blank ZObject as a new ZFunctionCall
			this.changeTypeByKeyPath( {
				keyPath: [ Constants.STORED_OBJECTS.FUNCTION_CALL ],
				type: Constants.Z_FUNCTION_CALL
			} );

			// Set as initialized
			this.setInitialized( true );

			return Promise.resolve();
		},

		/**
		 * Initializes a Create New ZObject page, setting the root blank
		 * persistent object and setting the internal type to a given one, if
		 * provided in the url Zid property.
		 *
		 * @return {Promise}
		 */
		initializeCreateNewPage: function () {
			// Set createNewPage flag to true
			this.setCreateNewPage( true );

			// Set current Zid to empty placeholder (Z0)
			this.setCurrentZid( Constants.NEW_ZID_PLACEHOLDER );

			// Create blank persistent object
			const persistentObject = this.createObjectByType( {
				type: Constants.Z_PERSISTENTOBJECT
			} );

			// Set Json Object with namespace
			this.setJsonObject( {
				namespace: Constants.STORED_OBJECTS.MAIN,
				zobject: canonicalToHybrid( persistentObject )
			} );

			let fetchPromise;

			const initialType = getParameterByName( 'zid' );

			if ( !!initialType && initialType.match( /Z[1-9]\d*$/ ) ) {
				// If there's a URL parameter for zid, fetch the zid and check that it is a type
				fetchPromise = this.fetchZids( { zids: [ initialType ] } ).then( () => {
					// If zid belongs to a type
					const typeObject = this.getStoredObject( initialType );
					if (
						typeObject &&
						Constants.Z_TYPE_IDENTITY in typeObject[ Constants.Z_PERSISTENTOBJECT_VALUE ]
					) {
						// Change type of inner object to a literal object of the given type
						this.changeTypeByKeyPath( {
							keyPath: [ Constants.STORED_OBJECTS.MAIN, Constants.Z_PERSISTENTOBJECT_VALUE ],
							type: initialType,
							literal: true
						} );
					}
				} );
			} else {
				// If there's no URL parameter for zid, we finalize the initialization
				fetchPromise = Promise.resolve();
			}

			// Set initialized as done:
			return fetchPromise.finally( () => {
				this.setInitialized( true );
			} );
		},

		/**
		 * Initializes a view or edit page of a given zid from a persisted ZObject.
		 * Calls to the wikilambdaload_zobjects API to fetch the root ZObject of the page
		 * with all its unfiltered content (all language labels, etc). This call is done
		 * only once and the method is separate from fetchZids because the logic to
		 * treat the result is extremely different.
		 *
		 * @param {string} zid
		 * @return {Promise}
		 */
		initializeRootZObject: function ( zid ) {
			// Set current Zid
			this.setCurrentZid( zid );
			const revision = getParameterByName( 'oldid' );

			// Calling the API without language parameter so that we get
			// the unfiltered multilingual object
			return fetchZObjects( {
				zids: zid,
				revisions: revision || undefined
			} ).then( ( response ) => {
				const zobject = response[ zid ].data;

				// Initialize optional aliases key if absent
				if ( !zobject[ Constants.Z_PERSISTENTOBJECT_ALIASES ] ) {
					zobject[ Constants.Z_PERSISTENTOBJECT_ALIASES ] = {
						Z1K1: Constants.Z_MULTILINGUALSTRINGSET,
						Z32K1: [
							Constants.Z_MONOLINGUALSTRINGSET
						]
					};
				}

				// Initialize optional description key if absent
				if ( !zobject[ Constants.Z_PERSISTENTOBJECT_DESCRIPTION ] ) {
					zobject[ Constants.Z_PERSISTENTOBJECT_DESCRIPTION ] = {
						Z1K1: Constants.Z_MULTILINGUALSTRING,
						Z12K1: [
							Constants.Z_MONOLINGUALSTRING
						]
					};
				}

				// If object is Type/Z4, on edit mode, and user has permission to edit types,
				// initialize falsy fields to allow users to change them.
				//
				// NOTE: This has the potential of adding unrelated edits to types,
				// e.g. if a user edits a label and the identity flag was missing (falsy),
				// the identity flag will be saved as false. This is why we need to restrict
				// this initialization only to users that have the right to edit types.
				if (
					!this.getViewMode &&
					this.userCanEditTypes &&
					isTruthyOrEqual( zobject, [
						Constants.Z_PERSISTENTOBJECT_VALUE,
						Constants.Z_OBJECT_TYPE ], Constants.Z_TYPE
					)
				) {
					// 1. Initialize type function keys (Z4K3, Z4K4, Z4K5 and Z4K6)
					const refs = [
						Constants.Z_TYPE_VALIDATOR,
						Constants.Z_TYPE_EQUALITY,
						Constants.Z_TYPE_RENDERER,
						Constants.Z_TYPE_PARSER
					];
					for ( const key of refs ) {
						if ( !isTruthyOrEqual( zobject, [ Constants.Z_PERSISTENTOBJECT_VALUE, key ] ) ) {
							zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ key ] = {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
								[ Constants.Z_REFERENCE_ID ]: ''
							};
						}
					}
					// 2. Initialize the converters' lists (Z4K7, Z4K8)
					const lists = {
						[ Constants.Z_TYPE_DESERIALISERS ]: Constants.Z_DESERIALISER,
						[ Constants.Z_TYPE_SERIALISERS ]: Constants.Z_SERIALISER
					};
					for ( const key in lists ) {
						if ( !isTruthyOrEqual( zobject, [ Constants.Z_PERSISTENTOBJECT_VALUE, key ] ) ) {
							zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ key ] = [ lists[ key ] ];
						}
					}
					// 3. Initialize keys' Is identity (Z3K4) field for every key
					// (skip the first item from the benjamin list)
					const keys = zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_TYPE_KEYS ].slice( 1 );
					for ( const key of keys ) {
						if ( !isTruthyOrEqual( key, [ Constants.Z_KEY_IS_IDENTITY ] ) ) {
							key[ Constants.Z_KEY_IS_IDENTITY ] = {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_BOOLEAN,
								[ Constants.Z_BOOLEAN_IDENTITY ]: Constants.Z_BOOLEAN_FALSE
							};
						}
					}
				}

				// Save initial multilingual data values
				// so that About widget knows how to reset to original
				// state in the case of a publish cancelation action.
				// NOTE: we store the canonical version
				this.saveMultilingualDataCopy( zobject );

				// Internal data fetch:
				// Get all ZObject Ids within the object
				const listOfZIdWithinObject = extractZIDs( zobject );
				this.fetchZids( { zids: listOfZIdWithinObject } );

				// External data fetch:
				// Get all Wikidata Ids within the object (if any)
				const listOfLexemeIds = extractWikidataLexemeIds( zobject );
				if ( listOfLexemeIds.length > 0 ) {
					this.fetchLexemes( { ids: listOfLexemeIds } );
				}

				// Set Json Object with namespace
				this.setJsonObject( {
					namespace: Constants.STORED_OBJECTS.MAIN,
					zobject: canonicalToHybrid( zobject )
				} );

				// Set initialized as done:
				this.setInitialized( true );
			} );
		}
	}
};

module.exports = zobjectStore;
