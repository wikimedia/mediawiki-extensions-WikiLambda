/*!
 * WikiLambda unit test suite for the AbstractPreviewFragment component.
 *
 * @copyright 2020–
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const createLabelDataMock = require( '../../helpers/getterHelpers.js' ).createLabelDataMock;
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const AbstractPreviewFragment = require( '../../../../resources/ext.wikilambda.app/components/abstract/AbstractPreviewFragment.vue' );

const keyPath = 'abstractwiki.sections.Q8776414.fragments.1';
const fragmentHash = 'somegood#';

describe( 'AbstractPreviewFragment', () => {
	let store;
	let wrapper;

	function renderFragment( props = {} ) {
		return shallowMount( AbstractPreviewFragment, {
			props: {
				keyPath,
				fragmentHash,
				...props
			},
			global: {
				stubs: {
					'cdx-message': false,
					'cdx-progress-indicator': true
				}
			}
		} );
	}

	beforeEach( () => {
		store = useMainStore();

		store.getFragmentPreview = jest.fn().mockReturnValue( undefined );
		store.getPreviewLanguageZid = 'Z1002';
		store.getLabelData = createLabelDataMock( {
			Z500: 'Some unknown error'
		} );

		store.getHighlightedFragment = undefined;
		store.setHighlightedFragment = jest.fn();
	} );

	it( 'renders without errors', () => {
		wrapper = renderFragment();
		expect( wrapper.find( '.ext-wikilambda-app-abstract-preview-fragment' ).exists() ).toBe( true );
	} );

	it( 'calls getFragmentPreview with fragmentHash and preview language', () => {
		wrapper = renderFragment();
		expect( store.getFragmentPreview ).toHaveBeenCalledWith( fragmentHash, 'Z1002' );
	} );

	// Missing fragment
	// ================

	it( 'renders missing state when no preview is stored', () => {
		wrapper = renderFragment();
		expect( wrapper.text() ).toContain( 'Missing' );
	} );

	it( 'renders retry button when no preview is stored', () => {
		wrapper = renderFragment();
		const retryButton = wrapper.find( '.ext-wikilambda-app-abstract-preview-fragment-retry' );
		expect( retryButton.exists() ).toBe( true );
	} );

	it( 'emits retry when retry button is clicked on missing fragmen', async () => {
		wrapper = renderFragment();
		const retryButton = wrapper.find( '.ext-wikilambda-app-abstract-preview-fragment-retry' );
		await retryButton.trigger( 'click' );
		expect( wrapper.emitted( 'retry' ) ).toHaveLength( 1 );
	} );

	// Pending fragmnet
	// ================

	it( 'renders pending label when preview is pending', () => {
		store.getFragmentPreview = jest.fn().mockReturnValue( {
			isLoading: false,
			isPending: true,
			hasError: false,
			html: ''
		} );

		wrapper = renderFragment();

		expect( wrapper.text() ).toContain( 'Pending' );
	} );

	it( 'renders retry button when preview is pending', () => {
		store.getFragmentPreview = jest.fn().mockReturnValue( {
			isLoading: false,
			isPending: true,
			hasError: false,
			html: ''
		} );

		wrapper = renderFragment();

		const retryButton = wrapper.find( '.ext-wikilambda-app-abstract-preview-fragment-retry' );
		expect( retryButton.exists() ).toBe( true );
	} );

	it( 'emits retry when retry button is clicked on pending fragment', async () => {
		store.getFragmentPreview = jest.fn().mockReturnValue( {
			isLoading: false,
			isPending: true,
			hasError: false,
			html: ''
		} );

		wrapper = renderFragment();

		const retryButton = wrapper.find( '.ext-wikilambda-app-abstract-preview-fragment-retry' );
		await retryButton.trigger( 'click' );
		expect( wrapper.emitted( 'retry' ) ).toHaveLength( 1 );
	} );

	// Loading
	// =======

	it( 'renders progress indicator when preview is being rendered', () => {
		store.getFragmentPreview = jest.fn().mockReturnValue( {
			isLoading: true,
			isPending: false,
			hasError: false,
			html: ''
		} );

		wrapper = renderFragment();

		const loader = wrapper.find( '.ext-wikilambda-app-abstract-preview-fragment-loading' );
		expect( loader.exists() ).toBe( true );
	} );

	// Ready fragment
	// ==============

	it( 'renders fragment output html when preview is available', async () => {
		store.getFragmentPreview = jest.fn().mockReturnValue( {
			html: '<p>A very bold fragment</p>',
			hasError: false,
			error: null,
			isLoading: false
		} );

		wrapper = renderFragment();

		await waitFor( () => {
			expect( wrapper.find( '.ext-wikilambda-app-abstract-preview-fragment-html' ).exists() ).toBe( true );
		} );

		expect( wrapper.html() ).toContain( '<p>A very bold fragment</p>' );
	} );

	it( 'renders error message when preview has text error', async () => {
		store.getFragmentPreview = jest.fn().mockReturnValue( {
			html: '',
			hasError: true,
			error: {
				text: 'some error happened'
			},
			isLoading: false,
			isPending: false
		} );

		wrapper = renderFragment();

		await waitFor( () => {
			expect( wrapper.find( '.ext-wikilambda-app-abstract-preview-fragment-error' ).exists() ).toBe( true );
		} );

		expect( wrapper.text() ).toContain( 'some error happened' );
	} );

	it( 'renders warning message when preview has warning', async () => {
		store.getFragmentPreview = jest.fn().mockReturnValue( {
			html: '',
			hasError: true,
			error: {
				type: 'warning',
				text: 'some warning'
			},
			isLoading: false,
			isPending: false
		} );

		wrapper = renderFragment();

		const message = wrapper.findComponent( { name: 'cdx-message' } );
		await waitFor( () => expect( message.exists() ).toBe( true ) );
		expect( message.props( 'type' ) ).toBe( 'warning' );
	} );

	it( 'renders retry button when error has retry=true', async () => {
		store.getFragmentPreview = jest.fn().mockReturnValue( {
			html: '',
			hasError: true,
			error: {
				retry: true,
				type: 'error',
				text: 'Some error'
			},
			isLoading: false,
			isPending: false
		} );

		wrapper = renderFragment();

		const message = wrapper.findComponent( { name: 'cdx-message' } );
		await waitFor( () => expect( message.exists() ).toBe( true ) );
		expect( message.find( 'button' ).text() ).toBe( 'Retry' );

		// Click button and check emitted event
		message.find( 'button' ).trigger( 'click' );
		expect( wrapper.emitted( 'retry' ) ).toHaveLength( 1 );
	} );

	it( 'renders error message when preview has i18n+zerror error', async () => {
		store.getLabelData = jest.fn().mockImplementation( ( zid ) => ( {
			label: zid === 'Z555' ? 'Some zerror happened' : zid
		} ) );
		store.getFragmentPreview = jest.fn().mockReturnValue( {
			html: '',
			hasError: true,
			error: {
				code: 'apierror-abstractwiki_run_fragment-returned-zerror',
				zid: 'Z555'
			},
			isLoading: false,
			isPending: false
		} );

		wrapper = renderFragment();

		await waitFor( () => {
			expect( wrapper.find( '.ext-wikilambda-app-abstract-preview-fragment-error' ).exists() ).toBe( true );
		} );

		expect( wrapper.text() ).toContain( 'Wikifunctions returned a failed response: Some zerror happened' );
	} );

	it( 'emits retry when fragment preview becomes blank', async () => {
		store.getFragmentPreview = jest.fn().mockReturnValue( {
			html: '<em>Old fragment in italics</em>',
			hasError: false,
			error: null,
			isBlank: false,
			isLoading: false,
			isPending: false
		} );

		wrapper = renderFragment();

		expect( wrapper.emitted( 'retry' ) ).toBeFalsy();

		store.getFragmentPreview = jest.fn().mockReturnValue( {
			isBlank: true, /* changed! */
			isLoading: false
		} );

		await waitFor( () => expect( wrapper.emitted( 'retry' ) ).toHaveLength( 1 ) );
	} );

	// Highlight
	// =========

	describe( 'highlight fragments', () => {
		it( 'adds highlight on pointer enter', async () => {
			wrapper = renderFragment();
			const fragment = wrapper.find( '.ext-wikilambda-app-abstract-preview-fragment' );

			await fragment.trigger( 'pointerenter' );

			expect( store.setHighlightedFragment ).toHaveBeenCalledWith( keyPath );
		} );

		it( 'removes highlight on pointer leave', async () => {
			wrapper = renderFragment();
			const fragment = wrapper.find( '.ext-wikilambda-app-abstract-preview-fragment' );

			await fragment.trigger( 'pointerleave' );

			expect( store.setHighlightedFragment ).toHaveBeenCalledWith( undefined );
		} );

		it( 'unsets highlight on focus and blur', async () => {
			wrapper = renderFragment();
			const fragment = wrapper.find( '.ext-wikilambda-app-abstract-preview-fragment' );

			await fragment.trigger( 'focus' );
			await fragment.trigger( 'blur' );

			expect( store.setHighlightedFragment ).toHaveBeenLastCalledWith( undefined );
		} );

		it( 'removes highlight on unmount', () => {
			wrapper = renderFragment();

			wrapper.unmount();

			expect( store.setHighlightedFragment ).toHaveBeenCalledWith( undefined );
		} );
	} );
} );
