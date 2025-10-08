/*!
 * WikiLambda unit test suite for the LanguageSelector standalone component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' );
const { mount, shallowMount } = require( '@vue/test-utils' );

const { mockLanguages } = require( '../fixtures/mocks.js' );
const { mockWindowLocation, restoreWindowLocation } = require( '../fixtures/location.js' );
const LanguageSelector = require( '../../../resources/ext.wikilambda.languageselector/components/LanguageSelector.vue' );
const { buildUrl } = require( '../helpers/urlHelpers.js' );
const Constants = require( '../../../resources/ext.wikilambda.app/Constants.js' );

describe( 'LanguageSelector', () => {
	let getMock;

	function renderLanguageSelector( props = {}, options = {} ) {
		return mount( LanguageSelector, {
			props,
			...options
		} );
	}

	function renderLanguageSelectorShallow( props = {}, options = {} ) {
		return shallowMount( LanguageSelector, {
			props,
			...options
		} );
	}

	beforeEach( () => {
		// Mock mw.config relevant variables
		mw.config = {
			get: jest.fn( ( param ) => {
				if ( param === 'wgUserLanguage' ) {
					return 'en';
				}
				if ( param === 'wgUserLanguageName' ) {
					return 'English';
				}
				return undefined;
			} )
		};

		mockWindowLocation( buildUrl( `/wiki/${ Constants.PATHS.RUN_FUNCTION_TITLE }` ) );

		// Mock mw.Api().get().then( )
		getMock = jest.fn( () => ( {
			then: jest.fn( ( thenFunction ) => thenFunction( mockLanguages ) )
		} ) );
		mw.Api = jest.fn( () => ( {
			get: getMock
		} ) );
	} );

	afterEach( () => {
		restoreWindowLocation();
		mw.config = null;
		mw.Api = null;
	} );

	it( 'renders without errors', () => {
		const wrapper = renderLanguageSelectorShallow();
		expect( wrapper.find( '.ext-wikilambda-language-selector' ).exists() ).toBe( true );
	} );

	it( 'renders toggle button with language name', () => {
		const wrapper = renderLanguageSelector();
		const button = wrapper.find( '.ext-wikilambda-language-selector__trigger' );
		expect( button.text() ).toBe( 'English' );
	} );

	it( 'shows search dialog when clicking on toggle button', async () => {
		const wrapper = renderLanguageSelector();

		// Assert that dialog is initially hidden
		expect( wrapper.find( '.ext-wikilambda-language-selector__dropdown--visible' ).exists() ).toBe( false );

		// Click language button
		const button = wrapper.find( '.ext-wikilambda-language-selector__trigger' );
		button.trigger( 'click' );

		// Assert that dialog is now visible
		await waitFor( () => expect( wrapper.find( '.ext-wikilambda-language-selector__dropdown--visible' ).exists() ).toBe( true ) );
	} );

	it( 'closes search dialog when clicking outside', async () => {
		const wrapper = renderLanguageSelector();

		// Assert that dialog is initially hidden
		expect( wrapper.find( '.ext-wikilambda-language-selector__dropdown--visible' ).exists() ).toBe( false );

		// Click language button
		const button = wrapper.find( '.ext-wikilambda-language-selector__trigger' );
		button.trigger( 'click' );

		// Assert that dialog is now visible
		await waitFor( () => expect( wrapper.find( '.ext-wikilambda-language-selector__dropdown--visible' ).exists() ).toBe( true ) );

		// Click outside the dialog
		const clickEvent = new MouseEvent( 'click', {
			bubbles: true,
			cancelable: true,
			view: window
		} );
		document.dispatchEvent( clickEvent );

		// Assert that dialog is now hidden
		await waitFor( () => expect( wrapper.find( '.ext-wikilambda-language-selector__dropdown--visible' ).exists() ).toBe( false ) );
	} );

	it( 'keeps the search dialog visble', async () => {
		const wrapper = renderLanguageSelector();

		// Assert that dialog is initially hidden
		expect( wrapper.find( '.ext-wikilambda-language-selector__dropdown--visible' ).exists() ).toBe( false );

		// Click language button
		wrapper.get( '.ext-wikilambda-language-selector__trigger' ).trigger( 'click' );

		// Assert that dialog is now visible
		await waitFor( () => expect( wrapper.find( '.ext-wikilambda-language-selector__dropdown--visible' ).exists() ).toBe( true ) );

		// Click the button again
		wrapper.get( '.ext-wikilambda-language-selector__trigger' ).trigger( 'click' );

		// Assert that dialog is still visible
		await waitFor( () => expect( wrapper.find( '.ext-wikilambda-language-selector__dropdown--visible' ).exists() ).toBe( true ) );

		// Focus on the lookup
		wrapper.get( '.ext-wikilambda-language-selector__lookup' ).trigger( 'focus' );

		// Assert that dialog is still visible
		await waitFor( () => expect( wrapper.find( '.ext-wikilambda-language-selector__dropdown--visible' ).exists() ).toBe( true ) );
	} );

	it( 'triggers language lookup', async () => {
		const wrapper = renderLanguageSelector();

		// Click language button
		wrapper.get( '.ext-wikilambda-language-selector__trigger' ).trigger( 'click' );

		// Wait for lookup to be found
		await waitFor( () => expect( wrapper.find( '.ext-wikilambda-language-selector__lookup' ).exists() ).toBe( true ) );

		// Input substring 'ita' in the lookup
		const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
		lookup.vm.$emit( 'update:input-value', 'ita' );

		// Assert that the lookup triggers a fetch to the languageinfo meta query API
		await waitFor( () => expect( getMock ).toHaveBeenLastCalledWith( {
			action: 'query',
			format: 'json',
			formatversion: '2',
			liprop: 'code|name|autonym',
			meta: 'languageinfo',
			uselang: 'en'
		} ) );
	} );

	it( 'does not trigger language lookup under two chars', async () => {
		const wrapper = renderLanguageSelector();

		// Click language button
		wrapper.get( '.ext-wikilambda-language-selector__trigger' ).trigger( 'click' );

		// Wait for lookup to be found
		await waitFor( () => expect( wrapper.find( '.ext-wikilambda-language-selector__lookup' ).exists() ).toBe( true ) );

		// Input substring 'ita' in the lookup
		const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
		lookup.vm.$emit( 'update:input-value', 'i' );

		// Assert that the lookup triggers a fetch to the languageinfo meta query API
		await waitFor( () => expect( getMock ).not.toHaveBeenCalled() );
	} );

	it( 'filters the language lookup response', async () => {
		const wrapper = renderLanguageSelector();

		// Click language button
		wrapper.get( '.ext-wikilambda-language-selector__trigger' ).trigger( 'click' );

		// Wait for lookup to be found
		await waitFor( () => {
			expect( wrapper.find( '.ext-wikilambda-language-selector__lookup' ).exists() ).toBe( true );
		} );

		// Assert that the lookup results are empty
		expect( wrapper.vm.lookupResults ).toEqual( [] );

		// Input substring 'ita' in the lookup
		const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
		lookup.vm.$emit( 'update:input-value', 'ita' );

		await waitFor( () => expect( getMock ).toHaveBeenCalled() );

		// Assert that the lookup shows the filtered results
		await waitFor( () => {
			const options = wrapper.findAll( '.cdx-menu-item' );
			expect( options ).toHaveLength( 3 );
			expect( options[ 0 ].text() ).toBe( 'Italian' );
			expect( options[ 1 ].text() ).toBe( 'Neapolitan' );
			expect( options[ 2 ].text() ).toBe( 'Occitan' );
		} );

		// Clear the lookup
		lookup.vm.$emit( 'update:input-value', '' );

		// Assert that the lookup is cleared (no options shown)
		await waitFor( () => {
			const options = wrapper.findAll( '.cdx-menu-item' );
			expect( options ).toHaveLength( 1 );
			expect( options[ 0 ].classes() ).toContain( 'cdx-menu__no-results' );
		} );
	} );

	describe( 'redirects', () => {

		it( 'does not redirect when selecting current language', async () => {
			const wrapper = renderLanguageSelector();

			// Click language button
			wrapper.get( '.ext-wikilambda-language-selector__trigger' ).trigger( 'click' );

			// Wait for lookup to be found
			await waitFor( () => expect( wrapper.find( '.ext-wikilambda-language-selector__lookup' ).exists() ).toBe( true ) );

			// Selects option 'en' in the lookup
			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:selected', 'en' );

			// Assert that dialog is now closed
			await waitFor( () => expect( wrapper.find( '.ext-wikilambda-language-selector__dropdown--visible' ).exists() ).toBe( false ) );

			// Assert that the page location hasn't changed (no redirect)
			// The test environment uses a different base URL
			expect( window.location.href ).toBe( 'http://localhost/wiki/Special:RunFunction' );
		} );

		it( 'redirects to view/language/zid page', async () => {
			const currentPath = '/view/en/Z12345';
			mockWindowLocation( buildUrl( currentPath ) );

			const wrapper = renderLanguageSelector();

			expect( wrapper.vm.currentPath ).toBe( currentPath );
			expect( wrapper.vm.isViewPath ).toBe( true );

			// Click language button
			wrapper.get( '.ext-wikilambda-language-selector__trigger' ).trigger( 'click' );

			// Wait for lookup to be found
			await waitFor( () => expect( wrapper.find( '.ext-wikilambda-language-selector__lookup' ).exists() ).toBe( true ) );

			// Selects option 'it' in the lookup
			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:selected', 'it' );

			await waitFor( () => expect( window.location.href ).toEqual( '/view/it/Z12345' ) );
		} );

		it( 'redirects to ?uselang=lang page', async () => {
			const currentPath = '/wiki/Z12345';
			mockWindowLocation( buildUrl( currentPath ) );

			const wrapper = renderLanguageSelector();

			expect( wrapper.vm.currentPath ).toBe( currentPath );
			expect( wrapper.vm.isViewPath ).toBe( false );

			// Click language button
			wrapper.get( '.ext-wikilambda-language-selector__trigger' ).trigger( 'click' );

			// Wait for lookup to be found
			await waitFor( () => expect( wrapper.find( '.ext-wikilambda-language-selector__lookup' ).exists() ).toBe( true ) );

			// Selects option 'it' in the lookup
			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:selected', 'it' );

			await waitFor( () => expect( window.location.href ).toEqual( '/wiki/Z12345?uselang=it' ) );
		} );
	} );
} );
