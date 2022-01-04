/*!
 * WikiLambda unit test suite for the callZFunction Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var callZFunctionModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/callZFunction.js' ),
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
		it( 'Call MW API for function orchestration; set orchestrationResult', function () {
			// eslint-disable-next-line no-unused-vars
			postMock = jest.fn( function ( payload ) {
				// eslint-disable-next-line compat/compat
				return new Promise( function ( resolve ) {
					resolve( {
						query: {
							// eslint-disable-next-line camelcase
							wikilambda_function_call: {
								Orchestrated: { data: expectedData }
							}
						}
					} );
				} );
			} );

			callZFunctionModule.actions.callZFunction(
				context, { zobject: functionCall }
			);

			expect( postMock ).toHaveBeenCalledWith( {
				action: 'wikilambda_function_call',
				// eslint-disable-next-line camelcase
				wikilambda_function_call_zobject: JSON.stringify( canonicalFunctionCall )
			} );
		} );

		it( 'Call MW API for function orchestration; set error as orchestrationResult', function () {
			var error = 'one tissue, used';

			// eslint-disable-next-line no-unused-vars
			postMock = jest.fn( function ( payload ) {
				// eslint-disable-next-line compat/compat
				return new Promise( function ( resolve, reject ) {
					reject( error );
				} );
			} );

			callZFunctionModule.actions.callZFunction(
				context, { zobject: functionCall }
			);

			expect( postMock ).toHaveBeenCalledWith( {
				action: 'wikilambda_function_call',
				// eslint-disable-next-line camelcase
				wikilambda_function_call_zobject: JSON.stringify( canonicalFunctionCall )
			} );
		} );
	} );

	it( 'Add orchestration result to the zobject tree (no prior result)', function () {
		var result = { Z1K1: 'Z6', Z6K1: 'A new string' },
			payload = { result: result, resultId: 6 },
			nextId = 6;
		context.getters = {
			getOrchestrationResultId: null,
			getNextObjectId: nextId
		};

		context.commit = jest.fn( function () {
			return;
		} );

		callZFunctionModule.actions.addZFunctionResultToTree( context, payload );

		expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObject', {
			zobject: result,
			key: '',
			id: nextId,
			parent: ''
		} );
	} );

	it( 'Add orchestration result to the zobject tree (with prior result)', function () {
		var result = { Z1K1: 'Z6', Z6K1: 'A new string' },
			payload = { result: result, resultId: 6 },
			nextId = 6;
		context.getters = {
			getOrchestrationResultId: nextId,
			getNextObjectId: nextId
		};

		context.commit = jest.fn( function () {
			return;
		} );

		callZFunctionModule.actions.addZFunctionResultToTree( context, payload );

		expect( context.commit ).toHaveBeenCalledTimes( 0 );
		expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObject', {
			zobject: result,
			key: '',
			id: nextId,
			parent: ''
		} );
	} );
} );
