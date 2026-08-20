/*!
 * WikiLambda unit test suite for the FunctionUsage widget.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { mount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );

const FunctionUsage = require( '../../../../../resources/ext.wikilambda.app/components/widgets/function-usage/FunctionUsage.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'FunctionUsage', () => {
	const functionZid = 'Z10000';
	let store, getMock;

	/**
	 * Build the wikilambdafn_usage response for a set of counts.
	 *
	 * @param {Object|undefined} usage
	 * @return {Object}
	 */
	function mockUsageResponse( usage ) {
		return { query: { pages: [ Object.assign( { title: functionZid }, usage ?
			{ wikilambdafn_usage: usage } :
			{} ) ] } };
	}

	/**
	 * Find a part of one of the two counts. The number and the label are asserted
	 * separately, as the label also holds an icon.
	 *
	 * @param {Object} wrapper
	 * @param {string} key Either 'pages' or 'wikis'
	 * @param {string} part Either 'value' or 'label'
	 * @return {Object}
	 */
	function countPart( wrapper, key, part ) {
		return wrapper.find(
			`[data-testid="function-usage-${ key }"] .ext-wikilambda-app-function-usage-widget__count-${ part }`
		);
	}

	function renderFunctionUsage( props = {}, options = {} ) {
		return mount( FunctionUsage, {
			props: { functionZid, ...props },
			...options
		} );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getUserLangCode = 'en';

		getMock = jest.fn().mockResolvedValue( mockUsageResponse( { pages: 143201, wikis: 87 } ) );
		mw.Api = jest.fn( () => ( { get: getMock } ) );
	} );

	it( 'renders without errors', () => {
		const wrapper = renderFunctionUsage();

		expect( wrapper.find( '.ext-wikilambda-app-function-usage-widget' ).exists() ).toBe( true );
	} );

	it( 'shows a progress indicator until the counts arrive', () => {
		const wrapper = renderFunctionUsage();

		expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( true );
		expect( wrapper.find( '[data-testid="function-usage-pages"]' ).exists() ).toBe( false );
	} );

	it( 'requests the usage counts for the given function, cacheably', () => {
		renderFunctionUsage();

		expect( getMock ).toHaveBeenCalledWith(
			expect.objectContaining( {
				action: 'query',
				prop: 'wikilambdafn_usage',
				titles: functionZid,
				maxage: 300,
				smaxage: 300
			} ),
			expect.objectContaining( { signal: expect.anything() } )
		);
	} );

	it( 'aborts the request if unmounted before it lands', () => {
		const wrapper = renderFunctionUsage();

		wrapper.unmount();

		expect( global.abortSpy ).toHaveBeenCalled();
	} );

	it( 'shows both counts, formatted and labelled, once they arrive', async () => {
		const wrapper = renderFunctionUsage();

		await waitFor( () => {
			expect( countPart( wrapper, 'pages', 'value' ).text() ).toBe( '143,201' );
		} );
		expect( countPart( wrapper, 'pages', 'label' ).text() ).toBe( 'Pages' );
		expect( countPart( wrapper, 'wikis', 'value' ).text() ).toBe( '87' );
		expect( countPart( wrapper, 'wikis', 'label' ).text() ).toBe( 'Wikis' );
	} );

	it( 'shows zeroes for a function that nothing uses', async () => {
		getMock.mockResolvedValue( mockUsageResponse( undefined ) );
		const wrapper = renderFunctionUsage();

		await waitFor( () => {
			expect( countPart( wrapper, 'pages', 'value' ).text() ).toBe( '0' );
		} );
		expect( countPart( wrapper, 'wikis', 'value' ).text() ).toBe( '0' );
		expect( wrapper.find( '[data-testid="function-usage-error"]' ).exists() ).toBe( false );
	} );

	it( 'labels each count with its own icon', async () => {
		const wrapper = renderFunctionUsage();

		await waitFor( () => {
			expect( countPart( wrapper, 'pages', 'label' ).exists() ).toBe( true );
		} );
		expect(
			countPart( wrapper, 'pages', 'label' )
				.find( '[data-testid="mock-icon-cdxIconArticle"]' ).exists()
		).toBe( true );
		expect(
			countPart( wrapper, 'wikis', 'label' )
				.find( '[data-testid="mock-icon-cdxIconLogoWikimedia"]' ).exists()
		).toBe( true );
	} );

	it( 'shows the page count as a floor when the real total is higher', async () => {
		getMock.mockResolvedValue(
			mockUsageResponse( { pages: 1000, wikis: 87, pagesLimited: true } )
		);
		const wrapper = renderFunctionUsage();

		await waitFor( () => {
			expect( countPart( wrapper, 'pages', 'value' ).text() ).toBe( '1,000+' );
		} );
		// The wiki count is never capped, so it carries no "+".
		expect( countPart( wrapper, 'wikis', 'value' ).text() ).toBe( '87' );
	} );

	it( 'shows a message instead of the counts when the request fails', async () => {
		getMock.mockRejectedValue( 'internal_api_error' );
		const wrapper = renderFunctionUsage();

		await waitFor( () => {
			expect( wrapper.find( '[data-testid="function-usage-error"]' ).exists() ).toBe( true );
		} );
		expect( wrapper.find( '[data-testid="function-usage-pages"]' ).exists() ).toBe( false );
	} );

	it( 'links to the Special page for this function, in the user language', () => {
		const wrapper = renderFunctionUsage();

		const link = wrapper.find( '[data-testid="function-usage-details-link"]' );
		expect( link.attributes( 'href' ) ).toContain( `Special:FunctionUsage/${ functionZid }` );
		expect( link.attributes( 'href' ) ).toContain( 'uselang=en' );
	} );

	it( 'keeps the details link when the request fails', async () => {
		getMock.mockRejectedValue( 'internal_api_error' );
		const wrapper = renderFunctionUsage();

		await waitFor( () => {
			expect( wrapper.find( '[data-testid="function-usage-error"]' ).exists() ).toBe( true );
		} );
		expect( wrapper.find( '[data-testid="function-usage-details-link"]' ).exists() ).toBe( true );
	} );
} );
