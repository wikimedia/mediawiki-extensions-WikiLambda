/*!
 * WikiLambda unit test suite for the HTML validation utilities.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const {
	allowedTags,
	allowedCustomElements,
	customElementDefinitions,
	findHtmlProblems
} = require( '../../../resources/ext.wikilambda.app/utils/htmlValidationUtils.js' );

describe( 'htmlValidationUtils', () => {

	describe( 'allowedTags', () => {
		it( 'includes the custom elements', () => {
			for ( const name of allowedCustomElements ) {
				expect( allowedTags.has( name ) ).toBe( true );
			}
			expect( allowedCustomElements.has( 'ext-wikilambda-image' ) ).toBe( true );
		} );
	} );

	describe( 'customElementDefinitions', () => {
		it( 'gives each element a description and a detail', () => {
			// An unknown message key gives an empty string, so check the length.
			for ( const definition of customElementDefinitions.values() ) {
				expect( typeof definition.description ).toBe( 'string' );
				expect( definition.description.length ).toBeGreaterThan( 0 );
				expect( typeof definition.detail ).toBe( 'string' );
				expect( definition.detail.length ).toBeGreaterThan( 0 );
			}
		} );
	} );

	describe( 'findHtmlProblems', () => {
		it( 'returns nothing for allowed HTML', () => {
			expect( findHtmlProblems( '<div class="a"><b>bold</b></div>' ) ).toEqual( [] );
		} );

		it( 'flags a disallowed tag, and its closing tag', () => {
			const problems = findHtmlProblems( '<script>alert(1)</script>' );

			expect( problems ).toHaveLength( 2 );
			for ( const problem of problems ) {
				expect( problem.severity ).toBe( 'error' );
				expect( problem.message ).toBe( 'Usage of <script> tags is not allowed.' );
			}
			expect( problems[ 0 ].index ).toBe( 0 );
			expect( problems[ 0 ].length ).toBe( '<script>'.length );
		} );

		it( 'does not flag an allowed tag', () => {
			expect( findHtmlProblems( '<b>bold</b>' ) ).toEqual( [] );
		} );

		it( 'flags an event handler attribute', () => {
			const problems = findHtmlProblems( '<div onclick="alert(1)">x</div>' );

			expect( problems ).toHaveLength( 1 );
			expect( problems[ 0 ].severity ).toBe( 'error' );
			expect( problems[ 0 ].message ).toBe( "Event handler attribute 'onclick' is not allowed." );
		} );

		it( 'flags a javascript: URL in an href attribute', () => {
			const problems = findHtmlProblems( '<a href="javascript:alert(1)">x</a>' );

			expect( problems ).toHaveLength( 1 );
			expect( problems[ 0 ].message ).toBe(
				'JavaScript URLs are not allowed in attributes like href or src.'
			);
		} );

		it( 'flags a javascript: URL in a CSS url()', () => {
			const problems = findHtmlProblems(
				'<div style="background-image: url(javascript:evil())">x</div>'
			);

			expect( problems ).toHaveLength( 1 );
			expect( problems[ 0 ].message ).toBe( 'JavaScript URLs are not allowed in CSS url().' );
		} );

		it( 'reports a custom element as information, not as an error', () => {
			const problems = findHtmlProblems( '<ext-wikilambda-image mid="M1" size="thumb" />' );

			expect( problems ).toHaveLength( 1 );
			expect( problems[ 0 ].severity ).toBe( 'info' );
			expect( problems[ 0 ].index ).toBe( 0 );
			expect( problems[ 0 ].message ).toBe(
				customElementDefinitions.get( 'ext-wikilambda-image' ).description
			);
		} );

		it( 'gives the offset of every match', () => {
			const text = '<p>ok</p><script>bad</script>';
			const problems = findHtmlProblems( text );

			expect( problems ).toHaveLength( 2 );
			expect( text.slice( problems[ 0 ].index, problems[ 0 ].index + problems[ 0 ].length ) )
				.toBe( '<script>' );
			expect( text.slice( problems[ 1 ].index, problems[ 1 ].index + problems[ 1 ].length ) )
				.toBe( '</script>' );
		} );

		it( 'starts each call from the beginning of the text', () => {
			const text = '<script>bad</script>';

			expect( findHtmlProblems( text ) ).toEqual( findHtmlProblems( text ) );
		} );
	} );
} );
