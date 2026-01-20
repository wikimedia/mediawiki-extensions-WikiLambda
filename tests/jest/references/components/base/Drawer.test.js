/*!
 * WikiLambda unit test suite for the Drawer base component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { mount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const Drawer = require( '../../../../../resources/ext.wikilambda.references/components/base/Drawer.vue' );
const { dialogGlobalStubs } = require( '../../../helpers/dialogTestHelpers' );

describe( 'Drawer', () => {
	let mockScrollTo;

	beforeEach( () => {
		// Mock DOM element
		mockScrollTo = jest.fn();
		Object.defineProperty( window, 'scrollTo', {
			writable: true,
			value: mockScrollTo
		} );
	} );

	/**
	 * Helper function to render Drawer component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderDrawer( props = {}, options = {} ) {
		const defaultProps = {
			open: false,
			title: 'Test Drawer'
		};
		const defaultOptions = {
			global: {
				stubs: {
					// add dialogGlobalStubs to the stubs for the teleport
					...dialogGlobalStubs,
					...options?.stubs
				}
			}
		};
		return mount( Drawer, {
			props: { ...defaultProps, ...props },
			slots: {
				default: '<p>Drawer content</p>',
				...options?.slots
			},
			...defaultOptions
		} );
	}

	describe( 'initial render', () => {
		it( 'does not render when open is false', () => {
			const wrapper = renderDrawer( { open: false } );
			expect( wrapper.find( '.ext-wikilambda-drawer' ).exists() ).toBe( false );
		} );

		it( 'renders when open is true', () => {
			const wrapper = renderDrawer( { open: true } );
			expect( wrapper.find( '.ext-wikilambda-drawer' ).exists() ).toBe( true );
		} );

		it( 'displays the title', () => {
			const title = 'My Drawer Title';
			const wrapper = renderDrawer( { open: true, title } );
			expect( wrapper.find( '.ext-wikilambda-drawer__title' ).text() ).toBe( title );
		} );

		it( 'displays slot content', () => {
			const wrapper = renderDrawer( {
				open: true
			}, {
				slots: {
					default: '<div class="test-content">Custom content</div>'
				}
			} );
			expect( wrapper.find( '.test-content' ).exists() ).toBe( true );
			expect( wrapper.find( '.test-content' ).text() ).toBe( 'Custom content' );
		} );

		it( 'has correct ARIA attributes', () => {
			const wrapper = renderDrawer( { open: true } );
			const drawer = wrapper.find( '.ext-wikilambda-drawer' );
			expect( drawer.attributes( 'role' ) ).toBe( 'dialog' );
			expect( drawer.attributes( 'aria-modal' ) ).toBe( 'true' );
			expect( drawer.attributes( 'tabindex' ) ).toBe( '-1' );
		} );
	} );

	describe( 'close functionality', () => {
		it( 'emits close event when close button is clicked', async () => {
			const wrapper = renderDrawer( { open: true } );
			const closeButton = wrapper.find( 'button[aria-label="Close"]' );
			await closeButton.trigger( 'click' );

			expect( wrapper.emitted( 'close' ) ).toBeTruthy();
			expect( wrapper.emitted( 'close' ).length ).toBe( 1 );
		} );

		it( 'emits close event when overlay is clicked', async () => {
			const wrapper = renderDrawer( { open: true } );
			const overlay = wrapper.find( '.ext-wikilambda-drawer-overlay' );
			await overlay.trigger( 'click' );

			expect( wrapper.emitted( 'close' ) ).toBeTruthy();
			expect( wrapper.emitted( 'close' ).length ).toBe( 1 );
		} );

		it( 'emits close event when Escape key is pressed', async () => {
			const wrapper = renderDrawer( { open: true } );

			expect( wrapper.find( '.ext-wikilambda-drawer' ).exists() ).toBe( true );

			const escapeEvent = new KeyboardEvent( 'keydown', { key: 'Escape' } );
			document.dispatchEvent( escapeEvent );

			await waitFor( () => expect( wrapper.emitted( 'close' ) ).toBeTruthy() );
		} );

		it( 'does not emit close when Escape is pressed and drawer is closed', async () => {
			const wrapper = renderDrawer( { open: false } );

			const escapeEvent = new KeyboardEvent( 'keydown', { key: 'Escape' } );
			document.dispatchEvent( escapeEvent );

			expect( wrapper.emitted( 'close' ) ).toBeFalsy();
		} );
	} );

	describe( 'scroll lock integration', () => {
		it( 'locks scroll when drawer opens', async () => {
			const wrapper = renderDrawer( { open: false } );

			// Initially unlocked
			expect( document.body.style.overflow ).toBe( '' );

			// Open drawer
			await wrapper.setProps( { open: true } );

			// Should be locked
			expect( document.body.style.overflow ).toBe( 'hidden' );
		} );

		it( 'unlocks scroll when drawer closes', async () => {
			const wrapper = renderDrawer( { open: true } );

			// Should be locked
			expect( document.body.style.overflow ).toBe( 'hidden' );

			// Close drawer
			await wrapper.setProps( { open: false } );

			// Should be unlocked
			expect( document.body.style.overflow ).toBe( '' );
		} );
	} );

	describe( 'focus trap integration', () => {
		it( 'traps focus when drawer is open', async () => {
			const wrapper = renderDrawer( { open: true } );
			await wrapper.vm.$nextTick();

			const drawer = wrapper.find( '.ext-wikilambda-drawer' );
			expect( drawer.exists() ).toBe( true );

			// Focus should be on drawer
			await wrapper.vm.$nextTick();
			// Note: Actual focus trap behavior is tested in useFocusTrap.test.js
		} );
	} );

	describe( 'cleanup', () => {
		it( 'removes Escape key listener on unmount', async () => {
			const removeEventListenerSpy = jest.spyOn( document, 'removeEventListener' );
			const wrapper = renderDrawer( { open: true } );
			await wrapper.vm.$nextTick();

			wrapper.unmount();

			expect( removeEventListenerSpy ).toHaveBeenCalledWith( 'keydown', expect.any( Function ) );
			removeEventListenerSpy.mockRestore();
		} );

		it( 'unlocks scroll on unmount if still open', async () => {
			const wrapper = renderDrawer( { open: true } );
			await wrapper.vm.$nextTick();

			expect( document.body.style.overflow ).toBe( 'hidden' );

			wrapper.unmount();

			expect( document.body.style.overflow ).toBe( '' );
		} );
	} );
} );
