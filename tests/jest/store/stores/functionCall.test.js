/*!
 * WikiLambda unit test suite for the functionCall Pinia store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { createPinia, setActivePinia } = require( 'pinia' );
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
		describe( 'callZFunction', () => {
			it( 'calls MW API for function orchestration; sets orchestrationResult', async () => {
				store.setValueByKeyPath = jest.fn();
				store.fetchZids = jest.fn();

				const expectedData = '{ "Z1K1": "Z6", "Z6K1": "present" }';
				postMock = jest.fn( () => new Promise( ( resolve ) => {
					resolve( {
						wikilambda_function_call: { data: expectedData }
					} );
				} ) );

				await store.callZFunction( { functionCall } );

				expect( store.setValueByKeyPath ).toHaveBeenCalled();
				expect( store.fetchZids ).toHaveBeenCalled();
				expect( postMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_function_call',
					format: 'json',
					formatversion: '2',
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
					format: 'json',
					formatversion: '2',
					wikilambda_function_call_zobject: JSON.stringify( canonicalFunctionCall ),
					uselang: 'en'
				} );

				expect( store.setError ).toHaveBeenCalledWith( {
					errorId: 'response',
					errorMessage: 'one tissue, used',
					errorType: 'error'
				} );
			} );
		} );
	} );
} );
