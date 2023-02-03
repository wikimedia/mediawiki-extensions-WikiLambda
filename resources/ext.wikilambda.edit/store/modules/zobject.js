/*!
 * WikiLambda Vue editor: ZOBject Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

var Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ).methods,
	zobjectTreeUtils = require( '../../mixins/zobjectTreeUtils.js' ).methods,
	canonicalize = require( '../../mixins/schemata.js' ).methods.canonicalizeZObject,
	getParameterByName = require( '../../mixins/urlUtils.js' ).methods.getParameterByName,
	addZObjects = require( './zobject/addZObjects.js' ),
	currentZObject = require( './zobject/currentZObject.js' ),
	Row = require( '../classes/Row.js' ),
	saveZObject = require( '../../mixins/api.js' ).methods.saveZObject,
	debounceZObjectLookup = null,
	DEBOUNCE_ZOBJECT_LOOKUP_TIMEOUT = 300;

/**
 * Returns whether the object is a reference type from the parent object
 * E.g. "Z1K1: {Z1K1: Z9}"
 *
 * @param {Object} object row of the internal zobject table
 * @param {Object} parentObject row of the internal zobject table
 * @return {boolean}
 */
function isObjectTypeDeclaration( object, parentObject ) {
	var isReference = object.value === Constants.Z_REFERENCE;
	var isObjectType = parentObject.key === Constants.Z_OBJECT_TYPE;

	return isReference && isObjectType;
}

/**
 * Returns whether the value of the function call id (E.g. {Z7K1: Z881}) is
 * a known generic type with a custom component
 *
 * @param {Object} functionCallId object row where key is Z7K1
 * @return {boolean}
 */
function isTypedObjectWithCustomComponent( functionCallId ) {
	var istypedObject = Constants.Z_TYPED_OBJECTS_LIST.indexOf( functionCallId.value ) !== -1;

	return istypedObject;
}

/**
 * Remove implementation and tester from a ZObject
 * The zObject has to be of type function
 *
 * @param {Object} zobject
 * @return {Object} zobject
 */
function unattachImplementationsAndTesters( zobject ) {
	if ( zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_OBJECT_TYPE ] === Constants.Z_FUNCTION
	) {
		zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_TESTERS ] = [ Constants.Z_TESTER ];
		zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_IMPLEMENTATIONS ] =
			[ Constants.Z_IMPLEMENTATION ];
	}

	return zobject;
}

/**
 * Returns whether a given persisted function returns a Type/Z4
 *
 * @param {Object} objectDeclaration persisted function zobject
 * @return {boolean}
 */
function isFunctionToType( objectDeclaration ) {
	if ( objectDeclaration ) {
		var isTypeFunction =
			objectDeclaration[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_OBJECT_TYPE ] === Constants.Z_FUNCTION;
		var returnsAType =
			objectDeclaration[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_RETURN_TYPE ] ===
				Constants.Z_TYPE;

		return isTypeFunction && returnsAType;
	}
}

function getFunctionOutputId( getNestedZObjectById ) {
	return getNestedZObjectById( 0, [
		Constants.Z_PERSISTENTOBJECT_VALUE,
		Constants.Z_FUNCTION_RETURN_TYPE,
		Constants.Z_REFERENCE_ID
	] ).id;
}

function getZImplementationFunctionId( findKeyInArray, context ) {
	const persistentObjectId = findKeyInArray( Constants.Z_PERSISTENTOBJECT_VALUE, context.state.zobject ).id;
	const persistentObject = context.getters.getZObjectChildrenById( persistentObjectId );
	const zImplementationFunction = findKeyInArray(
		[ Constants.Z_REFERENCE_ID, Constants.Z_STRING_VALUE ],
		context.getters.getZObjectChildrenById(
			findKeyInArray( Constants.Z_IMPLEMENTATION_FUNCTION, persistentObject ).id
		)
	);
	return zImplementationFunction.id;
}

function getZTesterFunctionId( findKeyInArray, context ) {
	const persistentObjectId = findKeyInArray( Constants.Z_PERSISTENTOBJECT_VALUE, context.state.zobject ).id;
	const persistentObject = context.getters.getZObjectChildrenById( persistentObjectId );
	const zTesterFunctionId = findKeyInArray( Constants.Z_TESTER_FUNCTION, persistentObject ).id;
	const zReference = context.getters.getZObjectChildrenById( zTesterFunctionId );
	return findKeyInArray( Constants.Z_REFERENCE_ID, zReference ).id;
}

/**
 * Runs actions on the global zobject to make it valid for submission.
 *
 * -Clears empty monolingual string labels.
 * -Canonicalizes the zobject.
 * -Unattaches implementations and testers, if relevant.
 *
 * @param {Object} context
 * @param {boolean} shouldUnattachImplementationAndTester
 * @return {Object} zobject
 */
function transformZObjectForSubmission( context, shouldUnattachImplementationAndTester ) {
	removeEmptyNameLabelValues( context );
	removeEmptyAliasLabelValues( context );

	if ( context.getters.getNestedZObjectById( 0, [
		Constants.Z_PERSISTENTOBJECT_VALUE,
		Constants.Z_FUNCTION_ARGUMENTS ] ) ) {
		removeEmptyArgumentLabelValues( context );
	}

	var zobject = canonicalize( zobjectTreeUtils.convertZObjectTreetoJson( context.state.zobject ) );

	if ( shouldUnattachImplementationAndTester ) {
		zobject = unattachImplementationsAndTesters( zobject );
	}

	return zobject;
}

/**
 * Removes the name label language objects with empty monolingual string values from the global zobject.
 *
 * @param {Object} context
 */
function removeEmptyNameLabelValues( context ) {
	var namesListId = context.getters.getNestedZObjectById( 0, [
		Constants.Z_PERSISTENTOBJECT_LABEL,
		Constants.Z_MULTILINGUALSTRING_VALUE
	] ).id;
	var namesList = context.getters.getAllItemsFromListById( namesListId );

	namesList.forEach( function ( nameListLabel ) {
		var labelString = context.getters.getNestedZObjectById( nameListLabel.id, [
			Constants.Z_MONOLINGUALSTRING_VALUE,
			Constants.Z_STRING_VALUE
		] );
		if ( !labelString.value ) {
			context.dispatch( 'removeZObjectChildren', nameListLabel.id );
			context.dispatch( 'removeZObject', nameListLabel.id );
		}
	} );
	context.dispatch( 'recalculateZListIndex', namesListId );
}

/**
 * Removes the function argument label language objects with empty monolingual string values from the global zobject.
 *
 * @param {Object} context
 */
function removeEmptyArgumentLabelValues( context ) {
	var argumentsList = context.getters.getAllItemsFromListById(
		context.getters.getNestedZObjectById( 0, [
			Constants.Z_PERSISTENTOBJECT_VALUE,
			Constants.Z_FUNCTION_ARGUMENTS
		] ).id );

	argumentsList.forEach( function ( argument ) {
		var argumentLabelArrayId = context.getters.getNestedZObjectById( argument.id, [
			Constants.Z_ARGUMENT_LABEL,
			Constants.Z_MULTILINGUALSTRING_VALUE ] ).id;
		var argumentLabelArray = context.getters.getAllItemsFromListById( argumentLabelArrayId );

		argumentLabelArray.forEach( function ( argumentLabel ) {
			var labelString = context.getters.getNestedZObjectById( argumentLabel.id, [
				Constants.Z_MONOLINGUALSTRING_VALUE,
				Constants.Z_STRING_VALUE
			] );

			if ( !labelString.value ) {
				context.dispatch( 'removeZObjectChildren', argumentLabel.id );
				context.dispatch( 'removeZObject', argumentLabel.id );
			}
		} );

		context.dispatch( 'recalculateZListIndex', argumentLabelArrayId );
	} );
}

/**
 * Removes the alias label language objects with empty monolingual string values from the global zobject.
 *
 * @param {Object} context
 */
function removeEmptyAliasLabelValues( context ) {
	var aliasListId = context.getters.getNestedZObjectById( 0, [
		Constants.Z_PERSISTENTOBJECT_ALIASES,
		Constants.Z_MULTILINGUALSTRINGSET_VALUE
	] ).id;
	var aliasList = context.getters.getAllItemsFromListById( aliasListId );

	aliasList.forEach( function ( alias ) {
		var aliasLabelId = context.getters.getNestedZObjectById( alias.id, [
			Constants.Z_MONOLINGUALSTRINGSET_VALUE ] ).id;
		var aliasLabelArray = context.getters.getAllItemsFromListById( aliasLabelId );

		if ( aliasLabelArray.length === 0 ) {
			context.dispatch( 'removeZObjectChildren', alias.id );
			context.dispatch( 'removeZObject', alias.id );
		} else {
			for ( let index = 0; index < aliasLabelArray.length; index++ ) {
				const aliasLabelItemId = aliasLabelArray[ index ];
				const aliasLabelItemIdItems = context.getters.getZObjectChildrenById( aliasLabelItemId.id );

				if ( aliasLabelItemIdItems.length === 0 ||
					( aliasLabelItemIdItems.length > 1 && !aliasLabelItemIdItems[ 1 ].value )
				) {
					context.dispatch( 'removeZObjectChildren', aliasLabelItemId.id );
					context.dispatch( 'removeZObject', aliasLabelItemId.id );
				}
			}
		}

		context.dispatch( 'recalculateZListIndex', aliasLabelId );
		context.dispatch( 'recalculateZListIndex', aliasListId );
	} );
}

function isNotObjectOrArrayRoot( object ) {
	return [ 'array', 'object' ].indexOf( object.value ) === -1;
}

/**
 * @param {Function} getZObjectChildrenById state getter
 * @param {Array} object
 * @return {Object}
 */
function retrieveFunctionCallFunctionZid( getZObjectChildrenById, object ) {
	var functionCall = typeUtils.findKeyInArray( Constants.Z_FUNCTION_CALL_FUNCTION, object );

	if ( functionCall && functionCall.value === 'object' ) {
		var functionCallObject = getZObjectChildrenById( functionCall.id );
		functionCall = typeUtils.findKeyInArray( Constants.Z_REFERENCE_ID, functionCallObject );
	}

	return functionCall;
}

function generateZIDListFromObjectTree( objectTree ) {
	let keysOrZids = new Set();
	objectTree.forEach( function ( row ) {
		keysOrZids.add( row.value );
		if ( row.key !== undefined ) {
			// We make sure that even integer keys are added as strings
			// otherwise the following pattern match will raise an error
			keysOrZids.add( `${row.key}` );
		}
	} );

	keysOrZids = [ ...keysOrZids ]
		.map( function ( str ) {
			// If it matches Zid or Zkey, return Zid part, else false
			const matches = str.match( /^(Z[1-9]\d*)(K[1-9]\d*)?$/ );
			return matches ? matches.slice( 1 )[ 0 ] : false;
		} )
		.filter( function ( value ) {
			// Filter false values
			return value;
		} );

	// Return unique values
	return [ ...new Set( keysOrZids ) ];
}

module.exports = exports = {
	modules: {
		addZObjects: addZObjects,
		currentZObject: currentZObject
	},
	state: {
		zobject: [],
		createNewPage: true,
		zobjectMessage: {
			type: 'error',
			text: null
		},
		isSavingZObject: false,
		ZObjectInitialized: false,
		activeLangSelection: '',
		isZObjectDirty: false
	},
	getters: {

		/* NEW GETTERS */

		/***********************************************************************
		 * INTERFACE METHODS
		 *
		 * These are the methods that will be commonly used from the components.
		 * These methods should never return internal structure of the zobject
		 * table. The only internal information they may return are row IDs so
		 * that they can pass them onto their child components.
		 ***********************************************************************/

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

		/************************************************************
		 * INTERFACE METHODS FOR TYPES
		 ************************************************************/

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
		 * Returns the terminal value of Z11K2
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

		getZCodeLanguage: function ( state, getters ) {
			function findZCodeValue( rowId ) {
				return getters.getRowByKeyPath( [
					Constants.Z_CODE_LANGUAGE,
					Constants.Z_PROGRAMMING_LANGUAGE_CODE
				], rowId );
			}
			return findZCodeValue;
		},

		/**
		 * Returns the terminal value of Z16K1
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZCode: function ( state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {string | undefined} rowId
			 */
			function findZCode( rowId ) {
				return getters.getRowByKeyPath( [ Constants.Z_CODE_CODE ], rowId );
			}
			return findZCode;
		},

		getZComposition: function ( state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {string | undefined} rowId
			 */
			function findZComposition( rowId ) {
				return getters.getRowByKeyPath( [ Constants.Z_IMPLEMENTATION_COMPOSITION ], rowId );
			}
			return findZComposition;
		},

		getZCodeId: function ( state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {string | undefined} rowId
			 */
			function findZCode( rowId ) {
				return getters.getRowByKeyPath( [ Constants.Z_IMPLEMENTATION_CODE ], rowId );
			}
			return findZCode;
		},

		getZCodeFunction: function ( state, getters ) {
			function findZFunction( rowId ) {
				const functionRow = getters.getRowByKeyPath( [ Constants.Z_IMPLEMENTATION_FUNCTION ], rowId );
				return getters.getZReferenceTerminalValue( functionRow.id );
			}

			return findZFunction;
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
				return getters.getZReferenceTerminalValue( booleanRow.id );
			}
			return findZBooleanValue;
		},

		/**
		 * Returns the string representation for the type of the ZObject
		 * represented by the value of the rowId passed as parameter
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZObjectTypeByRowId: function ( state, getters ) {
			/**
			 * @param {number} id
			 * @return {string | undefined} type
			 */
			function findZObjectTypeById( id ) {

				const row = getters.getRowById( id );

				// Three end conditions:
				// 1. If id (row Id) doesn't exist and returns undefined
				if ( !row || row.id === row.parent ) {
					return undefined;
				}

				// 2. If the row is TERMINAL it's either a string or reference value
				if ( row.isTerminal() ) {
					return ( row.key === Constants.Z_REFERENCE_ID ) ?
						Constants.Z_REFERENCE :
						Constants.Z_STRING;
				}

				// 3. If the row is an ARRAY, we return typed list
				if ( row.isArray() ) {
					return Constants.Z_TYPED_LIST;
				}

				// If it's an object we get its Z1K1 and analyze it:
				// E.g. from { Z1K1: Z9 } the type is Z9
				// E.g. from { Z1K1: Z7, Z7K1: Z881 } the type is Z7
				// E.g. from { Z1K1: { Z1K1: Z9, Z9K1: Z7 } } the type is Z7
				// But
				// E.g. from { Z1K1: { Z1K1: Z9, Z9K1: Z2 } } the type is Z2
				// E.g. from { Z1K1: { Z1K1: Z7, Z7K1: Z881 ... } } the type is Z881
				const typeRow = getters.getRowByKeyPath( [ Constants.Z_OBJECT_TYPE ], id );
				if ( !typeRow ) {
					// Return if undefined
					return undefined;
				}

				// If typeRow is Terminal, return its value
				// E.g. { Z1K1: Z9 }, return Z9
				// E.g. { Z1K1: Z7, Z7K1: Z881 }, return Z7
				if ( typeRow.isTerminal() ) {
					return typeRow.value;
				}

				// If typeRow is NOT Terminal, return the value of its type
				// E.g. from { Z1K1: { Z1K1: Z9, Z9K1: Z7 } } the type is Z7
				// A type can be expressed in different modes:
				// We need a method that, similarly to getReferenceValue, it gets ObjectTypeValue
				// This method will know where to look depending on the mode
				// * Literal: { Z1K1: Z4, Z4K1: Z10000 ... }
				// * Resolvers:
				//   * Reference { Z1K1: Z9, Z9K1: Z10000 }
				//   * Function call { Z1K1: Z7, Z7K1: Z881, ... }
				//   * Argument reference { Z1K1: Z18, Z18K1: "K1" }
				return getters.getZTypeStringRepresentation( typeRow.id );
			}

			return findZObjectTypeById;
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
				return ( row.parent === undefined ) ?
					depth :
					findDepth( row.parent, depth + 1 );
			}
			return findDepth;
		},

		/******************************************************************
		 * INTERNAL METHODS
		 *
		 * Should not be called from components. If we observe the need
		 * of calling these from a component probably needs we need another
		 * interface method that wraps it.
		 ******************************************************************/

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
				return row.parent;
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
			 * @return {Row} resulting row
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
					return row.value ?
						row.value :
						undefined;
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

			if ( state.zobject.length === 0 ) {
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
		 * TODO: add unit tests
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
				if ( rowId ) {
					// Zero or undefined, return false and end
					return false;
				}
				const row = getters.getRowById( rowId );
				return ( row.key === Constants.Z_IMPLEMENTATION_COMPOSITION ) ?
					true :
					findCompositionFromRowId( row.parent );
			}

			return findCompositionFromRowId;
		},

		/**
		 * Returns the string representation of a type found
		 * at the given rowID
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZTypeStringRepresentation: function ( state, getters ) {

			/**
			 * @param {number} rowId
			 * @return {string | undefined}
			 */
			function findZTypeTerminalValue( rowId ) {
				// rowId points at a row where the key is Z1K1 and the
				// value is an object that must resolve to a type.
				//
				// This type object can have different shapes (modes).
				// We need a method that, similarly to getReferenceValue,
				// it returns a string value that identifies the type.
				// This method will know where to look depending on the mode:
				//
				// * Literal: { Z1K1: Z4, Z4K1: Z10000 ... }
				// * Literal: { Z1K1: {Z1K1: Z9, Z9K1: Z4}, Z4K1: {Z1K1: Z6, Z6K1: Z10000}... }
				// * Resolvers:
				// ** Reference { Z1K1: Z9, Z9K1: Z10000 }
				// ** Function call { Z1K1: Z7, Z7K1: Z881, ... }
				// ** Argument reference { Z1K1: Z18, Z18K1: "K1" }

				const typeRow = getters.getRowByKeyPath( [ Constants.Z_OBJECT_TYPE ], rowId );

				// If it's terminal, it's a reference, return value of Z9K1
				if ( typeRow.isTerminal() ) {
					return getters.getZReferenceTerminalValue( rowId );
				}

				// If it's not terminal, get the value of Z1K1.Z9K1 to find the mode
				let type;
				const mode = getters.getZReferenceTerminalValue( typeRow.id );

				switch ( mode ) {
					case Constants.Z_TYPE:
						type = getters.getRowByKeyPath( [
							Constants.Z_TYPE_IDENTITY,
							Constants.Z_STRING_VALUE
						], rowId );
						break;

					case Constants.Z_FUNCTION_CALL:
						// FIXME account for a Z_FUNCTION_CALL key containing a literal
						// function or any other resolver, not only references.
						type = getters.getRowByKeyPath( [
							Constants.Z_FUNCTION_CALL,
							Constants.Z_REFERENCE_ID
						], rowId );
						break;

					case Constants.Z_ARGUMENT_REFERENCE:
						type = getters.getRowByKeyPath( [
							Constants.Z_ARGUMENT_REFERENCE,
							Constants.Z_STRING
						], rowId );
						break;

					default:
						type = undefined;
				}

				return type ?
					type.value :
					undefined;
			}

			return findZTypeTerminalValue;
		},

		/* END NEW GETTERS */

		getActiveLangSelection: function ( state ) {
			return state.activeLangSelection;
		},
		getZObjectLabels: function ( state, getters ) {
			return getters.getZObjectChildrenById( getters.getNestedZObjectById( 0, [
				Constants.Z_PERSISTENTOBJECT_LABEL,
				Constants.Z_MULTILINGUALSTRING_VALUE
			] ).id );
		},
		getZObjectLabel: function ( state, getters ) {
			return function ( zLanguage ) {
				var labelObject,
					label = false,
					lang = zLanguage || getters.getCurrentZLanguage;

				for ( var index in getters.getZObjectLabels ) {
					var maybeLabel = getters.getZObjectLabels[ index ],
						language = getters.getNestedZObjectById( maybeLabel.id, [
							Constants.Z_MONOLINGUALSTRING_LANGUAGE,
							Constants.Z_REFERENCE_ID
						] );

					if ( language.value === lang ) {
						labelObject = maybeLabel;
					}
				}

				if ( labelObject ) {
					label = getters.getNestedZObjectById( labelObject.id, [
						Constants.Z_MONOLINGUALSTRING_VALUE,
						Constants.Z_STRING_VALUE
					] );
				}

				return label;
			};
		},
		getIsSavingObject: function ( state ) {
			return state.isSavingZObject;
		},
		isCreateNewPage: function ( state ) {
			return state.createNewPage;
		},
		getZObjectMessage: function ( state ) {
			return state.zobjectMessage;
		},
		getZObjectById: function ( state ) {
			/**
			 * Return a specific zObject given its ID.
			 *
			 * @param {number} id
			 * @return {Row} zObjectItem
			 */
			return function ( id ) {
				return state.zobject.filter( function ( item ) {
					return item.id === id;
				} )[ 0 ];
			};
		},
		getNestedZObjectById: function ( state, getters ) {
			/**
			 * Return a specific zObject given a series of keys.
			 *
			 * @param {number} id
			 * @param {Array} keys
			 * @return {Object} zObjectItem
			 */
			return function ( id, keys ) {
				var list = getters.getZObjectChildrenById( id ),
					res;

				for ( var k = 0; k < keys.length; k++ ) {
					var key = keys[ k ];
					res = typeUtils.findKeyInArray( key, list );

					if ( res && k !== keys.length ) {
						list = getters.getZObjectChildrenById( res.id );
					} else {
						break;
					}
				}

				return res;
			};
		},
		getZObjectIndexById: function ( state ) {
			/**
			 * Return the index of a zObject by its ID. This is mainly used by actions.
			 *
			 * @param {number} id
			 * @return {number} index
			 */
			return function ( id ) {
				return state.zobject.findIndex( ( item ) => item.id === id );
			};
		},
		getZObjectChildrenById: function ( state, getters ) {
			/**
			 * Return the children of a specific zObject by its ID. The return is in zObjectTree array form.
			 * This method is desinged to return just ONE level of Depth.
			 * This will support development of small reusable components
			 * If language is passed, the language zid and object will be returned as a property
			 *
			 * @param {number} parentId
			 * @param {string} language
			 * @param {string} parentType
			 * @return {Array} zObjectTree
			 */
			return function ( parentId, language, parentType ) {
				if ( parentId === undefined ) {
					return [];
				}

				var childrenObjects = [];

				for ( var zobject in state.zobject ) {

					var objectProps = state.zobject[ zobject ];
					// if parentType is passed, ensure parentType matches the value of the zobject
					if ( parentType && objectProps.id === parentId && objectProps.value !== parentType ) {
						break;
					}

					if ( objectProps.parent === parentId ) {
						const childObject = new Row(
							objectProps.id,
							objectProps.key,
							objectProps.value,
							objectProps.parent
						);
						// FIXME: why are row.language and row.languageString necessary?
						if ( language ) {
							childObject.language = language;
							childObject.languageString = getters.getNestedZObjectById(
								objectProps.id,
								[ Constants.Z_STRING_VALUE ]
							);
						}
						childrenObjects.push( childObject );
					}
				}

				return childrenObjects;
			};
		},
		getAllItemsFromListById: function ( state, getters ) {
			/**
			 * Return the children of a specific zObject by its ID. The return is in zObjectTree array form.
			 * This method is desinged to return just ONE level of Depth.
			 * This will support development of small reusable components
			 * If language is passed, the language zid and object will be returned as a property
			 *
			 * @param {number} parentId
			 * @param {string} language
			 * @return {Array} zObjectTree
			 */
			return function ( parentId, language ) {
				var childrenObjects = getters.getZObjectChildrenById( parentId, language, 'array' );
				// Remove first item in array which denotes the type of the list
				if ( childrenObjects.length > 0 ) {
					childrenObjects.shift();
				}

				return childrenObjects;
			};
		},
		getListTypeById: function ( state ) {
			/**
			 * Return the type of children of a specific zObject(typedlist) by its ID
			 *
			 * @param {number} parentId
			 * @return {Object}
			 */
			return function ( parentId ) {
				let childrenType = {};

				if ( parentId ) {
					for ( const zobject in state.zobject ) {
						const objectProps = state.zobject[ zobject ];

						if ( objectProps.parent === parentId ) {
							childrenType = objectProps;
							break;
						}
					}
				}

				return childrenType;
			};
		},
		getZObjectChildrenByIdRecursively: function ( state ) {
			/**
			 * Return the children of a specific zObject by its ID. The return is in zObjectTree array form.
			 * This method is desinged to return just ONE level of Depth.
			 * This will support development of small reusable components
			 *
			 * @param {number} parentId
			 * @return {Array} zObjectTree
			 */
			return function ( parentId ) {
				if ( parentId === undefined ) {
					return [];
				}

				function filterObjectByParentId( items, id ) {
					var result = items.filter( function ( item ) {
						return item.parent === id;
					} );

					result.forEach( function ( child ) {
						if ( child.isTerminal() ) {
							return;
						}

						var nestedResut = filterObjectByParentId( items, child.id );
						result = result.concat( nestedResut );
					} );

					return result;
				}
				return filterObjectByParentId( state.zobject, parentId );
			};
		},
		getZObjectTypeById: function ( state, getters ) {
			/**
			 * Return the type of a specific zObject by its ID.
			 * If the type cannot be found it will return undefined
			 *
			 * TODO: Deprecate in favor of getZObjectTypeByRowId
			 *
			 * @param {number} id
			 * @return {string | undefined} type
			 */
			function findZObjectTypeById( id ) {
				var type,
					currentObject = getters.getZObjectById( id ),
					children = [];

				// If id (row Id) doesn't exist and returns undefined
				// FIXME: If the id is the same as the parent it returns undefined ????
				if ( !currentObject || currentObject.id === currentObject.parent ) {
					return undefined;
				}

				// If the row is TERMINAL, we return the value if the key is Z1K1, else undefined
				if ( currentObject.isTerminal() ) {
					return ( currentObject.key === Constants.Z_OBJECT_TYPE ) ?
						currentObject.value :
						undefined;
				}

				// Checks the value
				switch ( currentObject.value ) {

					// If the value is NON TERMINAL and it's an array, returns typed list
					case 'array':
						type = Constants.Z_TYPED_LIST;
						break;

					// If the value is NON TERMINA and it's an object...
					case 'object':
						children = getters.getZObjectChildrenById( id );
						var objectType = typeUtils.findKeyInArray( Constants.Z_OBJECT_TYPE, children ),
							referenceId = typeUtils.findKeyInArray( Constants.Z_REFERENCE_ID, children ),
							functionCallFunctionZid =
								retrieveFunctionCallFunctionZid( getters.getZObjectChildrenById, children ),
							objectTypeFunctionCallFunctionZid =
								retrieveFunctionCallFunctionZid(
									getters.getZObjectChildrenById, getters.getZObjectChildrenById( objectType.id ) );
						if ( isObjectTypeDeclaration( objectType, currentObject ) ) {
							type = referenceId.value;
						} else if ( isTypedObjectWithCustomComponent( objectTypeFunctionCallFunctionZid ) ) {
							type = objectTypeFunctionCallFunctionZid.value;
						} else if (
							functionCallFunctionZid &&
								isFunctionToType( getters.getZkeys[ functionCallFunctionZid.value ] ) ) {
							type = Constants.Z_FUNCTION_CALL_TO_TYPE;
						} else if ( isNotObjectOrArrayRoot( objectType ) ) {
							type = objectType.value;
						} else {
							type = findZObjectTypeById( objectType.id );
						}
						break;

					// FIXME If the value is TERMINAL, it returns undefined, unless it was an empty string ???
					default:
						type = undefined;
						break;
				}
				return type;
			}

			return findZObjectTypeById;
		},
		getZObjectAsJsonById: function ( state ) {
			/**
			 * Return the JSON representation of a specific zObject and its children
			 * using the zObject id value within the zObject array
			 *
			 * @param {number} id
			 * @param {boolean} isArray
			 * @return {Array} zObjectJson
			 */
			return function ( id, isArray ) {
				return zobjectTreeUtils.convertZObjectTreetoJson( state.zobject, id, isArray );
			};
		},
		/**
		 * Return the next key of the root ZObject. So if the current object is a Z1008
		 * and there are currently 2 keys, it will return Z1008K3
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {string} nextKey
		 */
		getNextKey: function ( state, getters ) {
			var zid = getters.getCurrentZObjectId,
				nextKey = zobjectTreeUtils.findLatestKey( state.zobject, zid ) + 1;

			return zid + 'K' + nextKey;
		},
		getLatestObjectIndex: function ( state ) {
			/**
			 * Return the index of a given ZID.
			 *
			 * @param {string} zid
			 * @return {number} number
			 */
			return function ( zid ) {
				return zobjectTreeUtils.findLatestKey( state.zobject, zid );
			};
		},
		/**
		 * Return the nextId within the Zobject tree. This is required when adding
		 * complex (nested) object within the tree
		 *
		 * @param {Object} state
		 * @return {string} nextId
		 */
		getNextObjectId: function ( state ) {
			return zobjectTreeUtils.getNextObjectId( state.zobject );
		},
		getZObjectInitialized: function ( state ) {
			return state.ZObjectInitialized;
		},
		getAttachedZTesters: function ( state, getters ) {
			/**
			 * Returns ZIDs for testers attached to the function with the given local ID.
			 * Note that this returns a raw array, not a canonical ZList.
			 *
			 * @param {string} functionId
			 * @return {Array}
			 */
			// TODO(T314928): This should be a simple lookup after data layer refactoring
			// ex: zObject.get( Constants.Z_FUNCTION_TESTERS );
			return function ( functionId ) {
				var attachedTesters = [];

				const zTesterListId = getters.getNestedZObjectById(
					functionId, [
						Constants.Z_PERSISTENTOBJECT_VALUE,
						Constants.Z_FUNCTION_TESTERS
					] ).id;
				const zTesterList = getters.getZObjectChildrenById( zTesterListId );
				// remove the list type (we want to return a raw array, not a canonical ZList)
				zTesterList.shift();

				for ( var zid in zTesterList ) {
					const testerZId = getters.getNestedZObjectById(
						zTesterList[ zid ].id, [
							Constants.Z_REFERENCE_ID
						] ).value;
					attachedTesters.push( testerZId );
				}

				return attachedTesters;
			};
		},
		getAttachedZImplementations: function ( state, getters ) {
			/**
			 * Returns ZIDs for implementations attached to the function with the given local ID.
			 * Note that this returns a raw array, not a canonical ZList.
			 *
			 * @param {string} functionId
			 * @return {Array}
			 */
			// TODO(T314928): This should be a simple lookup after data layer refactoring
			// ex: zObject.get( Constants.Z_FUNCTION_IMPLEMENTATIONS );
			return function ( functionId ) {
				var attachedImplementations = [];

				const zImplementationListId = getters.getNestedZObjectById(
					functionId, [
						Constants.Z_PERSISTENTOBJECT_VALUE,
						Constants.Z_FUNCTION_IMPLEMENTATIONS
					] ).id;
				const zImplementationList = getters.getZObjectChildrenById( zImplementationListId );
				// remove the list type (we want to return a raw array, not a canonical ZList)
				zImplementationList.shift();

				for ( var zid in zImplementationList ) {
					const implementationZId = getters.getNestedZObjectById(
						zImplementationList[ zid ].id, [
							Constants.Z_REFERENCE_ID
						] ).value;
					attachedImplementations.push( implementationZId );
				}

				return attachedImplementations;
			};
		},
		getIsZObjectDirty: function ( state ) {
			return state.isZObjectDirty;
		}
	},
	mutations: {

		/* NEW MUTATIONS */

		/**
		 * This is the most atomic setter. It sets the value
		 * of a given row, given the rowIndex and the value.
		 *
		 * @param {Object} state
		 * @param {Object} payload
		 * @param {number} payload.rowIndex
		 * @param {string|undefined} payload.value
		 */
		setValueByRowIndex: function ( state, payload ) {
			const item = state.zobject[ payload.rowIndex ];
			item.value = payload.value;
			// Modification of an array item cannot be detected
			// so it's not reactive. That's why we must run splice
			state.zobject.splice( payload.rowIndex, 1, item );
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
			state.zobject.push( row );
		},

		/* END NEW MUTATIONS */

		/**
		 * TODO: audit this function, we shouldn't be using this
		 * except for the initial setup
		 *
		 * @param {Object} state
		 * @param {Object} payload
		 */
		setZObject: function ( state, payload ) {
			state.zobject = payload;
		},
		setZObjectValue: function ( state, payload ) {
			var item = state.zobject[ payload.index ];
			item.value = payload.value;

			state.zobject.splice( payload.index, 1, item );
		},
		setZObjectKey: function ( state, payload ) {
			var item = state.zobject[ payload.index ];
			item.key = payload.key;

			state.zobject.splice( payload.index, 1, item );
		},
		setZObjectParent: function ( state, payload ) {
			var item = state.zobject[ payload.index ];
			item.parent = payload.parent;

			state.zobject.splice( payload.index, 1, item );
		},
		removeZObject: function ( state, index ) {
			state.zobject.splice( index, 1 );
		},
		addZObject: function ( state, payload ) {
			if ( payload instanceof Row ) {
				state.zobject.push( payload );
			} else {
				state.zobject.push( new Row( payload.id, payload.key, payload.value, payload.parent ) );
			}
		},
		setCreateNewPage: function ( state, payload ) {
			state.createNewPage = payload;
		},
		setMessage: function ( state, payload ) {
			if ( !payload ) {
				payload = {};
			}

			state.zobjectMessage = {
				type: payload.type || 'notice',
				text: payload.text || null
			};
		},
		setZObjectInitialized: function ( state, value ) {
			state.ZObjectInitialized = value;
		},
		setIsSavingZObject: function ( state, payload ) {
			state.isSavingZObject = payload;
		},
		setActiveLangSelection: function ( state, payload ) {
			state.activeLangSelection = payload;
		},
		setIsZObjectDirty: function ( state, value ) {
			state.isZObjectDirty = value;
		}
	},
	actions: {
		/**
		 * Handles the conversion and initization of a zObject.
		 * The Object received by the server is in JSON format, so we convert it
		 * to our Tree structure.
		 *
		 * @param {Object} context
		 * @return {Promise}
		 */
		initializeZObject: function ( context ) {
			var editingData = mw.config.get( 'wgWikiLambda' ),
				createNewPage = editingData.createNewPage,
				evaluateFunctionCall = editingData.evaluateFunctionCall,
				zId = editingData.zId,
				rootObject;

			context.commit( 'setCreateNewPage', createNewPage );

			// If createNewPage is true, ignore evaluateFunctionCall and any specified ZID.
			if ( createNewPage ) {
				context.commit( 'setCurrentZid', Constants.NEW_ZID_PLACEHOLDER );

				rootObject = { id: 0, key: undefined, parent: undefined, value: 'object' };
				context.commit( 'addZObject', rootObject );

				return context.dispatch( 'changeType', {
					id: 0,
					type: Constants.Z_PERSISTENTOBJECT
				} ).then( function () {
					// If `zid` url parameter is found, the new ZObject
					// will be of the given type.
					var defaultType = getParameterByName( 'zid' ),
						defaultKeys;

					context.commit( 'setZObjectInitialized', true );

					// No `zid` parameter, return.
					if ( !defaultType || !defaultType.match( /Z[1-9]\d*$/ ) ) {
						return Promise.resolve();
					}

					// Else, fetch `zid` and make sure it's a type
					return context.dispatch( 'fetchZKeys', { zids: [ defaultType ] } )
						.then( function () {
							var Z2K2 =
								typeUtils.findKeyInArray( Constants.Z_PERSISTENTOBJECT_VALUE, context.state.zobject );
							defaultKeys = context.rootGetters.getZkeys[ defaultType ];

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

			// If evaluateFunctionCall is true, ignore any specified ZID. If no ZID specified, assume
			// evaluateFunctionCall is true.
			} else if ( evaluateFunctionCall || !zId ) {
				context.commit( 'setCurrentZid', Constants.NEW_ZID_PLACEHOLDER );

				rootObject = { id: 0, key: undefined, parent: undefined, value: 'object' };
				context.commit( 'addZObject', rootObject );

				context.dispatch( 'changeType', {
					id: 0,
					type: Constants.Z_FUNCTION_CALL
				} );
				context.commit( 'setZObjectInitialized', true );

			} else {
				context.commit( 'setCurrentZid', zId );

				return context.dispatch( 'initializeRootZObject', zId );
			}
		},
		/**
		 * Call to the wikilambdaload_zobjects API to fetch the root Zobject of the page
		 * with all its unfiltered content (all language labels, etc). This call is done
		 * only once and the method is separate from fetchZKeys because the logic to
		 * treat the result is extremely different.
		 *
		 * @param {Object} context
		 * @param {string} zId
		 * @return {Promise}
		 */
		initializeRootZObject: function ( context, zId ) {
			// Calling the API without language parameter so that we get
			// the unfiltered multilingual object
			const api = new mw.Api();
			return api.get( {
				action: 'query',
				list: 'wikilambdaload_zobjects',
				format: 'json',
				wikilambdaload_zids: zId,
				wikilambdaload_canonical: 'true'
			} ).then( function ( response ) {
				const zobject = response.query.wikilambdaload_zobjects[ zId ].data;

				// Initialize optional aliases key if absent
				if ( !zobject[ Constants.Z_PERSISTENTOBJECT_ALIASES ] ) {
					zobject[ Constants.Z_PERSISTENTOBJECT_ALIASES ] = {
						Z1K1: Constants.Z_MULTILINGUALSTRINGSET,
						Z32K1: [
							Constants.Z_MONOLINGUALSTRINGSET
						]
					};
				}

				const zobjectRows = zobjectTreeUtils.convertZObjectToRows( zobject );

				// Get all zIds within the object.
				// We get main zId again because we previously did not add its labels
				// to the keyLabels object in the store. We will this way take
				// advantage of the backend making language fallback decisions
				let listOfZIdWithinObject = generateZIDListFromObjectTree( zobjectRows );
				listOfZIdWithinObject.push( zId );
				listOfZIdWithinObject = [ ...new Set( listOfZIdWithinObject ) ];

				context.dispatch( 'fetchZKeys', { zids: listOfZIdWithinObject } );
				context.commit( 'setZObject', zobjectRows );
				context.commit( 'setZObjectInitialized', true );
			} );
		},
		/**
		 *
		 * @param {Object} context
		 * @return {boolean}
		 *
		 * Return a boolean indicating if the current Z Object is valid based on type requirements
		 *
		 * Update error store with any errors found while validating
		 */
		validateZObject: function ( context ) {
			const zobjectType = context.getters.getCurrentZObjectType,
				zobject = context.getters.getZObjectAsJson;

			var internalId,
				isValid = true;

			switch ( zobjectType ) {
				case Constants.Z_FUNCTION:
					if ( !context.getters.currentZFunctionHasOutput ) {
						internalId = getFunctionOutputId( context.getters.getNestedZObjectById );
						context.dispatch( 'setError', {
							internalId,
							errorState: true,
							errorMessage: 'wikilambda-missing-function-output-error-message',
							errorType: Constants.errorTypes.ERROR
						} );
						isValid = false;
					}
					return isValid;
				case Constants.Z_IMPLEMENTATION:
					internalId = getZImplementationFunctionId(
						typeUtils.findKeyInArray,
						context
					);
					// invalid if a function hasn't been defined
					if ( !zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][
						Constants.Z_IMPLEMENTATION_FUNCTION ][ Constants.Z_REFERENCE_ID ] ) {
						context.dispatch( 'setError', {
							internalId,
							errorState: true,
							errorMessage: 'wikilambda-zobject-missing-attached-function',
							errorType: Constants.errorTypes.ERROR
						} );
						isValid = false;
					}

					// if implementation type is composition
					if ( zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_IMPLEMENTATION_COMPOSITION ] ) {
						// invalid if composition hasn't been defined
						if ( !zobject[
							Constants.Z_PERSISTENTOBJECT_VALUE
						][
							Constants.Z_IMPLEMENTATION_COMPOSITION
						][
							Constants.Z_FUNCTION_CALL_FUNCTION
						][
							Constants.Z_REFERENCE_ID
						] ) {
							internalId = typeUtils.findKeyInArray(
								Constants.Z_IMPLEMENTATION_COMPOSITION,
								context.state.zobject
							).id;
							context.dispatch( 'setError', {
								internalId,
								errorState: true,
								errorMessage: 'wikilambda-zimplememntation-composition-missing',
								errorType: Constants.errorTypes.ERROR
							} );
							isValid = false;
						}
					}
					// if implementation type is code
					if ( zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_IMPLEMENTATION_CODE ] ) {
						// invalid if no code is defined
						if ( !zobject[
							Constants.Z_PERSISTENTOBJECT_VALUE
						][
							Constants.Z_IMPLEMENTATION_CODE
						][
							Constants.Z_CODE_CODE
						][
							Constants.Z_STRING_VALUE
						] ) {
							internalId = typeUtils.findKeyInArray(
								Constants.Z_IMPLEMENTATION_CODE,
								context.state.zobject
							).id;
							context.dispatch( 'setError', {
								internalId,
								errorState: true,
								errorMessage: 'wikilambda-zimplementation-code-missing',
								errorType: Constants.errorTypes.ERROR
							} );
							isValid = false;
						}
					}
					return isValid;
				case Constants.Z_TESTER:
					// invalid if no function is defined
					if ( !zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][
						Constants.Z_TESTER_FUNCTION ][ Constants.Z_REFERENCE_ID ] ) {
						internalId = getZTesterFunctionId(
							typeUtils.findKeyInArray,
							context
						);
						context.dispatch( 'setError', {
							internalId,
							errorState: true,
							errorMessage: 'wikilambda-zobject-missing-attached-function',
							errorType: Constants.errorTypes.ERROR
						} );
						isValid = false;
					}
					// invalid if no function call is set
					if ( !zobject[
						Constants.Z_PERSISTENTOBJECT_VALUE
					][
						Constants.Z_TESTER_CALL
					][
						Constants.Z_FUNCTION_CALL_FUNCTION
					][
						Constants.Z_REFERENCE_ID
					] ) {
						internalId = typeUtils.findKeyInArray( Constants.Z_TESTER_CALL, context.state.zobject ).id;
						context.dispatch( 'setError', {
							internalId,
							errorState: true,
							errorMessage: 'wikilambda-zobject-missing-attached-function',
							errorType: Constants.errorTypes.ERROR
						} );
						isValid = false;
					}
					// invalid if no result validation is set
					if ( !zobject[
						Constants.Z_PERSISTENTOBJECT_VALUE
					][
						Constants.Z_TESTER_VALIDATION
					][
						Constants.Z_FUNCTION_CALL_FUNCTION
					][
						Constants.Z_REFERENCE_ID
					]
					) {
						internalId = typeUtils.findKeyInArray(
							Constants.Z_TESTER_VALIDATION,
							context.state.zobject
						).id;
						context.dispatch( 'setError', {
							internalId,
							errorState: true,
							errorMessage: 'wikilambda-zobject-missing-attached-function',
							errorType: Constants.errorTypes.ERROR
						} );
						isValid = false;
					}
					return isValid;
				default:
					return isValid;
			}
		},
		/**
		 * Submit a zObject to the api.
		 * The request is handled differently if new or existing object.
		 * Empty labels are removed before submitting.
		 *
		 * @param {Object} context
		 * @param {Object} param
		 * @param {Object} param.summary
		 * @param {boolean} param.shouldUnattachImplementationAndTester
		 * @return {Promise}
		 */
		submitZObject: function ( context, { summary, shouldUnattachImplementationAndTester } ) {
			context.commit( 'setIsSavingZObject', true );

			var zobject = transformZObjectForSubmission( context, shouldUnattachImplementationAndTester );

			// eslint-disable-next-line compat/compat
			return new Promise( function ( resolve, reject ) {
				saveZObject(
					zobject,
					context.getters.isCreateNewPage ? undefined : context.getters.getCurrentZObjectId,
					summary
				).then( function ( result ) {
					context.commit( 'setIsSavingZObject', false );
					return resolve( result.page );
				} ).catch( function ( error ) {
					context.commit( 'setIsSavingZObject', false );

					context.commit( 'setMessage', {
						type: 'error',
						text: error && error.error ? error.error.info : ''
					} );

					return reject( error );
				} );
			} );
		},
		/**
		 * Set the value of the page zObject. This updates the title and set the ZObject value
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 */
		setPageZObjectValue: function ( context, payload ) {

			if ( payload.id === undefined || payload.value === undefined ) {
				return;
			}

			// Update page title
			if ( payload.isMainZObject ) {
				const pageTitleSelector = '#firstHeading .ext-wikilambda-editpage-header-title--function-name';
				$( pageTitleSelector ).first().text( payload.value );
			}

			// TODO(T309723): if renaming a function that had previously had no name,
			// we need to re-add the structure in the form of a typed list

			// Update ZObject value
			context.dispatch( 'setZObjectValue', {
				id: payload.id,
				value: payload.value
			} );
		},
		/**
		 * Set the value of a specific Zobject. This method is called multiple times when adding a nested object.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 */
		setZObjectValue: function ( context, payload ) {
			var objectIndex;

			if ( payload.id === undefined || payload.value === undefined ) {
				return;
			}

			objectIndex = context.getters.getZObjectIndexById( payload.id );
			payload.index = objectIndex;
			context.commit( 'setZObjectValue', payload );
		},
		/**
		 * Set the parent of a specific Zobject.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 */
		setZObjectParent: function ( context, payload ) {
			var objectIndex;
			if ( payload.id === undefined || payload.parent === undefined ) {
				return;
			}
			objectIndex = context.getters.getZObjectIndexById( payload.id );
			payload.index = objectIndex;
			context.commit( 'setZObjectParent', payload );
		},
		/**
		 * Handles the conversion and initization of a zObject.
		 * The Object received by the server is in JSON format, so we convert it
		 * to our Tree structure.
		 *
		 * TODO: Deprecate in favor of injectZObjectFromRowId
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @return {Promise} type
		 */
		injectZObject: function ( context, payload ) {
			context.dispatch( 'injectZObjectFromRowId', {
				rowId: payload.id,
				value: payload.zobject
			} );
		},
		/**
		 * Recalculate the internal keys of a ZList in its zobject table representation.
		 * This should be used when an item is removed from a ZList.
		 *
		 * @param {Object} context
		 * @param {number} zListId
		 */
		recalculateZListIndex: function ( context, zListId ) {
			var zList = context.getters.getZObjectChildrenById( zListId );

			zList.forEach( function ( zObject, index ) {
				context.commit( 'setZObjectKey', {
					index: context.getters.getZObjectIndexById( zObject.id ),
					key: `${index}`
				} );
			} );
		},
		/**
		 * Recalculate the keys and key values of a ZArgument List.
		 * This should be used when an item is removed from a ZArgument list.
		 *
		 * @param {Object} context
		 * @param {number} zListId
		 */
		recalculateZArgumentList: function ( context, zListId ) {
			var zList = context.getters.getAllItemsFromListById( zListId );

			zList.forEach( function ( zObject, index ) {
				var children = context.getters.getZObjectChildrenById( zObject.id );
				var argumentKeyZObject = typeUtils.findKeyInArray( Constants.Z_ARGUMENT_KEY, children );
				var argumentKeyChildren = context.getters.getZObjectChildrenById( argumentKeyZObject.id );
				context.commit( 'setZObjectValue', {
					index: context.getters.getZObjectIndexById( argumentKeyChildren[ 1 ].id ),
					value: `${context.getters.getCurrentZObjectId}K${index + 1}`
				} );
				context.commit( 'setZObjectKey', {
					index: context.getters.getZObjectIndexById( zObject.id ),
					key: `${index}`
				} );
			} );
		},
		/**
		 * Set the programing language for a specific zCode object.
		 * The entry will result in a json representation equal to:
		 * { Z1K1: Z61, Z61K1: payload.value }
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 */
		setZCodeLanguage: function ( context, payload ) {
			context.dispatch( 'injectZObject', {
				zobject: {
					Z1K1: Constants.Z_PROGRAMMING_LANGUAGE,
					Z61K1: payload.value
				},
				key: Constants.Z_CODE_LANGUAGE,
				id: payload.zobject.id,
				parent: payload.zobject.parent
			} );
		},
		/**
		 * Sets the ZCode's code string to a default based on provided values.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @return {Object}
		 */
		initializeZCodeFunction: function ( context, payload ) {
			var zCode = context.getters.getZObjectChildrenById( payload.zCodeId ),
				zCodeString = typeUtils.findKeyInArray(
					Constants.Z_STRING_VALUE,
					context.getters.getZObjectChildrenById(
						typeUtils.findKeyInArray( Constants.Z_CODE_CODE, zCode ).id
					)
				),
				args = Array.isArray( payload.argumentList ) ?
					payload.argumentList.reduce(
						function ( str, argument, index ) {
							if ( index === 0 ) {
								return argument.zid;
							}
							return str + ', ' + argument.zid;
						}, '' ) : '';

			switch ( payload.language ) {
				case 'javascript':
					return context.commit( 'setZObjectValue', {
						index: context.getters.getZObjectIndexById( zCodeString.id ),
						value: 'function ' + payload.functionId + '( ' + args + ' ) {\n\n}'
					} );
				case 'python':
					return context.commit( 'setZObjectValue', {
						index: context.getters.getZObjectIndexById( zCodeString.id ),
						value: 'def ' + payload.functionId + '(' + args + '):\n\t'
					} );
				case 'lua':
					return context.commit( 'setZObjectValue', {
						index: context.getters.getZObjectIndexById( zCodeString.id ),
						value: 'function ' + payload.functionId + '(' + args + ')\n\t\nend'
					} );
				default:
					return context.commit( 'setZObjectValue', {
						index: context.getters.getZObjectIndexById( zCodeString.id ),
						value: ''
					} );
			}
		},
		setZImplementationType: function ( context, payload ) {
			var zobject = context.getters.getZObjectById( payload.zobjectId ),
				zobjectParent = context.getters.getZObjectById( zobject.parent ),
				json = context.getters.getZObjectAsJsonById( payload.zobjectId );

			switch ( payload.mode ) {
				case 'code':
					json[ Constants.Z_IMPLEMENTATION_CODE ] = {
						Z1K1: Constants.Z_CODE,
						Z16K1: {
							Z1K1: Constants.Z_PROGRAMMING_LANGUAGE,
							Z61K1: ''
						},
						Z16K2: ''
					};
					json[ Constants.Z_IMPLEMENTATION_COMPOSITION ] = undefined;
					break;
				case 'composition':
					json[ Constants.Z_IMPLEMENTATION_CODE ] = undefined;
					json[ Constants.Z_IMPLEMENTATION_COMPOSITION ] = {
						Z1K1: Constants.Z_FUNCTION_CALL,
						Z7K1: ''
					};
			}

			context.dispatch( 'injectZObject', {
				zobject: json,
				key: zobjectParent.key,
				id: payload.zobjectId,
				parent: zobjectParent.id
			} );
		},
		/**
		 * Remove a specific zobject. This method does NOT remove its children.
		 *
		 * @param {Object} context
		 * @param {number} objectId
		 */
		removeZObject: function ( context, objectId ) {
			if ( objectId === null || objectId === undefined ) {
				return;
			}
			var objectIndex = context.getters.getZObjectIndexById( objectId );
			context.commit( 'removeZObject', objectIndex );
		},
		/**
		 * Remove all the children of a specific zObject. Useful to clean up existing data.
		 * FIXME: add tests, check that all descendants are removed in objects and arrays
		 *
		 * @param {Object} context
		 * @param {number} rowId
		 */
		removeZObjectChildren: function ( context, rowId ) {
			if ( ( rowId === undefined ) || ( rowId === null ) ) {
				return;
			}

			const childRows = context.getters.getZObjectChildrenById( rowId );
			childRows.forEach( function ( child ) {
				// If not terminal, recurse to remove all progenie
				if ( !child.isTerminal() ) {
					context.dispatch( 'removeZObjectChildren', child.id );
				}
				// Then remove child
				context.dispatch( 'removeZObject', child.id );
			} );
		},

		/**
		 * Add a single entry in the zObject tree.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @return {number} newObjectId
		 */
		addZObject: function ( context, payload ) {
			if ( payload.key === undefined || isNaN( payload.parent ) ) {
				return;
			}
			// we add the value property if not passed in the payload
			if ( !payload.value ) {
				payload.value = undefined;
			}

			payload.id = zobjectTreeUtils.getNextObjectId( context.state.zobject );
			context.commit( 'addZObject', payload );
			return payload.id;
		},

		/**
		 * Add a multiple entry in the zObject tree.
		 *
		 * @param {Object} context
		 * @param {Array} zObjectItems
		 * @return {Array} newObjectIds
		 */
		addZObjects: function ( context, zObjectItems ) {
			var newObjectIds = [];
			zObjectItems.forEach( function ( item ) {
				item.id = zobjectTreeUtils.getNextObjectId( context.state.zobject );
				context.commit( 'addZObject', item );
				newObjectIds.push( item.id );
			} );

			return newObjectIds;
		},

		/**
		 * Reset an object to its initial state
		 *
		 * @param {Object} context Vuex context object
		 * @param {number} zObjectId ZObject ID
		 * @return {Promise}
		 */
		resetZObject: function ( context, zObjectId ) {
			var objectReferenceId = context.getters.getZObjectChildrenById( zObjectId )
					.filter( function ( child ) {
						return child.key === Constants.Z_REFERENCE_ID;
					} )[ 0 ],
				objectType = typeUtils
					.findKeyInArray(
						Constants.Z_OBJECT_TYPE,
						context.getters.getZObjectChildrenById( zObjectId )
					);
			return context.dispatch( 'changeType', {
				id: zObjectId,
				type: ( objectReferenceId || objectType ).value
			} );
		},
		/**
		 * Lookup a ZObject
		 *
		 * @param {Object} context Vuex context object
		 * @param {number} payload Object containing input(string) and type
		 * @return {Promise}
		 */
		lookupZObject: function ( context, payload ) {
			var api = new mw.Api(),
				queryType = 'wikilambdasearch_labels';
			// eslint-disable-next-line compat/compat
			return new Promise( function ( resolve ) {
				clearTimeout( debounceZObjectLookup );
				debounceZObjectLookup = setTimeout( function () {
					return api.get( {
						action: 'query',
						list: queryType,
						wikilambdasearch_search: payload.input,
						wikilambdasearch_type: payload.type,
						wikilambdasearch_return_type: payload.returnType,
						wikilambdasearch_language: context.getters.getZLang
					} ).then( function ( data ) {
						var lookupResults = [];
						if ( ( 'query' in data ) && ( queryType in data.query ) ) {
							lookupResults = data.query[ queryType ];
						}
						return resolve( lookupResults );
					} );
				}, DEBOUNCE_ZOBJECT_LOOKUP_TIMEOUT );
			} );
		},
		/**
		 * Adds the given testers to the given function's list of approved testers, and submits
		 * the change to the API.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {string} payload.functionId - the local ID of the function
		 * @param {Array} payload.testerZIds - the ZIDs of the testers to attach
		 * @return {Promise}
		 */
		attachZTesters: function ( context, payload ) {
			const zObjectCopy = JSON.parse( JSON.stringify( context.state.zobject ) );
			const listId = context.getters.getNestedZObjectById( payload.functionId, [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_TESTERS
			] ).id;
			const currentListLength = context.getters.getZObjectChildrenById( listId ).length;

			const newListItems = [];
			for ( let i = 0; i < payload.testerZIds.length; i++ ) {
				newListItems.push( {
					key: String( currentListLength + i ),
					value: 'object',
					parent: listId
				} );
			}

			return context.dispatch( 'addZObjects', newListItems ).then( ( newListItemIds ) => {
				for ( let i = 0; i < newListItemIds.length; i++ ) {
					context.dispatch( 'addZReference', {
						id: newListItemIds[ i ],
						value: payload.testerZIds[ i ]
					} );
				}

				return context.dispatch( 'submitZObject', '' ).catch( function ( e ) {
					context.commit( 'setZObject', zObjectCopy );
					throw e;
				} );
			} );
		},
		/**
		 * Removes the given testers from the given function's list of approved testers, and submits the
		 * change to the API.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {Object} payload.functionId - the local ID of the function
		 * @param {Array} payload.testerZIds - the ZIDs of the testers to detach
		 * @return {Promise}
		 */
		detachZTesters: function ( context, payload ) {
			const zObjectCopy = JSON.parse( JSON.stringify( context.state.zobject ) );
			const listId = context.getters.getNestedZObjectById(
				payload.functionId, [
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_FUNCTION_TESTERS
				] ).id;
			const listItems = context.getters.getZObjectChildrenById( listId );

			for ( const zid of payload.testerZIds ) {
				const listItemId = listItems.find( ( listItem ) =>
					context.getters.getNestedZObjectById(
						listItem.id,
						[ Constants.Z_REFERENCE_ID ]
					).value === zid
				).id;
				context.dispatch( 'removeZObjectChildren', listItemId );
				context.dispatch( 'removeZObject', listItemId );
			}
			context.dispatch( 'recalculateZListIndex', listId );
			return context.dispatch( 'submitZObject', '' ).catch( function ( e ) {
				context.commit( 'setZObject', zObjectCopy );
				throw e;
			} );
		},
		/**
		 * Adds the given implementations to the given function's list of approved implementations, and submits
		 * the change to the API.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {string} payload.functionId - the local ID of the function
		 * @param {Array} payload.implementationZIds - the ZIDs of the implementations to attach
		 * @return {Promise}
		 */
		attachZImplementations: function ( context, payload ) {
			const zObjectCopy = JSON.parse( JSON.stringify( context.state.zobject ) );
			const listId = context.getters.getNestedZObjectById( payload.functionId, [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_IMPLEMENTATIONS
			] ).id;
			const currentListLength = context.getters.getZObjectChildrenById( listId ).length;

			const newListItems = [];
			for ( let i = 0; i < payload.implementationZIds.length; i++ ) {
				newListItems.push( {
					key: String( currentListLength + i ),
					value: 'object',
					parent: listId
				} );
			}
			return context.dispatch( 'addZObjects', newListItems ).then( ( newListItemIds ) => {
				for ( let i = 0; i < newListItemIds.length; i++ ) {
					context.dispatch( 'addZReference', {
						id: newListItemIds[ i ],
						value: payload.implementationZIds[ i ]
					} );
				}

				return context.dispatch( 'submitZObject', '' ).catch( function ( e ) {
					context.commit( 'setZObject', zObjectCopy );
					throw e;
				} );
			} );
		},
		/**
		 * Removes the given implementations from the given function's list of approved implementations, and submits the
		 * change to the API.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {Object} payload.functionId - the local ID of the function
		 * @param {Array} payload.implementationZIds - the ZIDs of the implementations to detach
		 * @return {Promise}
		 */
		detachZImplementations: function ( context, payload ) {
			const zObjectCopy = JSON.parse( JSON.stringify( context.state.zobject ) );
			const listId = context.getters.getNestedZObjectById(
				payload.functionId, [
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_FUNCTION_IMPLEMENTATIONS
				] ).id;
			const listItems = context.getters.getZObjectChildrenById( listId );

			for ( const zid of payload.implementationZIds ) {
				const listItemId = listItems.find( ( listItem ) =>
					context.getters.getNestedZObjectById(
						listItem.id,
						[ Constants.Z_REFERENCE_ID ]
					).value === zid
				).id;
				context.dispatch( 'removeZObjectChildren', listItemId );
				context.dispatch( 'removeZObject', listItemId );
			}
			context.dispatch( 'recalculateZListIndex', listId );
			return context.dispatch( 'submitZObject', '' ).catch( function ( e ) {
				context.commit( 'setZObject', zObjectCopy );
				throw e;
			} );
		},
		setIsZObjectDirty: function ( context, value ) {
			context.commit( 'setIsZObjectDirty', value );
		},

		/* NEW ACTIONS */

		/**
		 * Set the value of a key.
		 * The value can be a terminal value (string) or it can be an array
		 * or an object. Depending on the kind of value passed, this method will
		 * handle all necessary changes:
		 * 1. Walk down the path passed as payload.keyPath and find the rowId
		 *    from which the changes should be made.
		 * 2. If the value is a terminal value (string), call the setValue action
		 * 3. If the value is more complex, call the injectZObjectFromRowId action,
		 *    which will make sure that all the current children are deleted and
		 *    the necessary rows are inserted at non-colliding ids.
		 *
		 * TODO: Add massive amounts of tests for this
		 *
		 * TODO: All the ubercomplex setters should be replaced with this or
		 * combinations of this.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {number} payload.rowId
		 * @param {Array} payload.keyPath
		 * @param {Object|Array|string} payload.value
		 */
		setValueByRowIdAndPath: function ( context, payload ) {
			// 1. Find the row that will be parent for the given payload.value
			const row = context.getters.getRowByKeyPath( payload.keyPath, payload.rowId );
			// 2. Is the value a string? Call atomic action setValueByRowId
			// 3. Is the value an object or array? Call action inject
			if ( typeof payload.value === 'string' ) {
				context.dispatch( 'setValueByRowId', { rowId: row.id, value: payload.value } );
			} else {
				context.dispatch( 'injectZObjectFromRowId', { rowId: row.id, value: payload.value } );
			}
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
			// FIXME make sure that the getIndex getters is only used in here.
			// Because setValueByRowId is the most atomic of all actions, the
			// following method should not be called from anywhere else. All more
			// complex actions should instead use rowId so that the rowIndex remains
			// a concept only internal to this method. We can then move the
			// getRowIndexByRowId to be an internal function in here so that the
			// index concepts stops being accessible from other modules and components
			function getRowIndexByRowId( rowId ) {
				let index;
				for ( const i in context.state.zobject ) {
					if ( context.state.zobject[ i ].id === rowId ) {
						index = i;
						break;
					}
				}
				return index;
			}

			const rowIndex = getRowIndexByRowId( payload.rowId );
			context.commit( 'setValueByRowIndex', { rowIndex, value: payload.value } );
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
		 */
		injectZObjectFromRowId: function ( context, payload ) {

			let rows;
			const hasParent = payload.rowId !== undefined;

			if ( hasParent ) {
				let parentRow = context.getters.getRowById( payload.rowId );
				const nextRowId = context.getters.getNextRowId;

				// Convert input payload.value into table rows with parent
				if ( payload.append ) {
					// If we append to a list, calculate the index from which we need to enter the value
					const index = context.getters.getNextArrayIndex( payload.rowId );
					rows = zobjectTreeUtils.convertZObjectToRows( payload.value, parentRow, nextRowId, true, index );
				} else {
					rows = zobjectTreeUtils.convertZObjectToRows( payload.value, parentRow, nextRowId );
				}

				// Reset the parent value in case it's changed
				parentRow = rows.shift();
				context.dispatch( 'setValueByRowId', { rowId: parentRow.id, value: parentRow.value } );

				// Remove all necessary children that are dangling from this parent, if append is not set
				if ( !payload.append ) {
					context.dispatch( 'removeZObjectChildren', parentRow.id );
				}
			} else {
				// Convert input payload.value into table rows with no parent
				rows = zobjectTreeUtils.convertZObjectToRows( payload.value );
			}

			// Push all the rows, they already have their required IDs
			rows.forEach( function ( row ) {
				context.commit( 'pushRow', row );
			} );
		}
		/* END NEW ACTIONS */
	}
};
