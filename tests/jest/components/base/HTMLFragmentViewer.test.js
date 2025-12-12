/*!
 * WikiLambda unit test suite for the HTMLFragmentViewer base component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const HTMLFragmentViewer = require( '../../../../resources/ext.wikilambda.app/components/base/HTMLFragmentViewer.vue' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'HTMLFragmentViewer', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.sanitiseHtml.mockResolvedValue( '' );
	} );

	/**
	 * Helper function to render HTMLFragmentViewer component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderHTMLFragmentViewer( props = {}, options = {} ) {
		const defaultProps = {
			html: '<p>Test HTML</p>',
			toggleLabel: 'Test Label'
		};
		const defaultOptions = {
			global: {
				stubs: {
					...options?.stubs
				}
			}
		};
		return shallowMount( HTMLFragmentViewer, {
			props: { ...defaultProps, ...props },
			...defaultOptions
		} );
	}

	describe( 'initial render', () => {
		it( 'renders the component without errors', () => {
			const wrapper = renderHTMLFragmentViewer();
			expect( wrapper.find( '.ext-wikilambda-app-html-fragment-viewer' ).exists() ).toBe( true );
		} );

		it( 'displays the correct toggle label', () => {
			const toggleLabel = 'Show rendered HTML';
			const wrapper = renderHTMLFragmentViewer( { toggleLabel }, { stubs: { CdxToggleSwitch: false, CdxLabel: false } } );

			const toggle = wrapper.findComponent( { name: 'cdx-toggle-switch' } );
			expect( toggle.exists() ).toBe( true );
			expect( toggle.text() ).toContain( toggleLabel );
		} );

		it( 'shows rendered HTML by default', async () => {
			const html = '<p>Test content</p>';
			const sanitizedHtml = '<p>Test content</p>';
			store.sanitiseHtml.mockResolvedValueOnce( sanitizedHtml );

			const wrapper = renderHTMLFragmentViewer( { html } );

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-html-fragment-viewer__rendered' ).exists() ).toBe( true );
			} );
			expect( wrapper.findComponent( { name: 'code-editor' } ).exists() ).toBe( false );
		} );

		it( 'displays progress indicator while sanitizing', async () => {
			const html = '<p>Test</p>';
			let resolveSanitize;
			const sanitizePromise = new Promise( ( resolve ) => {
				resolveSanitize = resolve;
			} );
			store.sanitiseHtml.mockReturnValueOnce( sanitizePromise );

			const wrapper = renderHTMLFragmentViewer( { html } );

			await waitFor( () => {
				const progressIndicator = wrapper.findComponent( { name: 'cdx-progress-indicator' } );
				expect( progressIndicator.exists() ).toBe( true );
			} );

			resolveSanitize( '<p>Test</p>' );
			await waitFor( () => {
				expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false );
			} );
		} );
	} );

	describe( 'toggle functionality', () => {
		it( 'shows code editor when toggle is switched to raw view', async () => {
			const html = '<p>Test</p>';
			store.sanitiseHtml.mockResolvedValueOnce( '<p>Test</p>' );

			const wrapper = renderHTMLFragmentViewer( { html } );

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-html-fragment-viewer__rendered' ).exists() ).toBe( true );
			} );

			const toggle = wrapper.findComponent( { name: 'cdx-toggle-switch' } );
			await toggle.vm.$emit( 'update:model-value', false );

			await waitFor( () => {
				const editor = wrapper.findComponent( { name: 'code-editor' } );
				expect( editor.exists() ).toBe( true );
				expect( editor.props( 'value' ) ).toBe( html );
				expect( editor.props( 'readOnly' ) ).toBe( true );
				expect( editor.props( 'disabled' ) ).toBe( true );
			} );
		} );

		it( 'shows rendered HTML when toggle is switched to rendered view', async () => {
			const html = '<p>Test</p>';
			store.sanitiseHtml.mockResolvedValue( '<p>Test</p>' );

			const wrapper = renderHTMLFragmentViewer( { html } );

			// Start with rendered view
			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-html-fragment-viewer__rendered' ).exists() ).toBe( true );
			} );

			// Switch to raw view
			const toggle = wrapper.findComponent( { name: 'cdx-toggle-switch' } );
			await toggle.vm.$emit( 'update:model-value', false );

			await waitFor( () => {
				expect( wrapper.findComponent( { name: 'code-editor' } ).exists() ).toBe( true );
			} );

			// Switch back to rendered view
			await toggle.vm.$emit( 'update:model-value', true );

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-html-fragment-viewer__rendered' ).exists() ).toBe( true );
			} );
		} );
	} );

	describe( 'sanitization', () => {
		it( 'sanitizes HTML when component is mounted with rendered view', async () => {
			const html = '<script>alert("xss")</script><p>Safe</p>';
			const sanitizedHtml = '<p>Safe</p>';
			store.sanitiseHtml.mockResolvedValue( sanitizedHtml );

			renderHTMLFragmentViewer( { html } );

			await waitFor( () => {
				expect( store.sanitiseHtml ).toHaveBeenCalledWith( html );
			} );
		} );

		it( 'sanitizes HTML when switching to rendered view', async () => {
			const html = '<p>Test</p>';
			store.sanitiseHtml.mockResolvedValue( '<p>Test</p>' );

			const wrapper = renderHTMLFragmentViewer( { html } );

			// Switch to raw view first
			const toggle = wrapper.findComponent( { name: 'cdx-toggle-switch' } );
			await toggle.vm.$emit( 'update:model-value', false );
			jest.clearAllMocks();

			// Switch back to rendered view
			await toggle.vm.$emit( 'update:model-value', true );

			await waitFor( () => {
				expect( store.sanitiseHtml ).toHaveBeenCalledWith( html );
			} );
		} );
	} );
} );
