/*!
 * WikiLambda Vue editor: ZOBject Vuex module to handle pre submission
 * actions (validation, transformations, and submission)
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const Constants = require( '../../../Constants.js' ),
	convertZObjectTreetoJson = require( '../../../mixins/zobjectTreeUtils.js' ).methods.convertZObjectTreetoJson,
	canonicalize = require( '../../../mixins/schemata.js' ).methods.canonicalizeZObject,
	saveZObject = require( '../../../mixins/api.js' ).methods.saveZObject;

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

			var rowId,
				invalidInputs,
				invalidOutputs,
				isValid = true;

			switch ( zobjectType ) {
				// Validate ZFunction:
				// * Output type not set
				// * Input type not set
				case Constants.Z_FUNCTION:
					// invalid if a function doesn't have an output type
					invalidOutputs = context.getters.currentZFunctionInvalidOutput;
					if ( invalidOutputs.length > 0 ) {
						for ( const invalidRow of invalidOutputs ) {
							context.dispatch( 'setError', {
								rowId: invalidRow,
								errorCode: Constants.errorCodes.MISSING_FUNCTION_OUTPUT,
								errorType: Constants.errorTypes.ERROR
							} );
						}
						isValid = false;
					}

					// invalid if any of the non-empty inputs doesn't have a type
					invalidInputs = context.getters.currentZFunctionInvalidInputs;
					if ( invalidInputs.length > 0 ) {
						for ( const invalidRow of invalidInputs ) {
							context.dispatch( 'setError', {
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
		 * @param {boolean} param.disconnectFunctionObjects
		 * @return {Promise}
		 */
		submitZObject: function ( context, { summary, disconnectFunctionObjects = false } ) {
			context.dispatch( 'transformZObjectForSubmission', disconnectFunctionObjects );

			const zobject = canonicalize( convertZObjectTreetoJson( context.getters.getZObjectTable ) );

			return saveZObject(
				zobject,
				context.getters.isCreateNewPage ? undefined : context.getters.getCurrentZObjectId,
				summary
			);
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
			context.dispatch( 'removeEmptyMonolingualValues', Constants.Z_PERSISTENTOBJECT_LABEL );
			context.dispatch( 'removeEmptyMonolingualValues', Constants.Z_PERSISTENTOBJECT_DESCRIPTION );
			context.dispatch( 'removeEmptyAliasValues' );

			// If there are argument functions, remove empty argument labels and empty arguments
			const functionArguments = context.getters.getRowByKeyPath( [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_ARGUMENTS
			], 0 );
			if ( functionArguments ) {
				context.dispatch( 'removeEmptyArguments' );
			}

			// TODO: If there are type keys, remove empty key labels

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
		 * Removes the name or description label language objects with empty monolingual
		 * string or language values from the global zobject.
		 *
		 * @param {Object} context
		 * @param {string} key Z_PERSISTENTOBJECT_LABEL or Z_PERSISTENTOBJECT_DESCRIPTION
		 */
		removeEmptyMonolingualValues: function ( context, key ) {
			const listRow = context.getters.getRowByKeyPath( [ key, Constants.Z_MULTILINGUALSTRING_VALUE ], 0 );
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
						context.dispatch( 'removeRowChildren', value.rowId );
						context.dispatch( 'removeRow', value.rowId );
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
					context.dispatch( 'removeRowChildren', alias.id );
					context.dispatch( 'removeRow', alias.id );
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
				context.dispatch( 'recalculateArgumentKeys', inputs[ 0 ].parent );
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
				context.dispatch( 'removeRowChildren', row.id );
				context.dispatch( 'removeRow', row.id );
			}
			// Disconnect testers
			const testerRow = context.getters.getRowByKeyPath( [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_TESTERS
			] );
			const testers = context.getters.getChildrenByParentRowId( testerRow.id ).slice( 1 );
			for ( const row of testers ) {
				context.dispatch( 'removeRowChildren', row.id );
				context.dispatch( 'removeRow', row.id );
			}
		}
	}
};
