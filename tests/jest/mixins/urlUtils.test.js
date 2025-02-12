/*!
 * WikiLambda unit test suite for the urlUtils mixin
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { methods: urlUtils } = require( '../../../resources/ext.wikilambda.app/mixins/urlUtils.js' );

describe( 'urlUtils', () => {
	describe( 'getParameterByName', () => {
		it( 'should return the value of the specified parameter from the URL', () => {
			// Mock the mw.Uri function
			global.mw = {
				Uri: jest.fn().mockImplementation( () => ( {
					query: {
						name: 'John',
						age: '30'
					}
				} ) )
			};

			// Call the getParameterByName method
			const nameValue = urlUtils.getParameterByName( 'name' );
			const ageValue = urlUtils.getParameterByName( 'age' );

			// Assert the returned values
			expect( nameValue ).toBe( 'John' );
			expect( ageValue ).toBe( '30' );
		} );

		it( 'should return null if the specified parameter is not found in the URL', () => {
			// Mock the mw.Uri function
			global.mw = {
				Uri: jest.fn().mockImplementation( () => ( {
					query: {
						name: 'John',
						age: '30'
					}
				} ) )
			};

			// Call the getParameterByName method with a non-existing parameter
			const nonExistingValue = urlUtils.getParameterByName( 'email' );

			// Assert the returned value is null
			expect( nonExistingValue ).toBeNull();
		} );
	} );

	describe( 'removeHashFromURL', () => {
		it( 'should remove the hash from the URL', () => {
			// Mock the window.location and history.replaceState
			const originalLocation = window.location;
			const mockReplaceState = jest.fn();
			delete window.location;
			window.location = {
				href: 'http://example.com#section1',
				hash: '#section1'
			};
			history.replaceState = mockReplaceState;

			// Call the removeHashFromURL method
			urlUtils.removeHashFromURL();

			// Assert the window.location.href has been updated and replaceState was called
			expect( mockReplaceState ).toHaveBeenCalledWith( null, '', 'http://example.com' );
			expect( window.location.href ).toBe( 'http://example.com#section1' );

			// Restore the original window.location object
			window.location = originalLocation;
		} );
	} );
	describe( 'isLinkCurrentPath', () => {
		it( 'should return true if the link href is the same as the current path', () => {
			// Mock the window.location
			const originalLocation = window.location;
			delete window.location;
			window.location = {
				origin: 'http://example.com',
				pathname: '/path/to/page',
				href: 'http://example.com/path/to/page'
			};

			// Call the isLinkCurrentPath method with a link href that matches the current path
			const isCurrentPath = urlUtils.isLinkCurrentPath( 'http://example.com/path/to/page' );

			// Assert that the method returns true
			expect( isCurrentPath ).toBe( true );

			// Restore the original window.location object
			window.location = originalLocation;
		} );

		it( 'should return false if the link href is different from the current path', () => {
			// Mock the window.location
			const originalLocation = window.location;
			delete window.location;
			window.location = {
				origin: 'http://example.com',
				pathname: '/path/to/page',
				href: 'http://example.com/path/to/page'
			};

			// Call the isLinkCurrentPath method with a link href that does not match the current path
			const isCurrentPath = urlUtils.isLinkCurrentPath( 'http://example.com/other/page' );

			// Assert that the method returns false
			expect( isCurrentPath ).toBe( false );

			// Restore the original window.location object
			window.location = originalLocation;
		} );
	} );
} );
