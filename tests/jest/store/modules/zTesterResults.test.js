/* eslint-disable compat/compat */
/* eslint-disable camelcase */
/*!
 * WikiLambda unit test suite for the zobjectModes Vuex module
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var zTesterResultsModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zTesterResults.js' ),
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' );

describe( 'zTesterResults Vuex module', function () {
	var state,
		context;

	beforeEach( function () {
		state = JSON.parse( JSON.stringify( zTesterResultsModule.state ) );
		context = {
			state: state,
			commit: jest.fn( function ( mutationType, payload ) {
				zTesterResultsModule.mutations[ mutationType ]( context.state, payload );
			} ),
			dispatch: jest.fn( function ( actionType, payload ) {
				zTesterResultsModule.actions[ actionType ]( context, payload );
			} ),
			getters: {}
		};
	} );

	describe( 'Getters', function () {
		it( 'should get undefined when the key is not found', function () {
			var result = zTesterResultsModule.getters.getZTesterResults( context.state )( 'Z10000', 'Z10001', 'Z10002' );
			expect( result ).toBe( undefined );
		} );
		it( 'should return the test result when it is found (true)', function () {
			context.state.zTesterResults[ 'Z10000:Z10001:Z10002' ] = true;
			var result = zTesterResultsModule.getters.getZTesterResults( context.state )( 'Z10000', 'Z10001', 'Z10002' );
			expect( result ).toBe( true );
		} );
		it( 'should return the test result when it is found (false)', function () {
			context.state.zTesterResults[ 'Z10000:Z10001:Z10002' ] = false;
			var result = zTesterResultsModule.getters.getZTesterResults( context.state )( 'Z10000', 'Z10001', 'Z10002' );
			expect( result ).toBe( false );
		} );
		it( 'should return false when the state is in an error state', function () {
			context.state.errorState = true;
			var result = zTesterResultsModule.getters.getZTesterResults( context.state )( 'Z10000', 'Z10001', 'Z10002' );
			expect( result ).toBe( false );
		} );

		it( 'should return an object with values for the percentage of passing tests by one given ZID', function () {
			context.state.zTesterResults[ 'Z10000:Z10001:Z10002' ] = true;
			context.state.zTesterResults[ 'Z10000:Z10001:Z10003' ] = true;
			context.state.zTesterResults[ 'Z10000:Z10001:Z10004' ] = true;
			context.state.zTesterResults[ 'Z10000:Z10001:Z10005' ] = false;
			context.state.zTesterResults[ 'Z10009:Z10010:Z10006' ] = false;

			var result = zTesterResultsModule.getters.getZTesterPercentage( context.state )( 'Z10000' );

			expect( result ).toEqual( {
				total: 4,
				passing: 3,
				percentage: 75
			} );
		} );
	} );

	describe( 'Mutations', function () {
		it( 'should set the tester result', function () {
			zTesterResultsModule.mutations.setZTesterResult( context.state, { key: 'Z10000:Z10001:Z10002', result: true } );

			var result = zTesterResultsModule.getters.getZTesterResults( context.state )( 'Z10000', 'Z10001', 'Z10002' );
			expect( result ).toBe( true );
		} );
		it( 'should set the fetching status', function () {
			zTesterResultsModule.mutations.setFetchingTestResults( context.state, true );

			expect( context.state.fetchingTestResults ).toBe( true );
		} );
		it( 'should allow for clearing the test results', function () {
			zTesterResultsModule.mutations.setZTesterResult( context.state, { key: 'Z10000:Z10001:Z10002', result: true } );

			expect( Object.keys( context.state.zTesterResults ).length ).toEqual( 1 );

			zTesterResultsModule.mutations.clearZTesterResults( context.state );

			expect( Object.keys( context.state.zTesterResults ).length ).toEqual( 0 );
		} );
		it( 'should allow for setting error state', function () {
			zTesterResultsModule.mutations.setErrorState( context.state, true );

			expect( context.state.errorState ).toBe( true );
		} );
	} );

	describe( 'Actions', function () {
		var booleanReturn,
			errorReturn,
			postMock;

		beforeEach( function () {
			booleanReturn = Constants.Z_BOOLEAN_TRUE;
			errorReturn = false;
			postMock = jest.fn( function ( payload ) {
				return new Promise( function ( resolve ) {
					var data = [];

					JSON.parse( payload.wikilambda_perform_test_zimplementations ).forEach( function ( impl ) {
						JSON.parse( payload.wikilambda_perform_test_ztesters ).forEach( function ( tester ) {
							data.push( {
								zFunctionId: payload.wikilambda_perform_test_zfunction,
								zImplementationId: impl,
								zTesterId: tester,
								validationResponse: {
									Z1K1: Constants.Z_PAIR,
									Z22K1: errorReturn ? Constants.Z_NOTHING : {
										Z1K1: Constants.Z_BOOLEAN,
										Z40K1: booleanReturn
									},
									Z22K2: Constants.Z_NOTHING
								}
							} );
						} );
					} );

					resolve( {
						query: {
							wikilambda_perform_test: {
								Tested: {
									data: JSON.stringify( data )
								}
							}
						}
					} );
				} );
			} );

			context.getters.getCurrentZObjectId = 'Z0';

			mw.Api = jest.fn( function () {
				return {
					post: postMock
				};
			} );
		} );

		it( 'should allow for resetting a given test result', function () {
			zTesterResultsModule.mutations.setZTesterResult( context.state, { key: 'Z10000:Z10001:Z10002', result: true } );

			expect( zTesterResultsModule.getters.getZTesterResults( context.state )( 'Z10000', 'Z10001', 'Z10002' ) ).toBe( true );

			zTesterResultsModule.actions.resetTestResult( context, {
				zFunctionId: 'Z10000',
				zTesterId: 'Z10001',
				zImplementationId: 'Z10002'
			} );

			expect( zTesterResultsModule.getters.getZTesterResults( context.state )( 'Z10000', 'Z10001', 'Z10002' ) ).toBe( undefined );
		} );

		it( 'should perform the provided tests (passing)', function () {
			var zFunctionId = 'Z10000',
				zImplementations = [ 'Z10001', 'Z10002' ],
				zTesters = [ 'Z10003', 'Z10004' ];

			return zTesterResultsModule.actions.getTestResults( context, {
				zFunctionId: zFunctionId,
				zImplementations: zImplementations,
				zTesters: zTesters
			} ).then( function () {
				var result = zTesterResultsModule.getters.getZTesterPercentage( context.state )( 'Z10000' );

				expect( postMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_perform_test',
					wikilambda_perform_test_zfunction: zFunctionId,
					wikilambda_perform_test_zimplementations: JSON.stringify( zImplementations ),
					wikilambda_perform_test_ztesters: JSON.stringify( zTesters ),
					wikilambda_perform_test_nocache: false
				} );
				expect( context.commit ).toHaveBeenCalledTimes( 7 );
				expect( Object.keys( context.state.zTesterResults ).length )
					.toEqual( zTesters.length * zImplementations.length );

				expect( result.passing ).toBe( zTesters.length * zImplementations.length );
			} );
		} );

		it( 'should perform the provided tests (failing)', function () {
			var zFunctionId = 'Z10000',
				zImplementations = [ 'Z10001', 'Z10002' ],
				zTesters = [ 'Z10003', 'Z10004' ];

			booleanReturn = Constants.Z_BOOLEAN_FALSE;

			return zTesterResultsModule.actions.getTestResults( context, {
				zFunctionId: zFunctionId,
				zImplementations: zImplementations,
				zTesters: zTesters
			} ).then( function () {
				var result = zTesterResultsModule.getters.getZTesterPercentage( context.state )( 'Z10000' );

				expect( postMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_perform_test',
					wikilambda_perform_test_zfunction: zFunctionId,
					wikilambda_perform_test_zimplementations: JSON.stringify( zImplementations ),
					wikilambda_perform_test_ztesters: JSON.stringify( zTesters ),
					wikilambda_perform_test_nocache: false
				} );
				expect( context.commit ).toHaveBeenCalledTimes( 7 );
				expect( Object.keys( context.state.zTesterResults ).length )
					.toEqual( zTesters.length * zImplementations.length );

				expect( result.passing ).toBe( 0 );
			} );
		} );

		it( 'should perform the provided tests (evaluator/orchestrator error)', function () {
			var zFunctionId = 'Z10000',
				zImplementations = [ 'Z10001', 'Z10002' ],
				zTesters = [ 'Z10003', 'Z10004' ];

			errorReturn = true;

			return zTesterResultsModule.actions.getTestResults( context, {
				zFunctionId: zFunctionId,
				zImplementations: zImplementations,
				zTesters: zTesters
			} ).then( function () {
				var result = zTesterResultsModule.getters.getZTesterPercentage( context.state )( 'Z10000' );

				expect( postMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_perform_test',
					wikilambda_perform_test_zfunction: zFunctionId,
					wikilambda_perform_test_zimplementations: JSON.stringify( zImplementations ),
					wikilambda_perform_test_ztesters: JSON.stringify( zTesters ),
					wikilambda_perform_test_nocache: false
				} );
				expect( context.commit ).toHaveBeenCalledTimes( 7 );
				expect( Object.keys( context.state.zTesterResults ).length )
					.toEqual( zTesters.length * zImplementations.length );

				expect( result.passing ).toBe( 0 );
			} );
		} );

		it( 'should not reset the tests when not to', function () {
			var zFunctionId = 'Z10000',
				zImplementations = [ 'Z10001', 'Z10002' ],
				zTesters = [ 'Z10003', 'Z10004' ];

			return zTesterResultsModule.actions.getTestResults( context, {
				zFunctionId: zFunctionId,
				zImplementations: zImplementations,
				zTesters: zTesters
			} ).then( function () {
				expect( context.commit ).not.toHaveBeenCalledWith( 'clearZTesterResults' );
			} );
		} );

		it( 'should reset the tests when directed to', function () {
			var zFunctionId = 'Z10000',
				zImplementations = [ 'Z10001', 'Z10002' ],
				zTesters = [ 'Z10003', 'Z10004' ];

			return zTesterResultsModule.actions.getTestResults( context, {
				zFunctionId: zFunctionId,
				zImplementations: zImplementations,
				zTesters: zTesters,
				clearPreviousResults: true
			} ).then( function () {
				expect( context.commit ).toHaveBeenCalledWith( 'clearZTesterResults' );
			} );
		} );

		it( 'should perform the provided tests (API error)', function () {
			var zFunctionId = 'Z10000',
				zImplementations = [ 'Z10001', 'Z10002' ],
				zTesters = [ 'Z10003', 'Z10004' ];

			postMock = jest.fn( function () {
				return new Promise( function ( resolve, reject ) {
					reject( 'API error' );
				} );
			} );

			return zTesterResultsModule.actions.getTestResults( context, {
				zFunctionId: zFunctionId,
				zImplementations: zImplementations,
				zTesters: zTesters
			} ).then( function () {
				var result = zTesterResultsModule.getters.getZTesterPercentage( context.state )( 'Z10000' );

				expect( postMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_perform_test',
					wikilambda_perform_test_zfunction: zFunctionId,
					wikilambda_perform_test_zimplementations: JSON.stringify( zImplementations ),
					wikilambda_perform_test_ztesters: JSON.stringify( zTesters ),
					wikilambda_perform_test_nocache: false
				} );
				expect( context.commit ).toHaveBeenCalledTimes( 4 );
				expect( Object.keys( context.state.zTesterResults ).length )
					.toEqual( 0 );

				expect( result.passing ).toBe( 0 );
				expect( context.state.errorState ).toBe( true );
			} );
		} );

		it( 'should not perform the tests if already fetching', function () {
			context.state.fetchingTestResults = true;

			zTesterResultsModule.actions.getTestResults( context );

			expect( context.commit ).not.toHaveBeenCalled();
		} );
	} );
} );
