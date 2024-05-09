/*!
 * WikiLambda Vue editor: ZOBject Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const Constants = require( '../../Constants.js' ),
	findKeyInArray = require( '../../mixins/typeUtils.js' ).methods.findKeyInArray,
	selectBestLanguage = require( '../../mixins/typeUtils.js' ).methods.selectBestLanguage,
	isTruthyOrEqual = require( '../../mixins/typeUtils.js' ).methods.isTruthyOrEqual,
	zobjectUtils = require( '../../mixins/zobjectUtils.js' ).methods,
	apiUtils = require( '../../mixins/api.js' ).methods,
	extractZIDs = require( '../../mixins/schemata.js' ).methods.extractZIDs,
	hybridToCanonical = require( '../../mixins/schemata.js' ).methods.hybridToCanonical,
	getParameterByName = require( '../../mixins/urlUtils.js' ).methods.getParameterByName,
	addZObjects = require( './zobject/addZObjects.js' ),
	currentZObject = require( './zobject/currentZObject.js' ),
	submission = require( './zobject/submission.js' ),
	Row = require( '../classes/Row.js' ),
	DEBOUNCE_ZOBJECT_LOOKUP_TIMEOUT = 300;

let debounceZObjectLookup = null;

module.exports = exports = {
	modules: {
		addZObjects: addZObjects,
		currentZObject: currentZObject,
		submission: submission
	},
	state: {
		zobject: [],
		createNewPage: false,
		isSavingZObject: false,
		ZObjectInitialized: false
	},
	getters: {
		/**
		 * Returns the whole state zobject table object
		 *
		 * @param {Object} state
		 * @return {Object}
		 */
		getZObjectTable: function ( state ) {
			return state.zobject;
		},

		/**
		 * Return a specific zObject key given its row ID or
		 * undefined if the row ID doesn't exist
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZObjectKeyByRowId: function ( state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {string | undefined}
			 */
			function fetchZObjectKey( rowId ) {
				const row = getters.getRowById( rowId );
				return ( row !== undefined ) ?
					row.key :
					undefined;
			}
			return fetchZObjectKey;
		},

		/**
		 * Returns string with the value if the row exists and
		 * is terminal, else returns undefined
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZObjectValueByRowId: function ( state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {string | undefined} terminal value
			 */
			function fetchZObjectValue( rowId ) {
				const row = getters.getRowById( rowId );
				return ( ( row !== undefined ) && row.isTerminal() ) ?
					row.value :
					undefined;
			}
			return fetchZObjectValue;
		},

		/**
		 * Returns the depth (from 0 to n) of the zobject
		 * represented by a given rowId
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getDepthByRowId: function ( state, getters ) {
			/**
			 * @param {number} rowId
			 * @param {number} depth
			 * @return {number}
			 */
			function findDepth( rowId, depth = 0 ) {
				const row = getters.getRowById( rowId );
				return ( !row || ( row.parent === undefined ) ) ?
					depth :
					findDepth( row.parent, depth + 1 );
			}
			return findDepth;
		},

		/**
		 * Returns the row Id where the persistent object value starts (Z2K2 key)
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZPersistentContentRowId: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {number | undefined}
			 */
			function findContent( rowId = 0 ) {
				const row = getters.getRowByKeyPath( [ Constants.Z_PERSISTENTOBJECT_VALUE ], rowId );
				return row ? row.id : undefined;
			}

			return findContent;
		},

		/**
		 * Returns an array of all the ZMonolingualString objects
		 * (their language and their rowId) that are available in
		 * the persistent object Name/Label key (Z2K3).
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZPersistentNameLangs: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {Array}
			 */
			function findName( rowId = 0 ) {
				const nameRow = getters.getRowByKeyPath( [
					Constants.Z_PERSISTENTOBJECT_LABEL,
					Constants.Z_MULTILINGUALSTRING_VALUE
				], rowId );
				return nameRow ?
					getters.getZMultilingualLanguageList( nameRow.id ) :
					[];
			}

			return findName;
		},

		/**
		 * Returns an array of all the ZMonolingualString objects
		 * (their language and their rowId) that are available in
		 * the persistent object Description key (Z2K5).
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZPersistentDescriptionLangs: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {Array}
			 */
			function findDescription( rowId = 0 ) {
				const descriptionRow = getters.getRowByKeyPath( [
					Constants.Z_PERSISTENTOBJECT_DESCRIPTION,
					Constants.Z_MULTILINGUALSTRING_VALUE
				], rowId );
				return descriptionRow ?
					getters.getZMultilingualLanguageList( descriptionRow.id ) :
					[];
			}

			return findDescription;
		},

		/**
		 * Returns an array of all the ZMonolingualStringSet objects
		 * (their language and their rowId) that are available in
		 * the persistent object Aliases key (Z2K4).
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZPersistentAliasLangs: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {Array}
			 */
			function findAliases( rowId = 0 ) {
				const aliasRow = getters.getRowByKeyPath( [
					Constants.Z_PERSISTENTOBJECT_ALIASES,
					Constants.Z_MULTILINGUALSTRINGSET_VALUE
				], rowId );
				// Return undefined if row does not exist
				if ( aliasRow === undefined ) {
					return [];
				}
				const allAlias = getters.getChildrenByParentRowId( aliasRow.id ).slice( 1 );
				const allLanguages = allAlias.map( ( monolingualset ) => {
					const langZid = getters.getZMonolingualStringsetLang( monolingualset.id );
					const langIsoCode = getters.getLanguageIsoCodeOfZLang( langZid );
					return {
						langZid,
						langIsoCode,
						rowId: monolingualset.id
					};
				} );
				return allLanguages;
			}

			return findAliases;
		},

		/**
		 * Returns the name for the ZPersistent object for a given
		 * lang Zid. If language isn't passed as a parameter, returns
		 * the best name for the ZPersistent object depending on the
		 * user preferred languge and the languages available.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZPersistentName: function ( _state, getters ) {
			/**
			 * @param {string|null} langZid
			 * @param {number} rowId
			 * @return {Object|undefined}
			 */
			function findName( langZid = null, rowId = 0 ) {
				const allNames = getters.getZPersistentNameLangs( rowId );
				return langZid ?
					allNames.find( ( lang ) => ( lang.langZid === langZid ) ) :
					selectBestLanguage( allNames );
			}

			return findName;
		},

		/**
		 * Returns the description for the ZPersistent object for a given
		 * lang Zid. If language isn't passed as a parameter, returns the
		 * best description for the ZPersistent object depending on the
		 * user preferred languge and the languages available.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZPersistentDescription: function ( _state, getters ) {
			/**
			 * @param {string|null} langZid
			 * @param {number} rowId
			 * @return {Object|undefined}
			 */
			function findDescription( langZid = null, rowId = 0 ) {
				const allDescriptions = getters.getZPersistentDescriptionLangs( rowId );
				return langZid ?
					allDescriptions.find( ( lang ) => ( lang.langZid === langZid ) ) :
					selectBestLanguage( allDescriptions );
			}

			return findDescription;
		},

		/**
		 * Returns the alias for the ZPersistent object for a given
		 * lang Zid. If language isn't passed as a parameter, returns
		 * the best alias for the ZPersistent object depending on the
		 * user preferred languge and the languages available.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZPersistentAlias: function ( _state, getters ) {
			/**
			 * @param {string|null} langZid
			 * @param {number} rowId
			 * @return {Object|undefined}
			 */
			function findAlias( langZid = null, rowId = 0 ) {
				const allAlias = getters.getZPersistentAliasLangs( rowId );
				return langZid ?
					allAlias.find( ( lang ) => ( lang.langZid === langZid ) ) :
					selectBestLanguage( allAlias );
			}

			return findAlias;
		},

		/**
		 * Returns a list of all the language Zids that are present
		 * in the metadata collection (must have at least a name, a
		 * description or a set of aliases).
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getMetadataLanguages: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {Array}
			 */
			function findAllLanguages( rowId = 0 ) {
				// Get languages available in name, description and alias fields
				const nameLangs = getters.getZPersistentNameLangs( rowId );
				const descriptionLangs = getters.getZPersistentDescriptionLangs( rowId );
				const aliasLangs = getters.getZPersistentAliasLangs( rowId );

				// Get languages available in input labels if object is a function
				const inputLangs = getters.getZFunctionInputLangs( rowId );

				// Combine all languages and return the array of unique languageZids
				const allLangs = nameLangs.concat( descriptionLangs, aliasLangs, inputLangs );
				const langZids = allLangs.map( ( lang ) => lang.langZid );
				return [ ...new Set( langZids ) ];
			}

			return findAllLanguages;
		},

		/**
		 * Returns the terminal value of Z6K1/String value of a ZObject
		 * assumed to be a string
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZStringTerminalValue: function ( state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {string | undefined}
			 */
			function findZStringTerminalValue( rowId ) {
				return getters.getZObjectTerminalValue( rowId, Constants.Z_STRING_VALUE );
			}

			return findZStringTerminalValue;
		},

		/**
		 * Returns the terminal value of Z6K1/String value of a ZObject
		 * assumed to be a string
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZReferenceTerminalValue: function ( state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {string | undefined}
			 */
			function findZReferenceTerminalValue( rowId ) {
				return getters.getZObjectTerminalValue( rowId, Constants.Z_REFERENCE_ID );
			}

			return findZReferenceTerminalValue;
		},

		/**
		 * Returns the terminal value of Z11K2
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZMonolingualTextValue: function ( state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {string | undefined}
			 */
			function findZMonolingualTextValue( rowId ) {
				const stringRow = getters.getRowByKeyPath( [ Constants.Z_MONOLINGUALSTRING_VALUE ], rowId );
				return stringRow ?
					getters.getZStringTerminalValue( stringRow.id ) :
					undefined;
			}
			return findZMonolingualTextValue;
		},

		/**
		 * Returns the terminal value of Z11K1
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZMonolingualLangValue: function ( state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {string | undefined} rowId
			 */
			function findZMonolingualLangValue( rowId ) {
				const langRow = getters.getRowByKeyPath( [ Constants.Z_MONOLINGUALSTRING_LANGUAGE ], rowId );
				if ( !langRow ) {
					return undefined;
				}
				const zObjectType = getters.getZObjectTypeByRowId( langRow.id );

				// If zobject language type is a natural language, return the
				// language code value
				if ( zObjectType === Constants.Z_NATURAL_LANGUAGE ) {
					return getters.getRowByKeyPath( [
						Constants.Z_NATURAL_LANGUAGE_ISO_CODE,
						Constants.Z_STRING_VALUE
					], langRow.id ).value;
				}

				return getters.getZReferenceTerminalValue( langRow.id );
			}
			return findZMonolingualLangValue;
		},

		/**
		 * Returns the terminal value of Z31K2, which is an
		 * array of strings.
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZMonolingualStringsetValues: function ( state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {Array}
			 */
			function findZMonolingualStringsetValues( rowId ) {
				const listRow = getters.getRowByKeyPath( [ Constants.Z_MONOLINGUALSTRINGSET_VALUE ], rowId );
				if ( listRow === undefined ) {
					return [];
				}
				const list = getters.getChildrenByParentRowId( listRow.id ).slice( 1 );
				const strings = list.map( ( stringRow ) => {
					return {
						rowId: stringRow.id,
						value: getters.getZStringTerminalValue( stringRow.id )
					};
				} );
				return strings;
			}
			return findZMonolingualStringsetValues;
		},

		/**
		 * Returns the terminal value of Z31K1
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZMonolingualStringsetLang: function ( state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {string | undefined} rowId
			 */
			function findZMonolingualStringsetLang( rowId ) {
				const langRow = getters.getRowByKeyPath( [ Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE ], rowId );
				if ( langRow === undefined ) {
					return undefined;
				}
				const zObjectType = getters.getZObjectTypeByRowId( langRow.id );

				// If zobject language type is a natural language, return the
				// language code value
				if ( zObjectType === Constants.Z_NATURAL_LANGUAGE ) {
					return getters.getRowByKeyPath( [
						Constants.Z_NATURAL_LANGUAGE_ISO_CODE,
						Constants.Z_STRING_VALUE
					], langRow.id ).value;
				}

				return getters.getZReferenceTerminalValue( langRow.id );
			}
			return findZMonolingualStringsetLang;
		},

		/**
		 * Returns the zid of the function given the rowId of a function call
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZFunctionCallFunctionId: function ( _state, getters ) {
			/**
			 * @param {string} rowId
			 * @return {string | undefined}
			 */
			function findZFunctionId( rowId ) {
				const zFunction = getters.getRowByKeyPath(
					[ Constants.Z_FUNCTION_CALL_FUNCTION ],
					rowId
				);
				if ( !zFunction ) {
					return undefined;
				}
				return getters.getZObjectTerminalValue( zFunction.id, Constants.Z_REFERENCE_ID );
			}
			return findZFunctionId;
		},

		/**
		 * Returns the argument key-values of a function call given the
		 * rowId of the function call object.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZFunctionCallArguments: function ( _state, getters ) {
			/**
			 * @param {string} rowId
			 * @return {Array}
			 */
			function findZFunctionCallArgs( rowId ) {
				const children = getters.getChildrenByParentRowId( rowId );
				return children.filter( ( row ) => {
					return ( row.key !== Constants.Z_OBJECT_TYPE ) &&
					( row.key !== Constants.Z_FUNCTION_CALL_FUNCTION );
				} );
			}
			return findZFunctionCallArgs;
		},

		/**
		 * Returns the row ID of the target function of a tester
		 * given the tester rowId
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZTesterFunctionRowId: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {number | undefined}
			 */
			function findFunctionId( rowId ) {
				const functionRef = getters.getRowByKeyPath( [ Constants.Z_TESTER_FUNCTION ], rowId );
				if ( functionRef === undefined ) {
					return undefined;
				}
				return functionRef.id;
			}
			return findFunctionId;
		},

		/**
		 * Returns the row ID of the call function call of a tester
		 * given the tester rowId
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZTesterCallRowId: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {number | undefined}
			 */
			function findCall( rowId ) {
				const callRow = getters.getRowByKeyPath( [ Constants.Z_TESTER_CALL ], rowId );
				if ( callRow === undefined ) {
					return undefined;
				}
				return callRow.id;
			}
			return findCall;
		},

		/**
		 * Returns the row ID of the validation function call of a tester
		 * given the tester rowId
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZTesterValidationRowId: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {number | undefined}
			 */
			function findValidation( rowId ) {
				const validationRow = getters.getRowByKeyPath( [ Constants.Z_TESTER_VALIDATION ], rowId );
				if ( validationRow === undefined ) {
					return undefined;
				}
				return validationRow.id;
			}
			return findValidation;
		},

		/**
		 * Returns the row ID of the target function of an implementation
		 * given the implementation rowId
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZImplementationFunctionRowId: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {number | undefined}
			 */
			function findFunctionId( rowId ) {
				const functionRef = getters.getRowByKeyPath( [ Constants.Z_IMPLEMENTATION_FUNCTION ], rowId );
				if ( functionRef === undefined ) {
					return undefined;
				}
				return functionRef.id;
			}
			return findFunctionId;
		},

		/**
		 * Returns the terminal function Zid of the target function of an implementation
		 * given the implementation rowId
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZImplementationFunctionZid: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {string | undefined}
			 */
			function findFunctionZid( rowId ) {
				const functionRowId = getters.getZImplementationFunctionRowId( rowId );
				return functionRowId ? getters.getZReferenceTerminalValue( functionRowId ) : undefined;
			}
			return findFunctionZid;
		},

		/**
		 * Returns the type of implementation selected for a given
		 * implmentation rowId. The type is what of all mutually exclusive
		 * keys is present in the current implementation: Z14K2 (composition),
		 * Z14K3 (code) or Z14K4 (builtin).
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZImplementationContentType: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {string | undefined}
			 */
			function findImplementationType( rowId ) {
				const children = getters.getChildrenByParentRowId( rowId );
				// get all child keys and remove Z1K1 and Z14K1
				const childKeys = children
					.filter( function ( child ) {
						const allowedKeys = [
							Constants.Z_IMPLEMENTATION_CODE,
							Constants.Z_IMPLEMENTATION_COMPOSITION,
							Constants.Z_IMPLEMENTATION_BUILT_IN
						];
						return ( allowedKeys.includes( child.key ) ) && ( child.value !== undefined );
					} )
					.map( function ( child ) {
						return child.key;
					} );
				// childKeys should only have one element after the filtering
				return ( childKeys.length === 1 ) ? childKeys[ 0 ] : undefined;
			}
			return findImplementationType;
		},

		/**
		 * Returns the rowId for the implementation content given
		 * an implementation rowId and the type of content defined
		 * by its key (Z14K2 for composition and Z14K3 for code)
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZImplementationContentRowId: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @param {string} key
			 * @return {number | undefined}
			 */
			function findImplementationContent( rowId, key ) {
				const row = getters.getRowByKeyPath( [ key ], rowId );
				return row ? row.id : undefined;
			}
			return findImplementationContent;
		},

		/**
		 * Returns the terminal value of Z16K1
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZCodeString: function ( state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {string | undefined}
			 */
			function findZCode( rowId ) {
				const codeRow = getters.getRowByKeyPath( [ Constants.Z_CODE_CODE ], rowId );
				return codeRow ? getters.getZStringTerminalValue( codeRow.id ) : undefined;
			}
			return findZCode;
		},

		/**
		 * Returns the row of a Z16/Code programming language key (Z16K1)
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZCodeProgrammingLanguageRow: function ( state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {Row | undefined}
			 */
			function findZCodeLanguage( rowId ) {
				const langRow = getters.getRowByKeyPath( [
					Constants.Z_CODE_LANGUAGE
				], rowId );
				return langRow;
			}
			return findZCodeLanguage;
		},

		/**
		 * Returns the terminal reference Value of Z40K1
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZBooleanValue: function ( state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {string | undefined}
			 */
			function findZBooleanValue( rowId ) {
				const booleanRow = getters.getRowByKeyPath( [ Constants.Z_BOOLEAN_IDENTITY ], rowId );

				if ( !booleanRow ) {
					return;
				}

				return getters.getZReferenceTerminalValue( booleanRow.id );
			}
			return findZBooleanValue;
		},

		/**
		 * Returns the string or object representation for the type of the
		 * ZObject represented in the rowId passed as parameter. Returns
		 * undefined if no valid type is present.
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZObjectTypeByRowId: function ( state, getters ) {
			/**
			 * @param {Row} typeRow
			 * @return {string | Object | undefined} type
			 */
			function getTypeRepresentation( typeRow ) {
				// If undefined, return undefined
				if ( !typeRow ) {
					return undefined;
				}
				// If typeRow is Terminal, return its value
				if ( typeRow.isTerminal() ) {
					return typeRow.value;
				}
				// If typeRow is NOT Terminal, return the canonical representation
				return hybridToCanonical( getters.getZObjectAsJsonById( typeRow.id ) );
			}

			/**
			 * @param {number} id
			 * @return {string | Object | undefined} type
			 */
			function findZObjectTypeById( id ) {
				const row = getters.getRowById( id );

				// 1. If rowId doesn't exist return undefined
				if ( !row || row.id === row.parent ) {
					return undefined;
				}

				// 2. If the row is TERMINAL it's either a string or reference value
				if ( row.isTerminal() ) {
					return ( row.key === Constants.Z_REFERENCE_ID ) ?
						Constants.Z_REFERENCE :
						Constants.Z_STRING;
				}

				// 3. If the row is an ARRAY, we return the full typed list function call
				let type;
				if ( row.isArray() ) {
					const itemTypeRow = getters.getRowByKeyPath( [ '0' ], row.id );
					const itemType = getTypeRepresentation( itemTypeRow );
					type = {
						[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
						[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_LIST,
						[ Constants.Z_TYPED_LIST_TYPE ]: itemType || ''
					};
					return type;
				}

				// 4. If the row is an OBJECT we get its Z1K1 and return its representation
				const typeRow = getters.getRowByKeyPath( [ Constants.Z_OBJECT_TYPE ], id );
				return getTypeRepresentation( typeRow );
			}

			return findZObjectTypeById;
		},

		/**
		 * Returns the item type of a typed list given the parent
		 * rowId of the list object
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getTypedListItemType: function ( state, getters ) {
			/**
			 * @param {number} parentRowId
			 * @return {string|Object|undefined}
			 */
			function findTypedListItemType( parentRowId ) {
				const listType = getters.getZObjectTypeByRowId( parentRowId );
				if ( !listType ) {
					return undefined;
				}
				return listType[ Constants.Z_TYPED_LIST_TYPE ];
			}
			return findTypedListItemType;
		},

		/**
		 * Returns a particular key-value in the Metadata object given
		 * the Metadata object rowId and a string key. Returns undefined
		 * if nothing is found under the given key.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getMapValueByKey: function ( _state, getters ) {
			/**
			 * @param {string} rowId
			 * @param {string} key
			 * @return {Row|undefined}
			 */
			function findMapValue( rowId, key ) {
				const listRow = getters.getRowByKeyPath( [ Constants.Z_TYPED_OBJECT_ELEMENT_1 ], rowId );
				if ( !listRow ) {
					return undefined;
				}
				const pairs = getters.getChildrenByParentRowId( listRow.id ).slice( 1 );
				for ( const pair of pairs ) {
					const keyRow = getters.getRowByKeyPath( [ Constants.Z_TYPED_OBJECT_ELEMENT_1 ], pair.id );
					if ( !keyRow ) {
						continue;
					}
					const keyString = getters.getZStringTerminalValue( keyRow.id );
					if ( keyString === key ) {
						const valueRow = getters.getRowByKeyPath( [ Constants.Z_TYPED_OBJECT_ELEMENT_2 ], pair.id );
						return valueRow;
					}
				}
				return undefined;
			}
			return findMapValue;
		},

		/**
		 * Returns a row object given its row ID. Note that the row ID is its
		 * parameter row.id and it is different than the indexx
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getRowById: function ( state ) {
			/**
			 * @param {number|undefined} rowId
			 * @return {Row} row
			 */
			function fetchRowId( rowId ) {
				return ( rowId === undefined ) ?
					undefined :
					state.zobject.find( function ( item ) {
						return item.id === rowId;
					} );
			}
			return fetchRowId;
		},

		/**
		 * Returns all the children rows given a parent rowId, else
		 * returns an empty list.
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getChildrenByParentRowId: function ( state ) {
			/**
			 * @param {number} rowId
			 * @param {Array} rows
			 * @return {Array}
			 */
			function fetchChildrenRows( rowId ) {
				return state.zobject.filter( function ( row ) {
					return ( row.parent === rowId );
				} );
			}
			return fetchChildrenRows;
		},

		/**
		 * Return the next available array key or index given an
		 * array parent Id
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getNextArrayIndex: function ( state, getters ) {
			/**
			 * @param {number} parentRowId
			 * @return {number}
			 */
			function fetchNextArrayIndexOfParentRowId( parentRowId ) {
				const children = getters.getChildrenByParentRowId( parentRowId );
				// TODO: should we check that the sequence of children keys is
				// continuous and doesn't have any gaps?
				return children.length;
			}
			return fetchNextArrayIndexOfParentRowId;
		},

		/**
		 * Return the parent rowId of a given rowId
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getParentRowId: function ( state, getters ) {
			/**
			 * @param {number} rowId
			 * @param {number} parent rowId
			 * @return {number}
			 */
			function findParent( rowId ) {
				const row = getters.getRowById( rowId );
				return row ? row.parent : undefined;
			}
			return findParent;
		},

		/**
		 * Given a starting rowId and an array of keys that form a path,
		 * follow that path down and return the resulting row.
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getRowByKeyPath: function ( state, getters ) {
			/**
			 * @param {Array} path sequence of keys that specify a path to follow down the ZObject
			 * @param {number} rowId starting row Id
			 * @return {Row|undefined} resulting row or undefined if not found
			 */
			function followPath( path = [], rowId = 0 ) {
				// End condition, if the path is empty, return the row by rowId
				if ( path.length === 0 ) {
					return getters.getRowById( rowId );
				}

				// Else, follow the sequence of keys by finding the child with
				// the head key and recourse
				const head = path[ 0 ];
				const tail = path.slice( 1 );
				const children = getters.getChildrenByParentRowId( rowId );
				const child = children.find( function ( row ) {
					return ( row.key === head );
				} );

				// Follow the path of keys parting from the child
				return ( child === undefined ) ?
					undefined :
					followPath( tail, child.id );
			}

			return followPath;
		},

		/**
		 * Returns the terminal value of a Z9/Reference or a Z6/String
		 * nested under a sequence of their keys.
		 *
		 * E.g. getZObjectTerminalValue( rowId, Z9K1 ) would return the
		 * terminal value in objects like { Z9K1: { Z9K1: "value" }},
		 * { Z9K1: "value"} or "value"
		 *
		 * This is a generalized method to be called from the specific
		 * methods getZStringTerminalValue or getZReferenceTerminalValue
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZObjectTerminalValue: function ( state, getters ) {
			/**
			 * @param {number} rowId an integer representing an existing rowId
			 * @param {string} terminalKey either string or reference terminal key
			 * @return {string | undefined}
			 */
			function findTerminalValue( rowId, terminalKey ) {
				const row = getters.getRowById( rowId );
				// Row not found is undefined
				if ( row === undefined ) {
					return undefined;
				}
				if ( row.isTerminal() ) {
					if ( terminalKey === Constants.Z_STRING_VALUE ) {
						return row.value;
					} else {
						return row.value ? row.value : undefined;
					}
				} else {
					const valueRow = getters.getRowByKeyPath( [ terminalKey ], row.id );
					return valueRow ?
						findTerminalValue( valueRow.id, terminalKey ) :
						undefined;
				}
			}
			return findTerminalValue;
		},

		/**
		 * Returns the next available rowId
		 *
		 * @param {Object} state
		 * @return {number}
		 */
		getNextRowId: function ( state ) {
			let highestObjectId = 0;

			if ( !state.zobject || state.zobject.length === 0 ) {
				return highestObjectId;
			}

			state.zobject.forEach( function ( item ) {
				if ( item.id > highestObjectId ) {
					highestObjectId = item.id;
				}
			} );

			return highestObjectId + 1;
		},

		/**
		 * Returns whether the rowId is inside an implementation
		 * composition (Z14K2), which will determine whether
		 * we can use argument references in its type selectors.
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		isInsideComposition: function ( state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {boolean}
			 */
			function findCompositionFromRowId( rowId ) {
				const row = getters.getRowById( rowId );
				if ( !row ) {
					// Not found or reached the root, return false and end
					return false;
				}
				return ( row.key === Constants.Z_IMPLEMENTATION_COMPOSITION ) ?
					true :
					findCompositionFromRowId( row.parent );
			}

			return findCompositionFromRowId;
		},

		/**
		 * Returns the list of metadata objects that are stored as
		 * ZMonolingualStrings (E.g. Name or Description) given the
		 * rowId where the content of the ZMulilingualString Value/Z12K1
		 * starts.
		 *
		 * TODO (T336390): Create Metadata class with langZid, langIsoCode
		 * and rowId for all the About widget related methods.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZMultilingualLanguageList: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {Array}
			 */
			function findBestMonolingual( rowId ) {
				const listRow = getters.getRowById( rowId );
				if ( !listRow || !listRow.isArray() ) {
					return [];
				}
				const allMonolinguals = getters.getChildrenByParentRowId( rowId ).slice( 1 );
				const allLanguages = allMonolinguals.map( ( monolingual ) => {
					const langZid = getters.getZMonolingualLangValue( monolingual.id );
					const langIsoCode = getters.getLanguageIsoCodeOfZLang( langZid );
					return {
						langZid,
						langIsoCode,
						rowId: monolingual.id
					};
				} );
				return allLanguages;
			}
			return findBestMonolingual;
		},

		/**
		 * Returns whether we are creating a new page.
		 *
		 * @param {Object} state
		 * @return {boolean}
		 */
		isCreateNewPage: function ( state ) {
			return state.createNewPage;
		},

		/**
		 * Return the JSON representation of a specific zObject and its children
		 * using the zObject id value within the zObject array
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getZObjectAsJsonById: function ( state ) {
			/**
			 * @param {number} id
			 * @param {boolean} isArray
			 * @return {Array} zObjectJson
			 */
			return function ( id, isArray ) {
				return zobjectUtils.convertTableToJson( state.zobject, id, isArray );
			};
		},

		/**
		 * Return the next key of the root ZObject. So if the current object is a Z408
		 * and there are currently 2 keys, it will return Z408K3.
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {string} nextKey
		 */
		getNextKey: function ( state, getters ) {
			const zid = getters.getCurrentZObjectId;
			// eslint-disable-next-line security/detect-non-literal-regexp
			const keyRegex = new RegExp( '^' + zid + 'K([0-9]+)$' );
			const defaultKey = 0;
			const lastKey = Math.max(
				defaultKey,
				...state.zobject.map( function ( item ) {
					const match = item.isTerminal() && item.value.match( keyRegex );
					return match ? parseInt( match[ 1 ], 10 ) : -1;
				} )
			);
			const nextKey = lastKey + 1;
			return zid + 'K' + nextKey;
		},

		/**
		 * Returns whether the root ZObject is initialized
		 *
		 * @param {Object} state
		 * @return {boolean}
		 */
		getZObjectInitialized: function ( state ) {
			return state.ZObjectInitialized;
		},

		/**
		 * Return the index of a zObject by its row ID
		 * for internal use.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getRowIndexById: function ( state ) {
			/**
			 * @param {number} id
			 * @return {number} index
			 */
			return function ( id ) {
				return state.zobject.findIndex( ( item ) => item.id === id );
			};
		},

		/**
		 * Return a deep copy of the current zobject table
		 *
		 * @param {Object} state
		 * @return {Object}
		 */
		getZObjectCopy: function ( state ) {
			// const copy = JSON.parse( JSON.stringify( context.state.zobject ) );
			return state.zobject.map( ( row ) => new Row( row.id, row.key, row.value, row.parent ) );
		},

		/**
		 * Returns whether the key has a Is identity/Z3K4 key set to true,
		 * given the row ID of the key object
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZKeyIsIdentity: function ( _state, getters ) {
			/**
			 * @param {string} zid
			 * @return {boolean}
			 */
			function findZKeyIsIdentity( zid ) {
				const isIdentity = getters.getRowByKeyPath( [ Constants.Z_KEY_IS_IDENTITY ], zid );
				if ( !isIdentity ) {
					return false;
				}

				let boolValue = '';
				const type = getters.getZObjectTypeByRowId( isIdentity.id );
				if ( type === Constants.Z_BOOLEAN ) {
					boolValue = getters.getZBooleanValue( isIdentity.id );
				} else if ( type === Constants.Z_REFERENCE ) {
					boolValue = getters.getZReferenceTerminalValue( isIdentity.id );
				}

				return boolValue === Constants.Z_BOOLEAN_TRUE;
			}
			return findZKeyIsIdentity;
		},

		/**
		 * Retuns the rowId of the key type field given the key rowId
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZKeyTypeRowId: function ( _state, getters ) {
			/**
			 * @param {string} rowId
			 * @return {number | undefined}
			 */
			function findZKeyType( rowId ) {
				const keyType = getters.getRowByKeyPath( [ Constants.Z_KEY_TYPE ], rowId );
				return keyType ? keyType.id : undefined;
			}
			return findZKeyType;
		}
	},
	mutations: {
		/**
		 * This is the most atomic setter. It sets the value
		 * of a given row, given the rowIndex and the value.
		 *
		 * @param {Object} state
		 * @param {Object} payload
		 * @param {number} payload.index
		 * @param {string|undefined} payload.value
		 */
		setValueByRowIndex: function ( state, payload ) {
			const item = state.zobject[ payload.index ];
			item.value = payload.value;
			// Modification of an array item cannot be detected
			// so it's not reactive. That's why we must run splice
			state.zobject.splice( payload.index, 1, item );
		},

		/**
		 * This is the most atomic setter. It sets the key of
		 * a given row, given the rowIndex and the key value.
		 *
		 * @param {Object} state
		 * @param {Object} payload
		 * @param {number} payload.index
		 * @param {string|undefined} payload.key
		 */
		setKeyByRowIndex: function ( state, payload ) {
			const item = state.zobject[ payload.index ];
			item.key = payload.key;
			// Modification of an array item cannot be detected
			// so it's not reactive. That's why we must run splice
			state.zobject.splice( payload.index, 1, item );
		},

		/**
		 * Push a row into the zobject state. The row already
		 * has the necessary IDs and details set, so it is not
		 * necessary to recalculate anything nor look at the
		 * table indices, simply push.
		 *
		 * @param {Object} state
		 * @param {Row} row
		 */
		pushRow: function ( state, row ) {
			// Make sure that all the rows pushed into the state are instances of Row
			if ( row instanceof Row ) {
				state.zobject.push( row );
			} else {
				state.zobject.push( new Row( row.id, row.key, row.value, row.parent ) );
			}
		},

		/**
		 * Set the whole state zobject with an array of Rows
		 * It's used in the initial setup and to restore
		 * the initial state of the object when attaching
		 * or detaching implementations or testers fails.
		 * It's important to always make sure that the
		 * payload is an Array of Row objects.
		 *
		 * @param {Object} state
		 * @param {Row[]} payload
		 */
		setZObject: function ( state, payload ) {
			state.zobject = payload;
		},

		/**
		 * Removes the Row at the given index of the state zobject
		 *
		 * @param {Object} state
		 * @param {number} index
		 */
		removeRowByIndex: function ( state, index ) {
			state.zobject.splice( index, 1 );
		},

		/**
		 * Sets the state flag createNewPage, which reflects
		 * whether we are creating a new page.
		 *
		 * @param {Object} state
		 * @param {boolean} payload
		 */
		setCreateNewPage: function ( state, payload ) {
			state.createNewPage = payload;
		},

		/**
		 * Sets the flag ZObjectInitialized once the
		 * root zobject state has been initialized.
		 *
		 * @param {Object} state
		 * @param {boolean} value
		 */
		setZObjectInitialized: function ( state, value ) {
			state.ZObjectInitialized = value;
		}
	},
	actions: {
		/**
		 * Handles the initization of the pages given the wgWikiLambda config parameters.
		 * The page can be:
		 * 1. A Create New ZObject page, when the flag createNewPage is true-
		 * 2. A Run Function page, when the flag runFunction is true or the
		 *    zid property is empty.
		 * 3. A View or Edit page of a persisted ZObject given its zid.
		 *
		 * @param {Object} context
		 * @return {Promise}
		 */
		initializeView: function ( context ) {
			const editingData = mw.config.get( 'wgWikiLambda' ),
				createNewPage = editingData.createNewPage,
				runFunction = editingData.runFunction,
				zId = editingData.zId;

			// If createNewPage is true, ignore runFunction and any specified ZID.
			if ( createNewPage ) {
				return context.dispatch( 'initializeCreateNewPage' );

			// If runFunction is true, ignore any specified ZID.
			// If no ZID specified, assume runFunction is true.
			} else if ( runFunction || !zId ) {
				return context.dispatch( 'initializeEvaluateFunction' );

			// Else, this is a view or edit page of an existing ZObject, so we
			// fetch the info and set the root ZObject with the persisted data.
			} else {
				return context.dispatch( 'initializeRootZObject', zId );
			}
		},

		/**
		 * Initializes a Evaluate Function Call page, setting the root blank
		 * function call object.
		 *
		 * @param {Object} context
		 */
		initializeEvaluateFunction: function ( context ) {
			// Set current Zid to empty placeholder (Z0)
			context.commit( 'setCurrentZid', Constants.NEW_ZID_PLACEHOLDER );

			// Create root row for the blank object
			const rootRow = new Row( 0, undefined, Constants.ROW_VALUE_OBJECT, undefined );
			context.commit( 'pushRow', rootRow );

			// Set the blank ZObject as a new ZFunctionCall
			context.dispatch( 'changeType', {
				id: 0,
				type: Constants.Z_FUNCTION_CALL
			} );
			context.commit( 'setZObjectInitialized', true );
		},

		/**
		 * Initializes a Create New ZObject page, setting the root blank
		 * persistent object and setting the internal type to a given one, if
		 * provided in the url Zid property.
		 *
		 * @param {Object} context
		 * @return {Promise}
		 */
		initializeCreateNewPage: function ( context ) {
			// Set createNewPage flag to true
			context.commit( 'setCreateNewPage', true );

			// Set current Zid to empty placeholder (Z0)
			context.commit( 'setCurrentZid', Constants.NEW_ZID_PLACEHOLDER );

			// Create root row for the blank object
			const rootRow = new Row( 0, undefined, Constants.ROW_VALUE_OBJECT, undefined );
			context.commit( 'pushRow', rootRow );

			// Set the blank ZObject as a new ZPersistentObject
			return context.dispatch( 'changeType', {
				id: 0,
				type: Constants.Z_PERSISTENTOBJECT
			} ).then( function () {
				// If `zid` url parameter is found, the new ZObject
				// will be of the given type.
				const defaultType = getParameterByName( 'zid' );
				let defaultKeys;

				context.commit( 'setZObjectInitialized', true );

				// No `zid` parameter, return.
				if ( !defaultType || !defaultType.match( /Z[1-9]\d*$/ ) ) {
					return Promise.resolve();
				}

				// Else, fetch `zid` and make sure it's a type
				return context.dispatch( 'fetchZids', { zids: [ defaultType ] } )
					.then( function () {
						const Z2K2 = findKeyInArray( Constants.Z_PERSISTENTOBJECT_VALUE, context.state.zobject );
						defaultKeys = context.getters.getStoredObject( defaultType );

						// If `zid` is not a type, return.
						if ( !defaultKeys ||
							defaultKeys[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_OBJECT_TYPE ] !==
							Constants.Z_TYPE
						) {
							return Promise.resolve();
						}

						// If `zid` is a type, dispatch `changeType` action
						return context.dispatch( 'changeType', {
							id: Z2K2.id,
							type: defaultType
						} );
					} );
			} );
		},

		/**
		 * Initializes a view or edit page of a given zid from a persisted ZObject.
		 * Calls to the wikilambdaload_zobjects API to fetch the root Zobject of the page
		 * with all its unfiltered content (all language labels, etc). This call is done
		 * only once and the method is separate from fetchZids because the logic to
		 * treat the result is extremely different.
		 *
		 * @param {Object} context
		 * @param {string} zId
		 * @return {Promise}
		 */
		initializeRootZObject: function ( context, zId ) {
			// Set current Zid
			context.commit( 'setCurrentZid', zId );
			const revision = getParameterByName( 'oldid' );

			// Calling the API without language parameter so that we get
			// the unfiltered multilingual object
			return apiUtils.fetchZObjects( {
				zids: zId,
				revisions: revision || undefined
			} ).then( ( response ) => {
				const zobject = response[ zId ].data;

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

				// If object is Type/Z4, and on edit mode:
				if ( !context.getters.getViewMode && isTruthyOrEqual( zobject, [
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_OBJECT_TYPE ], Constants.Z_TYPE ) ) {
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
					// 2. Initialize the converters lists (Z4K7, Z4K8)
					const lists = {
						[ Constants.Z_TYPE_DESERIALISERS ]: Constants.Z_DESERIALISER,
						[ Constants.Z_TYPE_SERIALISERS ]: Constants.Z_SERIALISER
					};
					for ( const key in lists ) {
						if ( !isTruthyOrEqual( zobject, [ Constants.Z_PERSISTENTOBJECT_VALUE, key ] ) ) {
							zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ key ] = [ lists[ key ] ];
						}
					}
					// 3. Initialize keys Is identity (Z3K4) field
					const keys = zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_TYPE_KEYS ];
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
				context.commit( 'saveMultilingualDataCopy', zobject );

				// Get all zIds within the object:
				const listOfZIdWithinObject = extractZIDs( zobject );
				context.dispatch( 'fetchZids', { zids: listOfZIdWithinObject } );

				// Convert to rows and set store:
				const zobjectRows = zobjectUtils.convertJsonToTable( zobject );
				context.commit( 'setZObject', zobjectRows );

				// Set initialized as done:
				context.commit( 'setZObjectInitialized', true );
			} );
		},

		/**
		 * Recalculate the internal keys of a ZList in its zobject table representation.
		 * This should be used when an item is removed from a ZList.
		 *
		 * @param {Object} context
		 * @param {number} listRowId
		 */
		recalculateTypedListKeys: function ( context, listRowId ) {
			const children = context.getters.getChildrenByParentRowId( listRowId );

			children.forEach( function ( itemRow, index ) {
				context.commit( 'setKeyByRowIndex', {
					index: context.getters.getRowIndexById( itemRow.id ),
					key: `${ index }`
				} );
			} );
		},

		/**
		 * Recalculate the keys and key values of a ZArgument List.
		 * This should be used when an item is removed from a ZArgument list.
		 *
		 * @param {Object} context
		 * @param {number} listRowId
		 */
		recalculateArgumentKeys: function ( context, listRowId ) {
			const args = context.getters.getChildrenByParentRowId( listRowId ).slice( 1 );

			args.forEach( function ( argRow, index ) {
				const argKeyRow = context.getters.getRowByKeyPath( [
					Constants.Z_ARGUMENT_KEY,
					Constants.Z_STRING_VALUE
				], argRow.id );
				context.commit( 'setValueByRowIndex', {
					index: context.getters.getRowIndexById( argKeyRow.id ),
					value: `${ context.getters.getCurrentZObjectId }K${ index + 1 }`
				} );
			} );
		},

		/**
		 * Remove a specific row given its rowId. This method does NOT remove
		 * the children of the given row.
		 * It also clears whatever errors are associated to this rowId.
		 *
		 * @param {Object} context
		 * @param {number} rowId
		 */
		removeRow: function ( context, rowId ) {
			if ( rowId === null || rowId === undefined ) {
				return;
			}
			const rowIndex = context.getters.getRowIndexById( rowId );
			context.commit( 'removeRowByIndex', rowIndex );
			context.commit( 'clearErrorsForId', rowId );
		},

		/**
		 * Remove all the children rows of a given rowId. It also clears
		 * whatever errors are associated to the children rowIds.
		 *
		 * @param {Object} context
		 * @param {number} rowId
		 */
		removeRowChildren: function ( context, rowId ) {
			if ( ( rowId === undefined ) || ( rowId === null ) ) {
				return;
			}

			const childRows = context.getters.getChildrenByParentRowId( rowId );
			childRows.forEach( ( child ) => {
				// If not terminal, recurse to remove all progenie
				if ( !child.isTerminal() ) {
					context.dispatch( 'removeRowChildren', child.id );
				}
				// Then remove child
				context.dispatch( 'removeRow', child.id );
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
		 */
		lookupZObject: function ( context, payload ) {
			// Add user language code to the payload
			payload.language = context.getters.getUserLangCode;
			return new Promise( ( resolve ) => {
				clearTimeout( debounceZObjectLookup );
				debounceZObjectLookup = setTimeout( () => {
					return apiUtils.searchLabels( payload ).then( ( data ) => {
						return resolve( data );
					} );
				}, DEBOUNCE_ZOBJECT_LOOKUP_TIMEOUT );
			} );
		},

		/**
		 * Set the value of a key.
		 * The value can be a terminal value (string) or it can be an array
		 * or an object. Depending on the kind of value passed, this method will
		 * handle all necessary changes:
		 * 1. Walk down the path passed as payload.keyPath and find the rowId
		 *    from which the changes should be made.
		 * 2. If the row is `undefined`, halt execution
		 * 3. If the value is a terminal value (string), call the setValue action
		 * 4. If the value is more complex, call the injectZObjectFromRowId action,
		 *    which will make sure that all the current children are deleted and
		 *    the necessary rows are inserted at non-colliding ids.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {number} payload.rowId
		 * @param {Array} payload.keyPath
		 * @param {Object|Array|string} payload.value
		 * @return {Promise|void}
		 */
		setValueByRowIdAndPath: function ( context, payload ) {
			// assume this isn't an append unless explicitly stated
			const append = payload.append ? payload.append : false;
			// 1. Find the row that will be parent for the given payload.value
			const row = context.getters.getRowByKeyPath( payload.keyPath, payload.rowId );
			// 2. If the row is `undefined`, halt execution
			// 3. Is the value a string? Call atomic action setValueByRowId
			// 4. Is the value an object or array? Call action inject
			if ( row === undefined ) {
				return;
			} else if ( typeof payload.value === 'string' ) {
				return context.dispatch( 'setValueByRowId', { rowId: row.id, value: payload.value } );
			} else {
				return context.dispatch( 'injectZObjectFromRowId', { rowId: row.id, value: payload.value, append } );
			}
		},

		/**
		 * Sets the argument keys to their initial blank values of a function call given
		 * its rowId when the function ID (Z7K1) changes, and removes the arguments of the
		 * old function id.
		 * Exception: When the function call is the value of a tester result validation (Z20K3)
		 * the first argument should not be added.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {string} payload.parentId
		 * @param {string} payload.functionZid
		 * @return {Promise}
		 */
		setZFunctionCallArguments: function ( context, payload ) {
			const allActions = [];
			let newArgs = [];
			let newKeys = [];

			// 1. Get new argument definitions from payload.functionZid
			if ( payload.functionZid ) {
				newArgs = context.getters.getInputsOfFunctionZid( payload.functionZid );
				newKeys = newArgs.map( ( arg ) => {
					return arg[ Constants.Z_ARGUMENT_KEY ];
				} );
			}

			// 2. Get function call arguments from parentId
			const oldArgs = context.getters.getZFunctionCallArguments( payload.parentId );
			const oldKeys = oldArgs.map( ( arg ) => {
				return arg.key;
			} );

			// 3. For every key of parent: if it's not in new keys, remove it
			oldArgs.forEach( function ( arg ) {
				if ( !newKeys.includes( arg.key ) ) {
					allActions.push( context.dispatch( 'removeRowChildren', arg.id ) );
					allActions.push( context.dispatch( 'removeRow', arg.id ) );
				}
			} );

			// 4. For every key of new arguments: If parent doesn't have it, set it to blank object
			// 4.a. If parent key is a tester validation function, omit the first argument
			const parentRow = context.getters.getRowById( payload.parentId );
			if ( parentRow.key === Constants.Z_TESTER_VALIDATION ) {
				newArgs.shift();
			}

			// 4.b. Initialize all the new function call arguments
			let zids = [];
			newArgs.forEach( function ( arg ) {
				if ( !oldKeys.includes( arg[ Constants.Z_ARGUMENT_KEY ] ) ) {
					const key = arg[ Constants.Z_ARGUMENT_KEY ];
					const value = context.getters.createObjectByType( {
						type: arg[ Constants.Z_ARGUMENT_TYPE ],
						link: true
					} );

					// Asynchronously fetch the necessary zids. We don't need to wait
					// to the fetch call because these will only be needed for labels.
					zids = zids.concat( extractZIDs( { [ key ]: value } ) );
					allActions.push( context.dispatch( 'injectKeyValueFromRowId', {
						rowId: payload.parentId,
						key,
						value
					} ) );
				}
			} );

			// 4.c. Make sure that all the newly added referenced zids are fetched
			zids = [ ...new Set( zids ) ];
			if ( zids.length > 0 ) {
				context.dispatch( 'fetchZids', { zids } );
			}

			return Promise.all( allActions );
		},

		/**
		 * Sets the new implementation key and removes the previous one when changing
		 * an implementation content from code to composition or viceversa. These keys
		 * need to be exclusive and the content for the new key needs to be correctly
		 * initialized with either a ZCode/Z16 object or with a ZFunctionCall/Z7.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {number} payload.parentId
		 * @param {string} payload.key
		 */
		setZImplementationContentType: function ( context, payload ) {
			const allKeys = [
				Constants.Z_IMPLEMENTATION_CODE,
				Constants.Z_IMPLEMENTATION_COMPOSITION,
				Constants.Z_IMPLEMENTATION_BUILT_IN
			];
			// Remove unchecked implementation types
			for ( const key of allKeys ) {
				if ( key !== payload.key ) {
					const keyRow = context.getters.getRowByKeyPath( [ key ], payload.parentId );
					if ( keyRow ) {
						context.dispatch( 'removeRowChildren', keyRow.id );
						context.dispatch( 'removeRow', keyRow.id );
					}
				}
			}
			// Get new implementation content
			const blankType = ( payload.key === Constants.Z_IMPLEMENTATION_CODE ) ?
				Constants.Z_CODE :
				Constants.Z_FUNCTION_CALL;
			const blankObject = context.getters.createObjectByType( { type: blankType } );
			// Add new key-value
			context.dispatch( 'injectKeyValueFromRowId', {
				rowId: payload.parentId,
				key: payload.key,
				value: blankObject
			} );
		},

		/**
		 * Most atomic action to edit the state. Perform the atomic mutation (index, value)
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {number} payload.rowId
		 * @param {Object|Array|string} payload.value
		 */
		setValueByRowId: function ( context, payload ) {
			if ( payload.rowId === undefined || payload.rowId === null ) {
				return;
			}
			context.commit( 'setValueByRowIndex', {
				index: context.getters.getRowIndexById( payload.rowId ),
				value: payload.value
			} );
		},

		/**
		 * Flattens an input ZObject into a table structure and inserts the rows
		 * into the global state. This action makes sure of a few things:
		 * 1. If it's called with a parent row, all the current children will
		 *    be removed, and the new children will be added with non-colliding IDs.
		 *    If the parent row is a list, the flag append will permit adding the new
		 *    value into the existing list items.
		 * 2. If it's called with no parent row, the ZObject will be inserted fully,
		 *    including a root row with parent and key set to undefined.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {number|undefined} payload.rowId parent rowId or undefined if root
		 * @param {Object|Array|string} payload.value ZObject to inject
		 * @param {boolean | undefined} payload.append Flag to append the new object and not remove
		 *        children
		 * @return {Promise}
		 */
		injectZObjectFromRowId: function ( context, payload ) {
			const hasParent = payload.rowId !== undefined;
			const allActions = [];
			let rows;

			if ( hasParent ) {
				let parentRow = context.getters.getRowById( payload.rowId );
				const nextRowId = context.getters.getNextRowId;

				// Convert input payload.value into table rows with parent
				if ( payload.append ) {
					// If we append to a list, calculate the index from which we need to enter the value
					const index = context.getters.getNextArrayIndex( payload.rowId );
					rows = zobjectUtils.convertJsonToTable( payload.value, parentRow, nextRowId, true, index );
				} else {
					rows = zobjectUtils.convertJsonToTable( payload.value, parentRow, nextRowId );
				}

				// Reset the parent value in case it's changed
				parentRow = rows.shift();
				allActions.push( context.dispatch( 'setValueByRowId', {
					rowId: parentRow.id,
					value: parentRow.value
				} ) );

				// Remove all necessary children that are dangling from this parent, if append is not set
				if ( !payload.append ) {
					allActions.push( context.dispatch( 'removeRowChildren', parentRow.id ) );
				}
			} else {
				// Convert input payload.value into table rows with no parent
				rows = zobjectUtils.convertJsonToTable( payload.value );
			}

			// Push all the rows, they already have their required IDs
			rows.forEach( function ( row ) {
				allActions.push( context.commit( 'pushRow', row ) );
			} );

			return Promise.all( allActions );
		},

		/**
		 * Given a key and a JSON object value, transforms into rows and inserts it
		 * under the given parent ID. This method is used to add new keys into an
		 * existing parent object, generally used for function call.
		 * Assumes that the key doesn't exist yet in the zobject table.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {number} payload.rowId
		 * @param {string} payload.key
		 * @param {Object} payload.value
		 */
		injectKeyValueFromRowId: function ( context, payload ) {
			const value = { [ payload.key ]: payload.value };
			const parentRow = context.getters.getRowById( payload.rowId );
			const nextRowId = context.getters.getNextRowId;
			const rows = zobjectUtils.convertJsonToTable( value, parentRow, nextRowId, false, 0, false );

			rows.forEach( function ( row ) {
				context.commit( 'pushRow', row );
			} );
		},

		/**
		 * Pushes a list of values into an existing list parent rowId
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {number} payload.rowId list rowId
		 * @param {Array} payload.values array of values to insert into the array
		 */
		pushValuesToList: function ( context, payload ) {
			const parentRow = context.getters.getRowById( payload.rowId );
			// rowId is not valid
			if ( !parentRow || parentRow.value !== Constants.ROW_VALUE_ARRAY ) {
				return;
			}

			let nextRowId = context.getters.getNextRowId;
			for ( const value of payload.values ) {
				const nextIndex = context.getters.getNextArrayIndex( parentRow.id );
				const rows = zobjectUtils.convertJsonToTable( value, parentRow, nextRowId, true, nextIndex );
				// Discard parentRow
				rows.shift();
				// Push all the object rows
				rows.forEach( ( row ) => context.commit( 'pushRow', row ) );
				// Calculate nextRowId
				const lastRow = rows[ rows.length - 1 ];
				nextRowId = lastRow.id + 1;
			}
		},

		/**
		 * Removes an item from a ZTypedList
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {number} payload.rowId row ID of the item to delete
		 */
		removeItemFromTypedList: function ( context, payload ) {
			const row = context.getters.getRowById( payload.rowId );
			if ( !row ) {
				return;
			}
			const parentRowId = row.parent;
			// remove item
			context.dispatch( 'removeRowChildren', payload.rowId );
			context.dispatch( 'removeRow', payload.rowId );
			// renumber children of parent starting from key
			context.dispatch( 'recalculateTypedListKeys', parentRowId );
		},

		/**
		 * Removes all items from a ZTypedList
		 * This should never be called directly, but is used before submitting a zobject
		 * in which a typed list has changed type, rendering the items invalid
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {number} payload.parentRowId
		 * @param {Array} payload.listItems
		 */
		removeItemsFromTypedList: function ( context, payload ) {
			for ( const itemRowId of payload.listItems ) {
				context.dispatch( 'removeRowChildren', itemRowId );
				context.dispatch( 'removeRow', itemRowId );
			}
			context.dispatch( 'recalculateTypedListKeys', payload.parentRowId );
		},

		/**
		 * Moves an item in a typed list to the given position
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {number} payload.parentRowId
		 * @param {string} payload.key
		 * @param {number} payload.offset
		 */
		moveItemInTypedList: function ( context, payload ) {
			const items = context.getters.getChildrenByParentRowId( payload.parentRowId );

			const movedItem = items.find( ( row ) => row.key === payload.key );
			const newKey = String( parseInt( payload.key ) + payload.offset );
			const displacedItem = items.find( ( row ) => row.key === newKey );

			context.commit( 'setKeyByRowIndex', {
				index: context.getters.getRowIndexById( movedItem.id ),
				key: newKey
			} );
			context.commit( 'setKeyByRowIndex', {
				index: context.getters.getRowIndexById( displacedItem.id ),
				key: payload.key
			} );
		}
	}
};
