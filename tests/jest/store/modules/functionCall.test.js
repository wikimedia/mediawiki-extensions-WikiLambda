/*!
 * WikiLambda unit test suite for the functionCall Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const tableDataToRowObjects = require( '../../helpers/zObjectTableHelpers.js' ).tableDataToRowObjects,
	functionCallModule = require( '../../../../resources/ext.wikilambda.app/store/modules/functionCall.js' ),
	zobjectModule = require( '../../../../resources/ext.wikilambda.app/store/modules/zobject.js' ),
	Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );

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

let context,
	postMock;

describe( 'functionCall Vuex module', () => {
	beforeEach( () => {
		context = Object.assign( {}, {
			commit: jest.fn(),
			dispatch: jest.fn(),
			getters: {}
		} );

		mw.Api = jest.fn( () => ( {
			post: postMock
		} ) );
	} );

	describe( 'Actions', () => {
		describe( 'initializeResultId', () => {
			beforeEach( () => {
				context.state = {
					zobject: tableDataToRowObjects( [
						{ id: 0, key: undefined, parent: undefined, value: Constants.ROW_VALUE_OBJECT },
						{ id: 1, key: 'Z1K1', parent: 0, value: 'Z6' },
						{ id: 2, key: 'Z6K1', parent: 0, value: 'not a map' }
					] )
				};
				context.getters = {
					getRowById: zobjectModule.getters.getRowById( context.state ),
					getNextRowId: zobjectModule.getters.getNextRowId( context.state )
				};
			} );

			it( 'it adds a detached row when rowId is not a valid row', () => {
				const payload = '';
				const rowId = functionCallModule.actions.initializeResultId( context, payload );
				expect( rowId ).toBe( 3 );
				expect( context.commit ).toHaveBeenCalledTimes( 1 );
				expect( context.commit ).toHaveBeenCalledWith( 'pushRow', {
					id: 3,
					key: undefined,
					parent: undefined,
					value: Constants.ROW_VALUE_OBJECT
				} );
			} );

			it( 'it removes children when rowId is a valid row', () => {
				const payload = 0;
				const rowId = functionCallModule.actions.initializeResultId( context, payload );
				expect( rowId ).toBe( 0 );
				expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeRowChildren', { rowId: 0 } );
			} );
		} );

		describe( 'functionCall', () => {
			it( 'Call MW API for function orchestration; set orchestrationResult', () => {
				const expectedData = '{ "Z1K1": "Z6", "Z6K1": "present" }';
				postMock = jest.fn( () => new Promise( ( resolve ) => {
					resolve( {
						query: {
							wikilambda_function_call: {
								data: expectedData
							}
						}
					} );
				} ) );

				functionCallModule.actions.callZFunction( context, { functionCall } );

				expect( postMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_function_call',
					wikilambda_function_call_zobject: JSON.stringify( canonicalFunctionCall )
				} );
			} );

			it( 'Call MW API for function orchestration; set HTTP error', async () => {
				const error = { error: { info: 'one tissue, used' } };
				postMock = jest.fn().mockReturnValue( {
					then: jest.fn().mockReturnValue( {
						catch: jest.fn().mockImplementation( () => new Promise( ( _resolve, reject ) => {
							reject( error );
						} ) )
					} )
				} );

				await functionCallModule.actions.callZFunction( context, { functionCall } );

				expect( postMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_function_call',
					wikilambda_function_call_zobject: JSON.stringify( canonicalFunctionCall )
				} );

				expect( context.dispatch ).toHaveBeenCalledWith( 'setError', {
					errorCode: undefined,
					errorMessage: 'one tissue, used',
					errorType: 'error'
				} );
			} );
		} );
	} );
} );
