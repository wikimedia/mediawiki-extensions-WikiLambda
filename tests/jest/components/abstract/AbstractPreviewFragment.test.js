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
		store.getAbstractWikiId = 'Q42';
		store.getUserLangCode = 'en';
		store.getZObjectByKeyPath = jest.fn().mockReturnValue( {
			Z1K1: 'Z7',
			Z7K1: 'Z10000',
			Z10000K1: { Z1K1: 'Z18', Z18K1: 'Z825K1' },
			Z10000K2: { Z1K1: 'Z18', Z18K1: 'Z825K2' },
			Z10000K3: { Z1K1: 'Z18', Z18K1: 'Z825K3' }
		} );

		store.getHighlightedFragment = undefined;
		store.setHighlightedFragment = jest.fn();
		store.getSelectedFragment = undefined;
		store.setSelectedFragment = jest.fn();
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

		const button = message.find( '.ext-wikilambda-app-abstract-preview-fragment-retry' );
		expect( button.text() ).toBe( 'Retry' );

		// Click button and check emitted event
		button.trigger( 'click' );
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

	it( 'renders replicate in Wikifunctions link when fragment fails', async () => {

		jest.useFakeTimers();
		jest.setSystemTime( new Date( '2026-08-31T12:00:00Z' ) );

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
		const link = message.find( '.ext-wikilambda-app-abstract-preview-fragment-replicate' );
		expect( link.text() ).toBe( 'View details in Wikifunctions' );

		const href = link.attributes( 'href' );
		const urlParams = new URLSearchParams( href.split( '?' )[ 1 ] );
		const callObject = JSON.parse( urlParams.get( 'call' ) );

		// Check url:
		// language code from getUserLangCode, zid from fragment function call
		expect( href ).toContain( '/view/en/Z10000' );
		// Z825K1 has been replaced with reference to getAbstractWikiId
		// Z825K2 has been replaced with getPreviewLanguageZid
		// Z825K3 has been replaced with function call to date parser
		expect( callObject ).toEqual( {
			Z1K1: 'Z7',
			Z7K1: 'Z10000',
			Z10000K1: { Z1K1: 'Z6091', Z6091K1: 'Q42' },
			Z10000K2: 'Z1002',
			Z10000K3: {
				Z1K1: 'Z7',
				Z7K1: 'Z20808',
				Z20808K1: '2026-08-31',
				Z20808K2: 'Z1002'
			}
		} );

		jest.useRealTimers();
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

		it( 'sets highlight when the focus moves into the fragment', async () => {
			wrapper = renderFragment();
			const fragment = wrapper.find( '.ext-wikilambda-app-abstract-preview-fragment' );

			await fragment.trigger( 'focusin' );

			expect( store.setHighlightedFragment ).toHaveBeenCalledWith( keyPath );
		} );

		it( 'unsets highlight when the focus leaves the fragment', async () => {
			wrapper = renderFragment();
			const fragment = wrapper.find( '.ext-wikilambda-app-abstract-preview-fragment' );

			await fragment.trigger( 'focusin' );
			await fragment.trigger( 'focusout' );

			expect( store.setHighlightedFragment ).toHaveBeenLastCalledWith( undefined );
		} );

		it( 'removes highlight on unmount', () => {
			wrapper = renderFragment();

			wrapper.unmount();

			expect( store.setHighlightedFragment ).toHaveBeenCalledWith( undefined );
		} );
	} );

	// Selection
	// =========

	describe( 'fragment selection', () => {
		it( 'marks itself as current when it is the selected fragment', () => {
			store.getSelectedFragment = keyPath;

			wrapper = renderFragment();
			const fragment = wrapper.find( '.ext-wikilambda-app-abstract-preview-fragment' );

			expect( fragment.attributes( 'aria-current' ) ).toBe( 'true' );
		} );

		it( 'is not current when another fragment is selected', () => {
			store.getSelectedFragment = 'abstractwiki.sections.Q8776414.fragments.99';

			wrapper = renderFragment();
			const fragment = wrapper.find( '.ext-wikilambda-app-abstract-preview-fragment' );

			expect( fragment.attributes( 'aria-current' ) ).toBeUndefined();
		} );

		it( 'selects the fragment on click', async () => {
			wrapper = renderFragment();
			const fragment = wrapper.find( '.ext-wikilambda-app-abstract-preview-fragment' );

			await fragment.trigger( 'click' );

			expect( store.setSelectedFragment ).toHaveBeenCalledWith( keyPath );
		} );

		it( 'moves itself into view when it becomes the selected fragment', async () => {
			wrapper = renderFragment();
			const scrollIntoView = jest.fn();
			wrapper.find( '.ext-wikilambda-app-abstract-preview-fragment' )
				.element.scrollIntoView = scrollIntoView;

			store.getSelectedFragment = keyPath;
			await wrapper.vm.$nextTick();

			expect( scrollIntoView ).toHaveBeenCalledWith( expect.objectContaining( {
				block: 'nearest',
				inline: 'nearest'
			} ) );
		} );
	} );
} );
