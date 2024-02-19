/*!
 * WikiLambda unit test suite for the zTesterResults Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const zTesterResultsModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zTesterResults.js' ),
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' );

describe( 'zTesterResults Vuex module', () => {
	let state,
		context;

	beforeEach( () => {
		state = JSON.parse( JSON.stringify( zTesterResultsModule.state ) );
		context = {
			state: state,
			commit: jest.fn( ( mutationType, payload ) => {
				zTesterResultsModule.mutations[ mutationType ]( context.state, payload );
			} ),
			dispatch: jest.fn( ( actionType, payload ) => {
				zTesterResultsModule.actions[ actionType ]( context, payload );
			} ),
			getters: {}
		};

		mw.log = { error: () => {} };
	} );

	describe( 'Getters', () => {
		it( 'should get undefined when the key is not found', () => {
			const result = zTesterResultsModule.getters.getZTesterResults( context.state )( 'Z10000', 'Z10001', 'Z10002' );
			expect( result ).toBe( undefined );
		} );

		it( 'should return the test result when it is found (true)', () => {
			// The code allows for either normal form, as here, or canonical, as below
			context.state.zTesterResults[ 'Z10000:Z10001:Z10002' ] = { Z1K1: 'Z40', Z40K1: 'Z41' };
			const result = zTesterResultsModule.getters.getZTesterResults( context.state )( 'Z10000', 'Z10001', 'Z10002' );
			expect( result ).toBe( true );
		} );

		it( 'should return the test result when it is found (false)', () => {
			context.state.zTesterResults[ 'Z10000:Z10001:Z10002' ] = 'Z42';
			const result = zTesterResultsModule.getters.getZTesterResults( context.state )( 'Z10000', 'Z10001', 'Z10002' );
			expect( result ).toBe( false );
		} );

		it( 'should return false when the state is in an error state', () => {
			context.state.errorState = true;
			const result = zTesterResultsModule.getters.getZTesterResults( context.state )( 'Z10000', 'Z10001', 'Z10002' );
			expect( result ).toBe( false );
		} );

		it( 'should return an object with values for the percentage of passing tests by one given ZID', () => {
			context.state.zTesterResults[ 'Z10000:Z10001:Z10002' ] = 'Z41';
			context.state.zTesterResults[ 'Z10000:Z10001:Z10003' ] = 'Z41';
			context.state.zTesterResults[ 'Z10000:Z10001:Z10004' ] = 'Z41';
			context.state.zTesterResults[ 'Z10000:Z10001:Z10005' ] = 'Z42';
			context.state.zTesterResults[ 'Z10009:Z10010:Z10006' ] = 'Z42';

			const result = zTesterResultsModule.getters.getZTesterPercentage( context.state )( 'Z10000' );

			expect( result ).toEqual( {
				total: 4,
				passing: 3,
				percentage: 75
			} );
		} );

		describe( 'getPassingTestZids', () => {
			it( 'returns all passing test zids for a given function Zid', () => {
				context.state.zTesterResults[ 'Z10000:Z10001:Z10011' ] = 'Z41';
				context.state.zTesterResults[ 'Z10000:Z10002:Z10012' ] = 'Z41';
				context.state.zTesterResults[ 'Z10000:Z10003:Z10013' ] = 'Z41';
				context.state.zTesterResults[ 'Z10000:Z10004:Z10014' ] = 'Z42';
				context.state.zTesterResults[ 'Z10009:Z10001:Z10015' ] = 'Z42';
				// Only Z10001, Z10002 and Z10003 are connected
				context.getters.getConnectedObjects = () => [ 'Z10001', 'Z10002', 'Z10003' ];
				const result = zTesterResultsModule.getters.getPassingTestZids( context.state, context.getters )( 'Z10000' );
				expect( result ).toEqual( [ 'Z10001', 'Z10002', 'Z10003' ] );
			} );
		} );
	} );

	describe( 'Mutations', () => {
		it( 'should set the tester result', () => {
			zTesterResultsModule.mutations.setZTesterResult( context.state, { key: 'Z10000:Z10001:Z10002', result: 'Z41' } );

			const result = zTesterResultsModule.getters.getZTesterResults( context.state )( 'Z10000', 'Z10001', 'Z10002' );
			expect( result ).toBe( true );
		} );

		it( 'should set the tester result promise', () => {
			zTesterResultsModule.mutations.setTestResultsPromise( context.state, 'Z10000', Promise.resolve( 'done' ) );

			return context.state.testResultsPromises.Z10000.then( ( result ) => {
				expect( result ).toBe( 'done' );
			} );
		} );

		it( 'should set the tester result as a resolving promise', () => {
			zTesterResultsModule.mutations.setTestResultsPromise( context.state, 'Z10000' );

			return context.state.testResultsPromises.Z10000.then( ( result ) => {
				expect( result ).toBe( undefined );
			} );
		} );

		it( 'should allow for clearing the test results', () => {
			zTesterResultsModule.mutations.setZTesterResult( context.state, { key: 'Z10000:Z10001:Z10002', result: { Z22K1: { Z40K1: 'Z41' } } } );
			expect( Object.keys( context.state.zTesterResults ).length ).toEqual( 1 );

			zTesterResultsModule.mutations.clearZTesterResults( context.state );
			expect( Object.keys( context.state.zTesterResults ).length ).toEqual( 0 );
		} );

		it( 'should allow for setting error state', () => {
			zTesterResultsModule.mutations.setErrorState( context.state, true );

			expect( context.state.errorState ).toBe( true );
		} );
	} );

	describe( 'Actions', () => {
		let booleanReturn,
			getMock;

		beforeEach( () => {
			booleanReturn = Constants.Z_BOOLEAN_TRUE;
			getMock = jest.fn( ( payload ) => {
				return new Promise( ( resolve ) => {
					const data = [];

					payload.wikilambda_perform_test_zimplementations.split( '|' ).forEach( ( impl ) => {
						payload.wikilambda_perform_test_ztesters.split( '|' ).forEach( ( tester ) => {
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

			mw.Api = jest.fn( () => {
				return {
					get: getMock
				};
			} );
		} );

		describe( 'getTestResults', () => {
			it( 'should perform the provided tests (passing)', () => {
				const zFunctionId = 'Z10000';
				const zImplementations = [ 'Z10001', 'Z10002' ];
				const zTesters = [ 'Z10003', 'Z10004' ];

				return zTesterResultsModule.actions.getTestResults( context, {
					zFunctionId,
					zImplementations,
					zTesters
				} ).then( () => {
					const result = zTesterResultsModule.getters.getZTesterPercentage( context.state )( 'Z10000' );

					expect( getMock ).toHaveBeenCalledWith( {
						action: 'wikilambda_perform_test',
						wikilambda_perform_test_zfunction: zFunctionId,
						wikilambda_perform_test_zimplementations: zImplementations.join( '|' ),
						wikilambda_perform_test_ztesters: zTesters.join( '|' ),
						wikilambda_perform_test_nocache: false
					} );
					expect( context.commit ).toHaveBeenCalledTimes( 8 );
					expect( Object.keys( context.state.zTesterResults ).length )
						.toEqual( zTesters.length * zImplementations.length );

					expect( result.passing ).toBe( zTesters.length * zImplementations.length );
				} );
			} );

			it( 'should perform the provided tests (failing)', () => {
				var zFunctionId = 'Z10000',
					zImplementations = [ 'Z10001', 'Z10002' ],
					zTesters = [ 'Z10003', 'Z10004' ];

				booleanReturn = Constants.Z_BOOLEAN_FALSE;

				return zTesterResultsModule.actions.getTestResults( context, {
					zFunctionId,
					zImplementations,
					zTesters
				} ).then( () => {
					const result = zTesterResultsModule.getters.getZTesterPercentage( context.state )( 'Z10000' );

					expect( getMock ).toHaveBeenCalledWith( {
						action: 'wikilambda_perform_test',
						wikilambda_perform_test_zfunction: zFunctionId,
						wikilambda_perform_test_zimplementations: zImplementations.join( '|' ),
						wikilambda_perform_test_ztesters: zTesters.join( '|' ),
						wikilambda_perform_test_nocache: false
					} );
					expect( context.commit ).toHaveBeenCalledTimes( 8 );
					expect( Object.keys( context.state.zTesterResults ).length )
						.toEqual( zTesters.length * zImplementations.length );

					expect( result.passing ).toBe( 0 );
				} );
			} );

			it( 'should not reset the tests when not to', () => {
				const zFunctionId = 'Z10000';
				const zImplementations = [ 'Z10001', 'Z10002' ];
				const zTesters = [ 'Z10003', 'Z10004' ];

				return zTesterResultsModule.actions.getTestResults( context, {
					zFunctionId,
					zImplementations,
					zTesters
				} ).then( () => {
					expect( context.commit ).not.toHaveBeenCalledWith( 'clearZTesterResults' );
				} );
			} );

			it( 'should reset the tests when directed to', () => {
				const zFunctionId = 'Z10000';
				const zImplementations = [ 'Z10001', 'Z10002' ];
				const zTesters = [ 'Z10003', 'Z10004' ];

				return zTesterResultsModule.actions.getTestResults( context, {
					zFunctionId,
					zImplementations,
					zTesters,
					clearPreviousResults: true
				} ).then( () => {
					expect( context.commit ).toHaveBeenCalledWith( 'clearZTesterResults', 'Z10000' );
				} );
			} );

			it( 'should perform the provided tests (API error)', () => {
				const zFunctionId = 'Z10000';
				const zImplementations = [ 'Z10001', 'Z10002' ];
				const zTesters = [ 'Z10003', 'Z10004' ];

				getMock = jest.fn( () => {
					return new Promise( function ( resolve, reject ) {
						reject( 'API error' );
					} );
				} );

				return zTesterResultsModule.actions.getTestResults( context, {
					zFunctionId,
					zImplementations,
					zTesters
				} ).then( () => {
					const result = zTesterResultsModule.getters.getZTesterPercentage( context.state )( 'Z10000' );

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

			it( 'should not perform the tests if already fetching for that functionZid', () => {
				const zFunctionId = 'Z10000';
				context.state.testResultsPromises = {
					[ zFunctionId ]: Promise.resolve()
				};

				zTesterResultsModule.actions.getTestResults( context, { zFunctionId } );
				expect( context.commit ).not.toHaveBeenCalled();
			} );

			it( 'should pass JSON for the current object to the API, if implementation ID matches current ' +
				'object and current object is not new', async () => {
				const currentObject = { lovely: 'implementation' };
				const zFunctionId = 'Z10000';
				const zImplementations = [ 'Z10001', 'Z10002' ];
				const zTesters = [ 'Z10003', 'Z10004' ];

				context.getters.getCurrentZObjectId = 'Z10001';
				context.getters.getZObjectAsJson = currentObject;

				await zTesterResultsModule.actions.getTestResults( context, {
					zFunctionId,
					zImplementations,
					zTesters
				} );

				expect( getMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_perform_test',
					wikilambda_perform_test_zfunction: zFunctionId,
					wikilambda_perform_test_zimplementations: [ JSON.stringify( currentObject ), 'Z10002' ].join( '|' ),
					wikilambda_perform_test_ztesters: zTesters.join( '|' ),
					wikilambda_perform_test_nocache: false
				} );
			} );

			it( 'should pass JSON for the current inner object to the API, if implementation ID matches current ' +
			'object and current object is new', async () => {
				const currentObject = {
					[ Constants.Z_PERSISTENTOBJECT_VALUE ]: {
						lovely: 'implementation|with|pipes'
					}
				};
				const zFunctionId = 'Z10000';
				const zImplementations = [ 'Z0', 'Z10002' ];
				const zTesters = [ 'Z10003', 'Z10004' ];
				context.getters.getCurrentZObjectId = 'Z0';
				context.getters.getZObjectAsJson = currentObject;

				await zTesterResultsModule.actions.getTestResults( context, {
					zFunctionId: zFunctionId,
					zImplementations: zImplementations,
					zTesters: zTesters
				} );

				const expectedEncodedObject = JSON.stringify( currentObject[ Constants.Z_PERSISTENTOBJECT_VALUE ] ).replace( '|', '🪈' );

				expect( getMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_perform_test',
					wikilambda_perform_test_zfunction: zFunctionId,
					wikilambda_perform_test_zimplementations: [ expectedEncodedObject, 'Z10002' ].join( '|' ),
					wikilambda_perform_test_ztesters: zTesters.join( '|' ),
					wikilambda_perform_test_nocache: false
				} );
			} );
		} );
	} );
} );
