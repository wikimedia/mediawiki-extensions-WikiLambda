/*!
 * WikiLambda Vue editor: Function Editor and Viewer Pinia store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const Constants = require( '../../Constants.js' );
const createConnectedItemsChangesSummaryMessage = require( '../../mixins/utilsMixins.js' ).methods.createConnectedItemsChangesSummaryMessage;
const apiUtils = require( '../../mixins/api.js' ).methods;

module.exports = {
	state: {},

	getters: {
		/**
		 * Returns the function Zid of a given function given
		 * the function rowId. If not set, returns undefined
		 *
		 * @return {Function}
		 */
		getZFunctionIdentity: function () {
			/**
			 * @param {number} rowId
			 * @return {string | undefined}
			 */
			return ( rowId = 0 ) => {
				const functionZid = this.getRowByKeyPath( [
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_FUNCTION_IDENTITY
				], rowId );
				return functionZid ?
					this.getZReferenceTerminalValue( functionZid.id ) :
					undefined;
			};
		},

		/**
		 * Returns the list of input rows for the function given
		 * given the root object rowId. If no rowId given, starts
		 * from 0, which is safe to use.
		 *
		 * @return {Function}
		 */
		getZFunctionInputs: function () {
			/**
			 * @param {string} rowId
			 * @return {Array}
			 */
			return ( rowId = 0 ) => {
				const inputsRow = this.getRowByKeyPath( [
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_FUNCTION_ARGUMENTS
				], rowId );
				if ( inputsRow === undefined ) {
					return [];
				}
				const inputs = this.getChildrenByParentRowId( inputsRow.id );
				// Remove benjamin type item
				return inputs.slice( 1 );
			};
		},

		/**
		 * Returns the array of language Zids that are present
		 * for each of the function's input labels. If no arguments,
		 * returns an empty array.
		 *
		 * @return {Function}
		 */
		getZFunctionInputLangs: function () {
			/**
			 * @param {string} rowId
			 * @return {Array} Array of Arrays of language zids
			 */
			return ( rowId = 0 ) => {
				const languages = [];
				const inputs = this.getZFunctionInputs( rowId );
				for ( const inputRow of inputs ) {
					const inputLabelsRow = this.getRowByKeyPath( [
						Constants.Z_ARGUMENT_LABEL,
						Constants.Z_MULTILINGUALSTRING_VALUE
					], inputRow.id );
					const inputLangs = inputLabelsRow ?
						this.getZMultilingualLanguageList( inputLabelsRow.id ) :
						[];
					languages.push( inputLangs );
				}
				return languages;
			};
		},

		/**
		 * Returns the output type row for the function given
		 * given the root object rowId. If no rowId given, starts
		 * from 0, which is safe to use.
		 *
		 * @return {Function}
		 */
		getZFunctionOutput: function () {
			/**
			 * @param {number} rowId
			 * @return {Object|undefined}
			 */
			return ( rowId = 0 ) => this.getRowByKeyPath( [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_RETURN_TYPE
			], rowId );
		},

		/**
		 * Returns the input type row of an input or
		 * argument declaration, given the rowId of the
		 * argument/Z17 object.
		 *
		 * @return {Function}
		 */
		getZArgumentTypeRowId: function () {
			/**
			 * @param {number} rowId
			 * @return {number|undefined}
			 */
			return ( rowId = 0 ) => {
				const argType = this.getRowByKeyPath( [ Constants.Z_ARGUMENT_TYPE ], rowId );
				return argType ? argType.id : undefined;
			};
		},

		/**
		 * Returns the terminal string value of the input key
		 *
		 * @return {Function}
		 */
		getZArgumentKey: function () {
			/**
			 * @param {number} rowId
			 * @return {string|undefined}
			 */
			return ( rowId = 0 ) => {
				const argKey = this.getRowByKeyPath( [ Constants.Z_ARGUMENT_KEY ], rowId );
				return argKey ? this.getZStringTerminalValue( argKey.id ) : undefined;
			};
		},

		/**
		 * Returns the input label row of an input or
		 * argument declaration, given the rowId of the
		 * argument/Z17 object and the language Zid.
		 *
		 * @return {Function}
		 */
		getZArgumentLabelForLanguage: function () {
			/**
			 * @param {string} rowId
			 * @param {string} lang
			 * @return {Object|undefined}
			 */
			return ( rowId, lang ) => {
				const argLabelsRow = this.getRowByKeyPath( [
					Constants.Z_ARGUMENT_LABEL,
					Constants.Z_MULTILINGUALSTRING_VALUE
				], rowId );
				const argLabels = argLabelsRow ?
					this.getChildrenByParentRowId( argLabelsRow.id ).slice( 1 ) :
					[];
				return argLabels.find( ( monolingual ) => {
					const langZid = this.getZMonolingualLangValue( monolingual.id );
					return langZid === lang;
				} );
			};
		},

		/**
		 * Returns ZIDs for testers connected to the root function.
		 * Note that this returns an array of only items, without the type from index 0.
		 *
		 * @return {Function}
		 */
		getConnectedTests: function () {
			/**
			 * @param {number} rowId
			 * @return {Array}
			 */
			return ( rowId = 0 ) => {
				const testsRow = this.getRowByKeyPath( [
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_FUNCTION_TESTERS
				], rowId );

				if ( !testsRow ) {
					return [];
				}
				const childRows = this.getChildrenByParentRowId( testsRow.id ).slice( 1 );
				return childRows.map( ( row ) => this.getZReferenceTerminalValue( row.id ) );
			};
		},

		/**
		 * Returns ZIDs for implementations connected to the root function.
		 * Note that this returns an array of only items, without the type from index 0.
		 *
		 * @return {Function}
		 */
		getConnectedImplementations: function () {
			/**
			 * @param {string} rowId
			 * @return {Array}
			 */
			return ( rowId = 0 ) => {
				const implementationsRow = this.getRowByKeyPath( [
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_FUNCTION_IMPLEMENTATIONS
				], rowId );

				if ( !implementationsRow ) {
					return [];
				}
				const childRows = this.getChildrenByParentRowId( implementationsRow.id ).slice( 1 );
				return childRows.map( ( row ) => this.getZReferenceTerminalValue( row.id ) );
			};
		},

		/**
		 * Returns the array of input-related field ids that are invalid.
		 * Ignores those inputs that have no label and fully empty type
		 * because it will be deleted before submission.
		 *
		 * @return {Array}
		 */
		getInvalidInputFields: function () {
			const inputs = this.getZFunctionInputs();
			let invalidRowIds = [];
			for ( const inputRow of inputs ) {
				// Get the validity state of all the type fields
				const inputTypeRow = this.getRowByKeyPath( [ Constants.Z_ARGUMENT_TYPE ], inputRow.id );
				const inputTypeFields = this.validateGenericType( inputTypeRow.id );

				// Get the values of the input labels
				const inputLabelsRow = this.getRowByKeyPath( [
					Constants.Z_ARGUMENT_LABEL,
					Constants.Z_MULTILINGUALSTRING_VALUE
				], inputRow.id );
				const inputLabelRows = this.getChildrenByParentRowId( inputLabelsRow.id ).slice( 1 );
				const inputLabelValues = inputLabelRows
					.map( ( row ) => this.getZMonolingualTextValue( row.id ) )
					.filter( ( text ) => !!text );

				// If type value is empty and fields are empty, ignore this input:
				// because it's totally empty, the input will be erased before submission.
				const inputTypeIsEmpty = ( inputTypeFields.filter( ( e ) => e.isValid ).length === 0 );
				if ( inputTypeIsEmpty && inputLabelValues.length === 0 ) {
					continue;
				}

				// Return errors to report
				const invalidInputRowIds = inputTypeFields.filter( ( e ) => !e.isValid ).map( ( e ) => e.rowId );
				invalidRowIds = invalidRowIds.concat( invalidInputRowIds );
			}
			return invalidRowIds;
		},

		/**
		 * Returns the array of output-related field ids that are invalid.
		 *
		 * @return {Array}
		 */
		getInvalidOutputFields: function () {
			const outputTypeRow = this.getZFunctionOutput();
			const outputTypeFields = this.validateGenericType( outputTypeRow.id );
			return outputTypeFields.filter( ( e ) => !e.isValid ).map( ( e ) => e.rowId );
		}
	},

	actions: {
		/**
		 * Adds the given tests to the current function's list of
		 * of connected tests and persists the change.
		 *
		 * @param {Object} payload
		 * @param {string} payload.rowId - the rowId of the function
		 * @param {Array} payload.zids - the Zids of the tests to connect
		 * @return {Promise}
		 */
		connectTests: function ( payload ) {
			// Save a copy of the pre-submission ZObject in case the submission returns an error
			const zobjectCopy = this.getZObjectCopy;

			const listRow = this.getRowByKeyPath( [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_TESTERS
			], payload.rowId );

			this.pushValuesToList( { rowId: listRow.id, values: payload.zids } );
			return this.submitZObject( {
				summary: createConnectedItemsChangesSummaryMessage( 'wikilambda-updated-testers-approved-summary', payload.zids )
			} ).catch( ( /* ApiError */ e ) => {
				// Reset old ZObject if something failed
				this.setZObject( zobjectCopy );
				throw e;
			} );
		},

		/**
		 * Adds the given implementations to the current function's list of
		 * of connected implementations and persists the change.
		 *
		 * @param {Object} payload
		 * @param {string} payload.rowId - the rowId of the function
		 * @param {Array} payload.zids - the Zids of the implementations to connect
		 * @return {Promise}
		 */
		connectImplementations: function ( payload ) {
			// Save a copy of the pre-submission ZObject in case the submission returns an error
			const zobjectCopy = this.getZObjectCopy;

			const listRow = this.getRowByKeyPath( [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_IMPLEMENTATIONS
			], payload.rowId );

			this.pushValuesToList( { rowId: listRow.id, values: payload.zids } );
			return this.submitZObject( {
				summary: createConnectedItemsChangesSummaryMessage( 'wikilambda-updated-implementations-approved-summary', payload.zids )
			} )
				.then( () => this.updateStoredObject() )
				.catch( ( /* ApiError */ e ) => {
					// Reset old ZObject if something failed
					this.setZObject( zobjectCopy );
					throw e;
				} );
		},

		/**
		 * Removes the given tests from the the current function's list of
		 * of connected tests and persists the change.
		 *
		 * @param {Object} payload
		 * @param {Object} payload.rowId - the rowId of the function
		 * @param {Array} payload.zids - the Zids of the tests to disconnect
		 * @return {Promise}
		 */
		disconnectTests: function ( payload ) {
			// Save a copy of the pre-submission ZObject in case the submission returns an error
			const zobjectCopy = this.getZObjectCopy;

			// Find the item rows to delete from the list
			const listRow = this.getRowByKeyPath( [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_TESTERS
			], payload.rowId );
			const listItems = this.getChildrenByParentRowId( listRow.id ).slice( 1 );
			const deleteRows = listItems.filter( ( row ) => {
				const reference = this.getZReferenceTerminalValue( row.id );
				return payload.zids.includes( reference );
			} );

			// Delete items from the list and recalculate the list keys
			for ( const row of deleteRows ) {
				this.removeRowChildren( { rowId: row.id, removeParent: true } );
			}
			this.recalculateTypedListKeys( listRow.id );

			return this.submitZObject( {
				summary: createConnectedItemsChangesSummaryMessage( 'wikilambda-updated-testers-deactivated-summary', payload.zids )
			} ).catch( ( /* ApiError */ e ) => {
				// Reset old ZObject if something failed
				this.setZObject( zobjectCopy );
				throw e;
			} );
		},

		/**
		 * Removes the given implementations from the the current function's list of
		 * of connected implementations and persists the change.
		 *
		 * @param {Object} payload
		 * @param {Object} payload.rowId - the rowId of the function
		 * @param {Array} payload.zids - the Zids of the implementations to disconnect
		 * @return {Promise}
		 */
		disconnectImplementations: function ( payload ) {
			const zobjectCopy = this.getZObjectCopy;

			// Find the item rows to delete from the list
			const listRow = this.getRowByKeyPath( [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_IMPLEMENTATIONS
			], payload.rowId );
			const listItems = this.getChildrenByParentRowId( listRow.id ).slice( 1 );
			const deleteRows = listItems.filter( ( row ) => {
				const reference = this.getZReferenceTerminalValue( row.id );
				return payload.zids.includes( reference );
			} );

			// Delete items from the list and recalculate the list keys
			for ( const row of deleteRows ) {
				this.removeRowChildren( { rowId: row.id, removeParent: true } );
			}
			this.recalculateTypedListKeys( listRow.id );

			return this.submitZObject( {
				summary: createConnectedItemsChangesSummaryMessage( 'wikilambda-updated-implementations-deactivated-summary', payload.zids )
			} )
				.then( () => this.updateStoredObject() )
				.catch( ( /* ApiError */ e ) => {
					// Reset old ZObject if something failed
					this.setZObject( zobjectCopy );
					throw e;
				} );
		},

		/**
		 * Triggers the fetch of all (connected and disconnected) tests for the i
		 * given function Zid. Also fetches other relevant object Zids.
		 *
		 * @param {string} functionZid
		 * @return {Promise}
		 */
		fetchTests: function ( functionZid ) {
			return apiUtils.fetchFunctionObjects( {
				functionZid,
				type: Constants.Z_TESTER
			} ).then( ( items ) => {
				const zids = items.map( ( item ) => item.zid );
				this.fetchZids( { zids } );
				return zids;
			} );
		},

		/**
		 * Triggers the fetch of all (connected and disconnected) implementations for the given
		 * functionZid. Also fetches other relevant object Zids.
		 *
		 * @param {string} functionZid
		 * @return {Promise}
		 */
		fetchImplementations: function ( functionZid ) {
			return apiUtils.fetchFunctionObjects( {
				functionZid,
				type: Constants.Z_IMPLEMENTATION
			} ).then( ( items ) => {
				const zids = items.map( ( item ) => item.zid );
				this.fetchZids( { zids } );
				return zids;
			} );
		}
	}
};
