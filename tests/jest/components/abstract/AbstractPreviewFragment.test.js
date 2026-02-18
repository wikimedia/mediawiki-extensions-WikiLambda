/*!
 * WikiLambda unit test suite for the AbstractPreviewFragment component.
 *
 * @copyright 2020–
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const AbstractPreviewFragment = require( '../../../../resources/ext.wikilambda.app/components/abstract/AbstractPreviewFragment.vue' );

const keyPath = 'abstractwiki.sections.Q8776414.fragments.1';

const fragmentCall = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
	Z7K1: { Z1K1: 'Z9', Z9K1: 'Z444' }
};

describe( 'AbstractPreviewFragment', () => {
	let store;
	let wrapper;

	function renderFragment() {
		return shallowMount( AbstractPreviewFragment, {
			props: {
				keyPath,
				fragment: fragmentCall
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

		store.getAbstractWikiId = 'Q42';
		store.getUserLangZid = 'Z1002';
		store.getFragmentPreview = jest.fn().mockReturnValue( undefined );

		store.getHighlightedFragment = undefined;
		store.renderFragmentPreview = jest.fn().mockResolvedValue();
		store.setHighlightedFragment = jest.fn();

		jest.useFakeTimers().setSystemTime( new Date( '2023-07-26T00:00:00Z' ) );
	} );

	afterEach( () => {
		// Unmount component after running each test, so that there
		// are no dangling unresolved promises that affect next test!
		wrapper.unmount();
	} );

	it( 'renders without errors', () => {
		wrapper = renderFragment();

		expect( wrapper.find( '.ext-wikilambda-app-abstract-preview-fragment' ).exists() ).toBe( true );
	} );

	it( 'renders progress indicator when preview is being rendered', () => {
		wrapper = renderFragment();

		const loader = wrapper.find( '.ext-wikilambda-app-abstract-preview-fragment-loading' );

		expect( loader.exists() ).toBe( true );
	} );

	it( 'generates the fragment preview on mount (async)', () => {
		wrapper = renderFragment();

		expect( store.renderFragmentPreview ).toHaveBeenCalledWith( {
			keyPath,
			fragment: fragmentCall,
			qid: 'Q42',
			language: 'Z1002',
			date: '2023-07-26',
			isAsync: true
		} );
	} );

	it( 'renders fragment output html when preview is available', async () => {
		store.getFragmentPreview = jest.fn().mockReturnValue( {
			html: '<p>A very bold fragment</p>',
			hasError: false,
			error: null,
			isLoading: false,
			isDirty: false
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
			isDirty: false
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
			isDirty: false
		} );

		wrapper = renderFragment();

		const message = wrapper.findComponent( { name: 'cdx-message' } );
		await waitFor( () => expect( message.exists() ).toBe( true ) );
		expect( message.props( 'type' ) ).toBe( 'warning' );
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
			isDirty: false
		} );

		wrapper = renderFragment();

		await waitFor( () => {
			expect( wrapper.find( '.ext-wikilambda-app-abstract-preview-fragment-error' ).exists() ).toBe( true );
		} );

		expect( wrapper.text() ).toContain( 'Wikifunctions returned a failed response: Some zerror happened' );
	} );

	it( 'rerenders preview when fragment preview becomes dirty', async () => {
		store.getFragmentPreview = jest.fn().mockReturnValue( {
			html: '<em>Old fragment in italics</em>',
			hasError: false,
			error: null,
			isDirty: false,
			isLoading: false
		} );

		wrapper = renderFragment();

		store.getFragmentPreview = jest.fn().mockReturnValue( {
			html: '<em>Old fragment in italics</em>',
			hasError: false,
			error: null,
			isDirty: true,
			isLoading: false
		} );

		await waitFor( () => expect( store.renderFragmentPreview ).toHaveBeenCalledTimes( 1 ) );

		expect( store.renderFragmentPreview ).toHaveBeenCalledWith( {
			keyPath,
			fragment: fragmentCall,
			qid: 'Q42',
			language: 'Z1002',
			date: '2023-07-26',
			isAsync: false
		} );
	} );

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
