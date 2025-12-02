/*!
 * WikiLambda Pinia store: ZObject store to handle pre-submission
 * actions (validation, transformations, and submission)
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { saveZObject } = require( '../../utils/apiUtils.js' );
const Constants = require( '../../Constants.js' );
const { canonicalToHybrid, hybridToCanonical } = require( '../../utils/schemata.js' );
const {
	getZObjectType,
	getZCodeString,
	getZCodeProgrammingLanguageId,
	getZFunctionCallFunctionId,
	getZMonolingualStringsetLang,
	getZMonolingualStringsetValues,
	getZMonolingualTextValue,
	getZMonolingualLangValue,
	getZStringTerminalValue,
	getZReferenceTerminalValue,
	validateFunctionCall
} = require( '../../utils/zobjectUtils.js' );

module.exports = {
	state: {
		// Flag to show publish success message
		showPublishSuccess: false
	},
	getters: {
		/**
		 * Returns whether to show the publish success message
		 *
		 * @return {boolean}
		 */
		getShowPublishSuccess: function () {
			return this.showPublishSuccess;
		}
	},
	actions: {
		/**
		 * Return a boolean indicating if the current Z Object is valid based on type requirements
		 * Update error store with any errors found while validating
		 *
		 * @return {boolean}
		 */
		validateZObject: function () {
			const zobjectType = this.getCurrentZObjectType;
			const zobject = this.getJsonObject( Constants.STORED_OBJECTS.MAIN );
			const innerObject = zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ];
			const innerKeyPath = [ Constants.STORED_OBJECTS.MAIN, Constants.Z_PERSISTENTOBJECT_VALUE ];

			let isValid = true;
			// Track the paths that have been validated
			const validatedPaths = new Set();

			switch ( zobjectType ) {
				// Validate ZFunction:
				// * Output type not set
				// * Input type not set
				case Constants.Z_FUNCTION:
					// Validate output fields
					this.getValidatedOutputFields.forEach( ( field ) => {
						if ( !field.isValid ) {
							this.setError( {
								errorId: field.keyPath,
								errorMessageKey: 'wikilambda-missing-function-output-error-message',
								errorType: Constants.ERROR_TYPES.ERROR
							} );
							validatedPaths.add( field.keyPath );
							isValid = false;
						}
					} );
					// Validate input fields
					this.getValidatedInputFields.forEach( ( field ) => {
						if ( !field.isValid ) {
							this.setError( {
								errorId: field.keyPath,
								errorMessageKey: 'wikilambda-missing-function-input-type-error-message',
								errorType: Constants.ERROR_TYPES.ERROR
							} );
							validatedPaths.add( field.keyPath );
							isValid = false;
						}
					} );
					break;

				// Validate ZImplementation:
				// * Implementation function is not defined (Z14K1)
				// * Composition implementation has undefined function call (Z14K2.Z7K1)
				//   or argument reference (Z14K2.Z18K1)
				// * Code implementation has undefined code string (Z14K3.Z16K2)
				case Constants.Z_IMPLEMENTATION: {
					// Validate: Target Function not defined
					if ( !this.getCurrentTargetFunctionZid ) {
						const targetFunctionPath = [ ...innerKeyPath, Constants.Z_IMPLEMENTATION_FUNCTION ].join( '.' );
						this.setError( {
							errorId: targetFunctionPath,
							errorMessageKey: 'wikilambda-zobject-missing-attached-function',
							errorType: Constants.ERROR_TYPES.ERROR
						} );
						validatedPaths.add( targetFunctionPath );
						isValid = false;
					}

					const implementationType = this.getCurrentZImplementationType;

					// Validate: Composition implementation
					if ( implementationType === Constants.Z_IMPLEMENTATION_COMPOSITION ) {
						const composition = innerObject[ Constants.Z_IMPLEMENTATION_COMPOSITION ];
						// We only validate if the composition is a function call,
						// if if's a literal object we leave validation for php side
						// as it would be extremely complex to validate the fields.
						if ( getZObjectType( composition ) === Constants.Z_FUNCTION_CALL ) {
							const compositionKeyPath = [ ...innerKeyPath, Constants.Z_IMPLEMENTATION_COMPOSITION ];
							const validatedFields = validateFunctionCall( compositionKeyPath, composition );

							validatedFields.forEach( ( field ) => {
								if ( !field.isValid ) {
									this.setError( {
										errorId: field.keyPath,
										errorMessageKey: 'wikilambda-zimplememntation-composition-missing',
										errorType: Constants.ERROR_TYPES.ERROR
									} );
									validatedPaths.add( field.keyPath );
									isValid = false;
								}
							} );
						}
					}

					// Validate: Code implementation
					if ( implementationType === Constants.Z_IMPLEMENTATION_CODE ) {
						const code = innerObject[ Constants.Z_IMPLEMENTATION_CODE ];

						if ( !getZCodeProgrammingLanguageId( code ) ) {
							const languagePath = [ ...innerKeyPath,
								Constants.Z_IMPLEMENTATION_CODE,
								Constants.Z_CODE_LANGUAGE
							].join( '.' );
							this.setError( {
								errorId: languagePath,
								errorMessageKey: 'wikilambda-zimplementation-code-language-missing',
								errorType: Constants.ERROR_TYPES.ERROR
							} );
							validatedPaths.add( languagePath );
							isValid = false;
						}

						if ( !getZCodeString( code ) ) {
							this.setError( {
								errorId: [ ...innerKeyPath,
									Constants.Z_IMPLEMENTATION_CODE,
									Constants.Z_CODE_CODE
								].join( '.' ),
								errorMessageKey: 'wikilambda-zimplementation-code-missing',
								errorType: Constants.ERROR_TYPES.ERROR
							} );
							isValid = false;
						}
					}

					break;
				}

				// Validate ZTester:
				// * Tester function is not defined (Z20K1)
				// * Tester call has undefined function call (Z20K2.Z7K1)
				// * Tester validation has undefined function call (Z20K3.Z7K1)
				case Constants.Z_TESTER: {
					// Validate: Target Function not defined
					if ( !this.getCurrentTargetFunctionZid ) {
						const targetFunctionPath = [ ...innerKeyPath, Constants.Z_TESTER_FUNCTION ].join( '.' );
						this.setError( {
							errorId: targetFunctionPath,
							errorMessageKey: 'wikilambda-zobject-missing-attached-function',
							errorType: Constants.ERROR_TYPES.ERROR
						} );
						validatedPaths.add( targetFunctionPath );
						isValid = false;
					}

					// Validate: Tester call function call is set
					const testerCall = innerObject[ Constants.Z_TESTER_CALL ];
					const testerCallKeyPath = [ ...innerKeyPath, Constants.Z_TESTER_CALL ];
					const testerCallFields = validateFunctionCall( testerCallKeyPath, testerCall );

					testerCallFields.forEach( ( field ) => {
						if ( !field.isValid ) {
							this.setError( {
								errorId: field.keyPath,
								errorMessageKey: 'wikilambda-ztester-missing-call-function',
								errorType: Constants.ERROR_TYPES.ERROR
							} );
							validatedPaths.add( field.keyPath );
							isValid = false;
						}
					} );

					// Validate: Tester validation function call is set
					const validationCall = innerObject[ Constants.Z_TESTER_VALIDATION ];
					const validationCallKeyPath = [ ...innerKeyPath, Constants.Z_TESTER_VALIDATION ];
					const validationCallFields = validateFunctionCall( validationCallKeyPath, validationCall );

					validationCallFields.forEach( ( field ) => {
						if ( !field.isValid ) {
							this.setError( {
								errorId: field.keyPath,
								errorMessageKey: 'wikilambda-ztester-missing-validation-function',
								errorType: Constants.ERROR_TYPES.ERROR
							} );
							validatedPaths.add( field.keyPath );
							isValid = false;
						}
					} );

					break;
				}

				default:
					break;
			}

			// Check for empty Z9K1 references in all zobject types, excluding already validated paths
			const emptyReferences = this.getEmptyReferencesKeyPaths();
			emptyReferences.forEach( ( keyPath ) => {
				// Skip if this path was already validated with a specific error
				if ( !validatedPaths.has( keyPath ) ) {
					this.setError( {
						errorId: keyPath,
						errorMessageKey: 'wikilambda-empty-reference-warning',
						errorType: Constants.ERROR_TYPES.WARNING
					} );
				}
			} );

			return isValid;

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

			const zobject = hybridToCanonical( this.getZObjectByKeyPath( [ Constants.STORED_OBJECTS.MAIN ] ) );
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
			const zobject = this.getJsonObject( Constants.STORED_OBJECTS.MAIN );
			const content = zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ];
			const type = getZObjectType( content );

			// For all objects: remove empty monolingual string and monolingual stringsets
			this.removeEmptyMonolingualValues( [
				Constants.STORED_OBJECTS.MAIN,
				Constants.Z_PERSISTENTOBJECT_LABEL
			] );
			this.removeEmptyMonolingualValues( [
				Constants.STORED_OBJECTS.MAIN,
				Constants.Z_PERSISTENTOBJECT_DESCRIPTION
			] );
			this.removeEmptyAliasValues( [
				Constants.STORED_OBJECTS.MAIN,
				Constants.Z_PERSISTENTOBJECT_ALIASES
			] );

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
				this.removeEmptyTypeFunctions();
				// 2. Rename misnumbered key Ids
				const keysPath = [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_TYPE_KEYS
				];
				this.recalculateKeys( keysPath );
				// ...for every key:
				const keys = content[ Constants.Z_TYPE_KEYS ];
				keys.forEach( ( item, index ) => {
					if ( index === 0 ) {
						return;
					}
					// 3. Set identity keys to false if boolean is not set
					this.setEmptyIsIdentityAsFalse( [ ...keysPath, index ] );
					// 4. Remove empty key labels
					this.removeEmptyMonolingualValues( [ ...keysPath, index, Constants.Z_KEY_LABEL ] );
				} );
			}

			// If object is an error type:
			if ( type === Constants.Z_ERRORTYPE ) {
				// 1. Rename misnumbered key Ids
				const keysPath = [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_ERRORTYPE_KEYS
				];
				this.recalculateKeys( keysPath );
				// ...for every key:
				const keys = content[ Constants.Z_ERRORTYPE_KEYS ];
				keys.forEach( ( item, index ) => {
					if ( index === 0 ) {
						return;
					}
					// 2. Set identity keys to false if boolean is not set
					this.setEmptyIsIdentityAsFalse( [ ...keysPath, index ] );
					// 3. Remove empty key labels
					this.removeEmptyMonolingualValues( [ ...keysPath, index, Constants.Z_KEY_LABEL ] );
				} );
			}

			// If a list has changed its type, remove invalid list items
			if ( this.hasInvalidListItems ) {
				const invalidLists = this.getInvalidListItems;
				for ( const path in invalidLists ) {
					this.deleteListItemsByKeyPath( {
						keyPath: path.split( '.' ),
						indexes: invalidLists[ path ]
					} );
					// clear the collection of list items removed
					this.clearInvalidListItems( path );
				}
			}

			// Disconnect implementations and testers if necessary
			if ( disconnectFunctionObjects ) {
				this.disconnectFunctionObjects();
			}
		},

		/**
		 * Given the key path to a ZKey object, checks its Is Identity/Z3K4 key and,
		 * * if it doesn't exist, leaves it as it is
		 * * if it exists, but the value is empty, set the value as False
		 *
		 * @param {Array} keyPath
		 */
		setEmptyIsIdentityAsFalse: function ( keyPath ) {
			const value = this.getZObjectByKeyPath( keyPath );

			// If value is not a valid key object with a Z3K4 key, do nothing
			if ( !value || typeof value !== 'object' || !( Constants.Z_KEY_IS_IDENTITY in value ) ) {
				return;
			}

			const isIdentityType = getZObjectType( value[ Constants.Z_KEY_IS_IDENTITY ] );

			// Set boolean terminal reference to false if it's undefined
			const booleanRef = isIdentityType === Constants.Z_BOOLEAN ?
				value[ Constants.Z_KEY_IS_IDENTITY ][ Constants.Z_BOOLEAN_IDENTITY ] :
				value[ Constants.Z_KEY_IS_IDENTITY ];

			const booleanValue = getZReferenceTerminalValue( booleanRef );

			if ( !booleanValue ) {
				booleanRef[ Constants.Z_REFERENCE_ID ] = Constants.Z_BOOLEAN_FALSE;
			}
		},

		/**
		 * Removes Z4K3/Validator, Z4K4/Equality, Z4K5/Renderer and Z4K6/Parser key values
		 * when the values are undefined. Assumes that the current object is a Type/Z4. Also
		 * assumes that the given functions are references, and never literals or function calls.
		 */
		removeEmptyTypeFunctions: function () {
			const value = this.getZObjectByKeyPath( [
				Constants.STORED_OBJECTS.MAIN,
				Constants.Z_PERSISTENTOBJECT_VALUE
			] );

			// If value is not a valid multilingual string, do nothing
			if ( !value || typeof value !== 'object' ) {
				return;
			}

			const keys = [
				Constants.Z_TYPE_VALIDATOR,
				Constants.Z_TYPE_EQUALITY,
				Constants.Z_TYPE_RENDERER,
				Constants.Z_TYPE_PARSER
			];

			for ( const key of keys ) {
				if ( key in value ) {
					const keyRef = getZReferenceTerminalValue( value[ key ] );
					if ( !keyRef ) {
						delete value[ key ];
					}
				}
			}
		},

		/**
		 * Removes the monolingual text items from a multilingual string object
		 * when the monolingual item is missing either the language or the text.
		 *
		 * @param {Array} keyPath
		 */
		removeEmptyMonolingualValues: function ( keyPath ) {
			const value = this.getZObjectByKeyPath( keyPath );

			// If value is not a valid multilingual string, do nothing
			if ( !value || typeof value !== 'object' || !( Constants.Z_MULTILINGUALSTRING_VALUE in value ) ) {
				return;
			}

			const initialList = value[ Constants.Z_MULTILINGUALSTRING_VALUE ];

			const filteredList = initialList.filter( ( monolingual, index ) => {
				// Keep benjamin item
				if ( index === 0 ) {
					return true;
				}

				// Keep the monolingual item if it has language and label, else delete
				const label = getZMonolingualTextValue( monolingual );
				const language = getZMonolingualLangValue( monolingual );
				return label && language;
			} );

			if ( initialList.length !== filteredList.length ) {
				value[ Constants.Z_MULTILINGUALSTRING_VALUE ] = filteredList;
			}
		},

		/**
		 * Removes the alias label language objects with empty monolingual string
		 * or language values from the global zobject.
		 *
		 * @param {Array} keyPath
		 */
		removeEmptyAliasValues: function ( keyPath ) {
			const value = this.getZObjectByKeyPath( keyPath );

			// If value is not a valid multilingual string, do nothing
			if ( !value || typeof value !== 'object' || !( Constants.Z_MULTILINGUALSTRINGSET_VALUE in value ) ) {
				return;
			}

			let hasNestedChanges = false;

			const initialList = value[ Constants.Z_MULTILINGUALSTRINGSET_VALUE ];

			const filteredList = initialList
				// For each monolingualStringSet, remove empty strings from the array
				.map( ( monolingualSet, index ) => {
					// Keep benjamin item
					if ( index === 0 ) {
						return monolingualSet;
					}

					const initialStringList = monolingualSet[ Constants.Z_MONOLINGUALSTRINGSET_VALUE ];
					const filteredStringList = initialStringList.filter( ( item, idx ) => {
						// Keep benjamin item
						if ( idx === 0 ) {
							return true;
						}

						// Keep the string if it's not empty
						const stringValue = getZStringTerminalValue( item );
						return !!stringValue;
					} );

					// Return different object if list changed
					if ( initialStringList.length !== filteredStringList.length ) {
						hasNestedChanges = true;
						return Object.assign( {}, monolingualSet, {
							[ Constants.Z_MONOLINGUALSTRINGSET_VALUE ]: filteredStringList
						} );
					}

					// No changes, keep same object
					return monolingualSet;
				} )

				// Filter out every monolingualStringSet that has empty array or lang
				.filter( ( monolingualSet, index ) => {
					// Keep benjamin item
					if ( index === 0 ) {
						return true;
					}

					// Keep the monolingual set item if it has language and some alias, else delete
					const aliases = getZMonolingualStringsetValues( monolingualSet );
					const language = getZMonolingualStringsetLang( monolingualSet );

					return ( aliases.length > 0 ) && !!language;
				} );

			if ( ( initialList.length !== filteredList ) || hasNestedChanges ) {
				value[ Constants.Z_MULTILINGUALSTRINGSET_VALUE ] = filteredList;
			}
		},

		/**
		 * Recalculate the keys and key values of a ZArgument or ZKey List.
		 *
		 * @param {Array} keyPath
		 */
		recalculateKeys: function ( keyPath ) {
			const value = this.getZObjectByKeyPath( keyPath );

			// If value is not a valid typed list, do nothing
			if ( !Array.isArray( value ) || value.length === 0 ) {
				return;
			}

			// If value is not a valid typed list of keys or arguments, do nothing
			const itemType = getZReferenceTerminalValue( value[ 0 ] );
			if ( itemType !== Constants.Z_KEY && itemType !== Constants.Z_ARGUMENT ) {
				return;
			}

			const keyId = itemType === Constants.Z_KEY ? Constants.Z_KEY_ID : Constants.Z_ARGUMENT_KEY;

			for ( const [ index, item ] of value.entries() ) {
				// Leave the benjamin item alone
				if ( index === 0 ) {
					continue;
				}

				// Mutate the key string value if needed
				const originalKey = item[ keyId ][ Constants.Z_STRING_VALUE ];
				const goodKey = `${ this.getCurrentZObjectId }K${ index }`;
				if ( originalKey !== goodKey ) {
					value[ index ][ keyId ][ Constants.Z_STRING_VALUE ] = goodKey;
				}
			}
		},

		/**
		 * Removes the function argument label language objects with empty monolingual
		 * string or language values from the global zobject.
		 */
		removeEmptyArguments: function () {
			const value = this.getZObjectByKeyPath( [
				Constants.STORED_OBJECTS.MAIN,
				Constants.Z_PERSISTENTOBJECT_VALUE
			] );

			// If value is not a valid multilingual string, do nothing
			if ( !value || typeof value !== 'object' || !( Constants.Z_FUNCTION_ARGUMENTS in value ) ) {
				return;
			}

			const argsKeyPath = [
				Constants.STORED_OBJECTS.MAIN,
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_ARGUMENTS
			];

			const initialList = value[ Constants.Z_FUNCTION_ARGUMENTS ];
			const filteredList = initialList.filter( ( arg, index ) => {
				// Leave the benjamin item
				if ( index === 0 ) {
					return true;
				}

				// For every argument, we remove it from the list if:
				// 1. argument type is empty, and
				// 2. argument labels are empty
				const argType = arg[ Constants.Z_ARGUMENT_TYPE ];
				const argValue = Constants.Z_FUNCTION_CALL_FUNCTION in argType ?
					getZFunctionCallFunctionId( argType ) :
					getZReferenceTerminalValue( argType );

				this.removeEmptyMonolingualValues( [ ...argsKeyPath, index, Constants.Z_ARGUMENT_LABEL ] );
				const labelCount = arg[ Constants.Z_ARGUMENT_LABEL ][ Constants.Z_MULTILINGUALSTRING_VALUE ].length;
				return ( !!argValue || labelCount > 1 );
			} );

			if ( filteredList.length !== initialList.length ) {
				value[ Constants.Z_FUNCTION_ARGUMENTS ] = filteredList;
			}

			if ( filteredList.length > 1 ) {
				this.recalculateKeys( [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_FUNCTION_ARGUMENTS
				] );
			}
		},

		/**
		 * Remove implementation and tester from a ZObject
		 * The zObject has to be of type function
		 */
		disconnectFunctionObjects: function () {
			const value = this.getZObjectByKeyPath( [
				Constants.STORED_OBJECTS.MAIN,
				Constants.Z_PERSISTENTOBJECT_VALUE
			] );

			if ( Constants.Z_FUNCTION_TESTERS in value ) {
				value[ Constants.Z_FUNCTION_TESTERS ] = canonicalToHybrid( [ Constants.Z_TESTER ] );
			}

			if ( Constants.Z_FUNCTION_IMPLEMENTATIONS in value ) {
				value[ Constants.Z_FUNCTION_IMPLEMENTATIONS ] = canonicalToHybrid( [ Constants.Z_IMPLEMENTATION ] );
			}
		},

		/**
		 * Sets the flag to show publish success message
		 * Uses mw.storage.session to persist across page reloads
		 *
		 * @param {string} zid - The ZObject ID that was published
		 */
		setPublishSuccess: function ( zid ) {
			if ( !zid ) {
				return;
			}
			mw.storage.session.set( `wikilambda-publish-success-${ zid }`, 'true' );
		},

		/**
		 * Checks if the publish success flag is set for a given ZID
		 *
		 * @param {string} zid - The ZObject ID to check
		 * @return {void}
		 */
		checkPublishSuccess: function ( zid ) {
			if ( !zid ) {
				return;
			}
			const key = `wikilambda-publish-success-${ zid }`;
			const exists = mw.storage.session.get( key ) === 'true';
			if ( exists ) {
				mw.storage.session.remove( key );
				this.showPublishSuccess = true;
				return;
			}
			this.showPublishSuccess = false;
		}
	}
};
