/*!
 * WikiLambda Vue editor: ZOBject Vuex module to handle pre submission
 * actions (validation, transformations, and submission)
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const Constants = require( '../../../Constants.js' ),
	convertTableToJson = require( '../../../mixins/zobjectUtils.js' ).methods.convertTableToJson,
	hybridToCanonical = require( '../../../mixins/schemata.js' ).methods.hybridToCanonical,
	apiUtils = require( '../../../mixins/api.js' ).methods,
	isTruthyOrEqual = require( '../../../mixins/typeUtils.js' ).methods.isTruthyOrEqual;

module.exports = exports = {
	actions: {
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

			let rowId,
				invalidInputs,
				invalidOutputs,
				isValid = true;

			switch ( zobjectType ) {
				// Validate ZFunction:
				// * Output type not set
				// * Input type not set
				case Constants.Z_FUNCTION:
					// invalid if a function doesn't have an output type
					invalidOutputs = context.getters.getInvalidOutputFields;
					if ( invalidOutputs.length > 0 ) {
						for ( const invalidRow of invalidOutputs ) {
							context.commit( 'setError', {
								rowId: invalidRow,
								errorCode: Constants.errorCodes.MISSING_FUNCTION_OUTPUT,
								errorType: Constants.errorTypes.ERROR
							} );
						}
						isValid = false;
					}

					// invalid if any of the non-empty inputs doesn't have a type
					invalidInputs = context.getters.getInvalidInputFields;
					if ( invalidInputs.length > 0 ) {
						for ( const invalidRow of invalidInputs ) {
							context.commit( 'setError', {
								rowId: invalidRow,
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
					if ( !isTruthyOrEqual( innerObject, [
						Constants.Z_IMPLEMENTATION_FUNCTION,
						Constants.Z_REFERENCE_ID
					] ) ) {
						rowId = context.getters.getZImplementationFunctionRowId( contentRowId );
						context.commit( 'setError', {
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
							!isTruthyOrEqual( innerObject, [ Constants.Z_IMPLEMENTATION_COMPOSITION ] ) ||
							(
								innerObject[ Constants.Z_IMPLEMENTATION_COMPOSITION ][
									Constants.Z_FUNCTION_CALL_FUNCTION ] &&
								!isTruthyOrEqual( innerObject, [
									Constants.Z_IMPLEMENTATION_COMPOSITION,
									Constants.Z_FUNCTION_CALL_FUNCTION,
									Constants.Z_REFERENCE_ID
								] )
							) ||
							(
								innerObject[ Constants.Z_IMPLEMENTATION_COMPOSITION ][
									Constants.Z_ARGUMENT_REFERENCE_KEY ] &&
								!isTruthyOrEqual( innerObject, [
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
							context.commit( 'setError', {
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
						const hasReferencedProgrammingLanguage = isTruthyOrEqual( innerObject, [
							Constants.Z_IMPLEMENTATION_CODE,
							Constants.Z_CODE_LANGUAGE,
							Constants.Z_REFERENCE_ID
						] );

						if ( !hasReferencedProgrammingLanguage ) {
							rowId = context.getters.getZImplementationContentRowId(
								contentRowId,
								Constants.Z_IMPLEMENTATION_CODE
							);
							const langRow = context.getters.getRowByKeyPath( [
								Constants.Z_CODE_LANGUAGE
							], rowId );
							context.commit( 'setError', {
								rowId: langRow.id,
								errorCode: Constants.errorCodes.MISSING_IMPLEMENTATION_CODE_LANGUAGE,
								errorType: Constants.errorTypes.ERROR
							} );
							isValid = false;
						}

						// invalid if no code is defined
						if ( !isTruthyOrEqual( innerObject, [
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
							context.commit( 'setError', {
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
					if ( !isTruthyOrEqual( innerObject, [
						Constants.Z_TESTER_FUNCTION,
						Constants.Z_REFERENCE_ID
					] ) ) {
						rowId = context.getters.getZTesterFunctionRowId( contentRowId );
						context.commit( 'setError', {
							rowId,
							errorCode: Constants.errorCodes.MISSING_TARGET_FUNCTION,
							errorType: Constants.errorTypes.ERROR
						} );
						isValid = false;
					}

					// invalid if no function call is set
					if ( !isTruthyOrEqual( innerObject, [
						Constants.Z_TESTER_CALL,
						Constants.Z_FUNCTION_CALL_FUNCTION,
						Constants.Z_REFERENCE_ID
					] ) ) {
						rowId = context.getters.getZTesterCallRowId( contentRowId );
						context.commit( 'setError', {
							rowId,
							errorCode: Constants.errorCodes.MISSING_TESTER_CALL,
							errorType: Constants.errorTypes.ERROR
						} );
						isValid = false;
					}

					// invalid if no result validation is set
					if ( !isTruthyOrEqual( innerObject, [
						Constants.Z_TESTER_VALIDATION,
						Constants.Z_FUNCTION_CALL_FUNCTION,
						Constants.Z_REFERENCE_ID
					] ) ) {
						rowId = context.getters.getZTesterValidationRowId( contentRowId );
						context.commit( 'setError', {
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
		 * @param {boolean} param.disconnectFunctionObjects
		 * @return {Promise}
		 */
		submitZObject: function ( context, { summary, disconnectFunctionObjects = false } ) {
			context.dispatch( 'transformZObjectForSubmission', disconnectFunctionObjects );

			const zobject = hybridToCanonical( convertTableToJson( context.getters.getZObjectTable ) );
			const zid = context.getters.isCreateNewPage ? undefined : context.getters.getCurrentZObjectId;

			return apiUtils.saveZObject( {
				zobject,
				zid,
				summary
			} );
		},

		/**
		 * Runs actions on the global zobject to make it valid for submission.
		 *
		 * - Clears empty monolingual string labels.
		 * - Clears empty monolingual stringset labels.
		 * - Clears empty arguments and argument labels.
		 * - Removes list items marked as invalid.
		 * - Unattaches implementations and testers, if relevant.
		 *
		 * @param {Object} context
		 * @param {boolean} disconnectFunctionObjects
		 */
		transformZObjectForSubmission: function ( context, disconnectFunctionObjects ) {
			// For al objects: remove empty monolingual string and monolingual stringsets
			context.dispatch( 'removeEmptyMonolingualValues', { key: Constants.Z_PERSISTENTOBJECT_LABEL } );
			context.dispatch( 'removeEmptyMonolingualValues', { key: Constants.Z_PERSISTENTOBJECT_DESCRIPTION } );
			context.dispatch( 'removeEmptyAliasValues' );

			const contentRow = context.getters.getRowByKeyPath( [ Constants.Z_PERSISTENTOBJECT_VALUE ], 0 );
			const contentRowId = contentRow ? contentRow.id : 0;
			const type = context.getters.getZObjectTypeByRowId( contentRowId );

			// If object is a function:
			if ( type === Constants.Z_FUNCTION ) {
				// 1. Clear empty monolingual strings
				// 2. Remove arguments with undefined type and label
				// 3. Rename misnumbered argument key Ids
				context.dispatch( 'removeEmptyArguments' );
			}

			// If object is a type:
			if ( type === Constants.Z_TYPE ) {
				// 1. Clear non-set render, parser and equality function keys
				// NOTE: Even if the render/parser/equality functions are mandatory, type creation
				// and editing needs to allow empty values initially to avoid circular dependencies.
				context.dispatch( 'removeEmptyTypeFunctions', contentRowId );
				// 2. Rename misnumbered key Ids
				const keys = context.getters.getRowByKeyPath( [ Constants.Z_TYPE_KEYS ], contentRowId );
				context.dispatch( 'recalculateKeys', { listRowId: keys.id, key: Constants.Z_KEY_ID } );
				// 3. Remove empty key labels
				const items = context.getters.getChildrenByParentRowId( keys.id ).slice( 1 );
				items.forEach( ( item ) => {
					context.dispatch( 'removeEmptyMonolingualValues', { key: Constants.Z_KEY_LABEL, rowId: item.id } );
				} );
			}

			// If object is an error type:
			if ( type === Constants.Z_ERRORTYPE ) {
				// 1. Rename misnumbered key Ids
				const keys = context.getters.getRowByKeyPath( [ Constants.Z_ERRORTYPE_KEYS ], contentRowId );
				context.dispatch( 'recalculateKeys', { listRowId: keys.id, key: Constants.Z_KEY_ID } );
				// 2. Remove empty key labels
				const items = context.getters.getChildrenByParentRowId( keys.id ).slice( 1 );
				items.forEach( ( item ) => {
					context.dispatch( 'removeEmptyMonolingualValues', { key: Constants.Z_KEY_LABEL, rowId: item.id } );
				} );
			}

			// If a list has changed its type, remove invalid list items
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

			// Disconnect implementations and testers if necessary
			if ( disconnectFunctionObjects ) {
				context.dispatch( 'disconnectFunctionObjects' );
			}
		},

		/**
		 * Removes Z4K3/Validator, Z4K4/Equality, Z4K5/Renderer and Z4K6/Parser key values
		 * when the values are undefined. Assumes that the current object is a Type/Z4. Also
		 * assumes that the given functions are references, and never literals or function calls.
		 *
		 * @param {Object} context
		 * @param {number} rowId
		 */
		removeEmptyTypeFunctions: function ( context, rowId ) {
			const keys = [
				Constants.Z_TYPE_VALIDATOR,
				Constants.Z_TYPE_EQUALITY,
				Constants.Z_TYPE_RENDERER,
				Constants.Z_TYPE_PARSER
			];

			for ( const key of keys ) {
				const keyRow = context.getters.getRowByKeyPath( [ key ], rowId );
				if ( keyRow ) {
					const value = context.getters.getZReferenceTerminalValue( keyRow.id );
					// If value is empty, remove the key altogether
					if ( !value ) {
						context.dispatch( 'removeRowChildren', { rowId: keyRow.id, removeParent: true } );
					}
				}
			}
		},

		/**
		 * Removes the name or description label language objects with empty monolingual
		 * string or language values from the global zobject.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {string} payload.key Z_PERSISTENTOBJECT_LABEL or Z_PERSISTENTOBJECT_DESCRIPTION
		 * @param {number} payload.rowId Starting rowId, default is 0
		 */
		removeEmptyMonolingualValues: function ( context, payload ) {
			const { key, rowId = 0 } = payload;
			const listRow = context.getters.getRowByKeyPath( [ key, Constants.Z_MULTILINGUALSTRING_VALUE ], rowId );
			if ( !listRow ) {
				return;
			}
			const rows = context.getters.getChildrenByParentRowId( listRow.id ).slice( 1 );
			const deleteRows = rows.filter( ( monolingualRow ) => {
				const labelString = context.getters.getZMonolingualTextValue( monolingualRow.id );
				const languageValue = context.getters.getZMonolingualLangValue( monolingualRow.id );
				return !labelString || !languageValue;
			} );
			const deleteRowIds = deleteRows.map( ( row ) => row.id );

			// Remove list of invalid items and, once all deleted, recalculate the array keys
			if ( deleteRowIds.length > 0 ) {
				context.dispatch( 'removeItemsFromTypedList', {
					parentRowId: listRow.id,
					listItems: deleteRowIds
				} );
			}
		},

		/**
		 * Removes the alias label language objects with empty monolingual string
		 * or language values from the global zobject.
		 *
		 * @param {Object} context
		 */
		removeEmptyAliasValues: function ( context ) {
			const aliasRow = context.getters.getRowByKeyPath( [
				Constants.Z_PERSISTENTOBJECT_ALIASES,
				Constants.Z_MULTILINGUALSTRINGSET_VALUE
			] );

			if ( !aliasRow ) {
				return;
			}

			const aliasSet = context.getters.getChildrenByParentRowId( aliasRow.id ).slice( 1 );
			for ( const alias of aliasSet ) {
				// Iterate over the values and remove empty ones
				const aliasValues = context.getters.getZMonolingualStringsetValues( alias.id );
				const goodValues = [];
				for ( const value of aliasValues ) {
					if ( !value.value ) {
						context.dispatch( 'removeRowChildren', { rowId: value.rowId, removeParent: true } );
					} else {
						goodValues.push( value );
					}
				}
				// If there are aliases left, recalculate list keys
				if ( goodValues.length > 0 ) {
					const listRow = context.getters.getRowByKeyPath( [
						Constants.Z_MONOLINGUALSTRINGSET_VALUE
					], alias.id );
					context.dispatch( 'recalculateTypedListKeys', listRow.id );
				}
				// If alias has no values or no language, remove whole alias
				const aliasLang = context.getters.getZMonolingualStringsetLang( alias.id );
				if ( !aliasLang || goodValues.length === 0 ) {
					context.dispatch( 'removeRowChildren', { rowId: alias.id, removeParent: true } );
				}
			}
			// Recalculate the keys of the list of monolingual string sets
			context.dispatch( 'recalculateTypedListKeys', aliasRow.id );
		},

		/**
		 * Removes the function argument label language objects with empty monolingual
		 * string or language values from the global zobject.
		 *
		 * @param {Object} context
		 */
		removeEmptyArguments: function ( context ) {
			// For every argument, we remove it from the list if:
			// 1. argument type is empty, and
			// 2. argument labels are empty
			// Else, we just clear the empty labels
			const inputs = context.getters.getZFunctionInputs();
			for ( const inputRow of inputs ) {
				// Get the value of the input type
				const inputTypeRow = context.getters.getRowByKeyPath( [ Constants.Z_ARGUMENT_TYPE ], inputRow.id );
				const inputTypeMode = context.getters.getZObjectTypeByRowId( inputTypeRow.id );
				const inputTypeValue = ( inputTypeMode === Constants.Z_REFERENCE ) ?
					context.getters.getZReferenceTerminalValue( inputTypeRow.id ) :
					context.getters.getZFunctionCallFunctionId( inputTypeRow.id );

				// Get the input labels
				const inputLabelsRow = context.getters.getRowByKeyPath( [
					Constants.Z_ARGUMENT_LABEL,
					Constants.Z_MULTILINGUALSTRING_VALUE
				], inputRow.id );
				const inputLabels = context.getters.getChildrenByParentRowId( inputLabelsRow.id ).slice( 1 );

				// Remove labels with empty text or language
				const inputLabelValues = [];
				for ( const labelRow of inputLabels ) {
					const labelValue = context.getters.getZMonolingualTextValue( labelRow.id );
					const languageValue = context.getters.getZMonolingualLangValue( labelRow.id );
					if ( !labelValue || !languageValue ) {
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
				context.dispatch( 'recalculateKeys', {
					listRowId: inputs[ 0 ].parent,
					key: Constants.Z_ARGUMENT_KEY
				} );
			}
		},

		/**
		 * Remove implementation and tester from a ZObject
		 * The zObject has to be of type function
		 *
		 * @param {Object} context
		 */
		disconnectFunctionObjects: function ( context ) {
			// Disconnect implementations
			const implementationRow = context.getters.getRowByKeyPath( [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_IMPLEMENTATIONS
			] );
			const implementations = context.getters.getChildrenByParentRowId( implementationRow.id ).slice( 1 );
			for ( const row of implementations ) {
				context.dispatch( 'removeRowChildren', { rowId: row.id, removeParent: true } );
			}
			// Disconnect testers
			const testerRow = context.getters.getRowByKeyPath( [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_TESTERS
			] );
			const testers = context.getters.getChildrenByParentRowId( testerRow.id ).slice( 1 );
			for ( const row of testers ) {
				context.dispatch( 'removeRowChildren', { rowId: row.id, removeParent: true } );
			}
		}
	}
};
