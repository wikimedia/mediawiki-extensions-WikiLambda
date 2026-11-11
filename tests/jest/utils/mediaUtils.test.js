/*!
 * WikiLambda unit test suite for the mediaUtils util
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const {
	matchesMedia,
	prefersReducedMotion
} = require( '../../../resources/ext.wikilambda.app/utils/mediaUtils.js' );

describe( 'mediaUtils', () => {
	let originalMatchMedia;

	beforeEach( () => {
		originalMatchMedia = window.matchMedia;
	} );

	afterEach( () => {
		window.matchMedia = originalMatchMedia;
	} );

	/**
	 * Make window.matchMedia match only the given query.
	 *
	 * @param {string} matchingQuery
	 */
	function mockMatchMedia( matchingQuery ) {
		window.matchMedia = jest.fn( ( query ) => ( { matches: query === matchingQuery } ) );
	}

	describe( 'matchesMedia', () => {
		it( 'returns true when the query matches', () => {
			mockMatchMedia( '(min-width: 1px)' );

			expect( matchesMedia( '(min-width: 1px)' ) ).toBe( true );
		} );

		it( 'returns false when the query does not match', () => {
			mockMatchMedia( '(min-width: 1px)' );

			expect( matchesMedia( '(max-width: 1px)' ) ).toBe( false );
		} );

		it( 'returns false when the browser has no matchMedia', () => {
			window.matchMedia = undefined;

			expect( matchesMedia( '(min-width: 1px)' ) ).toBe( false );
		} );
	} );

	describe( 'prefersReducedMotion', () => {
		it( 'returns true when the user asks for less movement', () => {
			mockMatchMedia( '(prefers-reduced-motion: reduce)' );

			expect( prefersReducedMotion() ).toBe( true );
		} );

		it( 'returns false otherwise', () => {
			mockMatchMedia( '(min-width: 1120px)' );

			expect( prefersReducedMotion() ).toBe( false );
		} );
	} );
} );
