/*!
 * WikiLambda unit test suite for the miscUtils util
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const {
	getNestedProperty,
	createConnectedItemsChangesSummaryMessage,
	arraysAreEqual,
	throttle,
	sha256,
	stabilize
} = require( '../../../resources/ext.wikilambda.app/utils/miscUtils.js' );

describe( 'miscUtils', () => {
	describe( 'getNestedProperty', () => {
		it( 'should return the value of a nested property', () => {
			const obj = {
				a: {
					b: {
						c: 'value'
					}
				}
			};
			const result = getNestedProperty( obj, 'a.b.c' );
			expect( result ).toBe( 'value' );
		} );

		it( 'should return undefined for non-existent property', () => {
			const obj = { a: {} };
			const result = getNestedProperty( obj, 'a.b.c' );
			expect( result ).toBeUndefined();
		} );

		it( 'should return undefined if any part of the path is null or undefined', () => {
			const obj = { a: null };
			const result = getNestedProperty( obj, 'a.b.c' );
			expect( result ).toBeUndefined();
		} );

		it( 'should handle an empty path', () => {
			const obj = { a: 'value' };
			const result = getNestedProperty( obj, '' );
			expect( result ).toBeUndefined();
		} );

		it( 'should handle a non-object initial value', () => {
			const result = getNestedProperty( null, 'a.b.c' );
			expect( result ).toBeUndefined();
		} );
	} );

	describe( 'createConnectedItemsChangesSummaryMessage', () => {
		beforeAll( () => {
			// Mocking the global mw object
			const textMock = jest.fn().mockReturnValue( 'Mocked message' );
			const paramsMock = jest.fn().mockReturnValue( { text: textMock } );
			const messageMock = jest.fn().mockReturnValue( { params: paramsMock } );

			global.mw = {
				message: messageMock,
				language: {
					listToText: jest.fn().mockImplementation( ( ZIDs ) => ZIDs.join( ', ' ) )
				}
			};
		} );

		afterAll( () => {
			// Clean up the global mw mock
			delete global.mw;
		} );

		it( 'should correctly format the message with empty ZID array', () => {
			const message = 'wikilambda-updated-implementations-approved-summary';
			const ZIDs = [];

			const result = createConnectedItemsChangesSummaryMessage( message, ZIDs );

			expect( result ).toBe( 'Mocked message' );
			expect( mw.message ).toHaveBeenCalledWith( message );
			expect( mw.language.listToText ).toHaveBeenCalledWith( ZIDs );
			expect( mw.message( message ).params ).toHaveBeenCalledWith( [ '' ] );
		} );

		it( 'should correctly format the message with multiple ZIDs', () => {
			const message = 'wikilambda-updated-implementations-approved-summary';
			const ZIDs = [ 'Z1', 'Z2', 'Z3' ];

			const result = createConnectedItemsChangesSummaryMessage( message, ZIDs );

			expect( result ).toBe( 'Mocked message' );
			expect( mw.message ).toHaveBeenCalledWith( message );
			expect( mw.language.listToText ).toHaveBeenCalledWith( ZIDs );
			expect( mw.message( message ).params ).toHaveBeenCalledWith( [ 'Z1, Z2, Z3' ] );
		} );
	} );

	describe( 'arraysAreEqual', () => {
		it( 'should return true for two empty arrays', () => {
			const arr1 = [];
			const arr2 = [];
			const result = arraysAreEqual( arr1, arr2 );
			expect( result ).toBe( true );
		} );

		it( 'should return true for two arrays with the same elements in the same order', () => {
			const arr1 = [ 1, 2, 3 ];
			const arr2 = [ 1, 2, 3 ];
			const result = arraysAreEqual( arr1, arr2 );
			expect( result ).toBe( true );
		} );

		it( 'should return false for two arrays with different lengths', () => {
			const arr1 = [ 1, 2, 3 ];
			const arr2 = [ 1, 2 ];
			const result = arraysAreEqual( arr1, arr2 );
			expect( result ).toBe( false );
		} );

		it( 'should return false for two arrays with the same elements in different orders', () => {
			const arr1 = [ 1, 2, 3 ];
			const arr2 = [ 3, 2, 1 ];
			const result = arraysAreEqual( arr1, arr2 );
			expect( result ).toBe( false );
		} );

		it( 'should return false for two arrays with different elements', () => {
			const arr1 = [ 1, 2, 3 ];
			const arr2 = [ 4, 5, 6 ];
			const result = arraysAreEqual( arr1, arr2 );
			expect( result ).toBe( false );
		} );
	} );

	describe( 'throttle', () => {
		jest.useFakeTimers();

		it( 'should call the function at most once within the delay period', () => {
			const func = jest.fn();
			const throttledFunc = throttle( func, 1000 );

			throttledFunc();
			throttledFunc();
			throttledFunc();

			expect( func ).toHaveBeenCalledTimes( 1 );

			jest.advanceTimersByTime( 1000 );
			throttledFunc();

			expect( func ).toHaveBeenCalledTimes( 2 );
		} );

		it( 'should call the function with the correct arguments', () => {
			const func = jest.fn();
			const throttledFunc = throttle( func, 1000 );

			throttledFunc( 'arg1', 'arg2' );

			expect( func ).toHaveBeenCalledWith( 'arg1', 'arg2' );
		} );
	} );

	describe( 'sha256', () => {
		it( 'should return a hex string of length 64', async () => {
			const result = await sha256( 'hello' );
			expect( result ).toHaveLength( 64 );
			expect( result ).toMatch( /^[0-9a-f]+$/ );
		} );

		it( 'should return the correct hash for a known input', async () => {
			const result = await sha256( 'hello' );
			expect( result ).toBe( '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824' );
		} );

		it( 'should return different hashes for different inputs', async () => {
			const result1 = await sha256( 'hello' );
			const result2 = await sha256( 'world' );
			expect( result1 ).not.toBe( result2 );
		} );

		it( 'should return the same hash for the same input', async () => {
			const result1 = await sha256( 'hello' );
			const result2 = await sha256( 'hello' );
			expect( result1 ).toBe( result2 );
		} );

		it( 'should handle an empty string', async () => {
			const result = await sha256( '' );
			expect( result ).toHaveLength( 64 );
			expect( result ).toBe( 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' );
		} );
	} );

	describe( 'stabilize', () => {
		it( 'should return primitives as-is', () => {
			expect( stabilize( 'hello' ) ).toBe( 'hello' );
			expect( stabilize( 42 ) ).toBe( 42 );
			expect( stabilize( true ) ).toBe( true );
			expect( stabilize( null ) ).toBe( null );
			expect( stabilize( undefined ) ).toBe( undefined );
		} );

		it( 'should sort object keys alphabetically', () => {
			const input = { z: 1, a: 2, m: 3 };
			const result = stabilize( input );
			expect( Object.keys( result ) ).toEqual( [ 'a', 'm', 'z' ] );
		} );

		it( 'should recursively sort nested object keys', () => {
			const input = { z: { b: 1, a: 2 }, a: 3 };
			const result = stabilize( input );
			expect( Object.keys( result ) ).toEqual( [ 'a', 'z' ] );
			expect( Object.keys( result.z ) ).toEqual( [ 'a', 'b' ] );
		} );

		it( 'should iterate through arrays and recurse', () => {
			const input = [ { z: 1, a: 2 }, { y: 3, b: 4 } ];
			const result = stabilize( input );
			expect( Object.keys( result[ 0 ] ) ).toEqual( [ 'a', 'z' ] );
			expect( Object.keys( result[ 1 ] ) ).toEqual( [ 'b', 'y' ] );
		} );

		it( 'should produce the same output for objects with different key order', () => {
			const input1 = { z: 1, a: 2 };
			const input2 = { a: 2, z: 1 };
			expect( JSON.stringify( stabilize( input1 ) ) ).toBe( JSON.stringify( stabilize( input2 ) ) );
		} );

		it( 'should handle empty objects and arrays', () => {
			expect( stabilize( {} ) ).toEqual( {} );
			expect( stabilize( [] ) ).toEqual( [] );
		} );
	} );
} );
