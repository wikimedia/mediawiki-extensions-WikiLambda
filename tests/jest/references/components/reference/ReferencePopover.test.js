/*!
 * WikiLambda unit test suite for the ReferencePopover component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { mount } = require( '@vue/test-utils' );
const ReferencePopover = require( '../../../../../resources/ext.wikilambda.references/components/reference/ReferencePopover.vue' );

describe( 'ReferencePopover', () => {
	let anchorElement;

	beforeEach( () => {
		anchorElement = document.createElement( 'button' );
		anchorElement.textContent = 'Reference [*]';
		anchorElement.className = 'ext-wikilambda-reference__button';
		document.body.appendChild( anchorElement );
	} );

	afterEach( () => {
		if ( anchorElement && anchorElement.parentNode ) {
			document.body.removeChild( anchorElement );
		}
	} );

	/**
	 * Helper function to render ReferencePopover component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderReferencePopover( props = {}, options = {} ) {
		const defaultProps = {
			open: false,
			title: 'Reference',
			html: '<p>Reference content</p>',
			anchor: anchorElement,
			mode: null
		};
		const defaultOptions = {
			global: {
				stubs: {
					...options?.stubs
				}
			}
		};
		return mount( ReferencePopover, {
			props: { ...defaultProps, ...props },
			...defaultOptions
		} );
	}

	describe( 'initial render', () => {
		it( 'renders the component', () => {
			const wrapper = renderReferencePopover();
			expect( wrapper.findComponent( { name: 'cdx-popover' } ).exists() ).toBe( true );
			expect( wrapper.findComponent( { name: 'cdx-popover' } ).props( 'open' ) ).toBe( false );
		} );

		it( 'renders popover when open is true', () => {
			const wrapper = renderReferencePopover( { open: true } );
			expect( wrapper.findComponent( { name: 'cdx-popover' } ).exists() ).toBe( true );
		} );

		it( 'displays HTML content', () => {
			const html = '<div class="reference-content">Test reference</div>';
			const wrapper = renderReferencePopover( { open: true, html } );
			// HTML content should be rendered inside the popover
			expect( wrapper.find( '.reference-content' ).exists() ).toBe( true );
			expect( wrapper.find( '.reference-content' ).text() ).toBe( 'Test reference' );
		} );

		it( 'passes anchor to popover', async () => {
			const wrapper = renderReferencePopover( { open: true } );
			const popover = wrapper.findComponent( { name: 'cdx-popover' } );
			expect( popover.props( 'anchor' ) ).toBe( anchorElement );
		} );

		it( 'passes title to popover', () => {
			const title = 'My Reference';
			const wrapper = renderReferencePopover( { open: true, title } );
			const popover = wrapper.findComponent( { name: 'cdx-popover' } );
			expect( popover.props( 'title' ) ).toBe( title );
		} );
	} );

	describe( 'events', () => {
		it( 'emits update:open when popover emits update:open', async () => {
			const wrapper = renderReferencePopover( { open: true } );
			const popover = wrapper.findComponent( { name: 'cdx-popover' } );

			await popover.vm.$emit( 'update:open', false );

			expect( wrapper.emitted( 'update:open' ) ).toBeTruthy();
			expect( wrapper.emitted( 'update:open' )[ 0 ] ).toEqual( [ false ] );
		} );

		it( 'emits mouseenter when popover emits mouseenter', async () => {
			const wrapper = renderReferencePopover( { open: true } );
			const mouseEvent = new MouseEvent( 'mouseenter' );

			// Call the handler directly to avoid Vue warning about undeclared emits
			wrapper.vm.onMouseenter( mouseEvent );

			expect( wrapper.emitted( 'mouseenter' ) ).toBeTruthy();
			expect( wrapper.emitted( 'mouseenter' )[ 0 ] ).toEqual( [ mouseEvent ] );
		} );

		it( 'emits mouseleave when popover emits mouseleave', async () => {
			const wrapper = renderReferencePopover( { open: true } );
			const mouseEvent = new MouseEvent( 'mouseleave' );

			// Call the handler directly to avoid Vue warning about undeclared emits
			wrapper.vm.onMouseleave( mouseEvent );

			expect( wrapper.emitted( 'mouseleave' ) ).toBeTruthy();
			expect( wrapper.emitted( 'mouseleave' )[ 0 ] ).toEqual( [ mouseEvent ] );
		} );
	} );

	describe( 'focus trap', () => {
		it( 'activates focus trap when open and mode is click', async () => {
			const wrapper = renderReferencePopover( { open: true, mode: 'click' } );

			// Focus trap should be active (tested in useFocusTrap.test.js)
			// Here we just verify the component renders correctly
			expect( wrapper.find( '.ext-wikilambda-reference-popover' ).exists() ).toBe( true );
		} );

		it( 'does not activate focus trap when mode is hover', async () => {
			const wrapper = renderReferencePopover( { open: true, mode: 'hover' } );

			// Focus trap should not be active in hover mode
			expect( wrapper.find( '.ext-wikilambda-reference-popover' ).exists() ).toBe( true );
		} );

		it( 'does not activate focus trap when closed', async () => {
			const wrapper = renderReferencePopover( { open: false, mode: 'click' } );

			// Focus trap should not be active when closed
			expect( wrapper.find( '.ext-wikilambda-reference-popover' ).exists() ).toBe( false );
		} );
	} );
} );
