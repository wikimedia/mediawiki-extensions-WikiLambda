/*!
 * WikiLambda unit test suite for the zobject submission Pinia store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const { setActivePinia, createPinia } = require( 'pinia' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const { hybridToCanonical } = require( '../../../../resources/ext.wikilambda.app/utils/schemata.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const { zobjectToRows } = require( '../../helpers/zObjectTableHelpers.js' );

describe( 'zobject submission Pinia store', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.zobject = [];
	} );

	describe( 'Actions', () => {
		describe( 'validateZObject', () => {
			beforeEach( () => {
				Object.defineProperty( store, 'getCurrentZObjectType', {
					value: Constants.Z_FUNCTION
				} );
				Object.defineProperty( store, 'getZObjectAsJson', {
					value: {}
				} );
				Object.defineProperty( store, 'getZPersistentContentRowId', {
					value: jest.fn().mockReturnValue( 1 )
				} );

				store.setError = jest.fn();
			} );

			it( 'Does not set error for a valid function', () => {

				Object.defineProperty( store, 'getInvalidOutputFields', {
					value: []
				} );
				Object.defineProperty( store, 'getInvalidInputFields', {
					value: []
				} );

				const isValid = store.validateZObject();
				expect( store.setError ).toHaveBeenCalledTimes( 0 );
				expect( isValid ).toEqual( true );
			} );

			it( 'Does not set error for an unknown zobject type', () => {

				Object.defineProperty( store, 'getCurrentZObjectType', {
					value: undefined
				} );
				Object.defineProperty( store, 'getInvalidOutputFields', {
					value: []
				} );
				Object.defineProperty( store, 'getInvalidInputFields', {
					value: []
				} );

				const isValid = store.validateZObject();
				expect( store.setError ).toHaveBeenCalledTimes( 0 );
				expect( isValid ).toEqual( true );
			} );

			it( 'Sets errors for a function with one invalid output field', () => {
				Object.defineProperty( store, 'getInvalidOutputFields', {
					value: [ 2 ]
				} );
				Object.defineProperty( store, 'getInvalidInputFields', {
					value: []
				} );

				const mockError = {
					rowId: 2,
					errorCode: Constants.errorCodes.MISSING_FUNCTION_OUTPUT,
					errorType: Constants.errorTypes.ERROR
				};

				const isValid = store.validateZObject();
				expect( store.setError ).toHaveBeenCalledTimes( 1 );
				expect( store.setError ).toHaveBeenCalledWith( mockError );
				expect( isValid ).toEqual( false );
			} );

			it( 'Sets errors for a function with many invalid output fields', () => {
				Object.defineProperty( store, 'getInvalidOutputFields', {
					value: [ 2, 3 ]
				} );
				Object.defineProperty( store, 'getInvalidInputFields', {
					value: []
				} );

				const mockErrors = [ {
					rowId: 2,
					errorCode: Constants.errorCodes.MISSING_FUNCTION_OUTPUT,
					errorType: Constants.errorTypes.ERROR
				}, {
					rowId: 3,
					errorCode: Constants.errorCodes.MISSING_FUNCTION_OUTPUT,
					errorType: Constants.errorTypes.ERROR
				} ];

				const isValid = store.validateZObject();
				expect( store.setError ).toHaveBeenCalledTimes( 2 );
				expect( store.setError ).toHaveBeenCalledWith( mockErrors[ 0 ] );
				expect( store.setError ).toHaveBeenCalledWith( mockErrors[ 1 ] );
				expect( isValid ).toEqual( false );
			} );

			it( 'Sets errors for a function with one invalid input field', () => {
				Object.defineProperty( store, 'getInvalidOutputFields', {
					value: []
				} );
				Object.defineProperty( store, 'getInvalidInputFields', {
					value: [ 3 ]
				} );

				const mockError = {
					rowId: 3,
					errorCode: Constants.errorCodes.MISSING_FUNCTION_INPUT_TYPE,
					errorType: Constants.errorTypes.ERROR
				};

				const isValid = store.validateZObject();
				expect( store.setError ).toHaveBeenCalledTimes( 1 );
				expect( store.setError ).toHaveBeenCalledWith( mockError );
				expect( isValid ).toEqual( false );
			} );

			it( 'Sets errors for a function with many invalid input fields', () => {
				Object.defineProperty( store, 'getInvalidOutputFields', {
					value: []
				} );
				Object.defineProperty( store, 'getInvalidInputFields', {
					value: [ 3, 4 ]
				} );

				const mockErrors = [ {
					rowId: 3,
					errorCode: Constants.errorCodes.MISSING_FUNCTION_INPUT_TYPE,
					errorType: Constants.errorTypes.ERROR
				}, {
					rowId: 4,
					errorCode: Constants.errorCodes.MISSING_FUNCTION_INPUT_TYPE,
					errorType: Constants.errorTypes.ERROR
				} ];

				const isValid = store.validateZObject();
				expect( store.setError ).toHaveBeenCalledTimes( 2 );
				expect( store.setError ).toHaveBeenCalledWith( mockErrors[ 0 ] );
				expect( store.setError ).toHaveBeenCalledWith( mockErrors[ 1 ] );
				expect( isValid ).toEqual( false );
			} );

			it( 'Sets errors for a function with invalid output and input fields', () => {
				Object.defineProperty( store, 'getInvalidOutputFields', {
					value: [ 2 ]
				} );
				Object.defineProperty( store, 'getInvalidInputFields', {
					value: [ 3 ]
				} );

				const mockErrors = [ {
					rowId: 2,
					errorCode: Constants.errorCodes.MISSING_FUNCTION_OUTPUT,
					errorType: Constants.errorTypes.ERROR
				}, {
					rowId: 3,
					errorCode: Constants.errorCodes.MISSING_FUNCTION_INPUT_TYPE,
					errorType: Constants.errorTypes.ERROR
				} ];

				const isValid = store.validateZObject();
				expect( store.setError ).toHaveBeenCalledTimes( 2 );
				expect( store.setError ).toHaveBeenCalledWith( mockErrors[ 0 ] );
				expect( store.setError ).toHaveBeenCalledWith( mockErrors[ 1 ] );
				expect( isValid ).toEqual( false );
			} );
		} );

		describe( 'validate implementation', () => {
			beforeEach( () => {
				Object.defineProperty( store, 'getCurrentZObjectType', {
					value: Constants.Z_IMPLEMENTATION
				} );
				Object.defineProperty( store, 'getZPersistentContentRowId', {
					value: jest.fn().mockReturnValue( 1 )
				} );
				store.setError = jest.fn();
			} );

			it( 'Does not set error for a valid code implementation', () => {

				Object.defineProperty( store, 'getZImplementationContentRowId', {
					value: jest.fn().mockReturnValue( 2 )
				} );
				Object.defineProperty( store, 'getRowByKeyPath', {
					value: jest.fn().mockReturnValue( { id: 3 } )
				} );
				Object.defineProperty( store, 'getZObjectAsJson', {
					value: {
						Z2K2: {
							Z1K1: Constants.Z_IMPLEMENTATION,
							Z14K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
							Z14K3: {
								Z1K1: Constants.Z_CODE,
								Z16K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: Constants.Z_PROGRAMMING_LANGUAGES.PYTHON },
								Z16K2: { Z1K1: Constants.Z_STRING, Z6K1: 'some code' }
							}
						}
					}
				} );

				const isValid = store.validateZObject();
				expect( store.setError ).toHaveBeenCalledTimes( 0 );
				expect( isValid ).toEqual( true );
			} );

			it( 'Does not set error for a valid composition implementation (function call)', () => {
				Object.defineProperty( store, 'getZObjectAsJson', {
					value: {
						Z2K2: {
							Z1K1: Constants.Z_IMPLEMENTATION,
							Z14K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
							Z14K2: {
								Z1K1: Constants.Z_FUNCTION_CALL,
								Z7K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z888' }
							}
						}
					}
				} );

				const isValid = store.validateZObject();
				expect( store.setError ).toHaveBeenCalledTimes( 0 );
				expect( isValid ).toEqual( true );
			} );

			it( 'Does not set error for a valid composition implementation (argument reference)', () => {
				Object.defineProperty( store, 'getZObjectAsJson', {
					value: {
						Z2K2: {
							Z1K1: Constants.Z_IMPLEMENTATION,
							Z14K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
							Z14K2: {
								Z1K1: Constants.Z_ARGUMENT_REFERENCE,
								Z18K1: { Z1K1: Constants.Z_STRING, Z6K1: 'Z888K1' }
							}
						}
					}
				} );

				const isValid = store.validateZObject();
				expect( store.setError ).toHaveBeenCalledTimes( 0 );
				expect( isValid ).toEqual( true );
			} );

			it( 'Does not set error for a valid composition implementation (type)', () => {
				Object.defineProperty( store, 'getZObjectAsJson', {
					value: {
						Z2K2: {
							Z1K1: Constants.Z_IMPLEMENTATION,
							Z14K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
							Z14K2: {
								Z1K1: Constants.Z_TYPE,
								Z4K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
								Z4K2: [ Constants.Z_KEY ]
							}
						}
					}
				} );

				const isValid = store.validateZObject();
				expect( store.setError ).toHaveBeenCalledTimes( 0 );
				expect( isValid ).toEqual( true );
			} );

			it( 'Does not set error for a valid builtin implementation', () => {
				Object.defineProperty( store, 'getZObjectAsJson', {
					value: {
						Z2K2: {
							Z1K1: Constants.Z_IMPLEMENTATION,
							Z14K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
							Z14K4: { Z1K1: Constants.Z_STRING, Z6K1: 'Z999' }
						}
					}
				} );

				const isValid = store.validateZObject();
				expect( store.setError ).toHaveBeenCalledTimes( 0 );
				expect( isValid ).toEqual( true );
			} );

			it( 'Sets error for an implementation with missing target function', () => {
				Object.defineProperty( store, 'getZImplementationFunctionRowId', {
					value: jest.fn().mockReturnValue( 2 )
				} );
				Object.defineProperty( store, 'getZObjectAsJson', {
					value: {
						Z2K2: {
							Z1K1: Constants.Z_IMPLEMENTATION,
							Z14K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: '' },
							Z14K4: { Z1K1: Constants.Z_STRING, Z6K1: 'Z999' }
						}
					}
				} );

				const mockError = {
					rowId: 2,
					errorCode: Constants.errorCodes.MISSING_TARGET_FUNCTION,
					errorType: Constants.errorTypes.ERROR
				};

				const isValid = store.validateZObject();
				expect( store.setError ).toHaveBeenCalledTimes( 1 );
				expect( store.setError ).toHaveBeenCalledWith( mockError );
				expect( isValid ).toEqual( false );
			} );

			it( 'Sets error for an implementation with missing composition', () => {
				Object.defineProperty( store, 'getZImplementationContentRowId', {
					value: jest.fn().mockReturnValue( 2 )
				} );
				Object.defineProperty( store, 'getZObjectAsJson', {
					value: {
						Z2K2: {
							Z1K1: Constants.Z_IMPLEMENTATION,
							Z14K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
							Z14K2: { Z1K1: Constants.Z_FUNCTION_CALL, Z7K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: '' } }
						}
					}
				} );

				const mockError = {
					rowId: 2,
					errorCode: Constants.errorCodes.MISSING_IMPLEMENTATION_COMPOSITION,
					errorType: Constants.errorTypes.ERROR
				};

				const isValid = store.validateZObject();
				expect( store.setError ).toHaveBeenCalledTimes( 1 );
				expect( store.setError ).toHaveBeenCalledWith( mockError );
				expect( isValid ).toEqual( false );
			} );

			it( 'Sets error for a code implementation with missing programming language', () => {

				Object.defineProperty( store, 'getZImplementationContentRowId', {
					value: jest.fn().mockReturnValue( 2 )
				} );
				Object.defineProperty( store, 'getRowByKeyPath', {
					value: jest.fn().mockReturnValue( { id: 3 } )
				} );
				Object.defineProperty( store, 'getZObjectAsJson', {
					value: {
						Z2K2: {
							Z1K1: Constants.Z_IMPLEMENTATION,
							Z14K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
							Z14K3: {
								Z1K1: Constants.Z_CODE,
								Z16K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: '' },
								Z16K2: { Z1K1: Constants.Z_STRING, Z6K1: 'some code' }
							}
						}
					}
				} );

				const mockError = {
					rowId: 3,
					errorCode: Constants.errorCodes.MISSING_IMPLEMENTATION_CODE_LANGUAGE,
					errorType: Constants.errorTypes.ERROR
				};

				const isValid = store.validateZObject();
				expect( store.setError ).toHaveBeenCalledTimes( 1 );
				expect( store.setError ).toHaveBeenCalledWith( mockError );
				expect( isValid ).toEqual( false );
			} );

			it( 'Sets error for a code implementation with missing code value', () => {
				Object.defineProperty( store, 'getZImplementationContentRowId', {
					value: jest.fn().mockReturnValue( 2 )
				} );
				Object.defineProperty( store, 'getRowByKeyPath', {
					value: jest.fn().mockReturnValue( { id: 4 } )
				} );
				Object.defineProperty( store, 'getZObjectAsJson', {
					value: {
						Z2K2: {
							Z1K1: Constants.Z_IMPLEMENTATION,
							Z14K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
							Z14K3: {
								Z1K1: Constants.Z_CODE,
								Z16K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: Constants.Z_PROGRAMMING_LANGUAGES.PYTHON },
								Z16K2: { Z1K1: Constants.Z_STRING, Z6K1: '' }
							}
						}
					}
				} );

				const mockError = {
					rowId: 4,
					errorCode: Constants.errorCodes.MISSING_IMPLEMENTATION_CODE,
					errorType: Constants.errorTypes.ERROR
				};

				const isValid = store.validateZObject();
				expect( store.setError ).toHaveBeenCalledTimes( 1 );
				expect( store.setError ).toHaveBeenCalledWith( mockError );
				expect( isValid ).toEqual( false );
			} );
		} );

		describe( 'validate tester', () => {
			beforeEach( () => {
				Object.defineProperty( store, 'getCurrentZObjectType', {
					value: Constants.Z_TESTER
				} );
				Object.defineProperty( store, 'getZPersistentContentRowId', {
					value: jest.fn().mockReturnValue( 1 )
				} );
				store.setError = jest.fn();
			} );

			it( 'Does not set error for a valid tester', () => {
				Object.defineProperty( store, 'getZObjectAsJson', {
					value: {
						Z2K2: {
							Z1K1: Constants.Z_TESTER,
							Z20K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
							Z20K2: { Z1K1: Constants.Z_FUNCTION_CALL, Z7K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z888' } },
							Z20K3: { Z1K1: Constants.Z_FUNCTION_CALL, Z7K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z777' } }
						}
					}
				} );

				const isValid = store.validateZObject();
				expect( store.setError ).toHaveBeenCalledTimes( 0 );
				expect( isValid ).toEqual( true );
			} );

			it( 'Sets error for a tester with missing target function', () => {
				Object.defineProperty( store, 'getZTesterFunctionRowId', {
					value: jest.fn().mockReturnValue( 2 )
				} );
				Object.defineProperty( store, 'getZObjectAsJson', {
					value: {
						Z2K2: {
							Z1K1: Constants.Z_TESTER,
							Z20K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: '' },
							Z20K2: { Z1K1: Constants.Z_FUNCTION_CALL, Z7K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z888' } },
							Z20K3: { Z1K1: Constants.Z_FUNCTION_CALL, Z7K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z777' } }
						}
					}
				} );

				const mockError = {
					rowId: 2,
					errorCode: Constants.errorCodes.MISSING_TARGET_FUNCTION,
					errorType: Constants.errorTypes.ERROR
				};

				const isValid = store.validateZObject();
				expect( store.setError ).toHaveBeenCalledTimes( 1 );
				expect( store.setError ).toHaveBeenCalledWith( mockError );
				expect( isValid ).toEqual( false );
			} );

			it( 'Sets error for a tester with missing call', () => {
				Object.defineProperty( store, 'getZTesterCallRowId', {
					value: jest.fn().mockReturnValue( 3 )
				} );
				Object.defineProperty( store, 'getZObjectAsJson', {
					value: {
						Z2K2: {
							Z1K1: Constants.Z_TESTER,
							Z20K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
							Z20K2: { Z1K1: Constants.Z_FUNCTION_CALL, Z7K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: '' } },
							Z20K3: { Z1K1: Constants.Z_FUNCTION_CALL, Z7K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z777' } }
						}
					}
				} );

				const mockError = {
					rowId: 3,
					errorCode: Constants.errorCodes.MISSING_TESTER_CALL,
					errorType: Constants.errorTypes.ERROR
				};

				const isValid = store.validateZObject();
				expect( store.setError ).toHaveBeenCalledTimes( 1 );
				expect( store.setError ).toHaveBeenCalledWith( mockError );
				expect( isValid ).toEqual( false );
			} );

			it( 'Sets error for a tester with missing validation', () => {
				Object.defineProperty( store, 'getZTesterValidationRowId', {
					value: jest.fn().mockReturnValue( 4 )
				} );
				Object.defineProperty( store, 'getZObjectAsJson', {
					value: {
						Z2K2: {
							Z1K1: Constants.Z_TESTER,
							Z20K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z999' },
							Z20K2: { Z1K1: Constants.Z_FUNCTION_CALL, Z7K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z888' } },
							Z20K3: { Z1K1: Constants.Z_FUNCTION_CALL, Z7K1: { Z1K1: Constants.Z_REFERENCE, Z9K1: '' } }
						}
					}
				} );

				const mockError = {
					rowId: 4,
					errorCode: Constants.errorCodes.MISSING_TESTER_VALIDATION,
					errorType: Constants.errorTypes.ERROR
				};

				const isValid = store.validateZObject();
				expect( store.setError ).toHaveBeenCalledTimes( 1 );
				expect( store.setError ).toHaveBeenCalledWith( mockError );
				expect( isValid ).toEqual( false );
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

				store.zobject = [];
				Object.defineProperty( store, 'isCreateNewPage', {
					value: true
				} );
				Object.defineProperty( store, 'getCurrentZObjectId', {
					value: 'Z0'
				} );
			} );

			it( 'submits a new zobject to create', () => {
				store.zobject = zobjectToRows( zobject );
				store.isCreateNewPage = true;

				store.submitZObject( { summary: 'A summary' } );

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
				store.zobject = zobjectToRows( zobject );
				store.isCreateNewPage = false;

				store.submitZObject( { summary: 'A summary' } );

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
				store.zobject = zobjectToRows( zobject );
				store.isCreateNewPage = false;
				store.transformZObjectForSubmission = jest.fn();

				store.submitZObject( { summary: 'A summary' } );

				expect( store.transformZObjectForSubmission ).toHaveBeenCalledWith( false );

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

				store.zobject = zobjectToRows( zobject );
				store.getCurrentZObjectId = 'Z0';
				store.isCreateNewPage = false;

				store.submitZObject( { summary: 'A summary', disconnectFunctionObjects: true } );

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

				store.zobject = zobjectToRows( zobject.dirty );
				store.getCurrentZObjectId = 'Z0';
				store.isCreateNewPage = false;

				store.submitZObject( { summary: 'A summary' } );

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

				store.zobject = zobjectToRows( initialObject );
				store.isCreateNewPage = false;
				store.getCurrentZObjectId = 'Z0';
				Object.defineProperty( store, 'hasInvalidListItems', {
					value: true
				} );
				Object.defineProperty( store, 'getInvalidListItems', {
					value: {
						1: [ 5 ],
						22: [ 36, 39 ]
					}
				} );
				store.removeItemsFromTypedList = jest.fn();
				store.clearInvalidListItems = jest.fn();

				store.submitZObject( { summary: 'A summary' } );

				expect( store.removeItemsFromTypedList ).toHaveBeenCalledWith( {
					parentRowId: 1,
					listItems: [ 5 ]
				} );
				expect( store.removeItemsFromTypedList ).toHaveBeenCalledWith( {
					parentRowId: 22,
					listItems: [ 36, 39 ]
				} );
				expect( store.clearInvalidListItems ).toHaveBeenCalled();
			} );
		} );

		describe( 'transformZObjectForSubmission', () => {
			beforeEach( () => {
				store.removeEmptyMonolingualValues = jest.fn();
				store.removeEmptyArguments = jest.fn();
				store.removeEmptyAliasValues = jest.fn();
				store.removeEmptyTypeFunctions = jest.fn();
				store.recalculateKeys = jest.fn();
				store.clearInvalidListItems = jest.fn();
				store.removeItemsFromTypedList = jest.fn();
				store.disconnectFunctionObjects = jest.fn();
				store.setEmptyIsIdentityAsFalse = jest.fn();

				Object.defineProperty( store, 'getRowByKeyPath', {
					value: jest.fn().mockReturnValue( undefined )
				} );
				Object.defineProperty( store, 'getZObjectTypeByRowId', {
					value: jest.fn().mockReturnValue( undefined )
				} );
				Object.defineProperty( store, 'getZObjectTypeByRowId', {
					value: jest.fn().mockReturnValue( undefined )
				} );
				Object.defineProperty( store, 'getChildrenByParentRowId', {
					value: jest.fn().mockReturnValue( [ 'Z1' ] )
				} );
			} );

			it( 'removes empty names', () => {
				store.transformZObjectForSubmission( false );
				expect( store.removeEmptyMonolingualValues ).toHaveBeenCalledWith( { key: 'Z2K3' } );
			} );

			it( 'removes empty descriptions', () => {
				store.transformZObjectForSubmission( false );
				expect( store.removeEmptyMonolingualValues ).toHaveBeenCalledWith( { key: 'Z2K5' } );
			} );

			it( 'removes empty aliases', () => {
				store.transformZObjectForSubmission( false );
				expect( store.removeEmptyAliasValues ).toHaveBeenCalled();
			} );

			it( 'does not remove empty arguments if it is not a function', () => {
				store.transformZObjectForSubmission( false );
				expect( store.removeEmptyArguments ).not.toHaveBeenCalled();
			} );

			it( 'removes empty arguments if it is a function', () => {
				store.getZObjectTypeByRowId = jest.fn().mockReturnValue( Constants.Z_FUNCTION );
				store.getRowByKeyPath = jest.fn().mockReturnValue( { id: 1 } );

				store.transformZObjectForSubmission( false );
				expect( store.removeEmptyArguments ).toHaveBeenCalled();
			} );

			it( 'removes undefined parser, renderer and equality functions if it is a type', () => {
				store.getZObjectTypeByRowId = jest.fn().mockReturnValue( Constants.Z_TYPE );
				store.getRowByKeyPath = jest.fn().mockReturnValue( { id: 1 } );

				store.transformZObjectForSubmission( false );
				expect( store.removeEmptyTypeFunctions ).toHaveBeenCalledWith( 1 );
			} );

			it( 'recalculates keys if it is a type', () => {
				store.getZObjectTypeByRowId = jest.fn().mockReturnValue( Constants.Z_TYPE );
				store.getRowByKeyPath = jest.fn().mockReturnValue( { id: 1 } );

				store.transformZObjectForSubmission( false );
				expect( store.recalculateKeys ).toHaveBeenCalledWith( { listRowId: 1, key: 'Z3K2' } );
			} );

			it( 'sets emtpy isIdentity/Z3K4 keys to false if it is a type', () => {
				store.getZObjectTypeByRowId = jest.fn().mockReturnValue( Constants.Z_TYPE );
				store.getRowByKeyPath = jest.fn().mockReturnValue( { id: 1 } );
				store.getChildrenByParentRowId = jest.fn().mockReturnValue( [ { id: 2 }, { id: 3 }, { id: 4 } ] );

				store.transformZObjectForSubmission( false );
				expect( store.setEmptyIsIdentityAsFalse ).toHaveBeenCalledWith( 3 );
				expect( store.setEmptyIsIdentityAsFalse ).toHaveBeenCalledWith( 4 );
			} );

			it( 'removes empty key labels if it is a type', () => {
				store.getZObjectTypeByRowId = jest.fn().mockReturnValue( Constants.Z_TYPE );
				store.getRowByKeyPath = jest.fn().mockReturnValue( { id: 1 } );
				store.getChildrenByParentRowId = jest.fn().mockReturnValue( [ { id: 2 }, { id: 3 }, { id: 4 } ] );

				store.transformZObjectForSubmission( false );
				expect( store.removeEmptyMonolingualValues ).toHaveBeenCalledWith( { rowId: 3, key: 'Z3K3' } );
				expect( store.removeEmptyMonolingualValues ).toHaveBeenCalledWith( { rowId: 4, key: 'Z3K3' } );
			} );

			it( 'recalculates keys if it is an error type', () => {
				store.getZObjectTypeByRowId = jest.fn().mockReturnValue( Constants.Z_ERRORTYPE );
				store.getRowByKeyPath = jest.fn().mockReturnValue( { id: 1 } );

				store.transformZObjectForSubmission( false );
				expect( store.recalculateKeys ).toHaveBeenCalledWith( { listRowId: 1, key: 'Z3K2' } );
			} );

			it( 'sets emtpy isIdentity/Z3K4 keys to false if it is an errortype', () => {
				store.getZObjectTypeByRowId = jest.fn().mockReturnValue( Constants.Z_ERRORTYPE );
				store.getRowByKeyPath = jest.fn().mockReturnValue( { id: 1 } );
				store.getChildrenByParentRowId = jest.fn().mockReturnValue( [ { id: 2 }, { id: 3 }, { id: 4 } ] );

				store.transformZObjectForSubmission( false );
				expect( store.setEmptyIsIdentityAsFalse ).toHaveBeenCalledWith( 3 );
				expect( store.setEmptyIsIdentityAsFalse ).toHaveBeenCalledWith( 4 );
			} );

			it( 'removes empty key labels if it is an errortype', () => {
				store.getZObjectTypeByRowId = jest.fn().mockReturnValue( Constants.Z_ERRORTYPE );
				store.getRowByKeyPath = jest.fn().mockReturnValue( { id: 1 } );
				store.getChildrenByParentRowId = jest.fn().mockReturnValue( [ { id: 2 }, { id: 3 }, { id: 4 } ] );

				store.transformZObjectForSubmission( false );
				expect( store.removeEmptyMonolingualValues ).toHaveBeenCalledWith( { rowId: 3, key: 'Z3K3' } );
				expect( store.removeEmptyMonolingualValues ).toHaveBeenCalledWith( { rowId: 4, key: 'Z3K3' } );
			} );

			it( 'removes list items marked as invalid', () => {
				Object.defineProperty( store, 'hasInvalidListItems', {
					value: true
				} );
				Object.defineProperty( store, 'getInvalidListItems', {
					value: {
						1: [ 2 ]
					}
				} );

				store.transformZObjectForSubmission( false );
				expect( store.removeItemsFromTypedList ).toHaveBeenCalledWith( {
					parentRowId: 1,
					listItems: [ 2 ]
				} );
				expect( store.clearInvalidListItems ).toHaveBeenCalled();
			} );

			it( 'does not remove list items if none are marked as invalid', () => {
				Object.defineProperty( store, 'hasInvalidListItems', {
					value: false
				} );

				store.transformZObjectForSubmission( false );
				expect( store.removeItemsFromTypedList ).not.toHaveBeenCalled();
				expect( store.clearInvalidListItems ).not.toHaveBeenCalled();
			} );

			it( 'disconnects function objects if needed', () => {
				store.transformZObjectForSubmission( true );
				expect( store.disconnectFunctionObjects ).toHaveBeenCalled();
			} );

			it( 'does not disconnect function objects if not needed', () => {
				store.transformZObjectForSubmission( false );
				expect( store.disconnectFunctionObjects ).not.toHaveBeenCalled();
			} );
		} );

		describe( 'removeEmptyMonolingualValues', () => {

			it( 'does nothing when nothing is present', () => {
				const zobject = {
					Z2K3: {
						Z1K1: 'Z12',
						Z12K1: [
							'Z11'
						]
					}
				};
				store.zobject = zobjectToRows( zobject );
				store.removeEmptyMonolingualValues( { key: 'Z2K3' } );

				const transformed = store.getZObjectAsJsonById( 0, false );
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
				store.zobject = zobjectToRows( zobject );
				store.removeEmptyMonolingualValues( { key: 'Z2K3' } );

				const transformed = store.getZObjectAsJsonById( 0, false );
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
				store.zobject = zobjectToRows( zobject );
				store.removeEmptyMonolingualValues( { key: 'Z2K3' } );

				const transformed = store.getZObjectAsJsonById( 0, false );
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
				store.zobject = zobjectToRows( zobject );
				store.removeEmptyMonolingualValues( { key: 'Z2K3' } );

				const transformed = store.getZObjectAsJsonById( 0, false );
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
				store.zobject = zobjectToRows( zobject );
				store.removeEmptyMonolingualValues( { key: 'Z2K3' } );

				const transformed = store.getZObjectAsJsonById( 0, false );
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

		describe( 'setEmptyIsIdentityAsFalse', () => {

			it( 'does nothing when no Z3K4 key is present', () => {
				const zobject = {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1'
				};
				store.zobject = zobjectToRows( zobject );
				store.setEmptyIsIdentityAsFalse( 0 );

				const transformed = store.getZObjectAsJsonById( 0, false );
				expect( hybridToCanonical( transformed ) ).toEqual( {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1'
				} );
			} );

			it( 'does nothing when Z3K4 is true literal', () => {
				const zobject = {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1',
					Z3K4: { Z1K1: 'Z40', Z40K1: 'Z41' }
				};
				store.zobject = zobjectToRows( zobject );
				store.setEmptyIsIdentityAsFalse( 0 );

				const transformed = store.getZObjectAsJsonById( 0, false );
				expect( hybridToCanonical( transformed ) ).toEqual( {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1',
					Z3K4: { Z1K1: 'Z40', Z40K1: 'Z41' }
				} );
			} );

			it( 'does nothing when Z3K4 is true reference', () => {
				const zobject = {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1',
					Z3K4: 'Z41'
				};
				store.zobject = zobjectToRows( zobject );
				store.setEmptyIsIdentityAsFalse( 0 );

				const transformed = store.getZObjectAsJsonById( 0, false );
				expect( hybridToCanonical( transformed ) ).toEqual( {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1',
					Z3K4: 'Z41'
				} );
			} );

			it( 'does nothing when Z3K4 is false literal', () => {
				const zobject = {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1',
					Z3K4: { Z1K1: 'Z40', Z40K1: 'Z42' }
				};
				store.zobject = zobjectToRows( zobject );
				store.setEmptyIsIdentityAsFalse( 0 );

				const transformed = store.getZObjectAsJsonById( 0, false );
				expect( hybridToCanonical( transformed ) ).toEqual( {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1',
					Z3K4: { Z1K1: 'Z40', Z40K1: 'Z42' }
				} );
			} );

			it( 'does nothing when Z3K4 is false reference', () => {
				const zobject = {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1',
					Z3K4: 'Z42'
				};
				store.zobject = zobjectToRows( zobject );
				store.setEmptyIsIdentityAsFalse( 0 );

				const transformed = store.getZObjectAsJsonById( 0, false );
				expect( hybridToCanonical( transformed ) ).toEqual( {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1',
					Z3K4: 'Z42'
				} );
			} );

			it( 'sets to false when Z3K4 is empty literal', () => {
				const zobject = {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1',
					Z3K4: { Z1K1: 'Z40', Z40K1: '' }
				};
				store.zobject = zobjectToRows( zobject );
				store.setEmptyIsIdentityAsFalse( 0 );

				const transformed = store.getZObjectAsJsonById( 0, false );
				expect( hybridToCanonical( transformed ) ).toEqual( {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1',
					Z3K4: { Z1K1: 'Z40', Z40K1: 'Z42' }
				} );
			} );

			it( 'sets to false when Z3K4 is empty reference', () => {
				const zobject = {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1',
					Z3K4: ''
				};
				store.zobject = zobjectToRows( zobject );
				store.setEmptyIsIdentityAsFalse( 0 );

				const transformed = store.getZObjectAsJsonById( 0, false );
				expect( hybridToCanonical( transformed ) ).toEqual( {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1',
					Z3K4: 'Z42'
				} );
			} );
		} );

		describe( 'removeEmptyAliasValues', () => {

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
				store.zobject = zobjectToRows( zobject );
				store.removeEmptyAliasValues();

				const transformed = store.getZObjectAsJsonById( 0, false );
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
				store.zobject = zobjectToRows( zobject );
				store.removeEmptyAliasValues();

				const transformed = store.getZObjectAsJsonById( 0, false );
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
				store.zobject = zobjectToRows( zobject );
				store.removeEmptyAliasValues();

				const transformed = store.getZObjectAsJsonById( 0, false );
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
				Object.defineProperty( store, 'getCurrentZObjectId', {
					value: 'Z12345'
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
							{ Z1K1: 'Z11', Z11K1: 'Z1005', Z11K2: '' },
							{ Z1K1: 'Z11', Z11K1: '', Z11K2: 'some label with empty language' }
						] } }
					] }
				};
				store.zobject = zobjectToRows( zobject );
				store.removeEmptyArguments();

				const transformed = store.getZObjectAsJsonById( 0, false );
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
				store.zobject = zobjectToRows( zobject );
				store.removeEmptyArguments();

				const transformed = store.getZObjectAsJsonById( 0, false );
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
				store.zobject = zobjectToRows( zobject );
				store.removeEmptyArguments();

				const transformed = store.getZObjectAsJsonById( 0, false );
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
				store.zobject = zobjectToRows( zobject );
				store.removeEmptyTypeFunctions( rowId );

				const transformed = store.getZObjectAsJsonById( 0, false );
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
				store.zobject = zobjectToRows( zobject );
				store.removeEmptyTypeFunctions( rowId );

				const transformed = store.getZObjectAsJsonById( 0, false );
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
				store.zobject = zobjectToRows( zobject );
				store.removeEmptyTypeFunctions( rowId );

				const transformed = store.getZObjectAsJsonById( 0, false );
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
				store.zobject = zobjectToRows( zobject );
				store.removeEmptyTypeFunctions( rowId );

				const transformed = store.getZObjectAsJsonById( 0, false );
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
				store.zobject = zobjectToRows( zobject );
				store.removeEmptyTypeFunctions( rowId );

				const transformed = store.getZObjectAsJsonById( 0, false );
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

			it( 'disconnects all implementations and testers', () => {
				const zobject = {
					Z2K2: {
						Z8K3: [ 'Z20', 'Z10020', 'Z10021' ],
						Z8K4: [ 'Z14', 'Z10014', 'Z10015' ]
					}
				};
				store.zobject = zobjectToRows( zobject );
				store.disconnectFunctionObjects();

				const transformed = store.getZObjectAsJsonById( 0, false );
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
				store.zobject = zobjectToRows( zobject );
				store.disconnectFunctionObjects();

				const transformed = store.getZObjectAsJsonById( 0, false );
				expect( hybridToCanonical( transformed ) ).toEqual( {
					Z2K2: {
						Z8K3: [ 'Z20' ],
						Z8K4: [ 'Z14' ]
					}
				} );
			} );
		} );
	} );
} );
