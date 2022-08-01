/* eslint-disable compat/compat */
/* eslint-disable camelcase */
/*!
 * WikiLambda unit test suite for the zobjectModes Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
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

		mw.log = { error: function () {} };
	} );

	describe( 'Getters', function () {
		it( 'should get undefined when the key is not found', function () {
			var result = zTesterResultsModule.getters.getZTesterResults( context.state )( 'Z10000', 'Z10001', 'Z10002' );
			expect( result ).toBe( undefined );
		} );
		it( 'should return the test result when it is found (true)', function () {
			// The code allows for either normal form, as here, or canonical, as below
			context.state.zTesterResults[ 'Z10000:Z10001:Z10002' ] = { Z1K1: 'Z40', Z40K1: 'Z41' };
			var result = zTesterResultsModule.getters.getZTesterResults( context.state )( 'Z10000', 'Z10001', 'Z10002' );
			expect( result ).toBe( true );
		} );
		it( 'should return the test result when it is found (false)', function () {
			context.state.zTesterResults[ 'Z10000:Z10001:Z10002' ] = 'Z42';
			var result = zTesterResultsModule.getters.getZTesterResults( context.state )( 'Z10000', 'Z10001', 'Z10002' );
			expect( result ).toBe( false );
		} );
		it( 'should return false when the state is in an error state', function () {
			context.state.errorState = true;
			var result = zTesterResultsModule.getters.getZTesterResults( context.state )( 'Z10000', 'Z10001', 'Z10002' );
			expect( result ).toBe( false );
		} );

		it( 'should return an object with values for the percentage of passing tests by one given ZID', function () {
			context.state.zTesterResults[ 'Z10000:Z10001:Z10002' ] = 'Z41';
			context.state.zTesterResults[ 'Z10000:Z10001:Z10003' ] = 'Z41';
			context.state.zTesterResults[ 'Z10000:Z10001:Z10004' ] = 'Z41';
			context.state.zTesterResults[ 'Z10000:Z10001:Z10005' ] = 'Z42';
			context.state.zTesterResults[ 'Z10009:Z10010:Z10006' ] = 'Z42';

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
			zTesterResultsModule.mutations.setZTesterResult( context.state, { key: 'Z10000:Z10001:Z10002', result: 'Z41' } );

			var result = zTesterResultsModule.getters.getZTesterResults( context.state )( 'Z10000', 'Z10001', 'Z10002' );
			expect( result ).toBe( true );
		} );
		it( 'should set the fetching status', function () {
			zTesterResultsModule.mutations.setFetchingTestResults( context.state, true );

			expect( context.state.fetchingTestResults ).toBe( true );
		} );
		it( 'should allow for clearing the test results', function () {
			zTesterResultsModule.mutations.setZTesterResult( context.state, { key: 'Z10000:Z10001:Z10002', result: { Z22K1: { Z40K1: 'Z41' } } } );

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
			getMock;

		beforeEach( function () {
			booleanReturn = Constants.Z_BOOLEAN_TRUE;
			getMock = jest.fn( function ( payload ) {
				return new Promise( function ( resolve ) {
					var data = [];

					payload.wikilambda_perform_test_zimplementations.split( '|' ).forEach( function ( impl ) {
						payload.wikilambda_perform_test_ztesters.split( '|' ).forEach( function ( tester ) {
							data.push( {
								zFunctionId: payload.wikilambda_perform_test_zfunction,
								zImplementationId: impl,
								zTesterId: tester,
								validateStatus: JSON.stringify( {
									Z1K1: Constants.Z_BOOLEAN,
									Z40K1: booleanReturn
								} ),
								// This will normally be a ZMap of metadata, but we aren't testing that here
								testMetadata: JSON.stringify( Constants.Z_VOID )
							} );
						} );
					} );

					resolve( {
						query: {
							wikilambda_perform_test: data
						}
					} );
				} );
			} );

			context.getters.getCurrentZObjectId = 'Z0';

			mw.Api = jest.fn( function () {
				return {
					get: getMock
				};
			} );
		} );

		it( 'should allow for resetting a given test result', function () {
			zTesterResultsModule.mutations.setZTesterResult( context.state, { key: 'Z10000:Z10001:Z10002', result: 'Z41' } );

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

				expect( getMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_perform_test',
					wikilambda_perform_test_zfunction: zFunctionId,
					wikilambda_perform_test_zimplementations: zImplementations.join( '|' ),
					wikilambda_perform_test_ztesters: zTesters.join( '|' ),
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

				expect( getMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_perform_test',
					wikilambda_perform_test_zfunction: zFunctionId,
					wikilambda_perform_test_zimplementations: zImplementations.join( '|' ),
					wikilambda_perform_test_ztesters: zTesters.join( '|' ),
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

			getMock = jest.fn( function () {
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

				expect( getMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_perform_test',
					wikilambda_perform_test_zfunction: zFunctionId,
					wikilambda_perform_test_zimplementations: zImplementations.join( '|' ),
					wikilambda_perform_test_ztesters: zTesters.join( '|' ),
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
