/*!
 * WikiLambda unit test suite for the AbstractFragmentStatus component.
 *
 * @copyright 2020–
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const AbstractFragmentStatus = require( '../../../../resources/ext.wikilambda.app/components/abstract/AbstractFragmentStatus.vue' );

const keyPath = 'abstractwiki.sections.Q8776414.fragments.1';
const fragmentHash = 'somegood#';

describe( 'AbstractFragmentStatus', () => {
	let store;

	function renderStatus() {
		return shallowMount( AbstractFragmentStatus, {
			props: { keyPath, fragmentHash },
			global: {
				stubs: {
					'wl-safe-message': false,
					'cdx-message': false
				}
			}
		} );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getHtmlErrorMessage = jest.fn().mockReturnValue( null );
		store.getFragmentPreview = jest.fn().mockReturnValue( undefined );
		store.getPreviewLanguageZid = 'Z1002';
		store.getFunctionCallLink = jest.fn().mockReturnValue( '/view/en/Z444?call=%7B%7D' );
	} );

	it( 'shows the missing state with a retry button when no generated text is stored', async () => {
		const wrapper = renderStatus();

		expect( store.getFragmentPreview ).toHaveBeenCalledWith( fragmentHash, 'Z1002' );
		expect( wrapper.find( '.ext-wikilambda-app-abstract-fragment-status-blank' ).text() ).toContain( 'Missing' );

		await wrapper.find( '.ext-wikilambda-app-abstract-fragment-status-retry' ).trigger( 'click' );
		expect( wrapper.emitted( 'retry' ) ).toHaveLength( 1 );
	} );

	it( 'shows the pending state when the generated text is pending', () => {
		store.getFragmentPreview = jest.fn().mockReturnValue( { isLoading: false, isPending: true, html: '' } );
		const wrapper = renderStatus();

		expect( wrapper.find( '.ext-wikilambda-app-abstract-fragment-status-blank' ).text() ).toContain( 'Pending' );
	} );

	it( 'shows a progress indicator while the fragment renders', () => {
		store.getFragmentPreview = jest.fn().mockReturnValue( { isLoading: true, html: '' } );
		const wrapper = renderStatus();

		expect( wrapper.find( '.ext-wikilambda-app-abstract-fragment-status-loading' ).exists() ).toBe( true );
	} );

	it( 'shows the error with a retry button and the link to Wikifunctions', async () => {
		store.getFragmentPreview = jest.fn().mockReturnValue( {
			isLoading: false,
			hasError: true,
			error: { text: 'some error happened', retry: true },
			html: ''
		} );
		const wrapper = renderStatus();

		const message = wrapper.find( '.ext-wikilambda-app-abstract-fragment-status-error' );
		expect( message.text() ).toContain( 'some error happened' );
		expect( message.find( '.ext-wikilambda-app-abstract-fragment-status-replicate' ).attributes( 'href' ) )
			.toBe( '/view/en/Z444?call=%7B%7D' );

		await message.find( '.ext-wikilambda-app-abstract-fragment-status-retry' ).trigger( 'click' );
		expect( wrapper.emitted( 'retry' ) ).toHaveLength( 1 );
	} );

	it( 'shows nothing when the generated text is ready', () => {
		store.getFragmentPreview = jest.fn().mockReturnValue( { isLoading: false, html: '<p>Text</p>' } );
		const wrapper = renderStatus();

		expect( wrapper.find( 'div' ).exists() ).toBe( false );
	} );
} );
