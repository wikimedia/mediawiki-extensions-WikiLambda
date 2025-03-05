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
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const {
	canonicalToHybrid,
	hybridToCanonical
} = require( '../../../../resources/ext.wikilambda.app/utils/schemata.js' );

describe( 'zobject submission Pinia store', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.jsonObject = { main: {} };
	} );

	describe( 'Actions', () => {

		describe( 'validateZObject', () => {
			beforeEach( () => {
				store.setError = jest.fn();
			} );

			describe( 'validateZObject function', () => {
				beforeEach( () => {
					const basicFunction = canonicalToHybrid( {
						Z1K1: 'Z2',
						Z2K2: {
							Z1K1: 'Z8'
						}
					} );
					Object.defineProperty( store, 'getCurrentZObjectType', {
						value: Constants.Z_FUNCTION
					} );
					Object.defineProperty( store, 'getJsonObject', {
						value: jest.fn().mockReturnValue( basicFunction )
					} );
				} );

				it( 'Does not set error for a valid function', () => {
					Object.defineProperty( store, 'getValidatedOutputFields', {
						value: [ { keyPath: 'main.Z2K2.Z8K2', isValid: true } ]
					} );
					Object.defineProperty( store, 'getValidatedInputFields', {
						value: [ { keyPath: 'main.Z2K2.Z8K1.1.Z17K1', isValid: true } ]
					} );

					const isValid = store.validateZObject();
					expect( store.setError ).toHaveBeenCalledTimes( 0 );
					expect( isValid ).toEqual( true );
				} );

				it( 'Sets errors for a function with one invalid output field', () => {
					Object.defineProperty( store, 'getValidatedOutputFields', {
						value: [ { keyPath: 'main.Z2K2.Z8K2', isValid: false } ]
					} );
					Object.defineProperty( store, 'getValidatedInputFields', {
						value: [ { keyPath: 'main.Z2K2.Z8K1.1.Z17K1', isValid: true } ]
					} );

					const mockError = {
						errorId: 'main.Z2K2.Z8K2',
						errorCode: Constants.ERROR_CODES.MISSING_FUNCTION_OUTPUT,
						errorType: Constants.ERROR_TYPES.ERROR
					};

					const isValid = store.validateZObject();
					expect( store.setError ).toHaveBeenCalledTimes( 1 );
					expect( store.setError ).toHaveBeenCalledWith( mockError );
					expect( isValid ).toEqual( false );
				} );

				it( 'Sets errors for a function with many invalid output fields', () => {
					Object.defineProperty( store, 'getValidatedOutputFields', {
						value: [
							{ keyPath: 'main.Z2K2.Z8K2.Z7K1', isValid: false },
							{ keyPath: 'main.Z2K2.Z8K2.Z881K1', isValid: false }
						]
					} );
					Object.defineProperty( store, 'getValidatedInputFields', {
						value: []
					} );

					const mockErrors = [ {
						errorId: 'main.Z2K2.Z8K2.Z7K1',
						errorCode: Constants.ERROR_CODES.MISSING_FUNCTION_OUTPUT,
						errorType: Constants.ERROR_TYPES.ERROR
					}, {
						errorId: 'main.Z2K2.Z8K2.Z881K1',
						errorCode: Constants.ERROR_CODES.MISSING_FUNCTION_OUTPUT,
						errorType: Constants.ERROR_TYPES.ERROR
					} ];

					const isValid = store.validateZObject();
					expect( store.setError ).toHaveBeenCalledTimes( 2 );
					expect( store.setError ).toHaveBeenCalledWith( mockErrors[ 0 ] );
					expect( store.setError ).toHaveBeenCalledWith( mockErrors[ 1 ] );
					expect( isValid ).toEqual( false );
				} );

				it( 'Sets errors for a function with one invalid input field', () => {
					Object.defineProperty( store, 'getValidatedOutputFields', {
						value: [ { keyPath: 'main.Z2K2.Z8K2', isValid: true } ]
					} );
					Object.defineProperty( store, 'getValidatedInputFields', {
						value: [
							{ keyPath: 'main.Z2K2.Z8K1.1.Z17K1', isValid: true },
							{ keyPath: 'main.Z2K2.Z8K1.2.Z17K1', isValid: false }
						]
					} );

					const mockError = {
						errorId: 'main.Z2K2.Z8K1.2.Z17K1',
						errorCode: Constants.ERROR_CODES.MISSING_FUNCTION_INPUT_TYPE,
						errorType: Constants.ERROR_TYPES.ERROR
					};

					const isValid = store.validateZObject();
					expect( store.setError ).toHaveBeenCalledTimes( 1 );
					expect( store.setError ).toHaveBeenCalledWith( mockError );
					expect( isValid ).toEqual( false );
				} );

				it( 'Sets errors for a function with many invalid input fields', () => {
					Object.defineProperty( store, 'getValidatedOutputFields', {
						value: [ { keyPath: 'main.Z2K2.Z8K2', isValid: true } ]
					} );
					Object.defineProperty( store, 'getValidatedInputFields', {
						value: [
							{ keyPath: 'main.Z2K2.Z8K1.1.Z17K1', isValid: true },
							{ keyPath: 'main.Z2K2.Z8K1.2.Z17K1', isValid: false },
							{ keyPath: 'main.Z2K2.Z8K1.3.Z17K1', isValid: false }
						]
					} );

					const mockErrors = [ {
						errorId: 'main.Z2K2.Z8K1.2.Z17K1',
						errorCode: Constants.ERROR_CODES.MISSING_FUNCTION_INPUT_TYPE,
						errorType: Constants.ERROR_TYPES.ERROR
					}, {
						errorId: 'main.Z2K2.Z8K1.3.Z17K1',
						errorCode: Constants.ERROR_CODES.MISSING_FUNCTION_INPUT_TYPE,
						errorType: Constants.ERROR_TYPES.ERROR
					} ];

					const isValid = store.validateZObject();
					expect( store.setError ).toHaveBeenCalledTimes( 2 );
					expect( store.setError ).toHaveBeenCalledWith( mockErrors[ 0 ] );
					expect( store.setError ).toHaveBeenCalledWith( mockErrors[ 1 ] );
					expect( isValid ).toEqual( false );
				} );

				it( 'Sets errors for a function with invalid output and input fields', () => {
					Object.defineProperty( store, 'getValidatedOutputFields', {
						value: [
							{ keyPath: 'main.Z2K2.Z8K2.Z7K1', isValid: true },
							{ keyPath: 'main.Z2K2.Z8K2.Z881K1', isValid: false }
						]
					} );
					Object.defineProperty( store, 'getValidatedInputFields', {
						value: [
							{ keyPath: 'main.Z2K2.Z8K1.1.Z17K1', isValid: false },
							{ keyPath: 'main.Z2K2.Z8K1.2.Z17K1', isValid: true },
							{ keyPath: 'main.Z2K2.Z8K1.3.Z17K1', isValid: true }
						]
					} );

					const mockErrors = [ {
						errorId: 'main.Z2K2.Z8K2.Z881K1',
						errorCode: Constants.ERROR_CODES.MISSING_FUNCTION_OUTPUT,
						errorType: Constants.ERROR_TYPES.ERROR
					}, {
						errorId: 'main.Z2K2.Z8K1.1.Z17K1',
						errorCode: Constants.ERROR_CODES.MISSING_FUNCTION_INPUT_TYPE,
						errorType: Constants.ERROR_TYPES.ERROR
					} ];

					const isValid = store.validateZObject();
					expect( store.setError ).toHaveBeenCalledTimes( 2 );
					expect( store.setError ).toHaveBeenCalledWith( mockErrors[ 0 ] );
					expect( store.setError ).toHaveBeenCalledWith( mockErrors[ 1 ] );
					expect( isValid ).toEqual( false );
				} );
			} );

			describe( 'validateZObject implementation', () => {
				beforeEach( () => {
					Object.defineProperty( store, 'getCurrentZObjectType', {
						value: Constants.Z_IMPLEMENTATION
					} );
					Object.defineProperty( store, 'getCurrentTargetFunctionZid', {
						value: 'Z999'
					} );
				} );

				it( 'Does not set error for a valid code implementation', () => {
					const storedImplementation = { Z2K2: {
						Z1K1: 'Z14',
						Z14K1: 'Z999',
						Z14K3: {
							Z1K1: 'Z16',
							Z16K1: 'Z600',
							Z16K2: 'some code'
						}
					} };

					Object.defineProperty( store, 'getCurrentZImplementationType', {
						value: Constants.Z_IMPLEMENTATION_CODE
					} );
					Object.defineProperty( store, 'getJsonObject', {
						value: jest.fn().mockReturnValue( canonicalToHybrid( storedImplementation ) )
					} );

					const isValid = store.validateZObject();
					expect( store.setError ).toHaveBeenCalledTimes( 0 );
					expect( isValid ).toEqual( true );
				} );

				it( 'Does not set error for a valid composition implementation (function call)', () => {
					const storedImplementation = { Z2K2: {
						Z1K1: 'Z14',
						Z14K1: 'Z999',
						Z14K2: {
							Z1K1: 'Z7',
							Z7K1: 'Z801',
							Z801K1: { Z1K1: 'Z18', Z18K1: 'Z999K1' }
						}
					} };

					Object.defineProperty( store, 'getCurrentZImplementationType', {
						value: Constants.Z_IMPLEMENTATION_COMPOSITION
					} );
					Object.defineProperty( store, 'getJsonObject', {
						value: jest.fn().mockReturnValue( canonicalToHybrid( storedImplementation ) )
					} );

					const isValid = store.validateZObject();
					expect( store.setError ).toHaveBeenCalledTimes( 0 );
					expect( isValid ).toEqual( true );
				} );

				it( 'Does not set error for a valid composition implementation (argument reference)', () => {
					const storedImplementation = { Z2K2: {
						Z1K1: 'Z14',
						Z14K1: 'Z999',
						Z14K2: {
							Z1K1: 'Z18',
							Z18K1: 'Z999K1'
						}
					} };

					Object.defineProperty( store, 'getCurrentZImplementationType', {
						value: Constants.Z_IMPLEMENTATION_COMPOSITION
					} );
					Object.defineProperty( store, 'getJsonObject', {
						value: jest.fn().mockReturnValue( canonicalToHybrid( storedImplementation ) )
					} );

					const isValid = store.validateZObject();
					expect( store.setError ).toHaveBeenCalledTimes( 0 );
					expect( isValid ).toEqual( true );
				} );

				it( 'Does not set error for a valid composition implementation (type)', () => {
					const storedImplementation = { Z2K2: {
						Z1K1: 'Z14',
						Z14K1: 'Z999',
						Z14K2: {
							Z1K1: 'Z4',
							Z4K1: 'Z999',
							Z4K2: [ 'Z3' ]
						}
					} };

					Object.defineProperty( store, 'getCurrentZImplementationType', {
						value: Constants.Z_IMPLEMENTATION_COMPOSITION
					} );
					Object.defineProperty( store, 'getJsonObject', {
						value: jest.fn().mockReturnValue( canonicalToHybrid( storedImplementation ) )
					} );

					const isValid = store.validateZObject();
					expect( store.setError ).toHaveBeenCalledTimes( 0 );
					expect( isValid ).toEqual( true );
				} );

				it( 'Does not set error for a valid builtin implementation', () => {
					const storedImplementation = { Z2K2: {
						Z1K1: 'Z14',
						Z14K1: 'Z999',
						Z14K4: 'Z888'
					} };

					Object.defineProperty( store, 'getCurrentZImplementationType', {
						value: Constants.Z_IMPLEMENTATION_BUILT_IN
					} );
					Object.defineProperty( store, 'getJsonObject', {
						value: jest.fn().mockReturnValue( canonicalToHybrid( storedImplementation ) )
					} );

					const isValid = store.validateZObject();
					expect( store.setError ).toHaveBeenCalledTimes( 0 );
					expect( isValid ).toEqual( true );
				} );

				it( 'Sets error for an implementation with missing target function', () => {
					const storedImplementation = { Z2K2: {
						Z1K1: 'Z14',
						Z14K1: { Z1K1: 'Z9', Z9K1: '' },
						Z14K3: {
							Z1K1: 'Z16',
							Z16K1: 'Z600',
							Z16K2: 'some code'
						}
					} };

					Object.defineProperty( store, 'getCurrentTargetFunctionZid', {
						value: ''
					} );
					Object.defineProperty( store, 'getCurrentZImplementationType', {
						value: Constants.Z_IMPLEMENTATION_CODE
					} );
					Object.defineProperty( store, 'getJsonObject', {
						value: jest.fn().mockReturnValue( canonicalToHybrid( storedImplementation ) )
					} );

					const mockError = {
						errorId: 'main.Z2K2.Z14K1',
						errorCode: Constants.ERROR_CODES.MISSING_TARGET_FUNCTION,
						errorType: Constants.ERROR_TYPES.ERROR
					};

					const isValid = store.validateZObject();
					expect( store.setError ).toHaveBeenCalledTimes( 1 );
					expect( store.setError ).toHaveBeenCalledWith( mockError );
					expect( isValid ).toEqual( false );
				} );

				it( 'Sets error for an implementation with missing composition', () => {
					const storedImplementation = { Z2K2: {
						Z1K1: 'Z14',
						Z14K1: 'Z999',
						Z14K2: {
							Z1K1: 'Z7',
							Z7K1: { Z1K1: 'Z9', Z9K1: '' }
						}
					} };

					Object.defineProperty( store, 'getCurrentZImplementationType', {
						value: Constants.Z_IMPLEMENTATION_COMPOSITION
					} );
					Object.defineProperty( store, 'getJsonObject', {
						value: jest.fn().mockReturnValue( canonicalToHybrid( storedImplementation ) )
					} );

					const mockError = {
						errorId: 'main.Z2K2.Z14K2.Z7K1',
						errorCode: Constants.ERROR_CODES.MISSING_IMPLEMENTATION_COMPOSITION,
						errorType: Constants.ERROR_TYPES.ERROR
					};

					const isValid = store.validateZObject();
					expect( store.setError ).toHaveBeenCalledTimes( 1 );
					expect( store.setError ).toHaveBeenCalledWith( mockError );
					expect( isValid ).toEqual( false );
				} );

				it( 'Sets error for a code implementation with missing programming language', () => {
					const storedImplementation = { Z2K2: {
						Z1K1: 'Z14',
						Z14K1: 'Z999',
						Z14K3: {
							Z1K1: 'Z16',
							Z16K1: { Z1K1: 'Z9', Z9K1: '' },
							Z16K2: 'some code'
						}
					} };

					Object.defineProperty( store, 'getCurrentZImplementationType', {
						value: Constants.Z_IMPLEMENTATION_CODE
					} );
					Object.defineProperty( store, 'getJsonObject', {
						value: jest.fn().mockReturnValue( canonicalToHybrid( storedImplementation ) )
					} );

					const mockError = {
						errorId: 'main.Z2K2.Z14K3.Z16K1',
						errorCode: Constants.ERROR_CODES.MISSING_IMPLEMENTATION_CODE_LANGUAGE,
						errorType: Constants.ERROR_TYPES.ERROR
					};

					const isValid = store.validateZObject();
					expect( store.setError ).toHaveBeenCalledTimes( 1 );
					expect( store.setError ).toHaveBeenCalledWith( mockError );
					expect( isValid ).toEqual( false );
				} );

				it( 'Sets error for a code implementation with missing code value', () => {
					const storedImplementation = { Z2K2: {
						Z1K1: 'Z14',
						Z14K1: 'Z999',
						Z14K3: {
							Z1K1: 'Z16',
							Z16K1: 'Z600',
							Z16K2: ''
						}
					} };

					Object.defineProperty( store, 'getCurrentZImplementationType', {
						value: Constants.Z_IMPLEMENTATION_CODE
					} );
					Object.defineProperty( store, 'getJsonObject', {
						value: jest.fn().mockReturnValue( canonicalToHybrid( storedImplementation ) )
					} );

					const mockError = {
						errorId: 'main.Z2K2.Z14K3.Z16K2',
						errorCode: Constants.ERROR_CODES.MISSING_IMPLEMENTATION_CODE,
						errorType: Constants.ERROR_TYPES.ERROR
					};

					const isValid = store.validateZObject();
					expect( store.setError ).toHaveBeenCalledTimes( 1 );
					expect( store.setError ).toHaveBeenCalledWith( mockError );
					expect( isValid ).toEqual( false );
				} );
			} );

			describe( 'validateZObject tester', () => {
				beforeEach( () => {
					Object.defineProperty( store, 'getCurrentZObjectType', {
						value: Constants.Z_TESTER
					} );
					Object.defineProperty( store, 'getCurrentTargetFunctionZid', {
						value: 'Z999'
					} );
				} );

				it( 'Does not set error for a valid tester', () => {
					const storedTester = { Z2K2: {
						Z1K1: 'Z20',
						Z20K1: 'Z999',
						Z20K2: {
							Z1K1: 'Z7',
							Z7K1: 'Z801',
							Z801K1: 'foo'
						},
						Z20K3: {
							Z1K1: 'Z7',
							Z7K1: 'Z866',
							Z866K2: 'foo'
						}
					} };
					Object.defineProperty( store, 'getJsonObject', {
						value: jest.fn().mockReturnValue( canonicalToHybrid( storedTester ) )
					} );

					const isValid = store.validateZObject();
					expect( store.setError ).toHaveBeenCalledTimes( 0 );
					expect( isValid ).toEqual( true );
				} );

				it( 'Sets error for a tester with missing target function', () => {
					const storedTester = { Z2K2: {
						Z1K1: 'Z20',
						Z20K1: { Z1K1: 'Z9', Z9K1: '' },
						Z20K2: {
							Z1K1: 'Z7',
							Z7K1: 'Z801',
							Z801K1: 'foo'
						},
						Z20K3: {
							Z1K1: 'Z7',
							Z7K1: 'Z866',
							Z866K2: 'foo'
						}
					} };
					Object.defineProperty( store, 'getCurrentTargetFunctionZid', {
						value: ''
					} );
					Object.defineProperty( store, 'getJsonObject', {
						value: jest.fn().mockReturnValue( canonicalToHybrid( storedTester ) )
					} );

					const mockError = {
						errorId: 'main.Z2K2.Z20K1',
						errorCode: Constants.ERROR_CODES.MISSING_TARGET_FUNCTION,
						errorType: Constants.ERROR_TYPES.ERROR
					};

					const isValid = store.validateZObject();
					expect( store.setError ).toHaveBeenCalledTimes( 1 );
					expect( store.setError ).toHaveBeenCalledWith( mockError );
					expect( isValid ).toEqual( false );
				} );

				it( 'Sets error for a tester with missing call', () => {
					const storedTester = { Z2K2: {
						Z1K1: 'Z20',
						Z20K1: 'Z999',
						Z20K2: {
							Z1K1: 'Z7',
							Z7K1: { Z1K1: 'Z9', Z9K1: '' }
						},
						Z20K3: {
							Z1K1: 'Z7',
							Z7K1: 'Z866',
							Z866K2: 'foo'
						}
					} };
					Object.defineProperty( store, 'getJsonObject', {
						value: jest.fn().mockReturnValue( canonicalToHybrid( storedTester ) )
					} );

					const mockError = {
						errorId: 'main.Z2K2.Z20K2.Z7K1',
						errorCode: Constants.ERROR_CODES.MISSING_TESTER_CALL,
						errorType: Constants.ERROR_TYPES.ERROR
					};

					const isValid = store.validateZObject();
					expect( store.setError ).toHaveBeenCalledTimes( 1 );
					expect( store.setError ).toHaveBeenCalledWith( mockError );
					expect( isValid ).toEqual( false );
				} );

				it( 'Sets error for a tester with missing validation', () => {
					const storedTester = { Z2K2: {
						Z1K1: 'Z20',
						Z20K1: 'Z999',
						Z20K2: {
							Z1K1: 'Z7',
							Z7K1: 'Z801',
							Z801K1: 'foo'
						},
						Z20K3: {
							Z1K1: 'Z7',
							Z7K1: { Z1K1: 'Z9', Z9K1: '' }
						}
					} };
					Object.defineProperty( store, 'getJsonObject', {
						value: jest.fn().mockReturnValue( canonicalToHybrid( storedTester ) )
					} );

					const mockError = {
						errorId: 'main.Z2K2.Z20K3.Z7K1',
						errorCode: Constants.ERROR_CODES.MISSING_TESTER_VALIDATION,
						errorType: Constants.ERROR_TYPES.ERROR
					};

					const isValid = store.validateZObject();
					expect( store.setError ).toHaveBeenCalledTimes( 1 );
					expect( store.setError ).toHaveBeenCalledWith( mockError );
					expect( isValid ).toEqual( false );
				} );
			} );
		} );

		describe( 'submitZObject', () => {
			let postWithEditTokenMock;

			beforeEach( () => {
				store.jsonObject = { main: {} };

				postWithEditTokenMock = jest.fn( () => new Promise( ( resolve ) => {
					resolve( { wikilambda_edit: { page: 'sample' } } );
				} ) );
				mw.Api = jest.fn( () => ( {
					postWithEditToken: postWithEditTokenMock
				} ) );

				Object.defineProperty( store, 'isCreateNewPage', {
					value: true
				} );
				Object.defineProperty( store, 'getCurrentZObjectId', {
					value: 'Z0'
				} );
			} );

			it( 'submits a new zobject to create', () => {
				const zobject = {
					Z1K1: 'Z2',
					Z2K1: { Z1K1: 'Z6', Z6K1: 'Z0' },
					Z2K2: 'some object',
					Z2K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
				store.isCreateNewPage = true;

				store.submitZObject( { summary: 'A summary' } );

				expect( mw.Api ).toHaveBeenCalledTimes( 1 );
				expect( postWithEditTokenMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_edit',
					format: 'json',
					formatversion: '2',
					uselang: 'en',
					summary: 'A summary',
					zid: undefined,
					zobject: JSON.stringify( zobject )
				} );
			} );

			it( 'submits an existing zobject to edit', () => {
				const zobject = {
					Z1K1: 'Z2',
					Z2K1: { Z1K1: 'Z6', Z6K1: 'Z999' },
					Z2K2: 'some object',
					Z2K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
				store.isCreateNewPage = false;

				store.submitZObject( { summary: 'A summary' } );

				expect( mw.Api ).toHaveBeenCalledTimes( 1 );
				expect( postWithEditTokenMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_edit',
					format: 'json',
					formatversion: '2',
					uselang: 'en',
					summary: 'A summary',
					zid: 'Z0',
					zobject: JSON.stringify( zobject )
				} );
			} );

			it( 'submits an object after calling transform', () => {
				const zobject = {
					Z1K1: 'Z2',
					Z2K1: { Z1K1: 'Z6', Z6K1: 'Z999' },
					Z2K2: 'some object',
					Z2K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
				store.isCreateNewPage = false;
				store.transformZObjectForSubmission = jest.fn();

				store.submitZObject( { summary: 'A summary' } );

				expect( store.transformZObjectForSubmission ).toHaveBeenCalledWith( false );

				expect( mw.Api ).toHaveBeenCalledTimes( 1 );
				expect( postWithEditTokenMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_edit',
					format: 'json',
					formatversion: '2',
					uselang: 'en',
					summary: 'A summary',
					zid: 'Z0',
					zobject: JSON.stringify( zobject )
				} );
			} );

			it( 'submits a function after disconnecting implementations and testers', () => {
				const zobject = JSON.parse(
					fs.readFileSync( path.join( __dirname, './objects/getZFunction.json' ) )
				).clean;

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.getCurrentZObjectId = 'Z0';
				store.isCreateNewPage = false;

				store.submitZObject( { summary: 'A summary', disconnectFunctionObjects: true } );

				expect( mw.Api ).toHaveBeenCalledTimes( 1 );

				zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_TESTERS ] = [ Constants.Z_TESTER ];
				zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_IMPLEMENTATIONS ] = [ Constants.Z_IMPLEMENTATION ];

				expect( postWithEditTokenMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_edit',
					format: 'json',
					formatversion: '2',
					uselang: 'en',
					summary: 'A summary',
					zid: 'Z0',
					zobject: JSON.stringify( zobject )
				} );
			} );

			it( 'submits an object after cleaning empty monolingual objects', () => {
				const zobject = JSON.parse(
					fs.readFileSync( path.join( __dirname, './objects/getZFunction.json' ) )
				);

				store.jsonObject.main = canonicalToHybrid( zobject.dirty );
				store.getCurrentZObjectId = 'Z0';
				store.isCreateNewPage = false;

				store.submitZObject( { summary: 'A summary' } );

				expect( mw.Api ).toHaveBeenCalledTimes( 1 );

				expect( postWithEditTokenMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_edit',
					format: 'json',
					formatversion: '2',
					uselang: 'en',
					summary: 'A summary',
					zid: 'Z0',
					zobject: JSON.stringify( zobject.clean )
				} );
			} );

			it( 'submits an object after removing invalid list items', () => {
				Object.defineProperty( store, 'removeEmptyMonolingualValues', {
					value: jest.fn()
				} );
				const initialObject = {
					Z2K2: [
						'Z6',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'invalid' },
						'valid'
					],
					Z2K3: {
						Z1K1: 'Z12',
						Z12K1: [
							'Z11',
							{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'valid label 1' },
							'invalid label 1',
							'invalid label 2',
							{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'valid label 2' }
						]
					}
				};

				store.jsonObject.main = canonicalToHybrid( initialObject );
				store.getCurrentZObjectId = 'Z0';
				store.isCreateNewPage = false;

				Object.defineProperty( store, 'hasInvalidListItems', {
					value: true
				} );
				Object.defineProperty( store, 'getInvalidListItems', {
					value: {
						'main.Z2K2': [ 1 ],
						'main.Z2K3.Z12K1': [ 2, 3 ]
					}
				} );
				store.deleteListItemsByKeyPath = jest.fn();
				store.clearInvalidListItems = jest.fn();

				store.submitZObject( { summary: 'A summary' } );

				expect( store.deleteListItemsByKeyPath ).toHaveBeenCalledWith( {
					keyPath: [ 'main', 'Z2K2' ],
					indexes: [ 1 ]
				} );
				expect( store.deleteListItemsByKeyPath ).toHaveBeenCalledWith( {
					keyPath: [ 'main', 'Z2K3', 'Z12K1' ],
					indexes: [ 2, 3 ]
				} );
				expect( store.clearInvalidListItems ).toHaveBeenCalled();
			} );
		} );

		describe( 'transformZObjectForSubmission', () => {
			beforeEach( () => {
				store.removeEmptyMonolingualValues = jest.fn();
				store.removeEmptyAliasValues = jest.fn();
				store.removeEmptyArguments = jest.fn();
				store.removeEmptyTypeFunctions = jest.fn();
				store.deleteListItemsByKeyPath = jest.fn();
				store.recalculateKeys = jest.fn();
				store.clearInvalidListItems = jest.fn();
				store.disconnectFunctionObjects = jest.fn();
				store.setEmptyIsIdentityAsFalse = jest.fn();

				const zobject = { Z2K2: 'string object' };
				Object.defineProperty( store, 'getJsonObject', {
					value: jest.fn().mockReturnValue( canonicalToHybrid( zobject ) )
				} );
			} );

			it( 'removes empty names', () => {
				store.transformZObjectForSubmission( false );
				expect( store.removeEmptyMonolingualValues ).toHaveBeenCalledWith( [ 'main', 'Z2K3' ] );
			} );

			it( 'removes empty descriptions', () => {
				store.transformZObjectForSubmission( false );
				expect( store.removeEmptyMonolingualValues ).toHaveBeenCalledWith( [ 'main', 'Z2K5' ] );
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
				Object.defineProperty( store, 'getJsonObject', {
					value: jest.fn().mockReturnValue( canonicalToHybrid( { Z2K2: { Z1K1: 'Z8' } } ) )
				} );

				store.transformZObjectForSubmission( false );
				expect( store.removeEmptyArguments ).toHaveBeenCalled();
			} );

			it( 'removes undefined parser, renderer and equality functions if it is a type', () => {
				Object.defineProperty( store, 'getJsonObject', {
					value: jest.fn().mockReturnValue( canonicalToHybrid( { Z2K2: {
						Z1K1: 'Z4',
						Z4K2: [ 'Z3' ]
					} } ) )
				} );

				store.transformZObjectForSubmission( false );
				expect( store.removeEmptyTypeFunctions ).toHaveBeenCalled();
			} );

			it( 'recalculates keys if it is a type', () => {
				Object.defineProperty( store, 'getJsonObject', {
					value: jest.fn().mockReturnValue( canonicalToHybrid( { Z2K2: {
						Z1K1: 'Z4',
						Z4K2: [ 'Z3' ]
					} } ) )
				} );

				store.transformZObjectForSubmission( false );
				expect( store.recalculateKeys ).toHaveBeenCalledWith( [ 'main', 'Z2K2', 'Z4K2' ] );
			} );

			it( 'sets emtpy isIdentity/Z3K4 keys to false if it is a type', () => {
				Object.defineProperty( store, 'getJsonObject', {
					value: jest.fn().mockReturnValue( canonicalToHybrid( { Z2K2: {
						Z1K1: 'Z4',
						Z4K2: [ 'Z3',
							{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z999K1', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
							{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z999K1', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
						]
					} } ) )
				} );

				store.transformZObjectForSubmission( false );
				expect( store.setEmptyIsIdentityAsFalse ).toHaveBeenCalledWith( [ 'main', 'Z2K2', 'Z4K2', 1 ] );
				expect( store.setEmptyIsIdentityAsFalse ).toHaveBeenCalledWith( [ 'main', 'Z2K2', 'Z4K2', 2 ] );
			} );

			it( 'removes empty key labels if it is a type', () => {
				Object.defineProperty( store, 'getJsonObject', {
					value: jest.fn().mockReturnValue( canonicalToHybrid( { Z2K2: {
						Z1K1: 'Z4',
						Z4K2: [ 'Z3',
							{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z999K1', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
							{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z999K1', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
						]
					} } ) )
				} );

				store.transformZObjectForSubmission( false );
				expect( store.removeEmptyMonolingualValues ).toHaveBeenCalledWith( [ 'main', 'Z2K2', 'Z4K2', 1, 'Z3K3' ] );
				expect( store.removeEmptyMonolingualValues ).toHaveBeenCalledWith( [ 'main', 'Z2K2', 'Z4K2', 2, 'Z3K3' ] );
			} );

			it( 'recalculates keys if it is an error type', () => {
				Object.defineProperty( store, 'getJsonObject', {
					value: jest.fn().mockReturnValue( canonicalToHybrid( { Z2K2: {
						Z1K1: 'Z50',
						Z50K1: [ 'Z3' ]
					} } ) )
				} );

				store.transformZObjectForSubmission( false );
				expect( store.recalculateKeys ).toHaveBeenCalledWith( [ 'main', 'Z2K2', 'Z50K1' ] );
			} );

			it( 'sets emtpy isIdentity/Z3K4 keys to false if it is an errortype', () => {
				Object.defineProperty( store, 'getJsonObject', {
					value: jest.fn().mockReturnValue( canonicalToHybrid( { Z2K2: {
						Z1K1: 'Z50',
						Z50K1: [ 'Z3',
							{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z999K1', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
							{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z999K1', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
						]
					} } ) )
				} );

				store.transformZObjectForSubmission( false );
				expect( store.setEmptyIsIdentityAsFalse ).toHaveBeenCalledWith( [ 'main', 'Z2K2', 'Z50K1', 1 ] );
				expect( store.setEmptyIsIdentityAsFalse ).toHaveBeenCalledWith( [ 'main', 'Z2K2', 'Z50K1', 2 ] );
			} );

			it( 'removes empty key labels if it is an errortype', () => {
				Object.defineProperty( store, 'getJsonObject', {
					value: jest.fn().mockReturnValue( canonicalToHybrid( { Z2K2: {
						Z1K1: 'Z50',
						Z50K1: [ 'Z3',
							{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z999K1', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
							{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z999K1', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
						]
					} } ) )
				} );

				store.transformZObjectForSubmission( false );
				expect( store.removeEmptyMonolingualValues ).toHaveBeenCalledWith( [ 'main', 'Z2K2', 'Z50K1', 1, 'Z3K3' ] );
				expect( store.removeEmptyMonolingualValues ).toHaveBeenCalledWith( [ 'main', 'Z2K2', 'Z50K1', 2, 'Z3K3' ] );
			} );

			it( 'removes list items marked as invalid', () => {
				Object.defineProperty( store, 'hasInvalidListItems', {
					value: true
				} );
				Object.defineProperty( store, 'getInvalidListItems', {
					value: {
						'main.Z2K2': [ 2 ]
					}
				} );

				store.transformZObjectForSubmission( false );
				expect( store.deleteListItemsByKeyPath ).toHaveBeenCalledWith( {
					keyPath: [ 'main', 'Z2K2' ],
					indexes: [ 2 ]
				} );
				expect( store.clearInvalidListItems ).toHaveBeenCalled();
			} );

			it( 'does not remove list items if none are marked as invalid', () => {
				Object.defineProperty( store, 'hasInvalidListItems', {
					value: false
				} );

				store.transformZObjectForSubmission( false );
				expect( store.deleteListItemsByKeyPath ).not.toHaveBeenCalled();
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
						Z12K1: [ 'Z11' ]
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
				store.removeEmptyMonolingualValues( [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_LABEL
				] );

				expect( hybridToCanonical( store.jsonObject.main ) ).toEqual( zobject );
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
				const expected = {
					Z2K3: {
						Z1K1: 'Z12',
						Z12K1: [
							'Z11',
							{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'this is good' }
						]
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
				store.removeEmptyMonolingualValues( [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_LABEL
				] );

				expect( hybridToCanonical( store.jsonObject.main ) ).toEqual( expected );
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

				const expected = {
					Z2K3: {
						Z1K1: 'Z12',
						Z12K1: [
							'Z11',
							{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'this is good' }
						]
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
				store.removeEmptyMonolingualValues( [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_LABEL
				] );

				expect( hybridToCanonical( store.jsonObject.main ) ).toEqual( expected );
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

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.removeEmptyMonolingualValues( [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_LABEL
				] );

				expect( hybridToCanonical( store.jsonObject.main ) ).toEqual( zobject );
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

				const expected = {
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
				};

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.removeEmptyMonolingualValues( [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_LABEL
				] );

				expect( hybridToCanonical( store.jsonObject.main ) ).toEqual( expected );
			} );
		} );

		describe( 'setEmptyIsIdentityAsFalse', () => {
			it( 'does nothing when no Z3K4 key is present', () => {
				const zobject = { Z2K2: {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1'
				} };

				const expected = { Z2K2: {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1'
				} };

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.setEmptyIsIdentityAsFalse( [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_VALUE
				] );

				const updated = hybridToCanonical( store.jsonObject.main );
				expect( updated ).toEqual( expected );
			} );

			it( 'does nothing when Z3K4 is true literal', () => {
				const zobject = { Z2K2: {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1',
					Z3K4: { Z1K1: 'Z40', Z40K1: 'Z41' }
				} };

				const expected = { Z2K2: {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1',
					Z3K4: { Z1K1: 'Z40', Z40K1: 'Z41' }
				} };

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.setEmptyIsIdentityAsFalse( [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_VALUE
				] );

				const updated = hybridToCanonical( store.jsonObject.main );
				expect( updated ).toEqual( expected );
			} );

			it( 'does nothing when Z3K4 is true reference', () => {
				const zobject = { Z2K2: {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1',
					Z3K4: 'Z41'
				} };

				const expected = { Z2K2: {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1',
					Z3K4: 'Z41'
				} };

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.setEmptyIsIdentityAsFalse( [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_VALUE
				] );

				const updated = hybridToCanonical( store.jsonObject.main );
				expect( updated ).toEqual( expected );
			} );

			it( 'does nothing when Z3K4 is false literal', () => {
				const zobject = { Z2K2: {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1',
					Z3K4: { Z1K1: 'Z40', Z40K1: 'Z42' }
				} };

				const expected = { Z2K2: {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1',
					Z3K4: { Z1K1: 'Z40', Z40K1: 'Z42' }
				} };

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.setEmptyIsIdentityAsFalse( [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_VALUE
				] );

				const updated = hybridToCanonical( store.jsonObject.main );
				expect( updated ).toEqual( expected );
			} );

			it( 'does nothing when Z3K4 is false reference', () => {
				const zobject = { Z2K2: {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1',
					Z3K4: 'Z42'
				} };

				const expected = { Z2K2: {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1',
					Z3K4: 'Z42'
				} };

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.setEmptyIsIdentityAsFalse( [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_VALUE
				] );

				const updated = hybridToCanonical( store.jsonObject.main );
				expect( updated ).toEqual( expected );
			} );

			it( 'sets to false when Z3K4 is empty literal', () => {
				const zobject = { Z2K2: {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1',
					Z3K4: { Z1K1: 'Z40', Z40K1: { Z1K1: 'Z9', Z9K1: '' } }
				} };

				const expected = { Z2K2: {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1',
					Z3K4: { Z1K1: 'Z40', Z40K1: 'Z42' }
				} };

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.setEmptyIsIdentityAsFalse( [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_VALUE
				] );

				const updated = hybridToCanonical( store.jsonObject.main );
				expect( updated ).toEqual( expected );
			} );

			it( 'sets to false when Z3K4 is empty reference', () => {
				const zobject = { Z2K2: {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1',
					Z3K4: { Z1K1: 'Z9', Z9K1: '' }
				} };

				const expected = { Z2K2: {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z111K1',
					Z3K4: 'Z42'
				} };

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.setEmptyIsIdentityAsFalse( [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_VALUE
				] );

				const updated = hybridToCanonical( store.jsonObject.main );
				expect( updated ).toEqual( expected );
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

				const expected = {
					Z2K4: {
						Z1K1: 'Z32',
						Z32K1: [
							'Z31',
							{ Z1K1: 'Z31', Z31K1: 'Z1003', Z31K2: [ 'Z6', 'un alias' ] },
							{ Z1K1: 'Z31', Z31K1: 'Z1002', Z31K2: [ 'Z6', 'one alias', 'another alias' ] }
						]
					}
				};

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.removeEmptyAliasValues( [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_ALIASES
				] );

				expect( hybridToCanonical( store.jsonObject.main ) ).toEqual( expected );
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

				const expected = {
					Z2K4: {
						Z1K1: 'Z32',
						Z32K1: [
							'Z31',
							{ Z1K1: 'Z31', Z31K1: 'Z1002', Z31K2: [ 'Z6', 'this is good' ] }
						]
					}
				};

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.removeEmptyAliasValues( [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_ALIASES
				] );

				expect( hybridToCanonical( store.jsonObject.main ) ).toEqual( expected );
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

				const expected = {
					Z2K4: {
						Z1K1: 'Z32',
						Z32K1: [
							'Z31',
							{ Z1K1: 'Z31', Z31K1: 'Z1003', Z31K2: [ 'Z6', 'un alias' ] }
						]
					}
				};

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.removeEmptyAliasValues( [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_ALIASES
				] );

				expect( hybridToCanonical( store.jsonObject.main ) ).toEqual( expected );
			} );
		} );

		describe( 'recalculateKeys', () => {
			beforeEach( () => {
				Object.defineProperty( store, 'getCurrentZObjectId', {
					value: 'Z999'
				} );
			} );

			it( 'does not change arguments that are correctly numbered', () => {
				const zobject = { Z2K2: {
					Z8K1: [ 'Z17',
						{
							Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z999K1',
							Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
						},
						{
							Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z999K2',
							Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11', { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'label' } ] }
						}
					]
				} };

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.recalculateKeys( [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_FUNCTION_ARGUMENTS
				] );

				const updated = hybridToCanonical( store.jsonObject.main );
				expect( updated ).toEqual( zobject );
				expect( updated.Z2K2.Z8K1.length ).toBe( 3 );
				expect( updated.Z2K2.Z8K1[ 1 ].Z17K2 ).toBe( 'Z999K1' );
				expect( updated.Z2K2.Z8K1[ 2 ].Z17K2 ).toBe( 'Z999K2' );
			} );

			it( 'renumbers argument keys to sequential numbers', () => {
				const zobject = { Z2K2: {
					Z8K1: [ 'Z17',
						{
							Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z999K2',
							Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
						},
						{
							Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z999K7',
							Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11', { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'label' } ] }
						}
					]
				} };

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.recalculateKeys( [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_FUNCTION_ARGUMENTS
				] );

				const updated = hybridToCanonical( store.jsonObject.main );
				expect( updated.Z2K2.Z8K1.length ).toBe( 3 );
				expect( updated.Z2K2.Z8K1[ 1 ].Z17K2 ).toBe( 'Z999K1' );
				expect( updated.Z2K2.Z8K1[ 2 ].Z17K2 ).toBe( 'Z999K2' );
			} );

			it( 'renumbers type keys', () => {
				const zobject = { Z2K2: {
					Z4K2: [ 'Z3',
						{
							Z1K1: 'Z3',
							Z3K1: 'Z6',
							Z3K2: 'Z999K6',
							Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
						},
						{
							Z1K1: 'Z3',
							Z3K1: 'Z6',
							Z3K2: 'Z999K3',
							Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
						}
					]
				} };

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.recalculateKeys( [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_TYPE_KEYS
				] );

				const updated = hybridToCanonical( store.jsonObject.main );
				expect( updated.Z2K2.Z4K2.length ).toBe( 3 );
				expect( updated.Z2K2.Z4K2[ 1 ].Z3K2 ).toBe( 'Z999K1' );
				expect( updated.Z2K2.Z4K2[ 2 ].Z3K2 ).toBe( 'Z999K2' );
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

				const expected = {
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
				};

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.removeEmptyArguments();

				const transformed = hybridToCanonical( store.jsonObject.main );
				expect( transformed ).toEqual( expected );
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

				const expected = {
					Z2K2: { Z8K1: [ 'Z17',
						{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
							{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input one' }
						] } },
						{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
							{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input two' }
						] } }
					] }
				};

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.removeEmptyArguments();

				const transformed = hybridToCanonical( store.jsonObject.main );
				expect( transformed ).toEqual( expected );
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

				const expected = {
					Z2K2: { Z8K1: [ 'Z17',
						{ Z1K1: 'Z17',
							Z17K1: { Z1K1: 'Z7', Z7K1: 'Z881', Z881K1: 'Z6' },
							Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
						{ Z1K1: 'Z17',
							Z17K1: { Z1K1: 'Z7', Z7K1: 'Z881', Z881K1: 'Z6' },
							Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
					] }
				};

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.removeEmptyArguments();

				const transformed = hybridToCanonical( store.jsonObject.main );
				expect( transformed ).toEqual( expected );
			} );

			it( 'removes arguments with multilingual list, removes empty monolinguals and rewrites keys', () => {
				const zobject = {
					Z2K2: { Z8K1: [ 'Z17',
						{ Z1K1: 'Z17',
							Z17K1: { Z1K1: 'Z9', Z9K1: '' },
							Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
								{ Z1K1: 'Z11', Z11K1: { Z1K1: 'Z9', Z9K1: '' }, Z11K2: 'bad monolingual' },
								{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: '' },
								{ Z1K1: 'Z11', Z11K1: { Z1K1: 'Z9', Z9K1: '' }, Z11K2: '' }
							] } },
						{ Z1K1: 'Z17',
							Z17K1: 'Z6',
							Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
								{ Z1K1: 'Z11', Z11K1: { Z1K1: 'Z9', Z9K1: '' }, Z11K2: 'bad monolingual' },
								{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: '' },
								{ Z1K1: 'Z11', Z11K1: { Z1K1: 'Z9', Z9K1: '' }, Z11K2: '' }
							] } },
						{ Z1K1: 'Z17',
							Z17K1: 'Z6',
							Z17K2: 'Z12345K3', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
								{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'was third now is second' }
							] } }
					] }
				};

				const expected = {
					Z2K2: { Z8K1: [ 'Z17',
						{ Z1K1: 'Z17',
							Z17K1: 'Z6',
							Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
						{ Z1K1: 'Z17',
							Z17K1: 'Z6',
							Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
								{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'was third now is second' }
							] } }
					] }
				};

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.removeEmptyArguments();

				const transformed = hybridToCanonical( store.jsonObject.main );
				expect( transformed ).toEqual( expected );
			} );
		} );

		describe( 'removeEmptyTypeFunctions', () => {

			it( 'removes undefined validator function/Z4K3', () => {
				const zobject = {
					Z2K2: {
						Z1K1: 'Z4',
						Z4K1: 'Z12345',
						Z4K2: [ 'Z3' ],
						Z4K3: { Z1K1: 'Z9', Z9K1: '' },
						Z4K4: 'Z10001',
						Z4K5: 'Z10002',
						Z4K6: 'Z10003'
					}
				};

				const expected = {
					Z2K2: {
						Z1K1: 'Z4',
						Z4K1: 'Z12345',
						Z4K2: [ 'Z3' ],
						Z4K4: 'Z10001',
						Z4K5: 'Z10002',
						Z4K6: 'Z10003'
					}
				};

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.removeEmptyTypeFunctions();

				const transformed = hybridToCanonical( store.jsonObject.main );
				expect( hybridToCanonical( transformed ) ).toEqual( expected );
			} );

			it( 'removes undefined equality function/Z4K4', () => {
				const zobject = {
					Z2K2: {
						Z1K1: 'Z4',
						Z4K1: 'Z12345',
						Z4K2: [ 'Z3' ],
						Z4K3: 'Z10001',
						Z4K4: { Z1K1: 'Z9', Z9K1: '' },
						Z4K5: 'Z10002',
						Z4K6: 'Z10003'
					}
				};

				const expected = {
					Z2K2: {
						Z1K1: 'Z4',
						Z4K1: 'Z12345',
						Z4K2: [ 'Z3' ],
						Z4K3: 'Z10001',
						Z4K5: 'Z10002',
						Z4K6: 'Z10003'
					}
				};

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.removeEmptyTypeFunctions();

				const transformed = hybridToCanonical( store.jsonObject.main );
				expect( hybridToCanonical( transformed ) ).toEqual( expected );
			} );

			it( 'removes undefined renderer function/Z4K5', () => {
				const zobject = {
					Z2K2: {
						Z1K1: 'Z4',
						Z4K1: 'Z12345',
						Z4K2: [ 'Z3' ],
						Z4K3: 'Z10001',
						Z4K4: 'Z10002',
						Z4K5: { Z1K1: 'Z9', Z9K1: '' },
						Z4K6: 'Z10003'
					}
				};

				const expected = {
					Z2K2: {
						Z1K1: 'Z4',
						Z4K1: 'Z12345',
						Z4K2: [ 'Z3' ],
						Z4K3: 'Z10001',
						Z4K4: 'Z10002',
						Z4K6: 'Z10003'
					}
				};

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.removeEmptyTypeFunctions();

				const transformed = hybridToCanonical( store.jsonObject.main );
				expect( hybridToCanonical( transformed ) ).toEqual( expected );
			} );

			it( 'removes undefined parser function/Z4K6', () => {
				const zobject = {
					Z2K2: {
						Z1K1: 'Z4',
						Z4K1: 'Z12345',
						Z4K2: [ 'Z3' ],
						Z4K3: 'Z10001',
						Z4K4: 'Z10002',
						Z4K5: 'Z10003',
						Z4K6: { Z1K1: 'Z9', Z9K1: '' }
					}
				};

				const expected = {
					Z2K2: {
						Z1K1: 'Z4',
						Z4K1: 'Z12345',
						Z4K2: [ 'Z3' ],
						Z4K3: 'Z10001',
						Z4K4: 'Z10002',
						Z4K5: 'Z10003'
					}
				};

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.removeEmptyTypeFunctions();

				const transformed = hybridToCanonical( store.jsonObject.main );
				expect( hybridToCanonical( transformed ) ).toEqual( expected );
			} );

			it( 'removes all undefined type functions', () => {
				const zobject = {
					Z2K2: {
						Z1K1: 'Z4',
						Z4K1: 'Z12345',
						Z4K2: [ 'Z3' ],
						Z4K3: { Z1K1: 'Z9', Z9K1: '' },
						Z4K4: { Z1K1: 'Z9', Z9K1: '' },
						Z4K5: { Z1K1: 'Z9', Z9K1: '' },
						Z4K6: { Z1K1: 'Z9', Z9K1: '' }
					}
				};

				const expected = {
					Z2K2: {
						Z1K1: 'Z4',
						Z4K1: 'Z12345',
						Z4K2: [ 'Z3' ]
					}
				};

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.removeEmptyTypeFunctions();

				const transformed = hybridToCanonical( store.jsonObject.main );
				expect( hybridToCanonical( transformed ) ).toEqual( expected );
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

				const expected = {
					Z2K2: {
						Z8K3: [ 'Z20' ],
						Z8K4: [ 'Z14' ]
					}
				};

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.disconnectFunctionObjects();

				const transformed = hybridToCanonical( store.jsonObject.main );
				expect( hybridToCanonical( transformed ) ).toEqual( expected );
			} );

			it( 'leaves intact when there are no implementations or testers', () => {
				const zobject = {
					Z2K2: {
						Z8K3: [ 'Z20' ],
						Z8K4: [ 'Z14' ]
					}
				};

				const expected = {
					Z2K2: {
						Z8K3: [ 'Z20' ],
						Z8K4: [ 'Z14' ]
					}
				};

				store.jsonObject.main = canonicalToHybrid( zobject );
				store.disconnectFunctionObjects();

				const transformed = hybridToCanonical( store.jsonObject.main );
				expect( hybridToCanonical( transformed ) ).toEqual( expected );
			} );
		} );
	} );
} );
