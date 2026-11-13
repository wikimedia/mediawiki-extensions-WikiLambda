/*!
 * WikiLambda unit test suite for the AbstractContentFragmentOutput component.
 *
 * @copyright 2020–
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const createLabelDataMock = require( '../../helpers/getterHelpers.js' ).createLabelDataMock;
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const AbstractContentFragmentOutput = require( '../../../../resources/ext.wikilambda.app/components/abstract/AbstractContentFragmentOutput.vue' );

const keyPath = 'abstractwiki.sections.Q8776414.fragments.1';
const fragmentHash = 'somegood#';
const fragmentCall = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
	Z7K1: { Z1K1: 'Z9', Z9K1: 'Z444' }
};

describe( 'AbstractContentFragmentOutput', () => {
	let store;

	function renderOutput( props = {}, mountOptions = {} ) {
		return shallowMount( AbstractContentFragmentOutput, {
			...mountOptions,
			props: {
				keyPath,
				fragment: fragmentCall,
				fragmentHash,
				...props
			},
			global: {
				stubs: {
					'wl-abstract-fragment-status': false,
					'wl-safe-message': false,
					'cdx-message': false,
					'cdx-progress-indicator': true
				}
			}
		} );
	}

	/**
	 * Give the generated text and its box a height, because jsdom has no layout
	 *
	 * @param {number} contentHeight
	 * @param {number} clipHeight
	 */
	function mockHeights( contentHeight, clipHeight ) {
		jest.spyOn( HTMLElement.prototype, 'offsetHeight', 'get' ).mockReturnValue( contentHeight );
		jest.spyOn( HTMLElement.prototype, 'clientHeight', 'get' ).mockReturnValue( clipHeight );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getHtmlErrorMessage = jest.fn().mockReturnValue( null );
		store.getFragmentPreview = jest.fn().mockReturnValue( undefined );
		store.getPreviewLanguageZid = 'Z1002';
		store.getAbstractWikiId = 'Q42';
		store.getLabelData = createLabelDataMock( {
			Z500: 'Some unknown error'
		} );
		store.getFunctionCallLink = jest.fn().mockReturnValue( '/view/en/Z444?call=%7B%7D' );
	} );

	afterEach( () => {
		jest.restoreAllMocks();
	} );

	it( 'reads the generated text of its hash in the preview language', () => {
		renderOutput();

		expect( store.getFragmentPreview ).toHaveBeenCalledWith( fragmentHash, 'Z1002' );
	} );

	describe( 'missing and pending fragment', () => {
		it( 'shows the missing state when no generated text is stored', () => {
			const wrapper = renderOutput();

			expect( wrapper.find( '.ext-wikilambda-app-abstract-fragment-status-blank' ).text() ).toContain( 'Missing' );
		} );

		it( 'shows the pending state when the generated text is pending', () => {
			store.getFragmentPreview = jest.fn().mockReturnValue( { isLoading: false, isPending: true, html: '' } );
			const wrapper = renderOutput();

			expect( wrapper.find( '.ext-wikilambda-app-abstract-fragment-status-blank' ).text() ).toContain( 'Pending' );
		} );

		it( 'renders the fragment again on a click on retry', async () => {
			const wrapper = renderOutput();

			await wrapper.find( '.ext-wikilambda-app-abstract-fragment-status-retry' ).trigger( 'click' );

			expect( store.renderFragmentPreview ).toHaveBeenCalledWith( {
				qid: 'Q42',
				fragment: fragmentCall,
				fragmentHash,
				language: 'Z1002'
			} );
		} );

		it( 'does not render a new fragment, which has no hash yet', async () => {
			const wrapper = renderOutput( { fragmentHash: null } );

			await wrapper.find( '.ext-wikilambda-app-abstract-fragment-status-retry' ).trigger( 'click' );

			expect( store.renderFragmentPreview ).not.toHaveBeenCalled();
		} );
	} );

	it( 'shows a progress indicator while the fragment renders', () => {
		store.getFragmentPreview = jest.fn().mockReturnValue( { isLoading: true, html: '' } );
		const wrapper = renderOutput();

		expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( true );
	} );

	describe( 'failed fragment', () => {
		it( 'shows the error, a retry button and the link to Wikifunctions', () => {
			store.getFragmentPreview = jest.fn().mockReturnValue( {
				isLoading: false,
				hasError: true,
				error: { text: 'some error happened', retry: true },
				html: ''
			} );
			const wrapper = renderOutput();

			const message = wrapper.find( '.ext-wikilambda-app-abstract-fragment-status-error' );
			expect( message.text() ).toContain( 'some error happened' );
			expect( message.find( '.ext-wikilambda-app-abstract-fragment-status-retry' ).exists() ).toBe( true );
			expect( message.find( 'a' ).attributes( 'href' ) ).toBe( '/view/en/Z444?call=%7B%7D' );
		} );

		it( 'does not show the link to Wikifunctions when the rendering service is busy', () => {
			store.getFragmentPreview = jest.fn().mockReturnValue( {
				isLoading: false,
				isUnavailable: true,
				hasError: true,
				error: { text: 'busy', type: 'warning' },
				html: ''
			} );
			const wrapper = renderOutput();

			const message = wrapper.find( '.ext-wikilambda-app-abstract-fragment-status-error' );
			expect( message.text() ).toContain( 'busy' );
			expect( message.find( 'a' ).exists() ).toBe( false );
		} );
	} );

	describe( 'generated text', () => {
		beforeEach( () => {
			store.getFragmentPreview = jest.fn().mockReturnValue( {
				isLoading: false,
				hasError: false,
				html: '<p>Paris is the capital of France.</p>'
			} );
		} );

		it( 'shows the generated text in a box', () => {
			const wrapper = renderOutput();

			const html = wrapper.find( '.ext-wikilambda-app-abstract-content-fragment-output-html' );
			expect( html.html() ).toContain( '<p>Paris is the capital of France.</p>' );
		} );

		it( 'shows a white box when the fragment is selected', () => {
			const box = '.ext-wikilambda-app-abstract-content-fragment-output-box';

			expect( renderOutput().find( box ).classes() ).not.toContain(
				'ext-wikilambda-app-abstract-content-fragment-output-box--selected'
			);
			expect( renderOutput( { selected: true } ).find( box ).classes() ).toContain(
				'ext-wikilambda-app-abstract-content-fragment-output-box--selected'
			);
		} );

		it( 'initializes the references and the images of the generated text', async () => {
			const hook = mw.hook;
			const fire = jest.fn();
			mw.hook = jest.fn().mockReturnValue( { fire } );

			const wrapper = renderOutput();
			await wrapper.vm.$nextTick();

			expect( mw.hook ).toHaveBeenCalledWith( 'wikilambda.references.content' );
			expect( mw.hook ).toHaveBeenCalledWith( 'wikilambda.image.content' );
			mw.hook = hook;
		} );

		it( 'shows no box when the fragment renders no text', () => {
			store.getFragmentPreview = jest.fn().mockReturnValue( { isLoading: false, hasError: false, html: '' } );
			const wrapper = renderOutput();

			expect( wrapper.find( '.ext-wikilambda-app-abstract-content-fragment-output-box' ).exists() ).toBe( false );
		} );

		it( 'does not show "Show more" when the text fits in the box', async () => {
			mockHeights( 44, 66 );
			const wrapper = renderOutput();
			await wrapper.vm.$nextTick();

			expect( wrapper.find( '.ext-wikilambda-app-abstract-content-fragment-output-show-more' ).exists() ).toBe( false );
		} );

		it( 'cuts off a long text and shows all of it on "Show more"', async () => {
			mockHeights( 200, 66 );
			const wrapper = renderOutput();
			await wrapper.vm.$nextTick();
			const clip = () => wrapper.find( '.ext-wikilambda-app-abstract-content-fragment-output-clip' );

			expect( clip().classes() ).toContain( 'ext-wikilambda-app-abstract-content-fragment-output-clip--truncated' );

			await wrapper.find( '.ext-wikilambda-app-abstract-content-fragment-output-show-more' ).trigger( 'click' );

			expect( clip().classes() ).not.toContain( 'ext-wikilambda-app-abstract-content-fragment-output-clip--collapsed' );
			expect( wrapper.find( '.ext-wikilambda-app-abstract-content-fragment-output-show-more' ).exists() ).toBe( false );
		} );

		it( 'keeps "Show more" when the keyboard moves the focus to it', async () => {
			mockHeights( 200, 66 );
			const wrapper = renderOutput();
			await wrapper.vm.$nextTick();

			await wrapper.find( '.ext-wikilambda-app-abstract-content-fragment-output-show-more' ).trigger( 'focusin' );

			expect( wrapper.find( '.ext-wikilambda-app-abstract-content-fragment-output-show-more' ).exists() ).toBe( true );
		} );

		it( 'gives the focus to the text on "Show more", because the button goes away', async () => {
			mockHeights( 200, 66 );
			const wrapper = renderOutput( {}, { attachTo: document.body } );
			await wrapper.vm.$nextTick();

			await wrapper.find( '.ext-wikilambda-app-abstract-content-fragment-output-show-more' ).trigger( 'click' );
			await wrapper.vm.$nextTick();

			expect( document.activeElement ).toBe(
				wrapper.find( '.ext-wikilambda-app-abstract-content-fragment-output-html' ).element
			);
			wrapper.unmount();
		} );

		it( 'shows all of a long text when a link in it takes the focus', async () => {
			mockHeights( 200, 66 );
			const wrapper = renderOutput();
			await wrapper.vm.$nextTick();
			const clip = () => wrapper.find( '.ext-wikilambda-app-abstract-content-fragment-output-clip' );

			await wrapper.find( '.ext-wikilambda-app-abstract-content-fragment-output-html' ).trigger( 'focusin' );

			expect( clip().classes() ).not.toContain( 'ext-wikilambda-app-abstract-content-fragment-output-clip--collapsed' );
		} );

		it( 'shows "Show more" when the text gets longer, e.g. when an image loads', async () => {
			let onResize;
			const observe = jest.fn();
			const disconnect = jest.fn();
			global.ResizeObserver = jest.fn( ( callback ) => {
				onResize = callback;
				return { observe, disconnect };
			} );
			mockHeights( 44, 66 );
			const wrapper = renderOutput();
			await wrapper.vm.$nextTick();
			expect( observe ).toHaveBeenCalled();

			mockHeights( 200, 66 );
			onResize();
			await wrapper.vm.$nextTick();

			expect( wrapper.find( '.ext-wikilambda-app-abstract-content-fragment-output-show-more' ).exists() ).toBe( true );

			wrapper.unmount();
			expect( disconnect ).toHaveBeenCalled();
			delete global.ResizeObserver;
		} );
	} );

	describe( 'provenance popover', () => {
		beforeEach( () => {
			store.getFragmentPreview = jest.fn().mockReturnValue( {
				isLoading: false,
				hasError: false,
				html: '<p>Paris is the capital of France.</p>'
			} );
			store.getProvenanceFragment = undefined;
			store.setProvenanceFragment = jest.fn();
			store.clearFreshRequestError = jest.fn();
		} );

		it( 'does not show the popover when it is closed', () => {
			const wrapper = renderOutput();

			expect( wrapper.findComponent( { name: 'wl-abstract-preview-provenance' } ).exists() ).toBe( false );
		} );

		it( 'shows the popover, pointing at the generated text, when it is opened for this fragment', async () => {
			store.getProvenanceFragment = keyPath;
			const wrapper = renderOutput();
			await wrapper.vm.$nextTick();

			const popover = wrapper.findComponent( { name: 'wl-abstract-preview-provenance' } );
			expect( popover.props( 'open' ) ).toBe( true );
			expect( popover.props( 'anchor' ) ).toBe( wrapper.element );
		} );

		it( 'closes the popover when it asks to close', async () => {
			store.getProvenanceFragment = keyPath;
			const wrapper = renderOutput();
			await wrapper.vm.$nextTick();

			wrapper.findComponent( { name: 'wl-abstract-preview-provenance' } ).vm.$emit( 'update:open', false );

			expect( store.setProvenanceFragment ).toHaveBeenCalledWith( undefined );
			expect( store.clearFreshRequestError ).toHaveBeenCalledWith( fragmentHash, 'Z1002' );
		} );

		it( 'renders the fragment again with the latest data when the popover asks for it (T441584)', async () => {
			store.getProvenanceFragment = keyPath;
			const wrapper = renderOutput();
			await wrapper.vm.$nextTick();

			wrapper.findComponent( { name: 'wl-abstract-preview-provenance' } ).vm.$emit( 'request-fresh' );

			expect( store.requestFreshFragmentPreview ).toHaveBeenCalledWith( {
				qid: 'Q42',
				fragment: fragmentCall,
				fragmentHash,
				language: 'Z1002'
			} );
		} );

		it( 'closes the popover when the fragment changes', async () => {
			store.getProvenanceFragment = keyPath;
			const wrapper = renderOutput();

			await wrapper.setProps( { fragmentHash: 'someother#' } );

			expect( store.setProvenanceFragment ).toHaveBeenCalledWith( undefined );
		} );

		it( 'closes the popover on unmount', () => {
			store.getProvenanceFragment = keyPath;
			const wrapper = renderOutput();

			wrapper.unmount();

			expect( store.setProvenanceFragment ).toHaveBeenCalledWith( undefined );
		} );
	} );
} );
