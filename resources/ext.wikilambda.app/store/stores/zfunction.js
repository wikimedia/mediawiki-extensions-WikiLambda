/*!
 * WikiLambda Vue editor: Function Editor and Viewer Pinia store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const Constants = require( '../../Constants.js' );
const { fetchFunctionObjects } = require( '../../utils/apiUtils.js' );
const { canonicalToHybrid } = require( '../../utils/schemata.js' );
const { createConnectedItemsChangesSummaryMessage } = require( '../../utils/miscUtils.js' );
const { createLabelComparator } = require( '../../utils/sortUtils.js' );
const {
	validateGenericType,
	getZMonolingualItemForLang,
	getZReferenceTerminalValue,
	getZStringTerminalValue
} = require( '../../utils/zobjectUtils.js' );

module.exports = {
	state: {},

	getters: {
		/**
		 * Returns the list of inputs of the root function.
		 *
		 * @return {Function}
		 */
		getZFunctionInputs: function () {
			const inputs = this.getZObjectByKeyPath( [
				Constants.STORED_OBJECTS.MAIN,
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_ARGUMENTS
			] );

			if ( !Array.isArray( inputs ) || !inputs.length ) {
				return [];
			}

			// Remove benjamin type item
			return inputs.slice( 1 );
		},

		/**
		 * Returns the array of input data: its label for a given language (if any)
		 * and general input information, sorted by the input key.
		 * For each input in the function, it returns:
		 * * keyPath: string key path to the monolingual object that contains the input
		 *   label for the given language, or undefined if the label doesn't exist yet.
		 * * value: terminal text value of the input label for the given language, or
		 *   empty string if it doesn't exist yet.
		 * * key: terminal string value of the input key.
		 * * type: whole content of the input type (object in hybrid form).
		 * * typeKeyPath: string key path to the input type.
		 *
		 * @param {string} lang
		 * @return {Function}
		 */
		getZFunctionInputLabels: function () {
			/**
			 * @param {string} lang
			 * @return {Array}
			 */
			const findInputLabels = ( lang ) => {
				const inputs = this.getZFunctionInputs;

				return inputs
					.map( ( input, index ) => {
						const inputKeyPath = [
							Constants.STORED_OBJECTS.MAIN,
							Constants.Z_PERSISTENTOBJECT_VALUE,
							Constants.Z_FUNCTION_ARGUMENTS,
							index + 1
						];
						const key = getZStringTerminalValue( input[ Constants.Z_ARGUMENT_KEY ] );
						const type = input[ Constants.Z_ARGUMENT_TYPE ];
						const typeKeyPath = [ ...inputKeyPath, Constants.Z_ARGUMENT_TYPE ].join( '.' );

						const label = getZMonolingualItemForLang( input[ Constants.Z_ARGUMENT_LABEL ], lang );
						const value = label ? label.value : '';
						const keyPath = label ?
							[
								...inputKeyPath,
								Constants.Z_ARGUMENT_LABEL,
								Constants.Z_MULTILINGUALSTRING_VALUE,
								label.index,
								Constants.Z_MONOLINGUALSTRING_VALUE
							].join( '.' ) :
							undefined;

						return { keyPath, value, key, type, typeKeyPath };
					} )
					// Natural sort for Z{number}K{number} format keys (e.g. Z1K1, Z1K2 ... Z1K9, Z1K10, Z1K11, etc.)
					// Uses 'en' language code for numeric sorting so it the order is the same for all languages.
					.sort( createLabelComparator( 'en', 'key' ) );
			};
			return findInputLabels;
		},

		/**
		 * Returns the output type for the root function.
		 *
		 * @return {Object}
		 */
		getZFunctionOutput: function () {
			return this.getZObjectByKeyPath( [
				Constants.STORED_OBJECTS.MAIN,
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_RETURN_TYPE
			] );
		},

		/**
		 * Returns ZIDs for testers connected to the root function.
		 * Note that this returns an array of only items, without the type from index 0.
		 *
		 * @return {Array}
		 */
		getConnectedTests: function () {
			const tests = this.getZObjectByKeyPath( [
				Constants.STORED_OBJECTS.MAIN,
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_TESTERS
			] );

			if ( !Array.isArray( tests ) ) {
				return [];
			}

			return tests.slice( 1 ).map( ( test ) => getZReferenceTerminalValue( test ) );
		},

		/**
		 * Returns ZIDs for implementations connected to the root function.
		 * Note that this returns an array of only items, without the type from index 0.
		 *
		 * @return {Array}
		 */
		getConnectedImplementations: function () {
			const implementations = this.getZObjectByKeyPath( [
				Constants.STORED_OBJECTS.MAIN,
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_IMPLEMENTATIONS
			] );

			if ( !implementations || !Array.isArray( implementations ) ) {
				return [];
			}

			return implementations.slice( 1 ).map( ( test ) => getZReferenceTerminalValue( test ) );
		},

		/**
		 * Returns the array of input-related field ids that are invalid.
		 * Ignores those inputs that have no label and fully empty type
		 * because it will be deleted before submission.
		 *
		 * @param {Object} state
		 * @return {Array}
		 */
		getValidatedInputFields: function () {
			const keyPath = [
				Constants.STORED_OBJECTS.MAIN,
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_ARGUMENTS
			];
			const zobject = this.getZObjectByKeyPath( keyPath );
			if ( !zobject ) {
				return [];
			}
			// All Argument declaration/Z17 objects, skip benjamin item
			const inputs = zobject.slice( 1 );
			const fields = [];

			inputs.forEach( ( input, index ) => {
				const labels = input[ Constants.Z_ARGUMENT_LABEL ][ Constants.Z_MULTILINGUALSTRING_VALUE ];
				// Labels multilingual only has benjamin item
				const noLabels = ( labels.length <= 1 );

				// If there's any label, proceed and validate recursively
				const inputIndex = String( Number( index ) + 1 );
				const inputTypeKeyPath = [ ...keyPath, inputIndex, Constants.Z_ARGUMENT_TYPE ];
				const inputType = input[ Constants.Z_ARGUMENT_TYPE ];
				const inputFields = validateGenericType( inputTypeKeyPath, inputType );

				// If there's no label and only one invalid field, we consider the input empty
				// and will be deleted on pre-submission transformations, so we don't report it
				const inputTypeUnset = inputFields.length === 1 && !inputFields[ 0 ].isValid;
				if ( noLabels && inputTypeUnset ) {
					return;
				}

				// Else, report the input fields validation status
				fields.push( ...inputFields );
			} );

			return fields;
		},

		/**
		 * Returns the array of output-related field ids that are invalid.
		 *
		 * @param {Object} state
		 * @return {Array}
		 */
		getValidatedOutputFields: function () {
			const keyPath = [
				Constants.STORED_OBJECTS.MAIN,
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_RETURN_TYPE
			];

			const output = this.getZObjectByKeyPath( keyPath );

			return validateGenericType( keyPath, output );
		}
	},

	actions: {
		/**
		 * Adds the given tests to the current function's list of
		 * of connected tests and persists the change.
		 *
		 * @param {Object} payload
		 * @param {Array} payload.zids - the Zids of the tests to connect
		 * @return {Promise}
		 */
		connectTests: function ( payload ) {
			// Save a copy of the pre-submission ZObject in case the submission returns an error
			const zobjectCopy = JSON.parse( JSON.stringify( this.getJsonObject( Constants.STORED_OBJECTS.MAIN ) ) );

			// Push items
			this.pushItemsByKeyPath( {
				keyPath: [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_FUNCTION_TESTERS
				],
				values: payload.zids.map( ( zid ) => canonicalToHybrid( zid ) )
			} );

			return this.submitZObject( {
				summary: createConnectedItemsChangesSummaryMessage( 'wikilambda-updated-testers-approved-summary', payload.zids )
			} ).catch( ( /* ApiError */ e ) => {
				// Reset old ZObject if something failed
				this.setJsonObject( { namespace: Constants.STORED_OBJECTS.MAIN, zobject: zobjectCopy } );
				throw e;
			} );
		},

		/**
		 * Adds the given implementations to the current function's list of
		 * of connected implementations and persists the change.
		 *
		 * @param {Object} payload
		 * @param {Array} payload.zids - the Zids of the implementations to connect
		 * @return {Promise}
		 */
		connectImplementations: function ( payload ) {
			// Save a copy of the pre-submission ZObject in case the submission returns an error
			const zobjectCopy = JSON.parse( JSON.stringify( this.getJsonObject( Constants.STORED_OBJECTS.MAIN ) ) );

			// Push items
			this.pushItemsByKeyPath( {
				keyPath: [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_FUNCTION_IMPLEMENTATIONS
				],
				values: payload.zids.map( ( zid ) => canonicalToHybrid( zid ) )
			} );

			return this.submitZObject( {
				summary: createConnectedItemsChangesSummaryMessage( 'wikilambda-updated-implementations-approved-summary', payload.zids )
			} )
				.then( () => this.updateStoredObject() )
				.catch( ( /* ApiError */ e ) => {
					// Reset old ZObject if something failed
					this.setJsonObject( { namespace: Constants.STORED_OBJECTS.MAIN, zobject: zobjectCopy } );
					throw e;
				} );
		},

		/**
		 * Removes the given tests from the the current function's list of
		 * of connected tests and persists the change.
		 *
		 * @param {Object} payload
		 * @param {Array} payload.zids - the Zids of the tests to disconnect
		 * @return {Promise}
		 */
		disconnectTests: function ( payload ) {
			// Save a copy of the pre-submission ZObject in case the submission returns an error
			const zobjectCopy = JSON.parse( JSON.stringify( this.getJsonObject( Constants.STORED_OBJECTS.MAIN ) ) );

			// Find the item indexes to delete from the list
			const keyPath = [
				Constants.STORED_OBJECTS.MAIN,
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_TESTERS
			];

			// Find the indexes of the items to delete given the terminal zids
			// Exclude indexes -1 (not found) or 0 (benjamin item)
			const list = this.getZObjectByKeyPath( keyPath );
			const indexes = payload.zids
				.map( ( zid ) => list.findIndex( ( ref ) => getZReferenceTerminalValue( ref ) === zid ) )
				.filter( ( index ) => index > 0 );

			this.deleteListItemsByKeyPath( { keyPath, indexes } );

			return this.submitZObject( {
				summary: createConnectedItemsChangesSummaryMessage( 'wikilambda-updated-testers-deactivated-summary', payload.zids )
			} ).catch( ( /* ApiError */ e ) => {
				// Reset old ZObject if something failed
				this.setJsonObject( { namespace: Constants.STORED_OBJECTS.MAIN, zobject: zobjectCopy } );
				throw e;
			} );
		},

		/**
		 * Removes the given implementations from the the current function's list of
		 * of connected implementations and persists the change.
		 *
		 * @param {Object} payload
		 * @param {Array} payload.zids - the Zids of the implementations to disconnect
		 * @return {Promise}
		 */
		disconnectImplementations: function ( payload ) {
			const zobjectCopy = JSON.parse( JSON.stringify( this.getJsonObject( Constants.STORED_OBJECTS.MAIN ) ) );

			// Find the item indexes to delete from the list
			const keyPath = [
				Constants.STORED_OBJECTS.MAIN,
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_IMPLEMENTATIONS
			];

			// Find the indexes of the items to delete given the terminal zids
			// Exclude indexes -1 (not found) or 0 (benjamin item)
			const list = this.getZObjectByKeyPath( keyPath );
			const indexes = payload.zids
				.map( ( zid ) => list.findIndex( ( ref ) => getZReferenceTerminalValue( ref ) === zid ) )
				.filter( ( index ) => index > 0 );

			this.deleteListItemsByKeyPath( { keyPath, indexes } );

			return this.submitZObject( {
				summary: createConnectedItemsChangesSummaryMessage( 'wikilambda-updated-implementations-deactivated-summary', payload.zids )
			} )
				.then( () => this.updateStoredObject() )
				.catch( ( /* ApiError */ e ) => {
					// Reset old ZObject if something failed
					this.setJsonObject( { namespace: Constants.STORED_OBJECTS.MAIN, zobject: zobjectCopy } );
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
			return fetchFunctionObjects( {
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
			return fetchFunctionObjects( {
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
