/*!
 * WikiLambda unit test suite for the FunctionSearchNextSteps component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const FunctionSearchNextSteps = require( '../../../../resources/ext.wikilambda.app/components/base/FunctionSearchNextSteps.vue' );

describe( 'FunctionSearchNextSteps', () => {
	const defaultConfigGetter = mw.config.get.getMockImplementation();

	/**
	 * Helper function to render the FunctionSearchNextSteps component.
	 *
	 * @param {Object} props - Props to pass to the component
	 * @return {Object} Mounted wrapper
	 */
	function renderNextSteps( props = {} ) {
		return shallowMount( FunctionSearchNextSteps, { props } );
	}

	/**
	 * Returns the link of the given next step.
	 *
	 * @param {Object} wrapper - Mounted wrapper
	 * @param {string} id - The id of the next step: suggest, create or view-all
	 * @return {Object} The link wrapper
	 */
	function getLink( wrapper, id ) {
		return wrapper.get( `[data-testid="function-search-next-step-${ id }"] a` );
	}

	beforeEach( () => {
		mw.config.get.mockImplementation( ( name ) => (
			name === 'wgWikifunctionsBaseUrl' ? 'https://www.wikifunctions.org' : defaultConfigGetter( name )
		) );
	} );

	afterEach( () => {
		mw.config.get.mockImplementation( defaultConfigGetter );
	} );

	it( 'shows the three next steps, each with a link and a description', () => {
		const wrapper = renderNextSteps();

		const items = wrapper.findAll( '.ext-wikilambda-app-function-search-next-steps__item' );
		expect( items.length ).toBe( 3 );
		expect( items[ 0 ].get( 'a' ).text() ).toBe( 'Suggest to the community' );
		expect( items[ 0 ].text() ).toContain( 'Start a discussion and ask contributors to help build the function' );
		expect( items[ 1 ].get( 'a' ).text() ).toBe( 'Create the function' );
		expect( items[ 1 ].text() ).toContain( 'Help grow Wikifunctions by creating the function yourself' );
		expect( items[ 2 ].get( 'a' ).text() ).toBe( 'View all functions' );
		expect( items[ 2 ].text() ).toContain( 'Explore the full list of functions in Wikifunctions' );
	} );

	it( 'links to the page of suggested functions on the current wiki', () => {
		const wrapper = renderNextSteps();

		expect( getLink( wrapper, 'suggest' ).attributes( 'href' ) ).toBe( '/wiki/Project:Suggested_functions' );
	} );

	it( 'links to the function editor on Wikifunctions', () => {
		const wrapper = renderNextSteps();

		expect( getLink( wrapper, 'create' ).attributes( 'href' ) )
			.toBe( 'https://www.wikifunctions.org/wiki/Special:CreateObject?zid=Z8' );
	} );

	it( 'links to the functions on Wikifunctions that return the given type', () => {
		const wrapper = renderNextSteps( { returnType: 'Z6' } );

		expect( getLink( wrapper, 'view-all' ).attributes( 'href' ) )
			.toBe( 'https://www.wikifunctions.org/wiki/Special:ListObjectsByType/Z8?return_type=Z6' );
	} );

	it( 'links to the useful functions on the current wiki for a field that expects HTML', () => {
		const wrapper = renderNextSteps( { returnType: 'Z89' } );

		const link = getLink( wrapper, 'useful' );
		expect( link.attributes( 'href' ) ).toBe( '/wiki/Project:Useful_functions_for_article_composition' );
		expect( link.text() ).toBe( 'See useful functions' );
		expect( wrapper.get( '[data-testid="function-search-next-step-useful"]' ).text() )
			.toContain( 'Browse functions that work well for writing articles' );
		expect( wrapper.find( '[data-testid="function-search-next-step-view-all"]' ).exists() ).toBe( false );
	} );

	it( 'does not link to the useful functions for a field that expects another type', () => {
		const wrapper = renderNextSteps( { returnType: 'Z6' } );

		expect( wrapper.find( '[data-testid="function-search-next-step-useful"]' ).exists() ).toBe( false );
	} );

	it( 'links to all the functions on Wikifunctions without a return type', () => {
		const wrapper = renderNextSteps();

		expect( getLink( wrapper, 'view-all' ).attributes( 'href' ) )
			.toBe( 'https://www.wikifunctions.org/wiki/Special:ListObjectsByType/Z8' );
	} );

	it( 'opens the links in a new tab', () => {
		const wrapper = renderNextSteps();

		const links = wrapper.findAll( 'a' );
		expect( links.length ).toBe( 3 );
		links.forEach( ( link ) => {
			expect( link.attributes( 'target' ) ).toBe( '_blank' );
		} );
	} );
} );
