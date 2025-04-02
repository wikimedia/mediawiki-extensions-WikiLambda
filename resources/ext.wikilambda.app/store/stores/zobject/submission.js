/*!
 * WikiLambda Pinia store: ZObject store to handle pre-submission
 * actions (validation, transformations, and submission)
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { saveZObject } = require( '../../../utils/apiUtils.js' );
const Constants = require( '../../../Constants.js' );
const { convertTableToJson } = require( '../../../utils/zobjectUtils.js' );
const { hybridToCanonical } = require( '../../../utils/schemata.js' );
const { isTruthyOrEqual } = require( '../../../utils/typeUtils.js' );

module.exports = {
	state: {},

	getters: {},

	actions: {
		/**
		 * Return a boolean indicating if the current Z Object is valid based on type requirements
		 * Update error store with any errors found while validating
		 *
		 * @return {boolean}
		 */
		validateZObject: function () {
			const zobjectType = this.getCurrentZObjectType;
			const zobject = this.getZObjectAsJson;
			const contentRowId = this.getZPersistentContentRowId();
			const innerObject = zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ];

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
					invalidOutputs = this.getInvalidOutputFields;
					if ( invalidOutputs.length > 0 ) {
						for ( const invalidRow of invalidOutputs ) {
							this.setError( {
								rowId: invalidRow,
								errorCode: Constants.ERROR_CODES.MISSING_FUNCTION_OUTPUT,
								errorType: Constants.ERROR_TYPES.ERROR
							} );
						}
						isValid = false;
					}

					// invalid if any of the non-empty inputs doesn't have a type
					invalidInputs = this.getInvalidInputFields;
					if ( invalidInputs.length > 0 ) {
						for ( const invalidRow of invalidInputs ) {
							this.setError( {
								rowId: invalidRow,
								errorCode: Constants.ERROR_CODES.MISSING_FUNCTION_INPUT_TYPE,
								errorType: Constants.ERROR_TYPES.ERROR
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
						rowId = this.getZImplementationFunctionRowId( contentRowId );
						this.setError( {
							rowId,
							errorCode: Constants.ERROR_CODES.MISSING_TARGET_FUNCTION,
							errorType: Constants.ERROR_TYPES.ERROR
						} );
						isValid = false;
					}

					// if implementation type is composition
					if ( innerObject[ Constants.Z_IMPLEMENTATION_COMPOSITION ] ) {
						// invalid if composition hasn't been defined
						// or if composition has an undefined Z7K1
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
							rowId = this.getZImplementationContentRowId(
								contentRowId,
								Constants.Z_IMPLEMENTATION_COMPOSITION
							);
							this.setError( {
								rowId,
								errorCode: Constants.ERROR_CODES.MISSING_IMPLEMENTATION_COMPOSITION,
								errorType: Constants.ERROR_TYPES.ERROR
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
							rowId = this.getZImplementationContentRowId(
								contentRowId,
								Constants.Z_IMPLEMENTATION_CODE
							);
							const langRow = this.getRowByKeyPath( [
								Constants.Z_CODE_LANGUAGE
							], rowId );
							this.setError( {
								rowId: langRow.id,
								errorCode: Constants.ERROR_CODES.MISSING_IMPLEMENTATION_CODE_LANGUAGE,
								errorType: Constants.ERROR_TYPES.ERROR
							} );
							isValid = false;
						}

						// invalid if no code is defined
						if ( !isTruthyOrEqual( innerObject, [
							Constants.Z_IMPLEMENTATION_CODE,
							Constants.Z_CODE_CODE,
							Constants.Z_STRING_VALUE
						] ) ) {
							rowId = this.getZImplementationContentRowId(
								contentRowId,
								Constants.Z_IMPLEMENTATION_CODE
							);
							const codeRow = this.getRowByKeyPath( [
								Constants.Z_CODE_CODE,
								Constants.Z_STRING_VALUE
							], rowId );
							this.setError( {
								rowId: codeRow.id,
								errorCode: Constants.ERROR_CODES.MISSING_IMPLEMENTATION_CODE,
								errorType: Constants.ERROR_TYPES.ERROR
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
						rowId = this.getZTesterFunctionRowId( contentRowId );
						this.setError( {
							rowId,
							errorCode: Constants.ERROR_CODES.MISSING_TARGET_FUNCTION,
							errorType: Constants.ERROR_TYPES.ERROR
						} );
						isValid = false;
					}

					// invalid if no function call is set
					if ( !isTruthyOrEqual( innerObject, [
						Constants.Z_TESTER_CALL,
						Constants.Z_FUNCTION_CALL_FUNCTION,
						Constants.Z_REFERENCE_ID
					] ) ) {
						rowId = this.getZTesterCallRowId( contentRowId );
						this.setError( {
							rowId,
							errorCode: Constants.ERROR_CODES.MISSING_TESTER_CALL,
							errorType: Constants.ERROR_TYPES.ERROR
						} );
						isValid = false;
					}

					// invalid if no result validation is set
					if ( !isTruthyOrEqual( innerObject, [
						Constants.Z_TESTER_VALIDATION,
						Constants.Z_FUNCTION_CALL_FUNCTION,
						Constants.Z_REFERENCE_ID
					] ) ) {
						rowId = this.getZTesterValidationRowId( contentRowId );
						this.setError( {
							rowId,
							errorCode: Constants.ERROR_CODES.MISSING_TESTER_VALIDATION,
							errorType: Constants.ERROR_TYPES.ERROR
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
		 * @param {Object} param
		 * @param {Object} param.summary
		 * @param {boolean} param.disconnectFunctionObjects
		 * @return {Promise}
		 */
		submitZObject: function ( { summary, disconnectFunctionObjects = false } ) {
			this.transformZObjectForSubmission( disconnectFunctionObjects );

			const zobject = hybridToCanonical( convertTableToJson( this.getZObjectTable ) );
			const zid = this.isCreateNewPage ? undefined : this.getCurrentZObjectId;

			return saveZObject( {
				zobject,
				zid,
				summary,
				language: this.getUserLangCode
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
		 * @param {boolean} disconnectFunctionObjects
		 */
		transformZObjectForSubmission: function ( disconnectFunctionObjects ) {
			// For all objects: remove empty monolingual string and monolingual stringsets
			this.removeEmptyMonolingualValues( { key: Constants.Z_PERSISTENTOBJECT_LABEL } );
			this.removeEmptyMonolingualValues( { key: Constants.Z_PERSISTENTOBJECT_DESCRIPTION } );
			this.removeEmptyAliasValues();

			const contentRow = this.getRowByKeyPath( [ Constants.Z_PERSISTENTOBJECT_VALUE ], 0 );
			const contentRowId = contentRow ? contentRow.id : 0;
			const type = this.getZObjectTypeByRowId( contentRowId );

			// If object is a function:
			if ( type === Constants.Z_FUNCTION ) {
				// 1. Clear empty monolingual strings
				// 2. Remove arguments with undefined type and label
				// 3. Rename misnumbered argument key Ids
				this.removeEmptyArguments();
			}

			// If object is a type:
			if ( type === Constants.Z_TYPE ) {
				// 1. Clear non-set render, parser and equality function keys
				// NOTE: Even if the render/parser/equality functions are mandatory, type creation
				// and editing needs to allow empty values initially to avoid circular dependencies.
				this.removeEmptyTypeFunctions( contentRowId );
				// 2. Rename misnumbered key Ids
				const keys = this.getRowByKeyPath( [ Constants.Z_TYPE_KEYS ], contentRowId );
				this.recalculateKeys( { listRowId: keys.id, key: Constants.Z_KEY_ID } );
				// 3. Remove empty key labels
				// 4. Set identity keys to false if boolean is not set
				const items = this.getChildrenByParentRowId( keys.id ).slice( 1 );
				items.forEach( ( item ) => {
					this.removeEmptyMonolingualValues( { key: Constants.Z_KEY_LABEL, rowId: item.id } );
					this.setEmptyIsIdentityAsFalse( item.id );
				} );
			}

			// If object is an error type:
			if ( type === Constants.Z_ERRORTYPE ) {
				// 1. Rename misnumbered key Ids
				const keys = this.getRowByKeyPath( [ Constants.Z_ERRORTYPE_KEYS ], contentRowId );
				this.recalculateKeys( { listRowId: keys.id, key: Constants.Z_KEY_ID } );
				// 2. Remove empty key labels
				// 3. Set identity keys to false if boolean is not set
				const items = this.getChildrenByParentRowId( keys.id ).slice( 1 );
				items.forEach( ( item ) => {
					this.removeEmptyMonolingualValues( { key: Constants.Z_KEY_LABEL, rowId: item.id } );
					this.setEmptyIsIdentityAsFalse( item.id );
				} );
			}

			// If a list has changed its type, remove invalid list items
			if ( this.hasInvalidListItems ) {
				const invalidLists = this.getInvalidListItems;
				for ( const parentRowId in invalidLists ) {
					this.removeItemsFromTypedList( {
						parentRowId: parseInt( parentRowId ),
						listItems: invalidLists[ parentRowId ]
					} );
				}
				// clear the collection of list items removed
				this.clearInvalidListItems();
			}

			// Disconnect implementations and testers if necessary
			if ( disconnectFunctionObjects ) {
				this.disconnectFunctionObjects();
			}
		},

		/**
		 * Given a key rowId, checks its Is Identity/Z3K4 key and,
		 * * if it doesn't exist, leaves it as it is
		 * * if it exists, but the value is empty, set the value as False
		 *
		 * @param {number} rowId
		 */
		setEmptyIsIdentityAsFalse: function ( rowId ) {
			const isIdentity = this.getRowByKeyPath( [ Constants.Z_KEY_IS_IDENTITY ], rowId );
			if ( !isIdentity ) {
				return;
			}

			const isIdentityType = this.getZObjectTypeByRowId( isIdentity.id );
			const isIdentityValue = isIdentityType === Constants.Z_BOOLEAN ?
				this.getZBooleanValue( isIdentity.id ) :
				this.getZReferenceTerminalValue( isIdentity.id );

			if ( !isIdentityValue ) {
				const value = this.createZReference( { value: Constants.Z_BOOLEAN_FALSE } );
				const keyPath = isIdentityType === Constants.Z_BOOLEAN ? [ Constants.Z_BOOLEAN_IDENTITY ] : [];
				this.setValueByRowIdAndPath( {
					rowId: isIdentity.id,
					keyPath,
					value
				} );
			}
		},

		/**
		 * Removes Z4K3/Validator, Z4K4/Equality, Z4K5/Renderer and Z4K6/Parser key values
		 * when the values are undefined. Assumes that the current object is a Type/Z4. Also
		 * assumes that the given functions are references, and never literals or function calls.
		 *
		 * @param {number} rowId
		 */
		removeEmptyTypeFunctions: function ( rowId ) {
			const keys = [
				Constants.Z_TYPE_VALIDATOR,
				Constants.Z_TYPE_EQUALITY,
				Constants.Z_TYPE_RENDERER,
				Constants.Z_TYPE_PARSER
			];

			for ( const key of keys ) {
				const keyRow = this.getRowByKeyPath( [ key ], rowId );
				if ( keyRow ) {
					const value = this.getZReferenceTerminalValue( keyRow.id );
					// If value is empty, remove the key altogether
					if ( !value ) {
						this.removeRowChildren( { rowId: keyRow.id, removeParent: true } );
					}
				}
			}
		},

		/**
		 * Removes the name or description label language objects with empty monolingual
		 * string or language values from the global zobject.
		 *
		 * @param {Object} payload
		 * @param {string} payload.key Z_PERSISTENTOBJECT_LABEL or Z_PERSISTENTOBJECT_DESCRIPTION
		 * @param {number} payload.rowId Starting rowId, default is 0
		 */
		removeEmptyMonolingualValues: function ( payload ) {
			const { key, rowId = 0 } = payload;
			const listRow = this.getRowByKeyPath( [ key, Constants.Z_MULTILINGUALSTRING_VALUE ], rowId );
			if ( !listRow ) {
				return;
			}
			const rows = this.getChildrenByParentRowId( listRow.id ).slice( 1 );
			const deleteRows = rows.filter( ( monolingualRow ) => {
				const labelString = this.getZMonolingualTextValue( monolingualRow.id );
				const languageValue = this.getZMonolingualLangValue( monolingualRow.id );
				return !labelString || !languageValue;
			} );
			const deleteRowIds = deleteRows.map( ( row ) => row.id );

			// Remove list of invalid items and, once all deleted, recalculate the array keys
			if ( deleteRowIds.length > 0 ) {
				this.removeItemsFromTypedList( {
					parentRowId: listRow.id,
					listItems: deleteRowIds
				} );
			}
		},

		/**
		 * Removes the alias label language objects with empty monolingual string
		 * or language values from the global zobject.
		 */
		removeEmptyAliasValues: function () {
			const aliasRow = this.getRowByKeyPath( [
				Constants.Z_PERSISTENTOBJECT_ALIASES,
				Constants.Z_MULTILINGUALSTRINGSET_VALUE
			] );

			if ( !aliasRow ) {
				return;
			}

			const aliasSet = this.getChildrenByParentRowId( aliasRow.id ).slice( 1 );
			for ( const alias of aliasSet ) {
				// Iterate over the values and remove empty ones
				const aliasValues = this.getZMonolingualStringsetValues( alias.id );
				const goodValues = [];
				for ( const value of aliasValues ) {
					if ( !value.value ) {
						this.removeRowChildren( { rowId: value.rowId, removeParent: true } );
					} else {
						goodValues.push( value );
					}
				}
				// If there are aliases left, recalculate list keys
				if ( goodValues.length > 0 ) {
					const listRow = this.getRowByKeyPath( [
						Constants.Z_MONOLINGUALSTRINGSET_VALUE
					], alias.id );
					this.recalculateTypedListKeys( listRow.id );
				}
				// If alias has no values or no language, remove whole alias
				const aliasLang = this.getZMonolingualStringsetLang( alias.id );
				if ( !aliasLang || goodValues.length === 0 ) {
					this.removeRowChildren( { rowId: alias.id, removeParent: true } );
				}
			}
			// Recalculate the keys of the list of monolingual string sets
			this.recalculateTypedListKeys( aliasRow.id );
		},

		/**
		 * Removes the function argument label language objects with empty monolingual
		 * string or language values from the global zobject.
		 */
		removeEmptyArguments: function () {
			// For every argument, we remove it from the list if:
			// 1. argument type is empty, and
			// 2. argument labels are empty
			// Else, we just clear the empty labels
			const inputs = this.getZFunctionInputs();
			for ( const inputRow of inputs ) {
				// Get the value of the input type
				const inputTypeRow = this.getRowByKeyPath( [ Constants.Z_ARGUMENT_TYPE ], inputRow.id );
				const inputTypeMode = this.getZObjectTypeByRowId( inputTypeRow.id );
				const inputTypeValue = ( inputTypeMode === Constants.Z_REFERENCE ) ?
					this.getZReferenceTerminalValue( inputTypeRow.id ) :
					this.getZFunctionCallFunctionId( inputTypeRow.id );

				// Get the input labels
				const inputLabelsRow = this.getRowByKeyPath( [
					Constants.Z_ARGUMENT_LABEL,
					Constants.Z_MULTILINGUALSTRING_VALUE
				], inputRow.id );
				const inputLabels = this.getChildrenByParentRowId( inputLabelsRow.id ).slice( 1 );

				// Remove labels with empty text or language
				const inputLabelValues = [];
				for ( const labelRow of inputLabels ) {
					const labelValue = this.getZMonolingualTextValue( labelRow.id );
					const languageValue = this.getZMonolingualLangValue( labelRow.id );
					if ( !labelValue || !languageValue ) {
						this.removeItemFromTypedList( { rowId: labelRow.id } );
					} else {
						inputLabelValues.push( labelValue );
					}
				}

				// If input is empty and labels are empty, remove this item
				if ( ( inputTypeValue === undefined ) && ( inputLabelValues.length === 0 ) ) {
					this.removeItemFromTypedList( { rowId: inputRow.id } );
				}
			}

			if ( inputs.length > 0 ) {
				this.recalculateKeys( {
					listRowId: inputs[ 0 ].parent,
					key: Constants.Z_ARGUMENT_KEY
				} );
			}
		},

		/**
		 * Remove implementation and tester from a ZObject
		 * The zObject has to be of type function
		 */
		disconnectFunctionObjects: function () {
			// Disconnect implementations
			const implementationRow = this.getRowByKeyPath( [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_IMPLEMENTATIONS
			] );
			const implementations = this.getChildrenByParentRowId( implementationRow.id ).slice( 1 );
			for ( const row of implementations ) {
				this.removeRowChildren( { rowId: row.id, removeParent: true } );
			}
			// Disconnect testers
			const testerRow = this.getRowByKeyPath( [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_TESTERS
			] );
			const testers = this.getChildrenByParentRowId( testerRow.id ).slice( 1 );
			for ( const row of testers ) {
				this.removeRowChildren( { rowId: row.id, removeParent: true } );
			}
		}

	}
};
