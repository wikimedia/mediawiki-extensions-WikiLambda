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
		describe( 'getZTesterResult', () => {
			beforeEach( () => {
				Object.defineProperty( store, 'getErrors', {
					value: jest.fn().mockReturnValue( [] )
				} );
			} );

			it( 'should get undefined when the key is not found', () => {
				const result = store.getZTesterResult( 'Z10000', 'Z10001', 'Z10002' );
				expect( result ).toBe( undefined );
			} );

			it( 'should return the test result when it is found (true)', () => {
				store.zTesterResults[ 'Z10000:Z10001:Z10002' ] = { Z1K1: 'Z40', Z40K1: 'Z41' };
				const result = store.getZTesterResult( 'Z10000', 'Z10001', 'Z10002' );
				expect( result ).toBe( true );
			} );

			it( 'should return the test result when it is found (false)', () => {
				store.zTesterResults[ 'Z10000:Z10001:Z10002' ] = 'Z42';
				const result = store.getZTesterResult( 'Z10000', 'Z10001', 'Z10002' );
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

		describe( 'getValidRendererTests', () => {
			it( 'should return valid renderer tests for a given renderer Zid', () => {
				const rendererZid = 'Z10000';
				const passingTestZids = [ 'Z10001', 'Z10002', 'Z10003' ];

				Object.defineProperty( store, 'getPassingTestZids', {
					value: jest.fn().mockReturnValue( passingTestZids )
				} );

				Object.defineProperty( store, 'getStoredObject', {
					value: jest.fn( ( zid ) => {
						if ( zid === 'Z10001' ) {
							return {
								[ Constants.Z_PERSISTENTOBJECT_VALUE ]: {
									[ Constants.Z_TESTER_CALL ]: {
										[ Constants.Z_FUNCTION_CALL_FUNCTION ]: rendererZid
									}
								}
							};
						} else if ( zid === 'Z10002' ) {
							return {
								[ Constants.Z_PERSISTENTOBJECT_VALUE ]: {
									[ Constants.Z_TESTER_CALL ]: {
										[ Constants.Z_FUNCTION_CALL_FUNCTION ]: 'Z99999'
									}
								}
							};
						}
						return null;
					} )
				} );

				const result = store.getValidRendererTests( rendererZid );

				expect( result ).toEqual( [
					{
						zid: 'Z10001',
						zobject: {
							[ Constants.Z_TESTER_CALL ]: {
								[ Constants.Z_FUNCTION_CALL_FUNCTION ]: rendererZid
							}
						}
					}
				] );
			} );
		} );
		describe( 'hasFlyingPromise', () => {
			const functionZid = 'Z10000';
			const testZid = 'Z10002';
			const implementationZid = 'Z10001';

			it( 'returns false when there are no promises', () => {
				const result = store.hasFlyingPromise( functionZid, testZid, implementationZid );
				expect( result ).toBe( false );
			} );

			it( 'returns true when there is a flying promise for all tests of a function', () => {
				store.testResultsPromises[ `${ functionZid }:*:*` ] = { flying: true, promise: Promise.resolve() };

				const result = store.hasFlyingPromise( functionZid, testZid, implementationZid );
				expect( result ).toBe( true );
			} );

			it( 'returns true when there is a flying promise for a test against all implementations', () => {
				store.testResultsPromises[ `${ functionZid }:${ testZid }:*` ] = { flying: true, promise: Promise.resolve() };

				const result = store.hasFlyingPromise( functionZid, testZid, implementationZid );
				expect( result ).toBe( true );
			} );

			it( 'returns true when there is a flying promise for an implementation against all tests', () => {
				store.testResultsPromises[ `${ functionZid }:*:${ implementationZid }` ] = { flying: true, promise: Promise.resolve() };

				const result = store.hasFlyingPromise( functionZid, testZid, implementationZid );
				expect( result ).toBe( true );
			} );

			it( 'returns true when there is a flying promise for a specific test and implementation', () => {
				store.testResultsPromises[ `${ functionZid }:${ testZid }:${ implementationZid }` ] = { flying: true, promise: Promise.resolve() };

				const result = store.hasFlyingPromise( functionZid, testZid, implementationZid );
				expect( result ).toBe( true );
			} );

			it( 'returns false when the matching promise is done', () => {
				store.testResultsPromises[ `${ functionZid }:*:*` ] = { flying: false, promise: Promise.resolve() };

				const result = store.hasFlyingPromise( functionZid, testZid, implementationZid );
				expect( result ).toBe( false );
			} );

			it( 'returns false when the promise key does not match the given zids', () => {
				store.testResultsPromises[ 'Z99999:*:*' ] = { flying: true, promise: Promise.resolve() };

				const result = store.hasFlyingPromise( functionZid, testZid, implementationZid );
				expect( result ).toBe( false );
			} );

			it( 'returns false when testZid and implementationZid are absent and no wildcard key matches', () => {
				store.testResultsPromises[ `${ functionZid }:${ testZid }:${ implementationZid }` ] = {
					flying: true,
					promise: Promise.resolve()
				};

				const result = store.hasFlyingPromise( functionZid, undefined, undefined );
				expect( result ).toBe( false );
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
			const promiseKey = 'Z10000:*:*';

			it( 'should set a flying promise with the given key', async () => {
				store.setTestResultsPromise( {
					promiseKey,
					promise: Promise.resolve( 'done' )
				} );

				expect( store.testResultsPromises[ promiseKey ].flying ).toBe( true );
				await store.testResultsPromises[ promiseKey ].promise.then( ( result ) => {
					expect( result ).toBe( 'done' );
				} );
			} );

			it( 'should set a resolved promise when no promise is provided', async () => {
				store.setTestResultsPromise( {
					promiseKey
				} );

				expect( store.testResultsPromises[ promiseKey ].flying ).toBe( false );
				await store.testResultsPromises[ promiseKey ].promise.then( ( result ) => {
					expect( result ).toBe( undefined );
				} );
			} );
		} );

		describe( 'clearZTesterResults', () => {
			const functionZid = 'Z10000';
			const implementationZid = 'Z10001';
			const testerZid = 'Z10002';

			it( 'should clear all results for a function when using wildcard key', () => {
				const key1 = `${ functionZid }:${ testerZid }:${ implementationZid }`;
				const key2 = `${ functionZid }:Z10003:Z10004`;
				const key3 = `${ functionZid }:Z10005:Z10006`;
				const otherKey = `Z99999:${ testerZid }:${ implementationZid }`;
				const promiseKey = `${ functionZid }:*:*`;

				store.zTesterResults[ key1 ] = 'Z41';
				store.zTesterResults[ key2 ] = 'Z41';
				store.zTesterResults[ key3 ] = 'Z42';
				store.zTesterResults[ otherKey ] = 'Z41';
				store.zTesterMetadata[ key1 ] = metadata.metadataEmpty;
				store.zTesterMetadata[ key2 ] = metadata.metadataEmpty;
				store.zTesterMetadata[ key3 ] = metadata.metadataEmpty;
				store.testResultsPromises[ promiseKey ] = { flying: false, promise: Promise.resolve() };

				store.clearZTesterResults( promiseKey );

				expect( store.zTesterResults[ key1 ] ).toBeUndefined();
				expect( store.zTesterResults[ key2 ] ).toBeUndefined();
				expect( store.zTesterResults[ key3 ] ).toBeUndefined();
				expect( store.zTesterResults[ otherKey ] ).toBe( 'Z41' );
				expect( promiseKey in store.testResultsPromises ).toBe( false );
			} );

			it( 'should only clear results matching a specific tester wildcard key', () => {
				const matchingKey = `${ functionZid }:${ testerZid }:Z10004`;
				const nonMatchingKey = `${ functionZid }:Z10003:${ implementationZid }`;
				const promiseKey = `${ functionZid }:${ testerZid }:*`;

				store.zTesterResults[ matchingKey ] = 'Z41';
				store.zTesterResults[ nonMatchingKey ] = 'Z41';
				store.zTesterMetadata[ matchingKey ] = metadata.metadataEmpty;
				store.zTesterMetadata[ nonMatchingKey ] = metadata.metadataEmpty;
				store.testResultsPromises[ promiseKey ] = { flying: false, promise: Promise.resolve() };

				store.clearZTesterResults( promiseKey );

				expect( store.zTesterResults[ matchingKey ] ).toBeUndefined();
				expect( store.zTesterMetadata[ matchingKey ] ).toBeUndefined();
				expect( store.zTesterResults[ nonMatchingKey ] ).toBe( 'Z41' );
				expect( store.zTesterMetadata[ nonMatchingKey ] ).toEqual( metadata.metadataEmpty );
				expect( promiseKey in store.testResultsPromises ).toBe( false );
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
					format: 'json',
					formatversion: '2',
					uselang: 'en',
					wikilambda_perform_test_zfunction: zFunctionId,
					wikilambda_perform_test_zimplementations: zImplementations.join( '|' ),
					wikilambda_perform_test_ztesters: zTesters.join( '|' )
				}, { signal: undefined } );

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
					format: 'json',
					formatversion: '2',
					uselang: 'en',
					wikilambda_perform_test_zfunction: zFunctionId,
					wikilambda_perform_test_zimplementations: zImplementations.join( '|' ),
					wikilambda_perform_test_ztesters: zTesters.join( '|' )
				}, { signal: undefined } );

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

				expect( store.clearZTesterResults ).toHaveBeenCalledWith( 'Z10000:*:*' );
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
					format: 'json',
					formatversion: '2',
					uselang: 'en',
					wikilambda_perform_test_zfunction: zFunctionId,
					wikilambda_perform_test_zimplementations: zImplementations.join( '|' ),
					wikilambda_perform_test_ztesters: zTesters.join( '|' )
				}, { signal: undefined } );

				expect( store.clearErrors ).toHaveBeenCalled();
				expect( store.fetchZids ).not.toHaveBeenCalled();
				expect( store.setError ).toHaveBeenCalledWith( {
					errorMessage: 'Unable to run tests. Please reload.',
					errorType: 'error',
					errorId: 'tests'
				} );

				expect( Object.keys( store.zTesterResults ).length ).toEqual( 0 );

				expect( result.passing ).toBe( 0 );
			} );

			it( 'should not perform the tests if already fetching for that functionZid', () => {
				const zFunctionId = 'Z10000';
				const promiseKey = 'Z10000:*:*';

				store.testResultsPromises = {
					[ promiseKey ]: { flying: true, promise: Promise.resolve() }
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
				Object.defineProperty( store, 'getJsonObject', {
					value: () => currentObject
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
					format: 'json',
					formatversion: '2',
					uselang: 'en',
					wikilambda_perform_test_zfunction: zFunctionId,
					wikilambda_perform_test_zimplementations: [ JSON.stringify( currentObject ), 'Z10002' ].join( '|' ),
					wikilambda_perform_test_ztesters: zTesters.join( '|' )
				}, { signal: undefined } );
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
				Object.defineProperty( store, 'getJsonObject', {
					value: () => currentObject
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
					format: 'json',
					formatversion: '2',
					uselang: 'en',
					wikilambda_perform_test_zfunction: zFunctionId,
					wikilambda_perform_test_zimplementations: [ expectedEncodedObject, 'Z10002' ].join( '|' ),
					wikilambda_perform_test_ztesters: zTesters.join( '|' )
				}, { signal: undefined } );
				expect( store.clearErrors ).toHaveBeenCalled();
				expect( store.fetchZids ).toHaveBeenCalled();
			} );
		} );
	} );
} );
