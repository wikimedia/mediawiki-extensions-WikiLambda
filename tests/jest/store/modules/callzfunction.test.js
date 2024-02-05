/*!
 * WikiLambda unit test suite for the callZFunction Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var tableDataToRowObjects = require( '../../helpers/zObjectTableHelpers.js' ).tableDataToRowObjects,
	callZFunctionModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/callZFunction.js' ),
	zobjectModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zobject.js' ),
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	functionCall = {
		Z1K1: {
			Z1K1: 'Z9',
			Z9K1: 'Z7'
		},
		Z7K1: {
			Z1K1: 'Z9',
			Z9K1: 'Z110'
		},
		Z110K1: {
			Z1K1: 'Z6',
			Z6K1: 'past'
		}
	},
	canonicalFunctionCall = {
		Z1K1: 'Z7', Z7K1: 'Z110', Z110K1: 'past'
	},
	expectedData = '{ "Z1K1": "Z6", "Z6K1": "present" }',
	context,
	postMock;

describe( 'callZFunction Vuex module', function () {
	beforeEach( function () {
		context = $.extend( {}, {
			// eslint-disable-next-line no-unused-vars
			commit: jest.fn( function ( mutationType, payload ) {
				return;
			} ),
			dispatch: jest.fn(),
			getters: {}
		} );

		mw.Api = jest.fn( function () {
			return {
				post: postMock
			};
		} );
	} );

	describe( 'Actions', function () {

		describe( 'initializeResultId', () => {
			beforeEach( function () {
				context.state = {
					zobject: tableDataToRowObjects( [
						{ id: 0, key: undefined, parent: undefined, value: 'object' },
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
				const rowId = callZFunctionModule.actions.initializeResultId( context, payload );
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
				const rowId = callZFunctionModule.actions.initializeResultId( context, payload );
				expect( rowId ).toBe( 0 );
				expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeRowChildren', 0 );
			} );
		} );

		describe( 'callZFunction', () => {
			it( 'Call MW API for function orchestration; set orchestrationResult', function () {
				// eslint-disable-next-line no-unused-vars
				postMock = jest.fn( function ( payload ) {
					return new Promise( function ( resolve ) {
						resolve( {
							query: {
								wikilambda_function_call: {
									data: expectedData
								}
							}
						} );
					} );
				} );

				callZFunctionModule.actions.callZFunction(
					context, { functionCall }
				);

				expect( postMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_function_call',
					wikilambda_function_call_zobject: JSON.stringify( canonicalFunctionCall )
				} );
			} );

			it( 'Call MW API for function orchestration; set error as orchestrationResult', function () {
				var error = 'one tissue, used';

				// eslint-disable-next-line no-unused-vars
				postMock = jest.fn( function ( payload ) {
					return new Promise( function ( resolve, reject ) {
						reject( error );
					} );
				} );

				callZFunctionModule.actions.callZFunction(
					context, { functionCall }
				);

				expect( postMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_function_call',
					wikilambda_function_call_zobject: JSON.stringify( canonicalFunctionCall )
				} );
			} );
		} );
	} );
} );
