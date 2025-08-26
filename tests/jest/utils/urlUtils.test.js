/*!
 * WikiLambda unit test suite for the urlUtils mixin
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const {
	getParameterByName,
	removeHashFromURL,
	isLinkCurrentPath,
	generateViewUrl,
	generateEditUrl
} = require( '../../../resources/ext.wikilambda.app/utils/urlUtils.js' );
const { mockWindowLocation } = require( '../fixtures/location.js' );

describe( 'urlUtils', () => {
	describe( 'getParameterByName', () => {
		it( 'should return the value of the specified parameter from the URL', () => {
			mockWindowLocation( 'http://example.com/?name=John&age=30' );

			const nameValue = getParameterByName( 'name' );
			const ageValue = getParameterByName( 'age' );

			expect( nameValue ).toBe( 'John' );
			expect( ageValue ).toBe( '30' );
		} );

		it( 'should return null if the specified parameter is not found in the URL', () => {
			mockWindowLocation( 'http://example.com/?name=John&age=30' );

			const nonExistingValue = getParameterByName( 'email' );

			expect( nonExistingValue ).toBeNull();

		} );
	} );

	describe( 'removeHashFromURL', () => {
		it( 'should remove the hash from the URL', () => {
			delete window.location;
			mockWindowLocation( 'http://example.com#section1' );

			// Call the removeHashFromURL method
			removeHashFromURL();

			// Assert the window.location.href has been updated and replaceState was called
			expect( window.history.replaceState ).toHaveBeenCalledWith( null, '', 'http://example.com/' );
			expect( window.location.href ).toBe( 'http://example.com/#section1' );
		} );
	} );
	describe( 'isLinkCurrentPath', () => {
		it( 'should return true if the link href is the same as the current path', () => {
			mockWindowLocation( 'http://example.com/path/to/page' );

			// Call the isLinkCurrentPath method with a link href that matches the current path
			const isCurrentPath = isLinkCurrentPath( 'http://example.com/path/to/page' );

			// Assert that the method returns true
			expect( isCurrentPath ).toBe( true );

		} );

		it( 'should return false if the link href is different from the current path', () => {
			mockWindowLocation( 'http://example.com/path/to/page' );

			// Call the isLinkCurrentPath method with a link href that does not match the current path
			const isCurrentPath = isLinkCurrentPath( 'http://example.com/other/page' );

			// Assert that the method returns false
			expect( isCurrentPath ).toBe( false );

		} );
	} );

	describe( 'generateViewUrl', () => {
		it( 'should generate a relative URL without baseUrl', () => {
			const url = generateViewUrl( {
				langCode: 'en',
				zid: 'Z123',
				params: { foo: 'bar' }
			} );
			expect( url ).toBe( '/view/en/Z123?foo=bar' );
		} );

		it( 'should generate a full URL with baseUrl', () => {
			const url = generateViewUrl( {
				langCode: 'en',
				zid: 'Z123',
				params: { foo: 'bar' },
				baseUrl: 'http://example.com'
			} );
			expect( url ).toBe( 'http://example.com/view/en/Z123?foo=bar' );
		} );

		it( 'should handle empty params correctly', () => {
			const url = generateViewUrl( {
				langCode: 'en',
				zid: 'Z123'
			} );
			expect( url ).toBe( '/view/en/Z123' );
		} );

		it( 'should ensure no double slashes in the URL with baseUrl', () => {
			const url = generateViewUrl( {
				langCode: 'en',
				zid: 'Z123',
				baseUrl: 'http://example.com/'
			} );
			expect( url ).toBe( 'http://example.com/view/en/Z123' );
		} );
	} );

	describe( 'generateEditUrl', () => {
		it( 'should generate edit URL with hash for scroll navigation', () => {
			const url = generateEditUrl( {
				langCode: 'en',
				zid: 'Z123',
				hash: 'main-Z2K2-Z12K1'
			} );

			expect( url ).toBe( '/wiki/Z123?uselang=en&action=edit#main-Z2K2-Z12K1' );
		} );

		it( 'should generate edit URL without hash when not provided', () => {
			const url = generateEditUrl( {
				langCode: 'en',
				zid: 'Z123'
			} );

			expect( url ).toBe( '/wiki/Z123?uselang=en&action=edit' );
		} );

		it( 'should combine hash with additional query parameters', () => {
			const url = generateEditUrl( {
				langCode: 'en',
				zid: 'Z123',
				params: { debug: '1', test: 'true' },
				hash: 'main-Z2K2-Z12K1'
			} );

			expect( url ).toBe( '/wiki/Z123?uselang=en&action=edit&debug=1&test=true#main-Z2K2-Z12K1' );
		} );

		it( 'should work with base URL and hash', () => {
			const url = generateEditUrl( {
				langCode: 'en',
				zid: 'Z123',
				hash: 'main-Z2K2-Z12K1',
				baseUrl: 'https://wikifunctions.org'
			} );

			expect( url ).toBe( 'https://wikifunctions.org/wiki/Z123?uselang=en&action=edit#main-Z2K2-Z12K1' );
		} );
	} );
} );
