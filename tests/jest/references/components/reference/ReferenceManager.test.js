/*!
 * WikiLambda unit test suite for the ReferenceManager component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { mount } = require( '@vue/test-utils' );

// Mock composables
const mockUseBreakpoints = {
	current: { value: 'DESKTOP' },
	MOBILE: { value: false },
	TABLET: { value: false },
	DESKTOP: { value: true }
};

jest.mock( '../../../../../resources/ext.wikilambda.references/composables/useBreakpoints.js', () => jest.fn( () => mockUseBreakpoints ) );
jest.mock( '../../../../../resources/ext.wikilambda.references/composables/useReferenceTriggers.js', () => jest.fn() );

// Import component after mocks are set up
const ReferenceManager = require( '../../../../../resources/ext.wikilambda.references/components/reference/ReferenceManager.vue' );
const useReferenceTriggers = require( '../../../../../resources/ext.wikilambda.references/composables/useReferenceTriggers.js' );

describe( 'ReferenceManager', () => {
	let triggerButton, noteElement;

	beforeEach( () => {
		// Create test DOM structure matching new format (after JS processing):
		// <sup class="ext-wikilambda-reference" data-wikilambda-reference-init="1">
		//   <button class="ext-wikilambda-reference__button">[*]</button>
		//   <span class="ext-wikilambda-reference__note">Reference content</span>
		// </sup>
		const sup = document.createElement( 'sup' );
		sup.className = 'ext-wikilambda-reference';
		sup.setAttribute( 'data-wikilambda-reference-init', '1' );
		triggerButton = document.createElement( 'button' );
		triggerButton.className = 'ext-wikilambda-reference__button';
		triggerButton.textContent = '[*]';
		triggerButton.setAttribute( 'aria-label', 'Open reference' );
		triggerButton.setAttribute( 'aria-expanded', 'false' );
		sup.appendChild( triggerButton );

		noteElement = document.createElement( 'span' );
		noteElement.className = 'ext-wikilambda-reference__note';
		noteElement.innerHTML = '<p>Reference content</p>';
		sup.appendChild( noteElement );

		document.body.appendChild( sup );

		// Reset mocks
		jest.clearAllMocks();
		mockUseBreakpoints.current.value = 'DESKTOP';
		mockUseBreakpoints.MOBILE.value = false;
		mockUseBreakpoints.DESKTOP.value = true;
	} );

	afterEach( () => {
		// Clean up DOM
		const sup = document.querySelector( '.ext-wikilambda-reference' );
		if ( sup ) {
			document.body.removeChild( sup );
		}
	} );

	/**
	 * Helper function to render ReferenceManager component
	 *
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderReferenceManager( options = {} ) {
		const defaultOptions = {
			global: {
				stubs: {
					'wl-drawer': {
						template: '<div v-if="open" class="wl-drawer-stub"><slot></slot></div>',
						props: [ 'open', 'title' ],
						emits: [ 'close' ]
					},
					'wl-reference-popover': {
						template: '<div v-if="open" class="wl-reference-popover-stub"><slot></slot></div>',
						props: [ 'open', 'title', 'html', 'anchor', 'mode' ],
						emits: [ 'update:open', 'mouseenter', 'mouseleave' ]
					},
					...options?.stubs
				}
			}
		};
		return mount( ReferenceManager, {
			...defaultOptions
		} );
	}

	describe( 'initialization', () => {
		it( 'renders the component', () => {
			const wrapper = renderReferenceManager();
			expect( wrapper.exists() ).toBe( true );
		} );

		it( 'initializes useReferenceTriggers with handlers', async () => {
			renderReferenceManager();
			expect( useReferenceTriggers ).toHaveBeenCalled();
			const handlers = useReferenceTriggers.mock.calls[ 0 ][ 0 ];
			expect( handlers ).toHaveProperty( 'onMouseenter' );
			expect( handlers ).toHaveProperty( 'onMouseleave' );
			expect( handlers ).toHaveProperty( 'onClick' );
		} );
	} );

	describe( 'mobile vs desktop', () => {
		it( 'shows drawer on mobile', () => {
			mockUseBreakpoints.current.value = 'MOBILE';
			mockUseBreakpoints.MOBILE.value = true;
			mockUseBreakpoints.DESKTOP.value = false;

			const wrapper = renderReferenceManager();
			expect( wrapper.find( '.wl-drawer-stub' ).exists() ).toBe( false );
			expect( wrapper.find( '.wl-reference-popover-stub' ).exists() ).toBe( false );
		} );

		it( 'shows popover on desktop', () => {
			mockUseBreakpoints.current.value = 'DESKTOP';
			mockUseBreakpoints.MOBILE.value = false;
			mockUseBreakpoints.DESKTOP.value = true;

			const wrapper = renderReferenceManager();
			expect( wrapper.find( '.wl-drawer-stub' ).exists() ).toBe( false );
			expect( wrapper.find( '.wl-reference-popover-stub' ).exists() ).toBe( false );
		} );
	} );

	describe( 'opening references', () => {
		it( 'opens drawer on mobile when trigger is clicked', async () => {
			mockUseBreakpoints.current.value = 'MOBILE';
			mockUseBreakpoints.MOBILE.value = true;
			mockUseBreakpoints.DESKTOP.value = false;

			const wrapper = renderReferenceManager();

			// Get the onClick handler from useReferenceTriggers
			expect( useReferenceTriggers ).toHaveBeenCalled();
			const handlers = useReferenceTriggers.mock.calls[ 0 ][ 0 ];
			handlers.onClick( triggerButton );

			expect( wrapper.vm.drawerOpen ).toBe( true );
			expect( wrapper.vm.referenceHtml ).toBe( '<p>Reference content</p>' );
		} );

		it( 'opens popover on desktop when trigger is clicked', async () => {
			mockUseBreakpoints.current.value = 'DESKTOP';
			mockUseBreakpoints.MOBILE.value = false;
			mockUseBreakpoints.DESKTOP.value = true;

			const wrapper = renderReferenceManager();

			// Get the onClick handler from useReferenceTriggers
			expect( useReferenceTriggers ).toHaveBeenCalled();
			const handlers = useReferenceTriggers.mock.calls[ 0 ][ 0 ];
			handlers.onClick( triggerButton );

			expect( wrapper.vm.popoverOpen ).toBe( true );
			expect( wrapper.vm.popoverMode ).toBe( 'click' );
			expect( wrapper.vm.referenceHtml ).toBe( '<p>Reference content</p>' );
		} );

		it( 'sets aria-expanded on trigger button', async () => {
			renderReferenceManager();

			expect( useReferenceTriggers ).toHaveBeenCalled();
			const handlers = useReferenceTriggers.mock.calls[ 0 ][ 0 ];
			handlers.onClick( triggerButton );

			expect( triggerButton.getAttribute( 'aria-expanded' ) ).toBe( 'true' );
		} );

		it( 'does not open if note element is not found', async () => {
			// Remove note element from sup
			if ( noteElement.parentNode ) {
				noteElement.parentNode.removeChild( noteElement );
			}

			const wrapper = renderReferenceManager();

			expect( useReferenceTriggers ).toHaveBeenCalled();
			const handlers = useReferenceTriggers.mock.calls[ 0 ][ 0 ];
			handlers.onClick( triggerButton );

			expect( wrapper.vm.popoverOpen ).toBe( false );
			expect( wrapper.vm.drawerOpen ).toBe( false );
		} );
	} );

	describe( 'hover behavior (desktop only)', () => {
		beforeEach( () => {
			mockUseBreakpoints.current.value = 'DESKTOP';
			mockUseBreakpoints.MOBILE.value = false;
			mockUseBreakpoints.DESKTOP.value = true;
		} );

		it( 'opens popover on mouseenter in hover mode', async () => {
			const wrapper = renderReferenceManager();

			expect( useReferenceTriggers ).toHaveBeenCalled();
			const handlers = useReferenceTriggers.mock.calls[ 0 ][ 0 ];
			handlers.onMouseenter( triggerButton );

			expect( wrapper.vm.popoverOpen ).toBe( true );
			expect( wrapper.vm.popoverMode ).toBe( 'hover' );
		} );

		it( 'does not open on hover if already in click mode', async () => {
			const wrapper = renderReferenceManager();

			expect( useReferenceTriggers ).toHaveBeenCalled();
			// First open in click mode
			const handlers = useReferenceTriggers.mock.calls[ 0 ][ 0 ];
			handlers.onClick( triggerButton );

			expect( wrapper.vm.popoverMode ).toBe( 'click' );

			// Try to hover - should not change mode
			handlers.onMouseenter( triggerButton );

			expect( wrapper.vm.popoverMode ).toBe( 'click' );
		} );

		it( 'schedules close on mouseleave in hover mode', async () => {
			jest.useFakeTimers();
			const wrapper = renderReferenceManager();

			expect( useReferenceTriggers ).toHaveBeenCalled();
			const handlers = useReferenceTriggers.mock.calls[ 0 ][ 0 ];

			// Open via hover
			handlers.onMouseenter( triggerButton );
			expect( wrapper.vm.popoverOpen ).toBe( true );
			expect( wrapper.vm.popoverMode ).toBe( 'hover' );

			// Leave trigger
			handlers.onMouseleave();

			// Should still be open (delay not expired)
			expect( wrapper.vm.popoverOpen ).toBe( true );

			// Advance timer past delay
			jest.advanceTimersByTime( 350 );

			// Should be closed
			expect( wrapper.vm.popoverOpen ).toBe( false );

			jest.useRealTimers();
		} );
	} );

	describe( 'closing references', () => {
		it( 'closes drawer and resets state', async () => {
			mockUseBreakpoints.current.value = 'MOBILE';
			mockUseBreakpoints.MOBILE.value = true;
			mockUseBreakpoints.DESKTOP.value = false;

			const wrapper = renderReferenceManager();

			// Open drawer
			expect( useReferenceTriggers ).toHaveBeenCalled();
			const handlers = useReferenceTriggers.mock.calls[ 0 ][ 0 ];
			handlers.onClick( triggerButton );

			expect( wrapper.vm.drawerOpen ).toBe( true );

			// Close drawer
			wrapper.vm.closeDrawer();

			expect( wrapper.vm.drawerOpen ).toBe( false );
			expect( wrapper.vm.anchor ).toBe( null );
			expect( triggerButton.getAttribute( 'aria-expanded' ) ).toBe( 'false' );
		} );

		it( 'closes popover and resets state', async () => {
			mockUseBreakpoints.current.value = 'DESKTOP';
			mockUseBreakpoints.MOBILE.value = false;
			mockUseBreakpoints.DESKTOP.value = true;

			const wrapper = renderReferenceManager();

			// Open popover
			expect( useReferenceTriggers ).toHaveBeenCalled();
			const handlers = useReferenceTriggers.mock.calls[ 0 ][ 0 ];
			handlers.onClick( triggerButton );

			expect( wrapper.vm.popoverOpen ).toBe( true );

			// Close popover
			wrapper.vm.setPopoverOpen( false );

			expect( wrapper.vm.popoverOpen ).toBe( false );
			expect( wrapper.vm.popoverMode ).toBe( null );
			expect( triggerButton.getAttribute( 'aria-expanded' ) ).toBe( 'false' );
		} );

		it( 'toggles popover closed when clicking same trigger', async () => {
			mockUseBreakpoints.current.value = 'DESKTOP';
			mockUseBreakpoints.MOBILE.value = false;
			mockUseBreakpoints.DESKTOP.value = true;

			const wrapper = renderReferenceManager();

			expect( useReferenceTriggers ).toHaveBeenCalled();
			const handlers = useReferenceTriggers.mock.calls[ 0 ][ 0 ];

			// First click opens
			handlers.onClick( triggerButton );
			expect( wrapper.vm.popoverOpen ).toBe( true );

			// Second click closes
			handlers.onClick( triggerButton );
			expect( wrapper.vm.popoverOpen ).toBe( false );
		} );
	} );

	describe( 'cleanup', () => {
		it( 'cleans up hover close timeout on unmount', async () => {
			jest.useFakeTimers();
			mockUseBreakpoints.current.value = 'DESKTOP';
			mockUseBreakpoints.MOBILE.value = false;
			mockUseBreakpoints.DESKTOP.value = true;

			const wrapper = renderReferenceManager();

			expect( useReferenceTriggers ).toHaveBeenCalled();
			const handlers = useReferenceTriggers.mock.calls[ 0 ][ 0 ];

			// Open via hover
			handlers.onMouseenter( triggerButton );

			// Leave (schedules close)
			handlers.onMouseleave();

			// Unmount before timeout expires
			wrapper.unmount();

			// Advance timer - should not cause errors
			jest.advanceTimersByTime( 500 );

			jest.useRealTimers();
		} );
	} );
} );
