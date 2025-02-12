/*!
 * WikiLambda unit test suite for the utilsMixins mixin
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { methods: utilsMixins } = require( '../../../resources/ext.wikilambda.app/mixins/utilsMixins.js' );

describe( 'utilsMixins', () => {
	describe( 'getNestedProperty', () => {
		it( 'should return the value of a nested property', () => {
			const obj = {
				a: {
					b: {
						c: 'value'
					}
				}
			};
			const result = utilsMixins.getNestedProperty( obj, 'a.b.c' );
			expect( result ).toBe( 'value' );
		} );

		it( 'should return undefined for non-existent property', () => {
			const obj = { a: {} };
			const result = utilsMixins.getNestedProperty( obj, 'a.b.c' );
			expect( result ).toBeUndefined();
		} );

		it( 'should return undefined if any part of the path is null or undefined', () => {
			const obj = { a: null };
			const result = utilsMixins.getNestedProperty( obj, 'a.b.c' );
			expect( result ).toBeUndefined();
		} );

		it( 'should handle an empty path', () => {
			const obj = { a: 'value' };
			const result = utilsMixins.getNestedProperty( obj, '' );
			expect( result ).toBeUndefined();
		} );

		it( 'should handle a non-object initial value', () => {
			const result = utilsMixins.getNestedProperty( null, 'a.b.c' );
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

			const result = utilsMixins.createConnectedItemsChangesSummaryMessage( message, ZIDs );

			expect( result ).toBe( 'Mocked message' );
			expect( mw.message ).toHaveBeenCalledWith( message );
			expect( mw.language.listToText ).toHaveBeenCalledWith( ZIDs );
			expect( mw.message( message ).params ).toHaveBeenCalledWith( [ '' ] );
		} );

		it( 'should correctly format the message with multiple ZIDs', () => {
			const message = 'wikilambda-updated-implementations-approved-summary';
			const ZIDs = [ 'Z1', 'Z2', 'Z3' ];

			const result = utilsMixins.createConnectedItemsChangesSummaryMessage( message, ZIDs );

			expect( result ).toBe( 'Mocked message' );
			expect( mw.message ).toHaveBeenCalledWith( message );
			expect( mw.language.listToText ).toHaveBeenCalledWith( ZIDs );
			expect( mw.message( message ).params ).toHaveBeenCalledWith( [ 'Z1, Z2, Z3' ] );
		} );
	} );
} );
