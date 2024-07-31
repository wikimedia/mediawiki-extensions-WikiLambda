/*!
 * WikiLambda unit test suite for the zobject submission Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const submissionModule = require( '../../../../resources/ext.wikilambda.app/store/modules/zobject/submission.js' ),
	zobjectModule = require( '../../../../resources/ext.wikilambda.app/store/modules/zobject.js' ),
	zfunctionModule = require( '../../../../resources/ext.wikilambda.app/store/modules/zfunction.js' ),
	zobjectToRows = require( '../../helpers/zObjectTableHelpers.js' ).zobjectToRows,
	hybridToCanonical = require( '../../../../resources/ext.wikilambda.app/mixins/schemata.js' ).methods.hybridToCanonical,
	Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' ),
	fs = require( 'fs' ),
	path = require( 'path' );

describe( 'zobject submission Vuex module', () => {

	let context;

	beforeEach( () => {
		context = Object.assign( {}, {
			// eslint-disable-next-line no-unused-vars
			commit: jest.fn( ( mutationType, payload ) => true ),
			// eslint-disable-next-line no-unused-vars
			dispatch: jest.fn( ( actionType, payload ) => true ),
			getters: {}
		} );
	} );

	describe( 'validateZObject', () => {

		describe( 'validate function', () => {
			it( 'Does not commit error for a valid function', () => {
				context.getters.getCurrentZObjectType = Constants.Z_FUNCTION;
				context.getters.getZObjectAsJson = {};
				context.getters.getZPersistentContentRowId = jest.fn( () => 1 );

				context.getters.getInvalidOutputFields = [];
				context.getters.getInvalidInputFields = [];

				const isValid = submissionModule.actions.validateZObject( context );
				expect( context.commit ).toHaveBeenCalledTimes( 0 );
				expect( isValid ).toEqual( true );
			} );

			it( 'Commits errors for a function with one invalid output field', () => {
				context.getters.getCurrentZObjectType = Constants.Z_FUNCTION;
				context.getters.getZObjectAsJson = {};
				context.getters.getZPersistentContentRowId = jest.fn( () => 1 );

				context.getters.getInvalidOutputFields = [ 2 ];
				context.getters.getInvalidInputFields = [];

				const mockError = {
					rowId: 2,
					errorCode: Constants.errorCodes.MISSING_FUNCTION_OUTPUT,
					errorType: Constants.errorTypes.ERROR
				};

				const isValid = submissionModule.actions.validateZObject( context );
				expect( context.commit ).toHaveBeenCalledTimes( 1 );
				expect( context.commit ).toHaveBeenCalledWith( 'setError', mockError );
				expect( isValid ).toEqual( false );
			} );

			it( 'Commits errors for a function with many invalid output fields', () => {
				context.getters.getCurrentZObjectType = Constants.Z_FUNCTION;
				context.getters.getZObjectAsJson = {};
				context.getters.getZPersistentContentRowId = jest.fn( () => 1 );

				context.getters.getInvalidOutputFields = [ 2, 3 ];
				context.getters.getInvalidInputFields = [];

				const mockErrors = [ {
					rowId: 2,
					errorCode: Constants.errorCodes.MISSING_FUNCTION_OUTPUT,
					errorType: Constants.errorTypes.ERROR
				}, {
					rowId: 3,
					errorCode: Constants.errorCodes.MISSING_FUNCTION_OUTPUT,
					errorType: Constants.errorTypes.ERROR
				} ];

				const isValid = submissionModule.actions.validateZObject( context );
				expect( context.commit ).toHaveBeenCalledTimes( 2 );
				expect( context.commit ).toHaveBeenCalledWith( 'setError', mockErrors[ 0 ] );
				expect( context.commit ).toHaveBeenCalledWith( 'setError', mockErrors[ 1 ] );
				expect( isValid ).toEqual( false );
			} );

			it( 'Commits errors for a function with one invalid input field', () => {
				context.getters.getCurrentZObjectType = Constants.Z_FUNCTION;
				context.getters.getZObjectAsJson = {};
				context.getters.getZPersistentContentRowId = jest.fn( () => 1 );

				context.getters.getInvalidOutputFields = [];
				context.getters.getInvalidInputFields = [ 3 ];

				const mockError = {
					rowId: 3,
					errorCode: Constants.errorCodes.MISSING_FUNCTION_INPUT_TYPE,
					errorType: Constants.errorTypes.ERROR
				};

				const isValid = submissionModule.actions.validateZObject( context );
				expect( context.commit ).toHaveBeenCalledTimes( 1 );
				expect( context.commit ).toHaveBeenCalledWith( 'setError', mockError );
				expect( isValid ).toEqual( false );
			} );

			it( 'Commits errors for a function with many invalid input fields', () => {
				context.getters.getCurrentZObjectType = Constants.Z_FUNCTION;
				context.getters.getZObjectAsJson = {};
				context.getters.getZPersistentContentRowId = jest.fn( () => 1 );

				context.getters.getInvalidOutputFields = [];
				context.getters.getInvalidInputFields = [ 3, 4 ];

				const mockErrors = [ {
					rowId: 3,
					errorCode: Constants.errorCodes.MISSING_FUNCTION_INPUT_TYPE,
					errorType: Constants.errorTypes.ERROR
				}, {
					rowId: 4,
					errorCode: Constants.errorCodes.MISSING_FUNCTION_INPUT_TYPE,
					errorType: Constants.errorTypes.ERROR
				} ];

				const isValid = submissionModule.actions.validateZObject( context );
				expect( context.commit ).toHaveBeenCalledTimes( 2 );
				expect( context.commit ).toHaveBeenCalledWith( 'setError', mockErrors[ 0 ] );
				expect( context.commit ).toHaveBeenCalledWith( 'setError', mockErrors[ 1 ] );
				expect( isValid ).toEqual( false );
			} );

			it( 'Commits errors for a function with invalid output and input fields', () => {
				context.getters.getCurrentZObjectType = Constants.Z_FUNCTION;
				context.getters.getZObjectAsJson = {};
				context.getters.getZPersistentContentRowId = jest.fn( () => 1 );

				context.getters.getInvalidOutputFields = [ 2 ];
				context.getters.getInvalidInputFields = [ 3 ];

				const mockErrors = [ {
					rowId: 2,
					errorCode: Constants.errorCodes.MISSING_FUNCTION_OUTPUT,
					errorType: Constants.errorTypes.ERROR
				}, {
					rowId: 3,
					errorCode: Constants.errorCodes.MISSING_FUNCTION_INPUT_TYPE,
					errorType: Constants.errorTypes.ERROR
				} ];

				const isValid = submissionModule.actions.validateZObject( context );
				expect( context.commit ).toHaveBeenCalledTimes( 2 );
				expect( context.commit ).toHaveBeenCalledWith( 'setError', mockErrors[ 0 ] );
				expect( context.commit ).toHaveBeenCalledWith( 'setError', mockErrors[ 1 ] );
				expect( isValid ).toEqual( false );
			} );
		} );

		describe( 'validate implementation', () => {
			it( 'Does not commit error for a valid code implementation (literal programming language)', () => {
				context.getters.getCurrentZObjectType = Constants.Z_IMPLEMENTATION;
				context.getters.getZImplementationContentRowId = jest.fn( () => 2 );
				context.getters.getZPersistentContentRowId = jest.fn( () => 1 );
				context.getters.getRowByKeyPath = jest.fn( () => ( { id: 3 } ) );
				context.getters.getZObjectAsJson = {
					Z2K2: {
						Z1K1: Constants.Z_IMPLEMENTATION,
						Z14K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
						Z14K3: {
							Z1K1: Constants.Z_CODE,
							Z16K1: { Z1K1: Constants.Z_PROGRAMMING_LANGUAGE, Z61K1: { Z1K1: Constants.Z_STRING, Z6K1: 'lang' } },
							Z16K2: { Z1K1: Constants.Z_STRING, Z6K1: 'some code' }
						}
					}
				};

				const isValid = submissionModule.actions.validateZObject( context );
				expect( context.commit ).toHaveBeenCalledTimes( 0 );
				expect( isValid ).toEqual( true );
			} );

			it( 'Does not commit error for a valid code implementation (referenced programming language)', () => {
				context.getters.getCurrentZObjectType = Constants.Z_IMPLEMENTATION;
				context.getters.getZImplementationContentRowId = jest.fn( () => 2 );
				context.getters.getZPersistentContentRowId = jest.fn( () => 1 );
				context.getters.getRowByKeyPath = jest.fn( () => ( { id: 3 } ) );

				context.getters.getZObjectAsJson = {
					Z2K2: {
						Z1K1: Constants.Z_IMPLEMENTATION,
						Z14K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
						Z14K3: {
							Z1K1: Constants.Z_CODE,
							Z16K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: Constants.Z_PROGRAMMING_LANGUAGES.PYTHON },
							Z16K2: { Z1K1: Constants.Z_STRING, Z6K1: 'some code' }
						}
					}
				};

				const isValid = submissionModule.actions.validateZObject( context );
				expect( context.commit ).toHaveBeenCalledTimes( 0 );
				expect( isValid ).toEqual( true );
			} );

			it( 'Does not commit error for a valid composition implementation (function call)', () => {
				context.getters.getCurrentZObjectType = Constants.Z_IMPLEMENTATION;
				context.getters.getZPersistentContentRowId = jest.fn( () => 1 );
				context.getters.getZObjectAsJson = {
					Z2K2: {
						Z1K1: Constants.Z_IMPLEMENTATION,
						Z14K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
						Z14K2: {
							Z1K1: Constants.Z_FUNCTION_CALL,
							Z7K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z888' }
						}
					}
				};

				const isValid = submissionModule.actions.validateZObject( context );
				expect( context.commit ).toHaveBeenCalledTimes( 0 );
				expect( isValid ).toEqual( true );
			} );

			it( 'Does not commit error for a valid composition implementation (argument reference)', () => {
				context.getters.getCurrentZObjectType = Constants.Z_IMPLEMENTATION;
				context.getters.getZPersistentContentRowId = jest.fn( () => 1 );
				context.getters.getZObjectAsJson = {
					Z2K2: {
						Z1K1: Constants.Z_IMPLEMENTATION,
						Z14K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
						Z14K2: {
							Z1K1: Constants.Z_ARGUMENT_REFERENCE,
							Z18K1: { Z1K1: Constants.Z_STRING, Z6K1: 'Z888K1' }
						}
					}
				};

				const isValid = submissionModule.actions.validateZObject( context );
				expect( context.commit ).toHaveBeenCalledTimes( 0 );
				expect( isValid ).toEqual( true );
			} );

			it( 'Does not commit error for a valid composition implementation (type)', () => {
				context.getters.getCurrentZObjectType = Constants.Z_IMPLEMENTATION;
				context.getters.getZPersistentContentRowId = jest.fn( () => 1 );
				context.getters.getZObjectAsJson = {
					Z2K2: {
						Z1K1: Constants.Z_IMPLEMENTATION,
						Z14K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
						Z14K2: {
							Z1K1: Constants.Z_TYPE,
							Z4K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
							Z4K2: [ Constants.Z_KEY ]
						}
					}
				};

				const isValid = submissionModule.actions.validateZObject( context );
				expect( context.commit ).toHaveBeenCalledTimes( 0 );
				expect( isValid ).toEqual( true );
			} );

			it( 'Does not commit error for a valid builtin implementation', () => {
				context.getters.getCurrentZObjectType = Constants.Z_IMPLEMENTATION;
				context.getters.getZPersistentContentRowId = jest.fn( () => 1 );
				context.getters.getZObjectAsJson = {
					Z2K2: {
						Z1K1: Constants.Z_IMPLEMENTATION,
						Z14K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
						Z14K4: { Z1K1: Constants.Z_STRING, Z6K1: 'Z999' }
					}
				};

				const isValid = submissionModule.actions.validateZObject( context );
				expect( context.commit ).toHaveBeenCalledTimes( 0 );
				expect( isValid ).toEqual( true );
			} );

			it( 'Commits error for an implementation with missing target function', () => {
				context.getters.getCurrentZObjectType = Constants.Z_IMPLEMENTATION;
				context.getters.getZPersistentContentRowId = jest.fn( () => 1 );
				context.getters.getZImplementationFunctionRowId = jest.fn( () => 2 );
				context.getters.getZObjectAsJson = {
					Z2K2: {
						Z1K1: Constants.Z_IMPLEMENTATION,
						Z14K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: '' },
						Z14K4: { Z1K1: Constants.Z_STRING, Z6K1: 'Z999' }
					}
				};

				const mockError = {
					rowId: 2,
					errorCode: Constants.errorCodes.MISSING_TARGET_FUNCTION,
					errorType: Constants.errorTypes.ERROR
				};

				const isValid = submissionModule.actions.validateZObject( context );
				expect( context.commit ).toHaveBeenCalledTimes( 1 );
				expect( context.commit ).toHaveBeenCalledWith( 'setError', mockError );
				expect( isValid ).toEqual( false );
			} );

			it( 'Commits error for an implementation with missing composition', () => {
				context.getters.getCurrentZObjectType = Constants.Z_IMPLEMENTATION;
				context.getters.getZPersistentContentRowId = jest.fn( () => 1 );
				context.getters.getZImplementationContentRowId = jest.fn( () => 2 );
				context.getters.getZObjectAsJson = {
					Z2K2: {
						Z1K1: Constants.Z_IMPLEMENTATION,
						Z14K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
						Z14K2: { Z1K1: Constants.Z_FUNCTION_CALL, Z7K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: '' } }
					}
				};

				const mockError = {
					rowId: 2,
					errorCode: Constants.errorCodes.MISSING_IMPLEMENTATION_COMPOSITION,
					errorType: Constants.errorTypes.ERROR
				};

				const isValid = submissionModule.actions.validateZObject( context );
				expect( context.commit ).toHaveBeenCalledTimes( 1 );
				expect( context.commit ).toHaveBeenCalledWith( 'setError', mockError );
				expect( isValid ).toEqual( false );
			} );

			it( 'Commits error for a code implementation with missing programming language (literal)', () => {
				context.getters.getCurrentZObjectType = Constants.Z_IMPLEMENTATION;
				context.getters.getZPersistentContentRowId = jest.fn( () => 1 );
				context.getters.getZImplementationContentRowId = jest.fn( () => 2 );
				context.getters.getRowByKeyPath = jest.fn( () => ( { id: 3 } ) );
				context.getters.getZObjectAsJson = {
					Z2K2: {
						Z1K1: Constants.Z_IMPLEMENTATION,
						Z14K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
						Z14K3: {
							Z1K1: Constants.Z_CODE,
							Z16K1: { Z1K1: Constants.Z_PROGRAMMING_LANGUAGE, Z61K1: { Z1K1: Constants.Z_STRING, Z6K1: '' } },
							Z16K2: { Z1K1: Constants.Z_STRING, Z6K1: 'some code' }
						}
					}
				};

				const mockError = {
					rowId: 3,
					errorCode: Constants.errorCodes.MISSING_IMPLEMENTATION_CODE_LANGUAGE,
					errorType: Constants.errorTypes.ERROR
				};

				const isValid = submissionModule.actions.validateZObject( context );
				expect( context.commit ).toHaveBeenCalledTimes( 1 );
				expect( context.commit ).toHaveBeenCalledWith( 'setError', mockError );
				expect( isValid ).toEqual( false );
			} );

			it( 'Commits error for a code implementation with missing programming language (reference)', () => {
				context.getters.getCurrentZObjectType = Constants.Z_IMPLEMENTATION;
				context.getters.getZPersistentContentRowId = jest.fn( () => 1 );
				context.getters.getZImplementationContentRowId = jest.fn( () => 2 );
				context.getters.getRowByKeyPath = jest.fn( () => ( { id: 3 } ) );
				context.getters.getZObjectAsJson = {
					Z2K2: {
						Z1K1: Constants.Z_IMPLEMENTATION,
						Z14K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
						Z14K3: {
							Z1K1: Constants.Z_CODE,
							Z16K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: '' },
							Z16K2: { Z1K1: Constants.Z_STRING, Z6K1: 'some code' }
						}
					}
				};

				const mockError = {
					rowId: 3,
					errorCode: Constants.errorCodes.MISSING_IMPLEMENTATION_CODE_LANGUAGE,
					errorType: Constants.errorTypes.ERROR
				};

				const isValid = submissionModule.actions.validateZObject( context );
				expect( context.commit ).toHaveBeenCalledTimes( 1 );
				expect( context.commit ).toHaveBeenCalledWith( 'setError', mockError );
				expect( isValid ).toEqual( false );
			} );

			it( 'Commits error for a code implementation with missing code value', () => {
				context.getters.getCurrentZObjectType = Constants.Z_IMPLEMENTATION;
				context.getters.getZPersistentContentRowId = jest.fn( () => 1 );
				context.getters.getZImplementationContentRowId = jest.fn( () => 2 );
				context.getters.getRowByKeyPath = jest.fn( () => ( { id: 4 } ) );
				context.getters.getZObjectAsJson = {
					Z2K2: {
						Z1K1: Constants.Z_IMPLEMENTATION,
						Z14K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
						Z14K3: {
							Z1K1: Constants.Z_CODE,
							Z16K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: Constants.Z_PROGRAMMING_LANGUAGES.PYTHON },
							Z16K2: { Z1K1: Constants.Z_STRING, Z6K1: '' }
						}
					}
				};

				const mockError = {
					rowId: 4,
					errorCode: Constants.errorCodes.MISSING_IMPLEMENTATION_CODE,
					errorType: Constants.errorTypes.ERROR
				};

				const isValid = submissionModule.actions.validateZObject( context );
				expect( context.commit ).toHaveBeenCalledTimes( 1 );
				expect( context.commit ).toHaveBeenCalledWith( 'setError', mockError );
				expect( isValid ).toEqual( false );
			} );
		} );

		describe( 'validate tester', () => {
			it( 'Does not commit error for a valid tester', () => {
				context.getters.getCurrentZObjectType = Constants.Z_TESTER;
				context.getters.getZPersistentContentRowId = jest.fn( () => 1 );
				context.getters.getZObjectAsJson = {
					Z2K2: {
						Z1K1: Constants.Z_TESTER,
						Z20K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
						Z20K2: { Z1K1: Constants.Z_FUNCTION_CALL, Z7K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z888' } },
						Z20K3: { Z1K1: Constants.Z_FUNCTION_CALL, Z7K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z777' } }
					}
				};

				const isValid = submissionModule.actions.validateZObject( context );
				expect( context.commit ).toHaveBeenCalledTimes( 0 );
				expect( isValid ).toEqual( true );
			} );

			it( 'Commits error for a tester with missing target function', () => {
				context.getters.getCurrentZObjectType = Constants.Z_TESTER;
				context.getters.getZPersistentContentRowId = jest.fn( () => 1 );
				context.getters.getZTesterFunctionRowId = jest.fn( () => 2 );
				context.getters.getZObjectAsJson = {
					Z2K2: {
						Z1K1: Constants.Z_TESTER,
						Z20K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: '' },
						Z20K2: { Z1K1: Constants.Z_FUNCTION_CALL, Z7K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z888' } },
						Z20K3: { Z1K1: Constants.Z_FUNCTION_CALL, Z7K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z777' } }
					}
				};

				const mockError = {
					rowId: 2,
					errorCode: Constants.errorCodes.MISSING_TARGET_FUNCTION,
					errorType: Constants.errorTypes.ERROR
				};

				const isValid = submissionModule.actions.validateZObject( context );
				expect( context.commit ).toHaveBeenCalledTimes( 1 );
				expect( context.commit ).toHaveBeenCalledWith( 'setError', mockError );
				expect( isValid ).toEqual( false );
			} );

			it( 'Commits error for a tester with missing call', () => {
				context.getters.getCurrentZObjectType = Constants.Z_TESTER;
				context.getters.getZPersistentContentRowId = jest.fn( () => 1 );
				context.getters.getZTesterCallRowId = jest.fn( () => 3 );
				context.getters.getZObjectAsJson = {
					Z2K2: {
						Z1K1: Constants.Z_TESTER,
						Z20K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
						Z20K2: { Z1K1: Constants.Z_FUNCTION_CALL, Z7K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: '' } },
						Z20K3: { Z1K1: Constants.Z_FUNCTION_CALL, Z7K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z777' } }
					}
				};

				const mockError = {
					rowId: 3,
					errorCode: Constants.errorCodes.MISSING_TESTER_CALL,
					errorType: Constants.errorTypes.ERROR
				};

				const isValid = submissionModule.actions.validateZObject( context );
				expect( context.commit ).toHaveBeenCalledTimes( 1 );
				expect( context.commit ).toHaveBeenCalledWith( 'setError', mockError );
				expect( isValid ).toEqual( false );
			} );

			it( 'Commits error for a tester with missing validation', () => {
				context.getters.getCurrentZObjectType = Constants.Z_TESTER;
				context.getters.getZPersistentContentRowId = jest.fn( () => 1 );
				context.getters.getZTesterValidationRowId = jest.fn( () => 4 );
				context.getters.getZObjectAsJson = {
					Z2K2: {
						Z1K1: Constants.Z_TESTER,
						Z20K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
						Z20K2: { Z1K1: Constants.Z_FUNCTION_CALL, Z7K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z888' } },
						Z20K3: { Z1K1: Constants.Z_FUNCTION_CALL, Z7K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: '' } }
					}
				};

				const mockError = {
					rowId: 4,
					errorCode: Constants.errorCodes.MISSING_TESTER_VALIDATION,
					errorType: Constants.errorTypes.ERROR
				};

				const isValid = submissionModule.actions.validateZObject( context );
				expect( context.commit ).toHaveBeenCalledTimes( 1 );
				expect( context.commit ).toHaveBeenCalledWith( 'setError', mockError );
				expect( isValid ).toEqual( false );
			} );
		} );
	} );

	describe( 'submitZObject', () => {

		let zobject, postWithEditTokenMock;

		beforeEach( () => {
			postWithEditTokenMock = jest.fn( () => new Promise( ( resolve ) => {
				resolve( {
					wikilambda_edit: {
						page: 'sample'
					}
				} );
			} ) );
			mw.Api = jest.fn( () => ( {
				postWithEditToken: postWithEditTokenMock
			} ) );

			context.state = { zobject: {} };

			context.getters.hasInvalidListItems = false;
			context.getters.getInvalidListItems = {};
			context.getters.isCreateNewPage = true;
			context.getters.getCurrentZObjectId = 'Z0';
			context.getters.getZFunctionInputs = zfunctionModule.getters.getZFunctionInputs( context.state, context.getters );
			context.getters.getRowById = zobjectModule.getters.getRowById( context.state );
			context.getters.getRowIndexById = zobjectModule.getters.getRowIndexById( context.state );
			context.getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( context.state );
			context.getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( context.state, context.getters );
			context.getters.getZMonolingualTextValue = zobjectModule.getters.getZMonolingualTextValue( context.state, context.getters );
			context.getters.getZMonolingualLangValue = zobjectModule.getters.getZMonolingualLangValue( context.state, context.getters );
			context.getters.getZMonolingualStringsetLang = zobjectModule.getters.getZMonolingualStringsetLang( context.state, context.getters );
			context.getters.getZMonolingualStringsetValues = zobjectModule.getters.getZMonolingualStringsetValues( context.state, context.getters );
			context.getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( context.state, context.getters );
			context.getters.getZStringTerminalValue = zobjectModule.getters.getZStringTerminalValue( context.state, context.getters );
			context.getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( context.state, context.getters );
			context.getters.getZObjectTypeByRowId = zobjectModule.getters.getZObjectTypeByRowId( context.state, context.getters );
			context.getters.getZObjectAsJsonById = zobjectModule.getters.getZObjectAsJsonById( context.state, context.getters );

			context.dispatch = jest.fn( ( actionType, payload ) => {
				let result;
				// run submission and zobject module actions
				if ( actionType in submissionModule.actions ) {
					result = submissionModule.actions[ actionType ]( context, payload );
				}
				if ( actionType in zobjectModule.actions ) {
					result = zobjectModule.actions[ actionType ]( context, payload );
				}
				// return then and catch
				return {
					then: ( fn ) => fn( result ),
					catch: () => 'error'
				};
			} );

			context.commit = jest.fn( ( mutationType, payload ) => {
				// run zobject module mutations
				if ( mutationType in zobjectModule.mutations ) {
					zobjectModule.mutations[ mutationType ]( context.state, payload );
				}
			} );

			zobject = {
				Z1K1: 'Z2',
				Z2K1: { Z1K1: 'Z6', Z6K1: 'Z0' },
				Z2K2: 'new object',
				Z2K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] },
				Z2K4: { Z1K1: 'Z32', Z12K1: [ 'Z31' ] },
				Z2K5: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
			};
		} );

		it( 'submits a new zobject to create', () => {
			context.state.zobject = zobjectToRows( zobject );
			context.getters.getZObjectTable = context.state.zobject;
			context.getters.isCreateNewPage = true;

			submissionModule.actions.submitZObject( context, { summary: 'A summary' } );

			expect( mw.Api ).toHaveBeenCalledTimes( 1 );
			expect( postWithEditTokenMock ).toHaveBeenCalledWith( {
				action: 'wikilambda_edit',
				uselang: 'en',
				summary: 'A summary',
				zid: undefined,
				zobject: JSON.stringify( zobject )
			} );
		} );

		it( 'submits an existing zobject to edit', () => {
			context.state.zobject = zobjectToRows( zobject );
			context.getters.getZObjectTable = context.state.zobject;
			context.getters.isCreateNewPage = false;

			submissionModule.actions.submitZObject( context, { summary: 'A summary' } );

			expect( mw.Api ).toHaveBeenCalledTimes( 1 );
			expect( postWithEditTokenMock ).toHaveBeenCalledWith( {
				action: 'wikilambda_edit',
				uselang: 'en',
				summary: 'A summary',
				zid: 'Z0',
				zobject: JSON.stringify( zobject )
			} );
		} );

		it( 'submits an object after calling transform', () => {
			context.state.zobject = zobjectToRows( zobject );
			context.getters.getZObjectTable = context.state.zobject;
			context.getters.isCreateNewPage = false;

			submissionModule.actions.submitZObject( context, { summary: 'A summary' } );

			expect( context.dispatch ).toHaveBeenCalledWith( 'transformZObjectForSubmission', false );

			expect( mw.Api ).toHaveBeenCalledTimes( 1 );
			expect( postWithEditTokenMock ).toHaveBeenCalledWith( {
				action: 'wikilambda_edit',
				uselang: 'en',
				summary: 'A summary',
				zid: 'Z0',
				zobject: JSON.stringify( zobject )
			} );
		} );

		it( 'submits a function after disconnecting implementations and testers', () => {
			zobject = JSON.parse(
				fs.readFileSync( path.join( __dirname, './objects/getZFunction.json' ) )
			).clean;

			context.state.zobject = zobjectToRows( zobject );
			context.getters.getZObjectTable = context.state.zobject;
			context.getters.getCurrentZObjectId = 'Z0';
			context.getters.isCreateNewPage = false;

			submissionModule.actions.submitZObject( context, { summary: 'A summary', disconnectFunctionObjects: true } );

			expect( context.dispatch ).toHaveBeenCalledWith( 'transformZObjectForSubmission', true );
			expect( mw.Api ).toHaveBeenCalledTimes( 1 );

			zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_TESTERS ] = [ Constants.Z_TESTER ];
			zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_IMPLEMENTATIONS ] = [ Constants.Z_IMPLEMENTATION ];

			expect( postWithEditTokenMock ).toHaveBeenCalledWith( {
				action: 'wikilambda_edit',
				uselang: 'en',
				summary: 'A summary',
				zid: 'Z0',
				zobject: JSON.stringify( zobject )
			} );
		} );

		it( 'submits an object after cleaning empty monolingual objects', () => {
			zobject = JSON.parse(
				fs.readFileSync( path.join( __dirname, './objects/getZFunction.json' ) )
			);

			context.state.zobject = zobjectToRows( zobject.dirty );
			context.getters.getZObjectTable = context.state.zobject;
			context.getters.getCurrentZObjectId = 'Z0';
			context.getters.isCreateNewPage = false;

			submissionModule.actions.submitZObject( context, { summary: 'A summary' } );

			expect( context.dispatch ).toHaveBeenCalledWith( 'transformZObjectForSubmission', false );
			expect( context.dispatch ).toHaveBeenCalledWith( 'removeEmptyMonolingualValues', { key: 'Z2K3' } );
			expect( context.dispatch ).toHaveBeenCalledWith( 'removeEmptyMonolingualValues', { key: 'Z2K5' } );
			expect( context.dispatch ).toHaveBeenCalledWith( 'removeEmptyAliasValues' );

			expect( mw.Api ).toHaveBeenCalledTimes( 1 );

			expect( postWithEditTokenMock ).toHaveBeenCalledWith( {
				action: 'wikilambda_edit',
				uselang: 'en',
				summary: 'A summary',
				zid: 'Z0',
				zobject: JSON.stringify( zobject.clean )
			} );
		} );

		it( 'submits an object after removing invalid list items', () => {
			const initialObject = {
				Z2K2: [ // parent rowId 1
					'Z6',
					{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'invalid' }, // invalid rowId 5
					'valid'
				],
				Z2K3: {
					Z1K1: 'Z12',
					Z12K1: [ // parent rowId 22
						'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'valid label 1' },
						'invalid label 1', // invalid item 36
						'invalid label 2', // invalid item 39
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'valid label 2' }
					]
				}
			};

			context.state.zobject = zobjectToRows( initialObject );
			context.getters.getZObjectTable = context.state.zobject;
			context.getters.isCreateNewPage = false;
			context.getters.getCurrentZObjectId = 'Z0';
			context.getters.hasInvalidListItems = true;
			context.getters.getInvalidListItems = {
				1: [ 5 ],
				22: [ 36, 39 ]
			};

			submissionModule.actions.submitZObject( context, { summary: 'A summary' } );

			expect( context.dispatch ).toHaveBeenCalledWith( 'removeItemsFromTypedList', {
				parentRowId: 1,
				listItems: [ 5 ]
			} );
			expect( context.dispatch ).toHaveBeenCalledWith( 'removeItemsFromTypedList', {
				parentRowId: 22,
				listItems: [ 36, 39 ]
			} );
			expect( context.dispatch ).toHaveBeenCalledWith( 'clearListItemsForRemoval' );
		} );
	} );

	describe( 'transformZObjectForSubmission', () => {
		beforeEach( () => {
			context.getters.getRowByKeyPath = () => undefined;
			context.getters.getZObjectTypeByRowId = () => undefined;
			context.getters.getChildrenByParentRowId = () => [ 'Z1' ];
		} );

		it( 'removes empty names', () => {
			submissionModule.actions.transformZObjectForSubmission( context, false );
			expect( context.dispatch ).toHaveBeenCalledWith( 'removeEmptyMonolingualValues', { key: 'Z2K3' } );
		} );

		it( 'removes empty descriptions', () => {
			submissionModule.actions.transformZObjectForSubmission( context, false );
			expect( context.dispatch ).toHaveBeenCalledWith( 'removeEmptyMonolingualValues', { key: 'Z2K5' } );
		} );

		it( 'removes empty aliases', () => {
			submissionModule.actions.transformZObjectForSubmission( context, false );
			expect( context.dispatch ).toHaveBeenCalledWith( 'removeEmptyAliasValues' );
		} );

		it( 'does not remove empty arguments if it is not a function', () => {
			submissionModule.actions.transformZObjectForSubmission( context, false );
			expect( context.dispatch ).not.toHaveBeenCalledWith( 'removeEmptyArguments' );
		} );

		it( 'removes empty arguments if it is a function', () => {
			context.getters.getZObjectTypeByRowId = () => Constants.Z_FUNCTION;
			context.getters.getRowByKeyPath = () => ( { id: 1 } );
			submissionModule.actions.transformZObjectForSubmission( context, false );
			expect( context.dispatch ).toHaveBeenCalledWith( 'removeEmptyArguments' );
		} );

		it( 'removes undefined parser, renderer and equality functions if it is a type', () => {
			context.getters.getZObjectTypeByRowId = () => Constants.Z_TYPE;
			context.getters.getRowByKeyPath = () => ( { id: 1 } );
			submissionModule.actions.transformZObjectForSubmission( context, false );
			expect( context.dispatch ).toHaveBeenCalledWith( 'removeEmptyTypeFunctions', 1 );
		} );

		it( 'recalculates keys if it is a type', () => {
			context.getters.getZObjectTypeByRowId = () => Constants.Z_TYPE;
			context.getters.getRowByKeyPath = () => ( { id: 1 } );
			submissionModule.actions.transformZObjectForSubmission( context, false );
			expect( context.dispatch ).toHaveBeenCalledWith( 'recalculateKeys', { listRowId: 1, key: 'Z3K2' } );
		} );

		it( 'removes empty key labels if it is a type', () => {
			context.getters.getZObjectTypeByRowId = () => Constants.Z_TYPE;
			context.getters.getRowByKeyPath = () => ( { id: 1 } );
			context.getters.getChildrenByParentRowId = () => [ { id: 2 }, { id: 3 }, { id: 4 } ];
			submissionModule.actions.transformZObjectForSubmission( context, false );
			expect( context.dispatch ).toHaveBeenCalledWith( 'removeEmptyMonolingualValues', { rowId: 3, key: 'Z3K3' } );
			expect( context.dispatch ).toHaveBeenCalledWith( 'removeEmptyMonolingualValues', { rowId: 4, key: 'Z3K3' } );
		} );

		it( 'recalculates keys if it is an error type', () => {
			context.getters.getZObjectTypeByRowId = () => Constants.Z_ERRORTYPE;
			context.getters.getRowByKeyPath = () => ( { id: 1 } );
			submissionModule.actions.transformZObjectForSubmission( context, false );
			expect( context.dispatch ).toHaveBeenCalledWith( 'recalculateKeys', { listRowId: 1, key: 'Z3K2' } );
		} );

		it( 'removes empty key labels if it is an errortype', () => {
			context.getters.getZObjectTypeByRowId = () => Constants.Z_ERRORTYPE;
			context.getters.getRowByKeyPath = () => ( { id: 1 } );
			context.getters.getChildrenByParentRowId = () => [ { id: 2 }, { id: 3 }, { id: 4 } ];
			submissionModule.actions.transformZObjectForSubmission( context, false );
			expect( context.dispatch ).toHaveBeenCalledWith( 'removeEmptyMonolingualValues', { rowId: 3, key: 'Z3K3' } );
			expect( context.dispatch ).toHaveBeenCalledWith( 'removeEmptyMonolingualValues', { rowId: 4, key: 'Z3K3' } );
		} );

		it( 'removes list items marked as invalid', () => {
			context.getters.hasInvalidListItems = true;
			context.getters.getInvalidListItems = {
				1: [ 2 ]
			};
			submissionModule.actions.transformZObjectForSubmission( context, false );
			expect( context.dispatch ).toHaveBeenCalledWith( 'removeItemsFromTypedList', {
				parentRowId: 1,
				listItems: [ 2 ]
			} );
			expect( context.dispatch ).toHaveBeenCalledWith( 'clearListItemsForRemoval' );
		} );

		it( 'does not remove list items if none are marked as invalid', () => {
			context.getters.hasInvalidListItems = false;
			submissionModule.actions.transformZObjectForSubmission( context, false );
			expect( context.dispatch ).not.toHaveBeenCalledWith( 'removeItemsFromTypedList' );
			expect( context.dispatch ).not.toHaveBeenCalledWith( 'clearListItemsForRemoval' );
		} );

		it( 'disconnects function objects if needed', () => {
			submissionModule.actions.transformZObjectForSubmission( context, true );
			expect( context.dispatch ).toHaveBeenCalledWith( 'disconnectFunctionObjects' );
		} );

		it( 'does not disconnect function objects if not needed', () => {
			submissionModule.actions.transformZObjectForSubmission( context, false );
			expect( context.dispatch ).not.toHaveBeenCalledWith( 'disconnectFunctionObjects' );
		} );
	} );

	describe( 'removeEmptyMonolingualValues', () => {

		beforeEach( () => {
			context.state = { zobject: {} };

			// run zobject module getters
			context.getters.getRowById = zobjectModule.getters.getRowById( context.state );
			context.getters.getRowIndexById = zobjectModule.getters.getRowIndexById( context.state );
			context.getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( context.state );
			context.getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( context.state, context.getters );
			context.getters.getZMonolingualTextValue = zobjectModule.getters.getZMonolingualTextValue( context.state, context.getters );
			context.getters.getZMonolingualLangValue = zobjectModule.getters.getZMonolingualLangValue( context.state, context.getters );
			context.getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( context.state, context.getters );
			context.getters.getZStringTerminalValue = zobjectModule.getters.getZStringTerminalValue( context.state, context.getters );
			context.getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( context.state, context.getters );
			context.getters.getZObjectTypeByRowId = zobjectModule.getters.getZObjectTypeByRowId( context.state, context.getters );

			// run zobject module actions
			context.dispatch = jest.fn( ( actionType, payload ) => {
				if ( actionType in zobjectModule.actions ) {
					return zobjectModule.actions[ actionType ]( context, payload );
				}
				return;
			} );

			// run zobject module mutations
			context.commit = jest.fn( ( mutationType, payload ) => {
				if ( mutationType in zobjectModule.mutations ) {
					zobjectModule.mutations[ mutationType ]( context.state, payload );
				}
			} );
		} );

		it( 'does nothing when nothing is present', () => {
			const zobject = {
				Z2K3: {
					Z1K1: 'Z12',
					Z12K1: [
						'Z11'
					]
				}
			};
			context.state.zobject = zobjectToRows( zobject );
			submissionModule.actions.removeEmptyMonolingualValues( context, { key: 'Z2K3' } );

			const transformed = zobjectModule.getters.getZObjectAsJsonById( context.state )( 0, false );
			expect( hybridToCanonical( transformed ) ).toEqual( {
				Z2K3: {
					Z1K1: 'Z12',
					Z12K1: [
						'Z11'
					]
				}
			} );
		} );

		it( 'removes monolingual value when text is empty', () => {
			const zobject = {
				Z2K3: {
					Z1K1: 'Z12',
					Z12K1: [
						'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: '' },
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'this is good' }
					]
				}
			};
			context.state.zobject = zobjectToRows( zobject );
			submissionModule.actions.removeEmptyMonolingualValues( context, { key: 'Z2K3' } );

			const transformed = zobjectModule.getters.getZObjectAsJsonById( context.state )( 0, false );
			expect( hybridToCanonical( transformed ) ).toEqual( {
				Z2K3: {
					Z1K1: 'Z12',
					Z12K1: [
						'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'this is good' }
					]
				}
			} );
		} );

		it( 'removes monolingual value when language is empty', () => {
			const zobject = {
				Z2K3: {
					Z1K1: 'Z12',
					Z12K1: [
						'Z11',
						{ Z1K1: 'Z11', Z11K1: '', Z11K2: 'this is bad' },
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'this is good' }
					]
				}
			};
			context.state.zobject = zobjectToRows( zobject );
			submissionModule.actions.removeEmptyMonolingualValues( context, { key: 'Z2K3' } );

			const transformed = zobjectModule.getters.getZObjectAsJsonById( context.state )( 0, false );
			expect( hybridToCanonical( transformed ) ).toEqual( {
				Z2K3: {
					Z1K1: 'Z12',
					Z12K1: [
						'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'this is good' }
					]
				}
			} );
		} );

		it( 'does not remove well formed monolingual values', () => {
			const zobject = {
				Z2K3: {
					Z1K1: 'Z12',
					Z12K1: [
						'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'esto está bien' },
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'this is good' }
					]
				}
			};
			context.state.zobject = zobjectToRows( zobject );
			submissionModule.actions.removeEmptyMonolingualValues( context, { key: 'Z2K3' } );

			const transformed = zobjectModule.getters.getZObjectAsJsonById( context.state )( 0, false );
			expect( hybridToCanonical( transformed ) ).toEqual( {
				Z2K3: {
					Z1K1: 'Z12',
					Z12K1: [
						'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'esto está bien' },
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'this is good' }
					]
				}
			} );
		} );

		it( 'only removes values of the given key', () => {
			const zobject = {
				Z2K3: {
					Z1K1: 'Z12',
					Z12K1: [
						'Z11',
						{ Z1K1: 'Z11', Z11K1: '', Z11K2: 'remove this...' }
					]
				},
				Z2K5: {
					Z1K1: 'Z12',
					Z12K1: [
						'Z11',
						{ Z1K1: 'Z11', Z11K1: '', Z11K2: '...but not this' }
					]
				}
			};
			context.state.zobject = zobjectToRows( zobject );
			submissionModule.actions.removeEmptyMonolingualValues( context, { key: 'Z2K3' } );

			const transformed = zobjectModule.getters.getZObjectAsJsonById( context.state )( 0, false );
			expect( hybridToCanonical( transformed ) ).toEqual( {
				Z2K3: {
					Z1K1: 'Z12',
					Z12K1: [ 'Z11' ]
				},
				Z2K5: {
					Z1K1: 'Z12',
					Z12K1: [
						'Z11',
						{ Z1K1: 'Z11', Z11K1: '', Z11K2: '...but not this' }
					]
				}
			} );
		} );
	} );

	describe( 'removeEmptyAliasValues', () => {

		beforeEach( () => {
			context.state = { zobject: {} };

			// run zobject module getters
			context.getters.getRowById = zobjectModule.getters.getRowById( context.state );
			context.getters.getRowIndexById = zobjectModule.getters.getRowIndexById( context.state );
			context.getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( context.state );
			context.getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( context.state, context.getters );
			context.getters.getZMonolingualStringsetLang = zobjectModule.getters.getZMonolingualStringsetLang( context.state, context.getters );
			context.getters.getZMonolingualStringsetValues = zobjectModule.getters.getZMonolingualStringsetValues( context.state, context.getters );
			context.getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( context.state, context.getters );
			context.getters.getZStringTerminalValue = zobjectModule.getters.getZStringTerminalValue( context.state, context.getters );
			context.getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( context.state, context.getters );
			context.getters.getZObjectTypeByRowId = zobjectModule.getters.getZObjectTypeByRowId( context.state, context.getters );

			// run zobject module actions
			context.dispatch = jest.fn( ( actionType, payload ) => {
				if ( actionType in zobjectModule.actions ) {
					return zobjectModule.actions[ actionType ]( context, payload );
				}
				return;
			} );

			// run zobject module mutations
			context.commit = jest.fn( ( mutationType, payload ) => {
				if ( mutationType in zobjectModule.mutations ) {
					zobjectModule.mutations[ mutationType ]( context.state, payload );
				}
			} );
		} );

		it( 'removes empty strings from the stringset', () => {
			const zobject = {
				Z2K4: {
					Z1K1: 'Z32',
					Z32K1: [
						'Z31',
						{ Z1K1: 'Z31', Z31K1: 'Z1003', Z31K2: [ 'Z6', '', 'un alias' ] },
						{ Z1K1: 'Z31', Z31K1: 'Z1002', Z31K2: [ 'Z6', 'one alias', '', 'another alias' ] }
					]
				}
			};
			context.state.zobject = zobjectToRows( zobject );
			submissionModule.actions.removeEmptyAliasValues( context );

			const transformed = zobjectModule.getters.getZObjectAsJsonById( context.state )( 0, false );
			expect( hybridToCanonical( transformed ) ).toEqual( {
				Z2K4: {
					Z1K1: 'Z32',
					Z32K1: [
						'Z31',
						{ Z1K1: 'Z31', Z31K1: 'Z1003', Z31K2: [ 'Z6', 'un alias' ] },
						{ Z1K1: 'Z31', Z31K1: 'Z1002', Z31K2: [ 'Z6', 'one alias', 'another alias' ] }
					]
				}
			} );
		} );

		it( 'removes alias with empty stringset', () => {
			const zobject = {
				Z2K4: {
					Z1K1: 'Z32',
					Z32K1: [
						'Z31',
						{ Z1K1: 'Z31', Z31K1: 'Z1002', Z31K2: [ 'Z6', 'this is good' ] },
						{ Z1K1: 'Z31', Z31K1: 'Z1003', Z31K2: [ 'Z6' ] },
						{ Z1K1: 'Z31', Z31K1: 'Z1004', Z31K2: [ 'Z6', '', '' ] }
					]
				}
			};
			context.state.zobject = zobjectToRows( zobject );
			submissionModule.actions.removeEmptyAliasValues( context );

			const transformed = zobjectModule.getters.getZObjectAsJsonById( context.state )( 0, false );
			expect( hybridToCanonical( transformed ) ).toEqual( {
				Z2K4: {
					Z1K1: 'Z32',
					Z32K1: [
						'Z31',
						{ Z1K1: 'Z31', Z31K1: 'Z1002', Z31K2: [ 'Z6', 'this is good' ] }
					]
				}
			} );
		} );

		it( 'removes alias with undefined language', () => {
			const zobject = {
				Z2K4: {
					Z1K1: 'Z32',
					Z32K1: [
						'Z31',
						{ Z1K1: 'Z31', Z31K1: '', Z31K2: [ 'Z6', 'this has no language' ] },
						{ Z1K1: 'Z31', Z31K1: 'Z1003', Z31K2: [ 'Z6', 'un alias' ] },
						{ Z1K1: 'Z31', Z31K1: '', Z31K2: [ 'Z6', '', '' ] }
					]
				}
			};
			context.state.zobject = zobjectToRows( zobject );
			submissionModule.actions.removeEmptyAliasValues( context );

			const transformed = zobjectModule.getters.getZObjectAsJsonById( context.state )( 0, false );
			expect( hybridToCanonical( transformed ) ).toEqual( {
				Z2K4: {
					Z1K1: 'Z32',
					Z32K1: [
						'Z31',
						{ Z1K1: 'Z31', Z31K1: 'Z1003', Z31K2: [ 'Z6', 'un alias' ] }
					]
				}
			} );
		} );
	} );

	describe( 'removeEmptyArguments', () => {

		beforeEach( () => {
			context.state = { zobject: {} };

			// run zobject module getters
			context.getters.getCurrentZObjectId = 'Z12345';
			context.getters.getZFunctionInputs = zfunctionModule.getters.getZFunctionInputs( context.state, context.getters );
			context.getters.getZFunctionCallFunctionId = zobjectModule.getters.getZFunctionCallFunctionId( context.state, context.getters );
			context.getters.getRowById = zobjectModule.getters.getRowById( context.state );
			context.getters.getRowIndexById = zobjectModule.getters.getRowIndexById( context.state );
			context.getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( context.state );
			context.getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( context.state, context.getters );
			context.getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( context.state, context.getters );
			context.getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( context.state, context.getters );
			context.getters.getZStringTerminalValue = zobjectModule.getters.getZStringTerminalValue( context.state, context.getters );
			context.getters.getZMonolingualTextValue = zobjectModule.getters.getZMonolingualTextValue( context.state, context.getters );
			context.getters.getZMonolingualLangValue = zobjectModule.getters.getZMonolingualLangValue( context.state, context.getters );
			context.getters.getZObjectTypeByRowId = zobjectModule.getters.getZObjectTypeByRowId( context.state, context.getters );
			context.getters.getZObjectAsJsonById = zobjectModule.getters.getZObjectAsJsonById( context.state, context.getters );

			// run zobject module actions
			context.dispatch = jest.fn( ( actionType, payload ) => {
				if ( actionType in zobjectModule.actions ) {
					return zobjectModule.actions[ actionType ]( context, payload );
				}
				return;
			} );

			// run zobject module mutations
			context.commit = jest.fn( ( mutationType, payload ) => {
				if ( mutationType in zobjectModule.mutations ) {
					zobjectModule.mutations[ mutationType ]( context.state, payload );
				}
			} );
		} );

		it( 'removes empty labels from arguments', () => {
			const zobject = {
				Z2K2: { Z8K1: [ 'Z17',
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input one' },
						{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'primer parámetro' },
						{ Z1K1: 'Z11', Z11K1: '', Z11K2: 'input with no language' }
					] } },
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input two' },
						{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'segundo parámetro' },
						{ Z1K1: 'Z11', Z11K1: 'Z1004', Z11K2: '' },
						{ Z1K1: 'Z11', Z11K1: 'Z1005', Z11K2: '' },
						{ Z1K1: 'Z11', Z11K1: '', Z11K2: 'some label with empty language' }
					] } }
				] }
			};
			context.state.zobject = zobjectToRows( zobject );
			submissionModule.actions.removeEmptyArguments( context );

			const transformed = zobjectModule.getters.getZObjectAsJsonById( context.state )( 0, false );
			expect( hybridToCanonical( transformed ) ).toEqual( {
				Z2K2: { Z8K1: [ 'Z17',
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input one' },
						{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'primer parámetro' }
					] } },
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input two' },
						{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'segundo parámetro' }
					] } }
				] }
			} );
		} );

		it( 'removes arguments with empty labels and undefined type', () => {
			const zobject = {
				Z2K2: { Z8K1: [ 'Z17',
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input one' }
					] } },
					{ Z1K1: 'Z17', Z17K1: '', Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
					{ Z1K1: 'Z17', Z17K1: '', Z17K2: 'Z12345K3', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: '' },
						{ Z1K1: 'Z11', Z11K1: '', Z11K2: 'input one' }
					] } },
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K4', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input two' }
					] } }
				] }
			};
			context.state.zobject = zobjectToRows( zobject );
			submissionModule.actions.removeEmptyArguments( context );

			const transformed = zobjectModule.getters.getZObjectAsJsonById( context.state )( 0, false );
			expect( hybridToCanonical( transformed ) ).toEqual( {
				Z2K2: { Z8K1: [ 'Z17',
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input one' }
					] } },
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input two' }
					] } }
				] }
			} );
		} );

		it( 'does not remove arguments with empty labels and generic type', () => {
			const zobject = {
				Z2K2: { Z8K1: [ 'Z17',
					{ Z1K1: 'Z17',
						Z17K1: { Z1K1: 'Z7', Z7K1: 'Z881', Z881K1: 'Z6' },
						Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
					{ Z1K1: 'Z17',
						Z17K1: { Z1K1: 'Z7', Z7K1: 'Z881', Z881K1: 'Z6' },
						Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
				] }
			};
			context.state.zobject = zobjectToRows( zobject );
			submissionModule.actions.removeEmptyArguments( context );

			const transformed = zobjectModule.getters.getZObjectAsJsonById( context.state )( 0, false );
			expect( hybridToCanonical( transformed ) ).toEqual( {
				Z2K2: { Z8K1: [ 'Z17',
					{ Z1K1: 'Z17',
						Z17K1: { Z1K1: 'Z7', Z7K1: 'Z881', Z881K1: 'Z6' },
						Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
					{ Z1K1: 'Z17',
						Z17K1: { Z1K1: 'Z7', Z7K1: 'Z881', Z881K1: 'Z6' },
						Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
				] }
			} );
		} );
	} );

	describe( 'removeEmptyTypeFunctions', () => {

		beforeEach( () => {
			context.state = { zobject: {} };

			// run zobject module getters
			context.getters.getCurrentZObjectId = 'Z12345';
			context.getters.getRowById = zobjectModule.getters.getRowById( context.state );
			context.getters.getRowIndexById = zobjectModule.getters.getRowIndexById( context.state );
			context.getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( context.state );
			context.getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( context.state, context.getters );
			context.getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( context.state, context.getters );
			context.getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( context.state, context.getters );

			// run zobject module actions
			context.dispatch = jest.fn( ( actionType, payload ) => {
				if ( actionType in zobjectModule.actions ) {
					return zobjectModule.actions[ actionType ]( context, payload );
				}
				return;
			} );

			// run zobject module mutations
			context.commit = jest.fn( ( mutationType, payload ) => {
				if ( mutationType in zobjectModule.mutations ) {
					zobjectModule.mutations[ mutationType ]( context.state, payload );
				}
			} );
		} );

		it( 'removes undefined validator function/Z4K3', () => {
			const rowId = 1;
			const zobject = {
				Z2K2: { // rowId = 1
					Z1K1: 'Z4',
					Z4K1: 'Z12345',
					Z4K2: [ 'Z3' ],
					Z4K3: '',
					Z4K4: 'Z10001',
					Z4K5: 'Z10002',
					Z4K6: 'Z10003'
				}
			};
			context.state.zobject = zobjectToRows( zobject );
			submissionModule.actions.removeEmptyTypeFunctions( context, rowId );

			const transformed = zobjectModule.getters.getZObjectAsJsonById( context.state )( 0, false );
			expect( hybridToCanonical( transformed ) ).toEqual( {
				Z2K2: {
					Z1K1: 'Z4',
					Z4K1: 'Z12345',
					Z4K2: [ 'Z3' ],
					Z4K4: 'Z10001',
					Z4K5: 'Z10002',
					Z4K6: 'Z10003'
				}
			} );
		} );

		it( 'removes undefined equality function/Z4K4', () => {
			const rowId = 1;
			const zobject = {
				Z2K2: { // rowId = 1
					Z1K1: 'Z4',
					Z4K1: 'Z12345',
					Z4K2: [ 'Z3' ],
					Z4K3: 'Z10001',
					Z4K4: '',
					Z4K5: 'Z10002',
					Z4K6: 'Z10003'
				}
			};
			context.state.zobject = zobjectToRows( zobject );
			submissionModule.actions.removeEmptyTypeFunctions( context, rowId );

			const transformed = zobjectModule.getters.getZObjectAsJsonById( context.state )( 0, false );
			expect( hybridToCanonical( transformed ) ).toEqual( {
				Z2K2: {
					Z1K1: 'Z4',
					Z4K1: 'Z12345',
					Z4K2: [ 'Z3' ],
					Z4K3: 'Z10001',
					Z4K5: 'Z10002',
					Z4K6: 'Z10003'
				}
			} );
		} );

		it( 'removes undefined renderer function/Z4K5', () => {
			const rowId = 1;
			const zobject = {
				Z2K2: { // rowId = 1
					Z1K1: 'Z4',
					Z4K1: 'Z12345',
					Z4K2: [ 'Z3' ],
					Z4K3: 'Z10001',
					Z4K4: 'Z10002',
					Z4K5: '',
					Z4K6: 'Z10003'
				}
			};
			context.state.zobject = zobjectToRows( zobject );
			submissionModule.actions.removeEmptyTypeFunctions( context, rowId );

			const transformed = zobjectModule.getters.getZObjectAsJsonById( context.state )( 0, false );
			expect( hybridToCanonical( transformed ) ).toEqual( {
				Z2K2: {
					Z1K1: 'Z4',
					Z4K1: 'Z12345',
					Z4K2: [ 'Z3' ],
					Z4K3: 'Z10001',
					Z4K4: 'Z10002',
					Z4K6: 'Z10003'
				}
			} );
		} );

		it( 'removes undefined parser function/Z4K6', () => {
			const rowId = 1;
			const zobject = {
				Z2K2: { // rowId = 1
					Z1K1: 'Z4',
					Z4K1: 'Z12345',
					Z4K2: [ 'Z3' ],
					Z4K3: 'Z10001',
					Z4K4: 'Z10002',
					Z4K5: 'Z10003',
					Z4K6: ''
				}
			};
			context.state.zobject = zobjectToRows( zobject );
			submissionModule.actions.removeEmptyTypeFunctions( context, rowId );

			const transformed = zobjectModule.getters.getZObjectAsJsonById( context.state )( 0, false );
			expect( hybridToCanonical( transformed ) ).toEqual( {
				Z2K2: {
					Z1K1: 'Z4',
					Z4K1: 'Z12345',
					Z4K2: [ 'Z3' ],
					Z4K3: 'Z10001',
					Z4K4: 'Z10002',
					Z4K5: 'Z10003'
				}
			} );
		} );

		it( 'removes all undefined type functions', () => {
			const rowId = 1;
			const zobject = {
				Z2K2: { // rowId = 1
					Z1K1: 'Z4',
					Z4K1: 'Z12345',
					Z4K2: [ 'Z3' ],
					Z4K3: '',
					Z4K4: '',
					Z4K5: '',
					Z4K6: ''
				}
			};
			context.state.zobject = zobjectToRows( zobject );
			submissionModule.actions.removeEmptyTypeFunctions( context, rowId );

			const transformed = zobjectModule.getters.getZObjectAsJsonById( context.state )( 0, false );
			expect( hybridToCanonical( transformed ) ).toEqual( {
				Z2K2: {
					Z1K1: 'Z4',
					Z4K1: 'Z12345',
					Z4K2: [ 'Z3' ]
				}
			} );
		} );
	} );

	describe( 'disconnectFunctionObjects', () => {

		beforeEach( () => {
			context.state = { zobject: {} };

			// run zobject module getters
			context.getters.getRowById = zobjectModule.getters.getRowById( context.state );
			context.getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( context.state, context.getters );
			context.getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( context.state );
			context.getters.getRowIndexById = zobjectModule.getters.getRowIndexById( context.state );

			// run zobject module actions
			context.dispatch = jest.fn( ( actionType, payload ) => {
				if ( actionType in zobjectModule.actions ) {
					return zobjectModule.actions[ actionType ]( context, payload );
				}
				return;
			} );

			// run zobject module mutations
			context.commit = jest.fn( ( mutationType, payload ) => {
				if ( mutationType in zobjectModule.mutations ) {
					zobjectModule.mutations[ mutationType ]( context.state, payload );
				}
			} );
		} );

		it( 'disconnects all implementations and testers', () => {
			const zobject = {
				Z2K2: {
					Z8K3: [ 'Z20', 'Z10020', 'Z10021' ],
					Z8K4: [ 'Z14', 'Z10014', 'Z10015' ]
				}
			};
			context.state.zobject = zobjectToRows( zobject );
			submissionModule.actions.disconnectFunctionObjects( context );

			const transformed = zobjectModule.getters.getZObjectAsJsonById( context.state )( 0, false );
			expect( hybridToCanonical( transformed ) ).toEqual( {
				Z2K2: {
					Z8K3: [ 'Z20' ],
					Z8K4: [ 'Z14' ]
				}
			} );
		} );

		it( 'leaves intact when there are no implementations or testers', () => {
			const zobject = {
				Z2K2: {
					Z8K3: [ 'Z20' ],
					Z8K4: [ 'Z14' ]
				}
			};
			context.state.zobject = zobjectToRows( zobject );
			submissionModule.actions.disconnectFunctionObjects( context );

			const transformed = zobjectModule.getters.getZObjectAsJsonById( context.state )( 0, false );
			expect( hybridToCanonical( transformed ) ).toEqual( {
				Z2K2: {
					Z8K3: [ 'Z20' ],
					Z8K4: [ 'Z14' ]
				}
			} );
		} );
	} );
} );
