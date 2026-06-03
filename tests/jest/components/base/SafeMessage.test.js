/*!
 * WikiLambda unit test suite for the SafeMessage component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { mount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const ErrorData = require( '../../../../resources/ext.wikilambda.app/store/classes/ErrorData.js' );
const SafeMessage = require( '../../../../resources/ext.wikilambda.app/components/base/SafeMessage.vue' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'SafeMessage', () => {
	let store;
	const errorSafe = new ErrorData( 'wikilambda-safe-error-message', [], null, 'error' );
	const errorPlainText = new ErrorData( null, [], 'Some plain error message', 'error' );
	const errorUnsafe = new ErrorData( null, [], '<b>Some unsafe error message</b>', 'error' );
	const errorWithHtml = new ErrorData(
		null,
		[],
		'List of errors<ul class="ext-wikilambda-app-suberror-list"><li class="ext-wikilambda-app-suberror-list__item">Label clash</li></ul>',
		'error'
	);

	/**
	 * Helper function to render SafeMessage component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderSafeMessage( props = {}, options = {} ) {
		return mount( SafeMessage, { props, ...options } );
	}

	beforeEach( () => {
		store = useMainStore();
		// By default, echo the input back as the "sanitised" output
		store.sanitiseHtml.mockImplementation( ( html ) => Promise.resolve( html ) );
		global.mw.message = jest.fn().mockReturnValue( {
			params: jest.fn().mockReturnValue( {
				parse: jest.fn().mockReturnValue( '<b>Some safe error message</b>' )
			} )
		} );
	} );

	it( 'renders without errors', () => {
		const wrapper = renderSafeMessage( {
			error: errorSafe
		} );

		expect( wrapper.find( 'span' ).exists() ).toBe( true );
	} );

	it( 'renders safe i18n error message as html without sanitising', () => {
		const wrapper = renderSafeMessage( {
			error: errorSafe
		} );

		expect( wrapper.find( 'span' ).exists() ).toBe( true );
		expect( wrapper.get( 'span' ).text() ).toBe( 'Some safe error message' );
		expect( wrapper.find( 'b' ).exists() ).toBe( true );
		expect( wrapper.get( 'b' ).text() ).toBe( 'Some safe error message' );
		// i18n messages are already escaped by mw.message().parse(), so they
		// don't need to go through the sanitiser
		expect( store.sanitiseHtml ).not.toHaveBeenCalled();
	} );

	it( 'renders a plain-text raw message as text without sanitising', () => {
		const wrapper = renderSafeMessage( {
			error: errorPlainText
		} );

		expect( wrapper.get( 'span' ).text() ).toBe( 'Some plain error message' );
		// No HTML markup, so no need to call the sanitiser
		expect( store.sanitiseHtml ).not.toHaveBeenCalled();
	} );

	it( 'sanitises a raw message that contains html and renders the result', async () => {
		const wrapper = renderSafeMessage( {
			error: errorWithHtml
		} );

		expect( store.sanitiseHtml ).toHaveBeenCalledWith( errorWithHtml.errorMessage );
		await waitFor( () => expect( wrapper.find( 'ul.ext-wikilambda-app-suberror-list' ).exists() ).toBe( true ) );
		expect( wrapper.find( 'li.ext-wikilambda-app-suberror-list__item' ).text() ).toBe( 'Label clash' );
	} );

	it( 'renders the sanitised version of a raw message, stripping unsafe markup', async () => {
		store.sanitiseHtml.mockResolvedValue( 'Some unsafe error message' );
		const wrapper = renderSafeMessage( {
			error: errorUnsafe
		} );

		await waitFor( () => expect( wrapper.get( 'span' ).text() ).toBe( 'Some unsafe error message' ) );
		expect( wrapper.find( 'b' ).exists() ).toBe( false );
	} );

	it( 'falls back to escaped text when sanitisation returns nothing', async () => {
		store.sanitiseHtml.mockResolvedValue( '' );
		const wrapper = renderSafeMessage( {
			error: errorUnsafe
		} );

		// Escaped, so the markup is shown as text and not rendered as an element
		await waitFor( () => expect( wrapper.get( 'span' ).text() ).toBe( '<b>Some unsafe error message</b>' ) );
		expect( wrapper.find( 'b' ).exists() ).toBe( false );
	} );

	it( 'falls back to escaped text when sanitisation fails', async () => {
		store.sanitiseHtml.mockRejectedValue( new Error( 'sanitiser failed' ) );
		const wrapper = renderSafeMessage( {
			error: errorUnsafe
		} );

		await waitFor( () => expect( wrapper.get( 'span' ).text() ).toBe( '<b>Some unsafe error message</b>' ) );
		expect( wrapper.find( 'b' ).exists() ).toBe( false );
	} );
} );
