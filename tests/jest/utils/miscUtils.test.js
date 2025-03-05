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
	arraysAreEqual
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
			textMock = jest.fn().mockReturnValue( 'Mocked message' );
			paramsMock = jest.fn().mockReturnValue( { text: textMock } );
			messageMock = jest.fn().mockReturnValue( { params: paramsMock } );

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
} );
