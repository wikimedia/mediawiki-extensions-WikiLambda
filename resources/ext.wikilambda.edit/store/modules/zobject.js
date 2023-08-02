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
	extractZIDs = require( '../../mixins/schemata.js' ).methods.extractZIDs,
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
	var istypedObject = Constants.Z_TYPED_OBJECTS_LIST.includes( functionCallId.value );

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

/**
 * Runs actions on the global zobject to make it valid for submission.
 *
 * -Clears empty monolingual string labels.
 * -Canonicalizes the zobject.
 * -Unattaches implementations and testers, if relevant.
 *
 * @param {Object} context
 * @param {boolean} detachFunctionObjects
 * @return {Object} zobject
 */
function transformZObjectForSubmission( context, detachFunctionObjects ) {
	removeEmptyMonolingualValues( context, Constants.Z_PERSISTENTOBJECT_LABEL );
	removeEmptyMonolingualValues( context, Constants.Z_PERSISTENTOBJECT_DESCRIPTION );
	removeEmptyAliasLabelValues( context );

	const functionArguments = context.getters.getRowByKeyPath( [
		Constants.Z_PERSISTENTOBJECT_VALUE,
		Constants.Z_FUNCTION_ARGUMENTS
	], 0 );
	if ( functionArguments ) {
		removeEmptyArguments( context );
	}

	let zobject = canonicalize( zobjectTreeUtils.convertZObjectTreetoJson( context.state.zobject ) );

	if ( detachFunctionObjects ) {
		zobject = unattachImplementationsAndTesters( zobject );
	}

	return zobject;
}

/**
 * Removes the name or description label language objects with empty monolingual string values from the global zobject.
 *
 * @param {Object} context
 * @param {string} key Z_PERSISTENTOBJECT_LABEL or Z_PERSISTENTOBJECT_DESCRIPTION
 */
function removeEmptyMonolingualValues( context, key ) {
	const listRow = context.getters.getRowByKeyPath( [ key, Constants.Z_MULTILINGUALSTRING_VALUE ], 0 );
	if ( !listRow ) {
		return;
	}
	const rows = context.getters.getChildrenByParentRowId( listRow.id ).slice( 1 );
	const deleteRows = rows.filter( ( monolingualRow ) => {
		const labelString = context.getters.getZMonolingualTextValue( monolingualRow.id );
		return !labelString;
	} );
	const deleteRowIds = deleteRows.map( ( row ) => row.id );

	// Remove list of invalid items and, once all deleted, recalculate the array keys
	if ( deleteRowIds.length > 0 ) {
		context.dispatch( 'removeItemsFromTypedList', {
			parentRowId: listRow.id,
			listItems: deleteRowIds
		} );
	}
}

/**
 * Removes the function argument label language objects with empty monolingual string values from the global zobject.
 *
 * @param {Object} context
 */
function removeEmptyArguments( context ) {
	// For every argument, we remove it from the list if:
	// 1. argument type is empty, and
	// 2. argument labels are empty
	// Else, we just clear the empty labels
	const inputs = context.getters.getZFunctionInputs();
	for ( const inputRow of inputs ) {
		// Get the value of the input type
		const inputTypeRow = context.getters.getRowByKeyPath( [ Constants.Z_ARGUMENT_TYPE ], inputRow.id );
		const inputTypeValue = context.getters.getZReferenceTerminalValue( inputTypeRow.id );

		// Get the input labels
		const inputLabelsRow = context.getters.getRowByKeyPath( [
			Constants.Z_ARGUMENT_LABEL,
			Constants.Z_MULTILINGUALSTRING_VALUE
		], inputRow.id );
		const inputLabels = context.getters.getChildrenByParentRowId( inputLabelsRow.id ).slice( 1 );

		// Remove empty labels
		const inputLabelValues = [];
		for ( const labelRow of inputLabels ) {
			const labelValue = context.getters.getZMonolingualTextValue( labelRow.id );
			if ( !labelValue ) {
				context.dispatch( 'removeItemFromTypedList', { rowId: labelRow.id } );
			} else {
				inputLabelValues.push( labelValue );
			}
		}

		// If input is empty and labels are empty, remove this item
		if ( ( inputTypeValue === undefined ) && ( inputLabelValues.length === 0 ) ) {
			context.dispatch( 'removeItemFromTypedList', { rowId: inputRow.id } );
		}
	}

	if ( inputs.length > 0 ) {
		context.dispatch( 'recalculateArgumentKeys', inputs[ 0 ].parent );
	}
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

		context.dispatch( 'recalculateTypedListKeys', aliasLabelId );
		context.dispatch( 'recalculateTypedListKeys', aliasListId );
	} );
}

function isNotObjectOrArrayRoot( object ) {
	return ![ 'array', 'object' ].includes( object.value );
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

/**
 * Given a list of available languages for an object metadata
 * (name, description or alias), it checks the user language and
 * fallback chain and selects which of the available ones is
 * the best pick (either the user language one, or the closest
 * fallback)
 *
 * TODO (T328430): Should we move this into a helpers or mixins file?
 *
 * @param {Array} allLanguages
 * @return {Object|undefined}
 */
function selectBestLanguage( allLanguages ) {
	/**
	 * @param {Array} chain
	 * @param {Array} availableLangs
	 * @return {Object}
	 */
	function findAvailableLang( chain, availableLangs ) {
		// Iterate through the fallback chain and return
		// the first available language found.
		let foundLang;
		for ( const lang of chain ) {
			foundLang = availableLangs.find( ( langObj ) => {
				return ( langObj.langIsoCode === lang );
			} );
			if ( foundLang !== undefined ) {
				return foundLang;
			}
		}
		return foundLang;
	}

	// There are no available languages, return undefined
	if ( allLanguages.length === 0 ) {
		return undefined;
	}
	const fallbackChain = mw.language.getFallbackLanguageChain();
	const availableLang = findAvailableLang( fallbackChain, allLanguages );
	return availableLang || allLanguages[ 0 ];
}

/**
 * Returns whether the value of zobject after
 * following the values of the nested properties given
 * by the array of keys is truthy
 *
 * @param {Object} zobject
 * @param {Array} keys
 * @return {boolean}
 */
function isValueTruthy( zobject, keys = [] ) {
	if ( keys.length === 0 ) {
		return !!zobject;
	}
	const head = keys[ 0 ];
	if ( zobject[ head ] ) {
		const tail = keys.slice( 1 );
		return isValueTruthy( zobject[ head ], tail );
	}
	return false;
}

module.exports = exports = {
	modules: {
		addZObjects: addZObjects,
		currentZObject: currentZObject
	},
	state: {
		zobject: [],
		createNewPage: false,
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

		/************************************************************
		 * INTERFACE METHODS FOR TYPES
		 ************************************************************/

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
			 * @param {string|undefined} langZid
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
			 * @param {string|undefined} langZid
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
			 * @param {string|undefined} langZid
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
				// Combine all languages and return the array of unique languageZids
				const allLangs = nameLangs.concat( descriptionLangs, aliasLangs );
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
		 * TODO (T296815); Assumes programming language is always a literal.
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZCodeProgrammingLanguage: function ( state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {string | undefined}
			 */
			function findZCodeLanguage( rowId ) {
				const languageRow = getters.getRowByKeyPath( [
					Constants.Z_CODE_LANGUAGE,
					Constants.Z_PROGRAMMING_LANGUAGE_CODE
				], rowId );
				return languageRow ? getters.getZStringTerminalValue( languageRow.id ) : undefined;
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
			 * @return {string|undefined}
			 */
			function findTypedListItemType( parentRowId ) {
				const typeRow = getters.getRowByKeyPath( [ '0' ], parentRowId );
				if ( !typeRow ) {
					return undefined;
				}
				return getters.getZTypeStringRepresentation( typeRow.id );
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

				if ( !typeRow ) {
					return undefined;
				}

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
							Constants.Z_FUNCTION_CALL_FUNCTION,
							Constants.Z_REFERENCE_ID
						], rowId );
						break;

					case Constants.Z_ARGUMENT_REFERENCE:
						type = getters.getRowByKeyPath( [
							Constants.Z_ARGUMENT_REFERENCE_KEY,
							Constants.Z_STRING_VALUE
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
			 * @return {Object}
			 */
			function findBestMonolingual( rowId ) {
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

		/* END NEW GETTERS */

		// TODO (T329106): Delete
		getZObjectLabels: function ( state, getters ) {
			return getters.getZObjectChildrenById( getters.getNestedZObjectById( 0, [
				Constants.Z_PERSISTENTOBJECT_LABEL,
				Constants.Z_MULTILINGUALSTRING_VALUE
			] ).id );
		},

		// TODO (T329106): Delete and replace with getZPersistentName
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

		// TODO: Consider whether we wanna use this
		getIsSavingObject: function ( state ) {
			return state.isSavingZObject;
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

		// DELETE
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

		/**
		 * Return the index of a zObject by its row ID
		 * for internal use.
		 *
		 * TODO: Deprecate
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getZObjectIndexById: function ( state ) {
			/**
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
			 * TODO (T329107): Deprecate this in favor of getChildrenByParentRowId, after investigating
			 * the need for row.language and row.languageString (below)
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

		/**
		 * Return the direct children rows of a specific zObject by its ID.
		 * This method is desinged to return just ONE level of Depth.
		 * This will support development of small reusable components.
		 * If language is passed, the language zid and object will be returned as a property.
		 * Returns only the list items, removing the first item denoting the type.
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getAllItemsFromListById: function ( state, getters ) {
			/**
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

		// TODO Delete
		getZObjectChildrenByIdRecursively: function ( state ) {
			/**
			 * Return the children of a specific zObject by its ID.
			 * The return is in zObjectTree array form.
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
					currentObject = getters.getRowById( id ),
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
								isFunctionToType( getters.getStoredObject( functionCallFunctionZid.value ) ) ) {
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
				return zobjectTreeUtils.convertZObjectTreetoJson( state.zobject, id, isArray );
			};
		},

		/**
		 * Return the next key of the root ZObject. So if the current object is a Z1008
		 * and there are currently 2 keys, it will return Z1008K3.
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
		 * Returns ZIDs for testers attached to the root function.
		 * Note that this returns an array of only items, without the type from index 0.
		 *
		 * TODO (T314928): Refactor using getRowByKeyPath, getZOBjectChildrenByRowId and
		 * getZReferenceTerminalValue
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getAttachedZTesters: function ( state, getters ) {
			/**
			 * @param {string} functionId
			 * @return {Array}
			 */
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

		/**
		 * Returns ZIDs for implementations attached to the root function.
		 * Note that this returns an array of only items, without the type from index 0.
		 *
		 * TODO (T314928): Refactor using getRowByKeyPath, getZOBjectChildrenByRowId and
		 * getZReferenceTerminalValue
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getAttachedZImplementations: function ( state, getters ) {
			/**
			 * @param {string} functionId
			 * @return {Array}
			 */
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
		 * Sets the key field of a Row given by the
		 * rowId in payload.index with the value given
		 * in payload.value
		 *
		 * @param {Object} state
		 * @param {Object} payload
		 * @param {number} payload.id
		 * @param {string} payload.value
		 */
		setZObjectValue: function ( state, payload ) {
			var item = state.zobject[ payload.index ];
			item.value = payload.value;

			state.zobject.splice( payload.index, 1, item );
		},

		/**
		 * Sets the key field of a Row given by the
		 * rowId in payload.index with the value given
		 * in payload.key
		 *
		 * @param {Object} state
		 * @param {Object} payload
		 * @param {number} payload.id
		 * @param {string} payload.key
		 */
		setZObjectKey: function ( state, payload ) {
			var item = state.zobject[ payload.index ];
			item.key = payload.key;

			state.zobject.splice( payload.index, 1, item );
		},

		/**
		 * Sets the key field of a Row given by the
		 * rowId in payload.index with the value given
		 * in payload.parent
		 *
		 * @param {Object} state
		 * @param {Object} payload
		 * @param {number} payload.id
		 * @param {number} payload.parent
		 */
		setZObjectParent: function ( state, payload ) {
			var item = state.zobject[ payload.index ];
			item.parent = payload.parent;

			state.zobject.splice( payload.index, 1, item );
		},

		/**
		 * Removes the Row at the given index of the state zobject
		 *
		 * @param {Object} state
		 * @param {number} index
		 */
		removeZObject: function ( state, index ) {
			state.zobject.splice( index, 1 );
		},

		/**
		 * Pushes a new Row into the state zobject
		 *
		 * @param {Object} state
		 * @param {Object} payload
		 */
		addZObject: function ( state, payload ) {
			if ( payload instanceof Row ) {
				state.zobject.push( payload );
			} else {
				state.zobject.push( new Row( payload.id, payload.key, payload.value, payload.parent ) );
			}
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
			var editingData = mw.config.get( 'wgWikiLambda' ),
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
		 * @return {Promise}
		 */
		initializeEvaluateFunction: function ( context ) {
			// Set current Zid to empty placeholder (Z0)
			context.commit( 'setCurrentZid', Constants.NEW_ZID_PLACEHOLDER );

			// Create root row for the blank object
			const rootObject = { id: 0, key: undefined, parent: undefined, value: 'object' };
			context.commit( 'addZObject', rootObject );

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
			const rootObject = { id: 0, key: undefined, parent: undefined, value: 'object' };
			context.commit( 'addZObject', rootObject );

			// Set the blank ZObject as a new ZPersistentObject
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
		 * only once and the method is separate from fetchZKeys because the logic to
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
			const api = new mw.Api();
			return api.get( {
				action: 'query',
				list: 'wikilambdaload_zobjects',
				format: 'json',
				wikilambdaload_zids: zId,
				wikilambdaload_revisions: revision || undefined
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

				// Initialize optional description key if absent
				if ( !zobject[ Constants.Z_PERSISTENTOBJECT_DESCRIPTION ] ) {
					zobject[ Constants.Z_PERSISTENTOBJECT_DESCRIPTION ] = {
						Z1K1: Constants.Z_MULTILINGUALSTRING,
						Z12K1: [
							Constants.Z_MONOLINGUALSTRING
						]
					};
				}

				// Save initial multilingual data values
				// so that About widget knows how to reset to original
				// state in the case of a publish cancelation action.
				context.commit( 'saveMultilingualDataCopy', zobject );

				// Get all zIds within the object:
				const listOfZIdWithinObject = extractZIDs( zobject );
				context.dispatch( 'fetchZKeys', { zids: listOfZIdWithinObject } );

				// Convert to rows and set store:
				const zobjectRows = zobjectTreeUtils.convertZObjectToRows( zobject );
				context.commit( 'setZObject', zobjectRows );

				// Set initialized as done:
				context.commit( 'setZObjectInitialized', true );
			} );
		},
		/**
		 * Return a boolean indicating if the current Z Object is valid based on type requirements
		 * Update error store with any errors found while validating
		 *
		 * @param {Object} context
		 * @return {boolean}
		 */
		validateZObject: function ( context ) {
			const zobjectType = context.getters.getCurrentZObjectType,
				zobject = context.getters.getZObjectAsJson,
				contentRowId = context.getters.getZPersistentContentRowId(),
				innerObject = zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ];

			var rowId,
				invalidInputs,
				isValid = true;

			switch ( zobjectType ) {
				// Validate ZFunction:
				// * Output type not set
				// * Input type not set
				case Constants.Z_FUNCTION:
					// invalid if a function doesn't have an output type
					if ( !context.getters.currentZFunctionHasOutput ) {
						rowId = context.getters.getRowByKeyPath( [
							Constants.Z_FUNCTION_RETURN_TYPE
						], contentRowId ).id;
						context.dispatch( 'setError', {
							rowId,
							errorCode: Constants.errorCodes.MISSING_FUNCTION_OUTPUT,
							errorType: Constants.errorTypes.ERROR
						} );
						isValid = false;
					}

					// invalid if any of the non-empty inputs doesn't have a type
					invalidInputs = context.getters.currentZFunctionInvalidInputs;
					if ( invalidInputs.length > 0 ) {
						for ( const invalidRow of invalidInputs ) {
							context.dispatch( 'setError', {
								rowId: invalidRow.typeRow.id,
								errorCode: Constants.errorCodes.MISSING_FUNCTION_INPUT_TYPE,
								errorType: Constants.errorTypes.ERROR
							} );
						}
						isValid = false;
					}
					return isValid;

				// Validate ZImplementation:
				// * Implementation function is not defined (Z14K1)
				// * Composition implementation has undefined function call (Z14K2.Z7K1)
				// * Code implementation has undefined code string (Z14K3.Z16K2)
				case Constants.Z_IMPLEMENTATION:

					// invalid if a function hasn't been defined
					if ( !isValueTruthy( innerObject, [
						Constants.Z_IMPLEMENTATION_FUNCTION,
						Constants.Z_REFERENCE_ID
					] ) ) {
						rowId = context.getters.getZImplementationFunctionRowId( contentRowId );
						context.dispatch( 'setError', {
							rowId,
							errorCode: Constants.errorCodes.MISSING_TARGET_FUNCTION,
							errorType: Constants.errorTypes.ERROR
						} );
						isValid = false;
					}

					// if implementation type is composition
					if ( innerObject[ Constants.Z_IMPLEMENTATION_COMPOSITION ] ) {
						// invalid if composition hasn't been defined
						// or if composition has an undefied Z7K1
						// or if composition has an undefined Z18K1
						if (
							!isValueTruthy( innerObject, [ Constants.Z_IMPLEMENTATION_COMPOSITION ] ) ||
							(
								innerObject[ Constants.Z_IMPLEMENTATION_COMPOSITION ][
									Constants.Z_FUNCTION_CALL_FUNCTION ] &&
								!isValueTruthy( innerObject, [
									Constants.Z_IMPLEMENTATION_COMPOSITION,
									Constants.Z_FUNCTION_CALL_FUNCTION,
									Constants.Z_REFERENCE_ID
								] )
							) ||
							(
								innerObject[ Constants.Z_IMPLEMENTATION_COMPOSITION ][
									Constants.Z_ARGUMENT_REFERENCE_KEY ] &&
								!isValueTruthy( innerObject, [
									Constants.Z_IMPLEMENTATION_COMPOSITION,
									Constants.Z_ARGUMENT_REFERENCE_KEY,
									Constants.Z_STRING_VALUE
								] )
							)
						) {
							rowId = context.getters.getZImplementationContentRowId(
								contentRowId,
								Constants.Z_IMPLEMENTATION_COMPOSITION
							);
							context.dispatch( 'setError', {
								rowId,
								errorCode: Constants.errorCodes.MISSING_IMPLEMENTATION_COMPOSITION,
								errorType: Constants.errorTypes.ERROR
							} );
							isValid = false;
						}
					}

					// if implementation type is code
					if ( innerObject[ Constants.Z_IMPLEMENTATION_CODE ] ) {

						// invalid if no programming language is defined
						if ( !isValueTruthy( innerObject, [
							Constants.Z_IMPLEMENTATION_CODE,
							Constants.Z_CODE_LANGUAGE,
							Constants.Z_PROGRAMMING_LANGUAGE_CODE,
							Constants.Z_STRING_VALUE
						] ) ) {
							rowId = context.getters.getZImplementationContentRowId(
								contentRowId,
								Constants.Z_IMPLEMENTATION_CODE
							);
							const langRow = context.getters.getRowByKeyPath( [
								Constants.Z_CODE_LANGUAGE,
								Constants.Z_PROGRAMMING_LANGUAGE_CODE,
								Constants.Z_STRING_VALUE
							], rowId );
							context.dispatch( 'setError', {
								rowId: langRow.id,
								errorCode: Constants.errorCodes.MISSING_IMPLEMENTATION_CODE_LANGUAGE,
								errorType: Constants.errorTypes.ERROR
							} );
							isValid = false;
						}

						// invalid if no code is defined
						if ( !isValueTruthy( innerObject, [
							Constants.Z_IMPLEMENTATION_CODE,
							Constants.Z_CODE_CODE,
							Constants.Z_STRING_VALUE
						] ) ) {
							rowId = context.getters.getZImplementationContentRowId(
								contentRowId,
								Constants.Z_IMPLEMENTATION_CODE
							);
							const codeRow = context.getters.getRowByKeyPath( [
								Constants.Z_CODE_CODE,
								Constants.Z_STRING_VALUE
							], rowId );
							context.dispatch( 'setError', {
								rowId: codeRow.id,
								errorCode: Constants.errorCodes.MISSING_IMPLEMENTATION_CODE,
								errorType: Constants.errorTypes.ERROR
							} );
							isValid = false;
						}
					}
					return isValid;

				// Validate ZTester:
				// * Tester function is not defined (Z20K1)
				// * Tester call has undefined function call (Z20K2.Z7K1)
				// * Tester validation has undefined function call (Z20K3.Z7K1)
				case Constants.Z_TESTER:
					// invalid if no function is defined
					if ( !isValueTruthy( innerObject, [
						Constants.Z_TESTER_FUNCTION,
						Constants.Z_REFERENCE_ID
					] ) ) {
						rowId = context.getters.getZTesterFunctionRowId( contentRowId );
						context.dispatch( 'setError', {
							rowId,
							errorCode: Constants.errorCodes.MISSING_TARGET_FUNCTION,
							errorType: Constants.errorTypes.ERROR
						} );
						isValid = false;
					}

					// invalid if no function call is set
					if ( !isValueTruthy( innerObject, [
						Constants.Z_TESTER_CALL,
						Constants.Z_FUNCTION_CALL_FUNCTION,
						Constants.Z_REFERENCE_ID
					] ) ) {
						rowId = context.getters.getZTesterCallRowId( contentRowId );
						context.dispatch( 'setError', {
							rowId,
							errorCode: Constants.errorCodes.MISSING_TESTER_CALL,
							errorType: Constants.errorTypes.ERROR
						} );
						isValid = false;
					}

					// invalid if no result validation is set
					if ( !isValueTruthy( innerObject, [
						Constants.Z_TESTER_VALIDATION,
						Constants.Z_FUNCTION_CALL_FUNCTION,
						Constants.Z_REFERENCE_ID
					] ) ) {
						rowId = context.getters.getZTesterValidationRowId( contentRowId );
						context.dispatch( 'setError', {
							rowId,
							errorCode: Constants.errorCodes.MISSING_TESTER_VALIDATION,
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
		 * @param {boolean} param.detachFunctionObjects
		 * @return {Promise}
		 */
		submitZObject: function ( context, { summary, detachFunctionObjects } ) {
			context.commit( 'setIsSavingZObject', true );

			// when a list has changed type and the items are no longer valid
			if ( context.getters.hasInvalidListItems ) {
				const invalidLists = context.getters.getInvalidListItems;
				for ( const parentRowId in invalidLists ) {
					context.dispatch( 'removeItemsFromTypedList', {
						parentRowId: parseInt( parentRowId ),
						listItems: invalidLists[ parentRowId ]
					} );
				}
				// clear the collection of list items removed
				context.dispatch( 'clearListItemsForRemoval' );
			}

			const zobject = transformZObjectForSubmission( context, detachFunctionObjects );

			return new Promise( ( resolve, reject ) => {
				saveZObject(
					zobject,
					context.getters.isCreateNewPage ? undefined : context.getters.getCurrentZObjectId,
					summary
				).then( function ( result ) {
					context.commit( 'setIsSavingZObject', false );
					return resolve( result.page );
				} ).catch( function ( error ) {
					context.commit( 'setIsSavingZObject', false );
					return reject( error );
				} );
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
		 * @param {number} listRowId
		 */
		recalculateTypedListKeys: function ( context, listRowId ) {
			const children = context.getters.getChildrenByParentRowId( listRowId );

			children.forEach( function ( itemRow, index ) {
				context.commit( 'setZObjectKey', {
					index: context.getters.getZObjectIndexById( itemRow.id ),
					key: `${index}`
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
				context.commit( 'setZObjectValue', {
					index: context.getters.getZObjectIndexById( argKeyRow.id ),
					value: `${context.getters.getCurrentZObjectId}K${index + 1}`
				} );
			} );
		},

		/**
		 * Remove a specific zobject. This method does NOT remove its children.
		 * It also clears whatever errors are associated to this rowId.
		 *
		 * @param {Object} context
		 * @param {number} objectId
		 */
		removeZObject: function ( context, objectId ) {
			if ( objectId === null || objectId === undefined ) {
				return;
			}
			const objectIndex = context.getters.getZObjectIndexById( objectId );
			context.commit( 'removeZObject', objectIndex );
			context.commit( 'clearErrorsForId', objectId );
		},

		/**
		 * Remove all the children of a specific zObject. Useful to clean up existing data.
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
			var api = new mw.Api(),
				queryType = 'wikilambdasearch_labels';

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
			// Save a copy of the pre-submission ZObject in case the submission returns an error
			const zObjectCopy = JSON.parse( JSON.stringify( context.state.zobject ) );

			// Get tester list (Z8K3) row following the appropriate keyPath Z2K2.Z8K3 from the root
			const listRow = context.getters.getRowByKeyPath( [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_TESTERS
			] );

			return context
				.dispatch( 'injectZObjectFromRowId', { rowId: listRow.id, value: payload.testerZIds, append: true } )
				.then( () => {
					return context.dispatch( 'submitZObject', '' ).catch( function ( e ) {
						// Reset old ZObject if something failed
						// FIXME zObjectCopy is an array of objects and not an array of Rows
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
			context.dispatch( 'recalculateTypedListKeys', listId );
			return context.dispatch( 'submitZObject', '' ).catch( function ( e ) {
				// FIXME zObjectCopy is an array of objects and not an array of Rows
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
			// Save a copy of the pre-submission ZObject in case the submission returns an error
			const zObjectCopy = JSON.parse( JSON.stringify( context.state.zobject ) );

			// Get implementation list (Z8K4) row following the appropriate keyPath Z2K2.Z8K4 from the root
			const listRow = context.getters.getRowByKeyPath( [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_IMPLEMENTATIONS
			] );

			return context
				.dispatch( 'injectZObjectFromRowId', { rowId: listRow.id, value: payload.implementationZIds, append: true } )
				.then( () => {
					return context.dispatch( 'submitZObject', '' ).catch( function ( e ) {
						// Reset old ZObject if something failed
						// FIXME zObjectCopy is an array of objects and not an array of Rows
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
			context.dispatch( 'recalculateTypedListKeys', listId );
			return context.dispatch( 'submitZObject', '' ).catch( function ( e ) {
				// FIXME zObjectCopy is an array of objects and not an array of Rows
				context.commit( 'setZObject', zObjectCopy );
				throw e;
			} );
		},
		setIsZObjectDirty: function ( context, value ) {
			context.commit( 'setIsZObjectDirty', value );
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
				context.dispatch( 'setValueByRowId', { rowId: row.id, value: payload.value } );
			} else {
				context.dispatch( 'injectZObjectFromRowId', { rowId: row.id, value: payload.value, append } );
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
					allActions.push( context.dispatch( 'removeZObjectChildren', arg.id ) );
					allActions.push( context.dispatch( 'removeZObject', arg.id ) );
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
					const blank = context.getters.createObjectByType( {
						type: arg[ Constants.Z_ARGUMENT_TYPE ],
						link: true
					} );

					// Asynchronously fetch the necessary zids. We don't need to wait
					// to the fetch call because these will only be needed for labels.
					zids = zids.concat( extractZIDs( blank ) );

					allActions.push( context.dispatch( 'injectKeyValueFromRowId', {
						rowId: payload.parentId,
						key: arg[ Constants.Z_ARGUMENT_KEY ],
						value: blank
					} ) );
				}
			} );

			// 4.c. Make sure that all the newly added referenced zids are fetched
			zids = [ ...new Set( zids ) ];
			context.dispatch( 'fetchZKeys', { zids } );

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
		 * @return {Promise}
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
						context.dispatch( 'removeZObjectChildren', keyRow.id );
						context.dispatch( 'removeZObject', keyRow.id );
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
					rows = zobjectTreeUtils.convertZObjectToRows( payload.value, parentRow, nextRowId, true, index );
				} else {
					rows = zobjectTreeUtils.convertZObjectToRows( payload.value, parentRow, nextRowId );
				}

				// Reset the parent value in case it's changed
				parentRow = rows.shift();
				allActions.push( context.dispatch( 'setValueByRowId', {
					rowId: parentRow.id,
					value: parentRow.value
				} ) );

				// Remove all necessary children that are dangling from this parent, if append is not set
				if ( !payload.append ) {
					allActions.push( context.dispatch( 'removeZObjectChildren', parentRow.id ) );
				}
			} else {
				// Convert input payload.value into table rows with no parent
				rows = zobjectTreeUtils.convertZObjectToRows( payload.value );
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
		 * Assumes that the key doesn't exist.
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
			const rows = zobjectTreeUtils.convertZObjectToRows( value, parentRow, nextRowId, false, 0, false );

			rows.forEach( function ( row ) {
				context.commit( 'pushRow', row );
			} );
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
			context.dispatch( 'removeZObjectChildren', payload.rowId );
			context.dispatch( 'removeZObject', payload.rowId );
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
				context.dispatch( 'removeZObjectChildren', itemRowId );
				context.dispatch( 'removeZObject', itemRowId );
			}
			context.dispatch( 'recalculateTypedListKeys', payload.parentRowId );
		}
	}
};
