/*!
 * WikiLambda unit test suite for the zTesterResults Pinia store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { setActivePinia, createPinia } = require( 'pinia' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const metadata = require( '../../fixtures/metadata.js' );

describe( 'testResults Pinia store', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.zTesterResults = {};
		store.zTesterMetadata = {};
		store.testResultsPromises = {};
		store.errors = {};
	} );

	describe( 'Getters', () => {
		describe( 'getZTesterResults', () => {
			beforeEach( () => {
				Object.defineProperty( store, 'getErrors', {
					value: jest.fn().mockReturnValue( [] )
				} );
			} );

			it( 'should get undefined when the key is not found', () => {
				const result = store.getZTesterResults( 'Z10000', 'Z10001', 'Z10002' );
				expect( result ).toBe( undefined );
			} );

			it( 'should return the test result when it is found (true)', () => {
				store.zTesterResults[ 'Z10000:Z10001:Z10002' ] = { Z1K1: 'Z40', Z40K1: 'Z41' };
				const result = store.getZTesterResults( 'Z10000', 'Z10001', 'Z10002' );
				expect( result ).toBe( true );
			} );

			it( 'should return the test result when it is found (false)', () => {
				store.zTesterResults[ 'Z10000:Z10001:Z10002' ] = 'Z42';
				const result = store.getZTesterResults( 'Z10000', 'Z10001', 'Z10002' );
				expect( result ).toBe( false );
			} );

			it( 'should return false when the state is in an error state', () => {
				Object.defineProperty( store, 'getErrors', {
					value: jest.fn().mockReturnValue( [ {
						message: 'Some HTTP error on perform_tests',
						type: 'error'
					} ] )
				} );
				const result = store.getZTesterResults( 'Z10000', 'Z10001', 'Z10002' );
				expect( result ).toBe( false );
			} );
		} );

		describe( 'getZTesterMetadata', () => {
			it( 'should return the metadata for the given function:test:implementation key', () => {
				store.zTesterMetadata[ 'Z10000:Z10001:Z10002' ] = metadata.metadataBasic;
				store.zTesterMetadata[ 'Z10000:Z10001:Z10003' ] = metadata.metadataEmpty;

				const metadata1 = store.getZTesterMetadata( 'Z10000', 'Z10001', 'Z10002' );
				const metadata2 = store.getZTesterMetadata( 'Z10000', 'Z10001', 'Z10003' );

				expect( metadata1 ).toEqual( metadata.metadataBasic );
				expect( metadata2 ).toEqual( metadata.metadataEmpty );
			} );
		} );

		describe( 'getZTesterPercentage', () => {
			it( 'should return an object with values for the percentage of passing tests by one given ZID', () => {
				store.zTesterResults[ 'Z10000:Z10001:Z10002' ] = 'Z41';
				store.zTesterResults[ 'Z10000:Z10001:Z10003' ] = 'Z41';
				store.zTesterResults[ 'Z10000:Z10001:Z10004' ] = 'Z41';
				store.zTesterResults[ 'Z10000:Z10001:Z10005' ] = 'Z42';
				store.zTesterResults[ 'Z10009:Z10010:Z10006' ] = 'Z42';

				const result = store.getZTesterPercentage( 'Z10000' );

				expect( result ).toEqual( {
					total: 4,
					passing: 3,
					percentage: 75
				} );
			} );
		} );

		describe( 'getPassingTestZids', () => {
			it( 'returns all passing test zids for a given function Zid', () => {
				store.zTesterResults[ 'Z10000:Z10001:Z10011' ] = 'Z41';
				store.zTesterResults[ 'Z10000:Z10002:Z10012' ] = 'Z41';
				store.zTesterResults[ 'Z10000:Z10003:Z10013' ] = 'Z41';
				store.zTesterResults[ 'Z10000:Z10004:Z10014' ] = 'Z42';
				store.zTesterResults[ 'Z10009:Z10001:Z10015' ] = 'Z42';

				Object.defineProperty( store, 'getConnectedObjects', {
					value: jest.fn().mockReturnValue( [ 'Z10001', 'Z10002', 'Z10003' ] )
				} );

				const result = store.getPassingTestZids( 'Z10000' );
				expect( result ).toEqual( [ 'Z10001', 'Z10002', 'Z10003' ] );
			} );
		} );
	} );

	describe( 'Actions', () => {
		let booleanReturn,
			getMock;

		beforeEach( () => {
			booleanReturn = Constants.Z_BOOLEAN_TRUE;
			getMock = jest.fn( ( payload ) => {
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
							testMetadata: JSON.stringify( Constants.Z_VOID )
						} );
					} );
				} );

				// Use mockResolvedValue to mock the resolved value of the promise
				return Promise.resolve( {
					query: {
						wikilambda_perform_test: data
					}
				} );
			} );
			Object.defineProperty( store, 'getCurrentZObjectId', {
				value: 'Z0'
			} );

			mw.Api = jest.fn( () => ( {
				get: getMock
			} ) );
		} );

		describe( 'setZTesterResult', () => {
			it( 'should set the tester result', () => {
				const key = 'Z10000:Z10001:Z10002';
				store.setZTesterResult( {
					key,
					result: 'Z41',
					metadata: metadata.metadataEmpty
				} );

				expect( store.zTesterResults[ key ] ).toBe( 'Z41' );
				expect( store.zTesterMetadata[ key ] ).toEqual( metadata.metadataEmpty );
			} );

		} );

		describe( 'setTestResultsPromise', () => {
			it( 'should set the tester result promise', async () => {
				store.setTestResultsPromise( {
					functionZid: 'Z10000',
					promise: Promise.resolve( 'done' )
				} );
				await store.testResultsPromises.Z10000.then( ( result ) => {
					expect( result ).toBe( 'done' );
				} );
			} );

			it( 'should set the tester result as a resolving promise', async () => {
				store.setTestResultsPromise( {
					functionZid: 'Z10000'
				} );
				await store.testResultsPromises.Z10000.then( ( result ) => {
					expect( result ).toBe( undefined );
				} );
			} );
		} );

		describe( 'clearZTesterResults', () => {
			it( 'should clear the test results', () => {
				const key = 'Z10000:Z10001:Z10002';
				store.zTesterResults[ key ] = 'Z41';
				store.zTesterMetadata[ key ] = metadata.metadataEmpty;
				store.testResultsPromises.Z10000 = new Promise( ( resolve ) => {
					resolve();
				} );

				store.clearZTesterResults( 'Z10000' );
				expect( Object.keys( store.zTesterResults ).length ).toEqual( 0 );
				expect( Object.keys( store.zTesterMetadata ).length ).toEqual( 0 );
				expect( 'Z10000' in store.testResultsPromises ).toBe( false );
			} );
		} );

		describe( 'getTestResults', () => {

			beforeEach( () => {
				store.fetchZids = jest.fn();
				store.clearErrors = jest.fn();
				store.setError = jest.fn();
			} );

			it( 'exits early if function Zid is not provided', async () => {
				store.clearZTesterResults = jest.fn();
				store.setTestResultsPromise = jest.fn();
				store.setZTesterResult = jest.fn();

				const zFunctionId = undefined;

				await store.getTestResults( { zFunctionId } );

				expect( getMock ).not.toHaveBeenCalled();
				expect( store.clearZTesterResults ).not.toHaveBeenCalled();
				expect( store.clearErrors ).not.toHaveBeenCalled();
				expect( store.setTestResultsPromise ).not.toHaveBeenCalled();
				expect( store.fetchZids ).not.toHaveBeenCalled();
				expect( store.setZTesterResult ).not.toHaveBeenCalled();
				expect( store.setError ).not.toHaveBeenCalled();
			} );

			it( 'should perform the provided tests (passing)', async () => {
				const zFunctionId = 'Z10000';
				const zImplementations = [ 'Z10001', 'Z10002' ];
				const zTesters = [ 'Z10003', 'Z10004' ];

				await store.getTestResults( {
					zFunctionId,
					zImplementations,
					zTesters
				} );
				const result = store.getZTesterPercentage( 'Z10000' );

				expect( getMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_perform_test',
					uselang: 'en',
					wikilambda_perform_test_zfunction: zFunctionId,
					wikilambda_perform_test_zimplementations: zImplementations.join( '|' ),
					wikilambda_perform_test_ztesters: zTesters.join( '|' ),
					wikilambda_perform_test_nocache: false
				} );

				expect( store.clearErrors ).toHaveBeenCalled();
				expect( store.fetchZids ).toHaveBeenCalled();

				expect( Object.keys( store.zTesterResults ).length )
					.toEqual( zTesters.length * zImplementations.length );

				expect( result.passing ).toBe( zTesters.length * zImplementations.length );

			} );
			it( 'should perform the provided tests (failing)', async () => {
				const zFunctionId = 'Z10000',
					zImplementations = [ 'Z10001', 'Z10002' ],
					zTesters = [ 'Z10003', 'Z10004' ];

				booleanReturn = Constants.Z_BOOLEAN_FALSE;

				await store.getTestResults( {
					zFunctionId,
					zImplementations,
					zTesters
				} );
				const result = store.getZTesterPercentage( 'Z10000' );

				expect( getMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_perform_test',
					uselang: 'en',
					wikilambda_perform_test_zfunction: zFunctionId,
					wikilambda_perform_test_zimplementations: zImplementations.join( '|' ),
					wikilambda_perform_test_ztesters: zTesters.join( '|' ),
					wikilambda_perform_test_nocache: false
				} );

				expect( store.clearErrors ).toHaveBeenCalled();
				expect( store.fetchZids ).toHaveBeenCalled();

				expect( Object.keys( store.zTesterResults ).length )
					.toEqual( zTesters.length * zImplementations.length );

				expect( result.passing ).toBe( 0 );

			} );

			it( 'should not reset the tests when not to', async () => {
				const zFunctionId = 'Z10000';
				const zImplementations = [ 'Z10001', 'Z10002' ];
				const zTesters = [ 'Z10003', 'Z10004' ];

				store.clearZTesterResults = jest.fn();

				await store.getTestResults( {
					zFunctionId,
					zImplementations,
					zTesters
				} );

				expect( store.clearZTesterResults ).not.toHaveBeenCalled();
			} );

			it( 'should reset the tests when directed to', async () => {
				const zFunctionId = 'Z10000';
				const zImplementations = [ 'Z10001', 'Z10002' ];
				const zTesters = [ 'Z10003', 'Z10004' ];

				store.clearZTesterResults = jest.fn();

				await store.getTestResults( {
					zFunctionId,
					zImplementations,
					zTesters,
					clearPreviousResults: true
				} );

				expect( store.clearZTesterResults ).toHaveBeenCalledWith( 'Z10000' );
			} );

			it( 'should perform the provided tests (API error)', async () => {
				const zFunctionId = 'Z10000';
				const zImplementations = [ 'Z10001', 'Z10002' ];
				const zTesters = [ 'Z10003', 'Z10004' ];

				getMock = jest.fn().mockRejectedValue( 'API error' );

				await store.getTestResults( {
					zFunctionId,
					zImplementations,
					zTesters
				} );
				const result = store.getZTesterPercentage( 'Z10000' );

				expect( getMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_perform_test',
					uselang: 'en',
					wikilambda_perform_test_zfunction: zFunctionId,
					wikilambda_perform_test_zimplementations: zImplementations.join( '|' ),
					wikilambda_perform_test_ztesters: zTesters.join( '|' ),
					wikilambda_perform_test_nocache: false
				} );

				expect( store.clearErrors ).toHaveBeenCalled();
				expect( store.fetchZids ).not.toHaveBeenCalled();
				expect( store.setError ).toHaveBeenCalledWith( {
					errorMessage: 'Unable to run tests. Please reload.',
					errorType: 'error',
					rowId: -1
				} );

				expect( Object.keys( store.zTesterResults ).length ).toEqual( 0 );

				expect( result.passing ).toBe( 0 );
			} );

			it( 'should not perform the tests if already fetching for that functionZid', () => {
				const zFunctionId = 'Z10000';
				store.testResultsPromises = {
					[ zFunctionId ]: Promise.resolve()
				};
				store.clearZTesterResults = jest.fn();

				store.getTestResults( { zFunctionId } );

				expect( store.clearErrors ).not.toHaveBeenCalled();
				expect( store.clearZTesterResults ).not.toHaveBeenCalled();
				expect( store.fetchZids ).not.toHaveBeenCalled();

			} );

			it( 'should pass JSON for the current object to the API, if implementation ID matches current ' +
				'object and current object is not new', async () => {
				const currentObject = { lovely: 'implementation' };
				const zFunctionId = 'Z10000';
				const zImplementations = [ 'Z10001', 'Z10002' ];
				const zTesters = [ 'Z10003', 'Z10004' ];

				// Mock the getters
				Object.defineProperty( store, 'getCurrentZObjectId', {
					value: 'Z10001'
				} );
				Object.defineProperty( store, 'getZObjectAsJson', {
					value: currentObject
				} );
				Object.defineProperty( store, 'getViewMode', {
					value: false
				} );

				await store.getTestResults( {
					zFunctionId,
					zImplementations,
					zTesters
				} );

				expect( getMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_perform_test',
					uselang: 'en',
					wikilambda_perform_test_zfunction: zFunctionId,
					wikilambda_perform_test_zimplementations: [ JSON.stringify( currentObject ), 'Z10002' ].join( '|' ),
					wikilambda_perform_test_ztesters: zTesters.join( '|' ),
					wikilambda_perform_test_nocache: false
				} );
				expect( store.clearErrors ).toHaveBeenCalled();
				expect( store.fetchZids ).toHaveBeenCalled();
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

				// Mock the getters
				Object.defineProperty( store, 'getCurrentZObjectId', {
					value: 'Z0'
				} );
				Object.defineProperty( store, 'getZObjectAsJson', {
					value: currentObject
				} );
				Object.defineProperty( store, 'getViewMode', {
					value: false
				} );

				await store.getTestResults( {
					zFunctionId: zFunctionId,
					zImplementations: zImplementations,
					zTesters: zTesters
				} );

				const expectedEncodedObject = JSON.stringify( currentObject[ Constants.Z_PERSISTENTOBJECT_VALUE ] ).replace( /\|/g, '🪈' );

				expect( expectedEncodedObject ).toBe( '{"lovely":"implementation🪈with🪈pipes"}' );
				expect( getMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_perform_test',
					uselang: 'en',
					wikilambda_perform_test_zfunction: zFunctionId,
					wikilambda_perform_test_zimplementations: [ expectedEncodedObject, 'Z10002' ].join( '|' ),
					wikilambda_perform_test_ztesters: zTesters.join( '|' ),
					wikilambda_perform_test_nocache: false
				} );
				expect( store.clearErrors ).toHaveBeenCalled();
				expect( store.fetchZids ).toHaveBeenCalled();
			} );
		} );
	} );
} );
