/*!
 * WikiLambda unit test suite for the FunctionSelectorHelp component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { mount } = require( '@vue/test-utils' );
const FunctionSelectorHelp = require( '../../../../resources/ext.wikilambda.app/components/base/FunctionSelectorHelp.vue' );

describe( 'FunctionSelectorHelp', () => {
	/**
	 * Helper function to render the FunctionSelectorHelp component.
	 *
	 * @param {Object} props - Props to pass to the component
	 * @return {Object} Mounted wrapper
	 */
	function renderFunctionSelectorHelp( props = {} ) {
		const defaultProps = {
			returnType: 'Z6',
			returnTypeLabel: 'String'
		};
		return mount( FunctionSelectorHelp, {
			props: { ...defaultProps, ...props }
		} );
	}

	/**
	 * Opens the popover by switching the toggle button on.
	 *
	 * @param {Object} wrapper - Mounted wrapper
	 * @return {Promise<void>}
	 */
	async function openPopover( wrapper ) {
		wrapper.findComponent( { name: 'cdx-toggle-button' } ).vm.$emit( 'update:modelValue', true );
		await wrapper.vm.$nextTick();
	}

	describe( 'initial render', () => {
		it( 'renders without errors', () => {
			const wrapper = renderFunctionSelectorHelp();
			expect( wrapper.findComponent( { name: 'wl-function-selector-help' } ).exists() ).toBe( true );
		} );

		it( 'renders the toggle button with the help notice icon', () => {
			const wrapper = renderFunctionSelectorHelp();
			expect( wrapper.findComponent( { name: 'cdx-toggle-button' } ).exists() ).toBe( true );
			expect( wrapper.findComponent( { name: 'cdx-icon' } ).exists() ).toBe( true );
		} );

		it( 'keeps the popover closed by default', () => {
			const wrapper = renderFunctionSelectorHelp();
			expect( wrapper.findComponent( { name: 'cdx-popover' } ).props( 'open' ) ).toBe( false );
		} );

		it( 'uses the popover title message for the button label and the popover title', () => {
			const wrapper = renderFunctionSelectorHelp();
			expect( wrapper.findComponent( { name: 'cdx-popover' } ).props( 'title' ) )
				.toBe( 'Why some functions aren\'t listed' );
		} );
	} );

	describe( 'popover content', () => {
		it( 'renders the body message with the return type and label as parameters', async () => {
			const wrapper = renderFunctionSelectorHelp( { returnType: 'Z40', returnTypeLabel: 'Boolean' } );
			await openPopover( wrapper );

			expect( wrapper.findAll( 'p' )[ 0 ].text() ).toContain( 'Boolean (Z40)' );
		} );

		it( 'renders the learn more link via the i18n-html directive', async () => {
			const wrapper = renderFunctionSelectorHelp();
			await openPopover( wrapper );

			const paragraphs = wrapper.findAll( 'p' );
			expect( paragraphs[ paragraphs.length - 1 ].text() )
				.toContain( 'How to use a function with a different return type' );
		} );
	} );

	describe( 'toggle behaviour', () => {
		it( 'opens the popover when the toggle button is switched on', async () => {
			const wrapper = renderFunctionSelectorHelp();
			expect( wrapper.findComponent( { name: 'cdx-popover' } ).props( 'open' ) ).toBe( false );

			await openPopover( wrapper );

			expect( wrapper.findComponent( { name: 'cdx-popover' } ).props( 'open' ) ).toBe( true );
		} );

		it( 'closes the popover when the popover emits update:open', async () => {
			const wrapper = renderFunctionSelectorHelp();
			await openPopover( wrapper );
			expect( wrapper.findComponent( { name: 'cdx-popover' } ).props( 'open' ) ).toBe( true );

			wrapper.findComponent( { name: 'cdx-popover' } ).vm.$emit( 'update:open', false );
			await wrapper.vm.$nextTick();

			expect( wrapper.findComponent( { name: 'cdx-popover' } ).props( 'open' ) ).toBe( false );
		} );
	} );
} );
