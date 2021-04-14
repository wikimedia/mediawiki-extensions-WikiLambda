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
	expectedData = '{ "Z1K1": "Z6", "Z6K1": "present" }',
	state,
	context,
	postMock;

describe( 'callZFunction Vuex module', function () {
	beforeEach( function () {
		state = $.extend( {}, callZFunctionModule.state );
		context = $.extend( {}, {
			// eslint-disable-next-line no-unused-vars
			commit: jest.fn( function ( mutationType, payload ) {
				return;
			} ),
			getters: {}
		} );

		mw.Api = jest.fn( function () {
			return {
				post: postMock
			};
		} );
	} );

	describe( 'Getters', function () {
		it( 'Returns current orchestrationResult', function () {
			state.orchestrationResult = functionCall;
			expect( callZFunctionModule.getters.getOrchestrationResult( state ) ).toEqual( functionCall );
		} );
	} );

	describe( 'Mutations', function () {
		it( 'Sets orchestrationResult', function () {
			callZFunctionModule.mutations.setOrchestrationResult( state, functionCall );
			expect( state.orchestrationResult ).toEqual( functionCall );
		} );
	} );

	describe( 'Actions', function () {
		it( 'Call MW API for function orchestration; set orchestrationResult', function () {
			var resolveMock = jest.fn( function ( fn ) {
				fn( {
					query: {
						// eslint-disable-next-line camelcase
						wikilambda_function_call: {
							Orchestrated: { data: expectedData }
						}
					}
				} );

				return {
					catch: jest.fn()
				};
			} );

			// eslint-disable-next-line no-unused-vars
			postMock = jest.fn( function ( payload ) {
				return { then: resolveMock };
			} );

			callZFunctionModule.actions.callZFunction(
				context, { zobject: functionCall }
			);

			expect( postMock ).toHaveBeenCalledWith( {
				action: 'wikilambda_function_call',
				// eslint-disable-next-line camelcase
				wikilambda_function_call_zobject: JSON.stringify( functionCall )
			} );
			expect( resolveMock ).toHaveBeenCalledTimes( 1 );
			expect( context.commit ).toHaveBeenCalledTimes( 1 );
			expect( context.commit ).toHaveBeenCalledWith( 'setOrchestrationResult', expectedData );
		} );

		it( 'Call MW API for function orchestration; set error as orchestrationResult', function () {
			var error = 'one tissue, used';

			// eslint-disable-next-line no-unused-vars
			postMock = jest.fn( function ( payload ) {
				return {
					// eslint-disable-next-line no-unused-vars
					then: jest.fn( function ( fn ) {
						return {
							catch: jest.fn( function ( func ) {
								func( error );
							} )
						};
					} )
				};
			} );

			callZFunctionModule.actions.callZFunction(
				context, { zobject: functionCall }
			);

			expect( postMock ).toHaveBeenCalledWith( {
				action: 'wikilambda_function_call',
				// eslint-disable-next-line camelcase
				wikilambda_function_call_zobject: JSON.stringify( functionCall )
			} );
			expect( context.commit ).toHaveBeenCalledTimes( 1 );
			expect( context.commit ).toHaveBeenCalledWith( 'setOrchestrationResult', error );
		} );
	} );
} );
