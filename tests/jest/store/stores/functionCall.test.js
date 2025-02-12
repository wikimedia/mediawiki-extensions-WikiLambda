/*!
 * WikiLambda unit test suite for the functionCall Pinia store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { createPinia, setActivePinia } = require( 'pinia' );
const { tableDataToRowObjects } = require( '../../helpers/zObjectTableHelpers.js' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );

const functionCall = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
	Z7K1: { Z1K1: 'Z9', Z9K1: 'Z110' },
	Z110K1: { Z1K1: 'Z6', Z6K1: 'past' }
};

const canonicalFunctionCall = {
	Z1K1: 'Z7',
	Z7K1: 'Z110',
	Z110K1: 'past'
};

let store, postMock;

describe( 'functionCall Pinia store', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.metadata = undefined;

		mw.Api = jest.fn( () => ( {
			post: postMock
		} ) );
	} );

	describe( 'Actions', () => {
		describe( 'initializeResultId', () => {
			beforeEach( () => {
				store.pushRow = jest.fn();
				store.removeRowChildren = jest.fn();
				store.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z1K1', parent: 0, value: 'Z6' },
					{ id: 2, key: 'Z6K1', parent: 0, value: 'not a map' }
				] );
			} );

			it( 'adds a detached row when rowId is not a valid row', () => {
				const payload = '';
				const expectedObject = {
					id: 3,
					key: undefined,
					parent: undefined,
					value: Constants.ROW_VALUE_OBJECT
				};

				const rowId = store.initializeResultId( payload );

				expect( rowId ).toBe( 3 );
				expect( store.pushRow ).toHaveBeenCalledWith( expectedObject );
				expect( store.removeRowChildren ).not.toHaveBeenCalled();
			} );

			it( 'removes children when rowId is a valid row', () => {
				const payload = 0;
				const rowId = store.initializeResultId( payload );

				expect( rowId ).toBe( 0 );
				expect( store.pushRow ).not.toHaveBeenCalled();
				expect( store.removeRowChildren ).toHaveBeenCalledWith( { rowId: 0 } );
			} );
		} );

		describe( 'callZFunction', () => {
			it( 'calls MW API for function orchestration; sets orchestrationResult', async () => {
				store.injectZObjectFromRowId = jest.fn();
				store.fetchZids = jest.fn();

				const expectedData = '{ "Z1K1": "Z6", "Z6K1": "present" }';
				postMock = jest.fn( () => new Promise( ( resolve ) => {
					resolve( {
						wikilambda_function_call: { data: expectedData }
					} );
				} ) );

				await store.callZFunction( { functionCall } );

				expect( store.injectZObjectFromRowId ).toHaveBeenCalled();
				expect( store.fetchZids ).toHaveBeenCalled();
				expect( postMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_function_call',
					wikilambda_function_call_zobject: JSON.stringify( canonicalFunctionCall ),
					uselang: 'en'
				} );
			} );

			it( 'calls MW API for function orchestration; sets HTTP error', async () => {
				store.setError = jest.fn();

				// Create the mock 'xhr' object as it would be in an actual jQuery AJAX failure
				const xhr = {
					responseJSON: {
						error: { info: 'one tissue, used' }
					}
				};

				// Create the mock error (simulating jQuery AJAX failure with 'http' code)
				const code = 'http';
				const arg2 = { xhr };

				postMock = jest.fn().mockReturnValue( {
					then: jest.fn().mockReturnThis(),
					catch: jest.fn().mockImplementation( ( callback ) => callback( code, arg2 ) )
				} );

				await store.callZFunction( { functionCall } );

				expect( postMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_function_call',
					wikilambda_function_call_zobject: JSON.stringify( canonicalFunctionCall ),
					uselang: 'en'
				} );

				expect( store.setError ).toHaveBeenCalledWith( {
					errorCode: undefined,
					errorMessage: 'one tissue, used',
					errorType: 'error'
				} );
			} );
		} );
	} );
} );
