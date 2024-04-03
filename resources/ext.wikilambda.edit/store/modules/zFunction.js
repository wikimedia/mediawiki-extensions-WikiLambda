/*!
 * WikiLambda Vue editor: Function Editor Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const Constants = require( '../../Constants.js' ),
	apiUtils = require( '../../mixins/api.js' ).methods;

module.exports = exports = {
	getters: {
		/**
		 * Returns the function Zid of a given function given
		 * the function rowId. If not set, returns undefined
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZFunctionIdentity: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {string | undefined}
			 */
			function findIdentity( rowId = 0 ) {
				const functionZid = getters.getRowByKeyPath( [
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_FUNCTION_IDENTITY
				], rowId );
				return functionZid ?
					getters.getZReferenceTerminalValue( functionZid.id ) :
					undefined;
			}
			return findIdentity;
		},
		/**
		 * Returns the list of input rows for the function given
		 * given the root object rowId. If no rowId given, starts
		 * from 0, which is safe to use.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZFunctionInputs: function ( _state, getters ) {
			/**
			 * @param {string} rowId
			 * @return {Array}
			 */
			function findZFunctionInputs( rowId = 0 ) {
				const inputsRow = getters.getRowByKeyPath( [
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_FUNCTION_ARGUMENTS
				], rowId );
				if ( inputsRow === undefined ) {
					return [];
				}
				const inputs = getters.getChildrenByParentRowId( inputsRow.id );
				// Remove benjamin type item
				return inputs.slice( 1 );
			}
			return findZFunctionInputs;
		},
		/**
		 * Returns the array of language Zids that are present
		 * in a function's input labels. If no arguments or no
		 * labels, returns an empty array.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZFunctionInputLangs: function ( _state, getters ) {
			/**
			 * @param {string} rowId
			 * @return {Array}
			 */
			function findInputLangs( rowId = 0 ) {
				let languages = [];
				const inputs = getters.getZFunctionInputs( rowId );
				for ( const inputRow of inputs ) {
					const inputLabelsRow = getters.getRowByKeyPath( [
						Constants.Z_ARGUMENT_LABEL,
						Constants.Z_MULTILINGUALSTRING_VALUE
					], inputRow.id );
					const inputLangs = inputLabelsRow ?
						getters.getZMultilingualLanguageList( inputLabelsRow.id ) :
						[];
					languages = languages.concat( inputLangs );
				}
				return languages;
			}

			return findInputLangs;
		},
		/**
		 * Returns the output type row for the function given
		 * given the root object rowId. If no rowId given, starts
		 * from 0, which is safe to use.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZFunctionOutput: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {Object|undefined}
			 */
			function findZFunctionOutput( rowId = 0 ) {
				return getters.getRowByKeyPath( [
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_FUNCTION_RETURN_TYPE
				], rowId );
			}
			return findZFunctionOutput;
		},
		/**
		 * Returns the input type row of an input or
		 * argument declaration, given the rowId of the
		 * argument/Z17 object.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZArgumentTypeRowId: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {number|undefined}
			 */
			function findArgumentType( rowId ) {
				const argType = getters.getRowByKeyPath( [ Constants.Z_ARGUMENT_TYPE ], rowId );
				return argType ? argType.id : undefined;
			}
			return findArgumentType;
		},
		/**
		 * Returns the terminal string value of the input key
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZArgumentKey: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {string|undefined}
			 */
			function findArgumentType( rowId ) {
				const argKey = getters.getRowByKeyPath( [ Constants.Z_ARGUMENT_KEY ], rowId );
				return argKey ? getters.getZStringTerminalValue( argKey.id ) : undefined;
			}
			return findArgumentType;
		},
		/**
		 * Returns the input label row of an input or
		 * argument declaration, given the rowId of the
		 * argument/Z17 object and the language Zid.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZArgumentLabelForLanguage: function ( _state, getters ) {
			/**
			 * @param {string} rowId
			 * @param {string} lang
			 * @return {Object|undefined}
			 */
			function findArgumentLabel( rowId, lang ) {
				const argLabelsRow = getters.getRowByKeyPath( [
					Constants.Z_ARGUMENT_LABEL,
					Constants.Z_MULTILINGUALSTRING_VALUE
				], rowId );
				const argLabels = argLabelsRow ?
					getters.getChildrenByParentRowId( argLabelsRow.id ).slice( 1 ) :
					[];
				const argLabel = argLabels.find( ( monolingual ) => {
					const langZid = getters.getZMonolingualLangValue( monolingual.id );
					return langZid === lang;
				} );
				return argLabel;
			}
			return findArgumentLabel;
		},
		/**
		 * Returns ZIDs for testers connected to the root function.
		 * Note that this returns an array of only items, without the type from index 0.
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getConnectedTests: function ( state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {Array}
			 */
			return function ( rowId ) {
				const testsRow = getters.getRowByKeyPath( [
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_FUNCTION_TESTERS
				], rowId );

				if ( !testsRow ) {
					return [];
				}
				const childRows = getters.getChildrenByParentRowId( testsRow.id ).slice( 1 );
				return childRows.map( ( row ) => getters.getZReferenceTerminalValue( row.id ) );
			};
		},
		/**
		 * Returns ZIDs for implementations connected to the root function.
		 * Note that this returns an array of only items, without the type from index 0.
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getConnectedImplementations: function ( state, getters ) {
			/**
			 * @param {string} rowId
			 * @return {Array}
			 */
			return function ( rowId ) {
				const implementationsRow = getters.getRowByKeyPath( [
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_FUNCTION_IMPLEMENTATIONS
				], rowId );

				if ( !implementationsRow ) {
					return [];
				}
				const childRows = getters.getChildrenByParentRowId( implementationsRow.id ).slice( 1 );
				return childRows.map( ( row ) => getters.getZReferenceTerminalValue( row.id ) );
			};
		}
	},
	actions: {
		/**
		 * Adds the given tests to the current function's list of
		 * of connected tests and persists the change.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {string} payload.rowId - the rowId of the function
		 * @param {Array} payload.zids - the Zids of the tests to connect
		 * @return {Promise}
		 */
		connectTests: function ( context, payload ) {
			// Save a copy of the pre-submission ZObject in case the submission returns an error
			const zobjectCopy = context.getters.getZObjectCopy;

			const listRow = context.getters.getRowByKeyPath( [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_TESTERS
			], payload.rowId );

			return context
				.dispatch( 'pushValuesToList', { rowId: listRow.id, values: payload.zids } )
				.then( () => {
					return context.dispatch( 'submitZObject', '' ).catch( ( e ) => {
						// Reset old ZObject if something failed
						context.commit( 'setZObject', zobjectCopy );
						throw e;
					} );
				} );
		},
		/**
		 * Adds the given implementations to the current function's list of
		 * of connected implementations and persists the change.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {string} payload.rowId - the rowId of the function
		 * @param {Array} payload.zids - the Zids of the implementations to connect
		 * @return {Promise}
		 */
		connectImplementations: function ( context, payload ) {
			// Save a copy of the pre-submission ZObject in case the submission returns an error
			const zobjectCopy = context.getters.getZObjectCopy;

			const listRow = context.getters.getRowByKeyPath( [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_IMPLEMENTATIONS
			], payload.rowId );

			return context
				.dispatch( 'pushValuesToList', { rowId: listRow.id, values: payload.zids } )
				.then( () => {
					return context.dispatch( 'submitZObject', '' ).catch( ( e ) => {
						// Reset old ZObject if something failed
						context.commit( 'setZObject', zobjectCopy );
						throw e;
					} );
				} );
		},
		/**
		 * Removes the given tests from the the current function's list of
		 * of connected tests and persists the change.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {Object} payload.rowId - the rowId of the function
		 * @param {Array} payload.zids - the Zids of the tests to disconnect
		 * @return {Promise}
		 */
		disconnectTests: function ( context, payload ) {
			// Save a copy of the pre-submission ZObject in case the submission returns an error
			const zobjectCopy = context.getters.getZObjectCopy;

			// Find the item rows to delete from the list
			const listRow = context.getters.getRowByKeyPath( [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_TESTERS
			], payload.rowId );
			const listItems = context.getters.getChildrenByParentRowId( listRow.id ).slice( 1 );
			const deleteRows = listItems.filter( ( row ) => {
				const reference = context.getters.getZReferenceTerminalValue( row.id );
				return payload.zids.includes( reference );
			} );

			// Delete items from the list and recalculate the list keys
			for ( const row of deleteRows ) {
				context.dispatch( 'removeRowChildren', row.id );
				context.dispatch( 'removeRow', row.id );
			}
			context.dispatch( 'recalculateTypedListKeys', listRow.id );

			return context.dispatch( 'submitZObject', '' ).catch( ( e ) => {
				// Reset old ZObject if something failed
				context.commit( 'setZObject', zobjectCopy );
				throw e;
			} );
		},
		/**
		 * Removes the given implementations from the the current function's list of
		 * of connected implementations and persists the change.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {Object} payload.rowId - the rowId of the function
		 * @param {Array} payload.zids - the Zids of the implementations to disconnect
		 * @return {Promise}
		 */
		disconnectImplementations: function ( context, payload ) {
			const zobjectCopy = context.getters.getZObjectCopy;

			// Find the item rows to delete from the list
			const listRow = context.getters.getRowByKeyPath( [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_IMPLEMENTATIONS
			], payload.rowId );
			const listItems = context.getters.getChildrenByParentRowId( listRow.id ).slice( 1 );
			const deleteRows = listItems.filter( ( row ) => {
				const reference = context.getters.getZReferenceTerminalValue( row.id );
				return payload.zids.includes( reference );
			} );

			// Delete items from the list and recalculate the list keys
			for ( const row of deleteRows ) {
				context.dispatch( 'removeRowChildren', row.id );
				context.dispatch( 'removeRow', row.id );
			}
			context.dispatch( 'recalculateTypedListKeys', listRow.id );

			return context.dispatch( 'submitZObject', '' ).catch( ( e ) => {
				// Reset old ZObject if something failed
				context.commit( 'setZObject', zobjectCopy );
				throw e;
			} );
		},
		/**
		 * Triggers the fetch of all (connected and disconnected) tests for the i
		 * given function Zid. Also fetches other relevant object Zids.
		 *
		 * @param {Object} context
		 * @param {string} functionZid
		 * @return {Promise}
		 */
		fetchTests: function ( context, functionZid ) {
			return apiUtils.fetchFunctionObjects( {
				functionZid,
				type: Constants.Z_TESTER
			} ).then( ( items ) => {
				const zids = items.map( ( item ) => item.zid );
				context.dispatch( 'fetchZids', { zids } );
				return zids;
			} );
		},
		/**
		 * Triggers the fetch of all (connected and disconnected) implementations for the given
		 * functionZid. Also fetches other relevant object Zids.
		 *
		 * @param {Object} context
		 * @param {string} functionZid
		 * @return {Promise}
		 */
		fetchImplementations: function ( context, functionZid ) {
			return apiUtils.fetchFunctionObjects( {
				functionZid,
				type: Constants.Z_IMPLEMENTATION
			} ).then( ( items ) => {
				const zids = items.map( ( item ) => item.zid );
				context.dispatch( 'fetchZids', { zids } );
				return zids;
			} );
		}
	}
};
