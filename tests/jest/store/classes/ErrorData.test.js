/*!
 * WikiLambda unit test suite for the ErrorData class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const ErrorData = require( '../../../../resources/ext.wikilambda.app/store/classes/ErrorData.js' );

describe( 'ErrorData class', () => {

	describe( 'ErrorData constructor', () => {
		it( 'returns an ErrorData object with message key and response', () => {
			const messageKey = 'error';
			const params = [ 'param1', 'param2' ];
			const message = 'message';
			const type = 'error';

			const errorData = new ErrorData( messageKey, params, message, type );

			expect( errorData.messageKey ).toBe( messageKey );
			expect( errorData.params ).toEqual( params );
			expect( errorData.message ).toBe( message );
			expect( errorData.type ).toBe( type );
		} );
	} );

	describe( 'isSafeForHtml', () => {
		it( 'returns true if error message is built from a i18n message key', () => {
			const errorData = new ErrorData( 'message-key', [], null, 'error' );
			expect( errorData.isSafeForHtml ).toBe( true );
		} );

		it( 'returns false if error message comes from a raw unsafe text', () => {
			const errorData = new ErrorData( null, [], 'Some arbitrary error message', 'error' );
			expect( errorData.isSafeForHtml ).toBe( false );
		} );
	} );

	describe( 'errorMessage', () => {
		beforeEach( () => {
			global.mw.message = jest.fn().mockReturnValue( {
				params: jest.fn().mockReturnValue( {
					parse: jest.fn().mockReturnValue( 'Some safe error message' )
				} )
			} );
		} );

		it( 'returns parsed i18n message', () => {
			const errorData = new ErrorData( 'message-key', [], null, 'error' );
			expect( errorData.errorMessage ).toBe( 'Some safe error message' );
		} );

		it( 'returns raw string message', () => {
			const errorData = new ErrorData( null, [], 'Some arbitrary error message', 'error' );
			expect( errorData.errorMessage ).toBe( 'Some arbitrary error message' );
		} );
	} );

	describe( 'buildErrorData', () => {
		it( 'returns input if already ErrorData', () => {
			const errorPayload = new ErrorData( 'message-key', [], null, 'error' );
			const errorData = ErrorData.buildErrorData( errorPayload );
			expect( errorData ).toEqual( errorPayload );
		} );

		it( 'builds safe ErrorData object if it has error message key', () => {
			const errorPayload = {
				errorMessageKey: 'some-message-key'
			};
			const errorData = ErrorData.buildErrorData( errorPayload );
			expect( errorData.messageKey ).toBe( 'some-message-key' );
			expect( errorData.message ).toBe( null );
			expect( errorData.params ).toEqual( [] );
			expect( errorData.type ).toBe( 'error' );
			expect( errorData.isSafeForHtml ).toBe( true );
		} );

		it( 'builds unsafe ErrorData object if it has no error message key', () => {
			const errorPayload = {
				errorMessage: 'Some message'
			};
			const errorData = ErrorData.buildErrorData( errorPayload );
			expect( errorData.messageKey ).toBe( null );
			expect( errorData.message ).toBe( 'Some message' );
			expect( errorData.params ).toEqual( [] );
			expect( errorData.type ).toBe( 'error' );
			expect( errorData.isSafeForHtml ).toBe( false );
		} );
	} );
} );
