/*!
 * WikiLambda unit test suite for the useFocusTrap composable.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { ref } = require( 'vue' );
const loadComposable = require( '../../helpers/loadComposable.js' );
const useFocusTrap = require( '../../../../resources/ext.wikilambda.references/composables/useFocusTrap.js' );

describe( 'useFocusTrap', () => {
	let container, rootEl, button1, input;
	let activeElement;

	beforeEach( () => {
		jest.useFakeTimers();

		// Create a test container with focusable elements
		container = document.createElement( 'div' );
		document.body.appendChild( container );

		rootEl = document.createElement( 'div' );
		rootEl.setAttribute( 'tabindex', '-1' );
		rootEl.className = 'test-root';
		container.appendChild( rootEl );

		button1 = document.createElement( 'button' );
		button1.textContent = 'Button 1';
		// Mock offsetWidth and offsetHeight so elements are considered focusable
		Object.defineProperty( button1, 'offsetWidth', { value: 100, configurable: true } );
		Object.defineProperty( button1, 'offsetHeight', { value: 100, configurable: true } );
		rootEl.appendChild( button1 );

		input = document.createElement( 'input' );
		input.type = 'text';
		Object.defineProperty( input, 'offsetWidth', { value: 100, configurable: true } );
		Object.defineProperty( input, 'offsetHeight', { value: 100, configurable: true } );
		rootEl.appendChild( input );

		// Mock document.activeElement using a getter (jsdom limitation)
		activeElement = document.body; // Default
		Object.defineProperty( document, 'activeElement', {
			get: () => activeElement,
			configurable: true
		} );

		// Mock focus() to update our activeElement variable
		rootEl.focus = jest.fn( () => {
			activeElement = rootEl;
		} );
		button1.focus = jest.fn( () => {
			activeElement = button1;
		} );
		input.focus = jest.fn( () => {
			activeElement = input;
		} );
	} );

	afterEach( () => {
		document.body.removeChild( container );
		jest.useRealTimers();
	} );

	describe( 'initialization', () => {
		it( 'returns focus trap methods', () => {
			const [ result ] = loadComposable( () => useFocusTrap( {
				getRootEl: () => rootEl,
				isActive: ref( false )
			} ) );

			expect( result ).toHaveProperty( 'activate' );
			expect( result ).toHaveProperty( 'deactivate' );
			expect( result ).toHaveProperty( 'isAttached' );
			expect( result ).toHaveProperty( 'onKeydown' );
		} );

		it( 'starts with isAttached as false', () => {
			const [ result ] = loadComposable( () => useFocusTrap( {
				getRootEl: () => rootEl,
				isActive: ref( false )
			} ) );

			expect( result.isAttached.value ).toBe( false );
		} );
	} );

	describe( 'activation and deactivation', () => {
		it( 'activates when isActive becomes true', () => {
			const isActive = ref( false );
			const [ result ] = loadComposable( () => useFocusTrap( {
				getRootEl: () => rootEl,
				isActive
			} ) );

			expect( result.isAttached.value ).toBe( false );

			result.activate();
			jest.advanceTimersByTime( 1 );

			expect( result.isAttached.value ).toBe( true );
		} );

		it( 'deactivates when isActive becomes false', () => {
			const isActive = ref( true );
			const [ result ] = loadComposable( () => useFocusTrap( {
				getRootEl: () => rootEl,
				isActive
			} ) );

			result.activate();
			jest.advanceTimersByTime( 1 );
			expect( result.isAttached.value ).toBe( true );

			result.deactivate();

			expect( result.isAttached.value ).toBe( false );
		} );

		it( 'focuses root element on activation', () => {
			const focusSpy = jest.spyOn( rootEl, 'focus' );
			const isActive = ref( false );
			const [ result ] = loadComposable( () => useFocusTrap( {
				getRootEl: () => rootEl,
				isActive
			} ) );

			result.activate();
			jest.advanceTimersByTime( 1 );

			expect( focusSpy ).toHaveBeenCalled();
			focusSpy.mockRestore();
		} );
	} );

	describe( 'focus trapping', () => {
		it( 'traps Tab key at last element, wrapping to first', () => {
			const isActive = ref( true );
			const [ result ] = loadComposable( () => useFocusTrap( {
				getRootEl: () => rootEl,
				isActive
			} ) );

			result.activate();
			jest.advanceTimersByTime( 1 );

			// Focus last element - this sets activeElement via our mock
			input.focus();
			expect( document.activeElement ).toBe( input );
			// Clear the mock call from above
			button1.focus.mockClear();

			// Press Tab - use the onKeydown handler directly to test
			// The handler checks: if (!e.shiftKey && document.activeElement === last)
			const tabEvent = new KeyboardEvent( 'keydown', { key: 'Tab', bubbles: true, cancelable: true } );
			Object.defineProperty( tabEvent, 'preventDefault', { value: jest.fn() } );
			result.onKeydown( tabEvent );

			// Should wrap to first focusable - verify focus was called on button1
			expect( button1.focus ).toHaveBeenCalled();
			expect( tabEvent.preventDefault ).toHaveBeenCalled();
		} );

		it( 'traps Shift+Tab at first element, wrapping to last', () => {
			const isActive = ref( true );
			const [ result ] = loadComposable( () => useFocusTrap( {
				getRootEl: () => rootEl,
				isActive
			} ) );

			result.activate();
			jest.advanceTimersByTime( 1 );

			// Focus first element
			button1.focus();
			expect( document.activeElement ).toBe( button1 );
			// Clear the mock call from above
			input.focus.mockClear();

			// Press Shift+Tab - use the onKeydown handler directly
			const shiftTabEvent = new KeyboardEvent( 'keydown', {
				key: 'Tab',
				shiftKey: true,
				bubbles: true,
				cancelable: true
			} );
			Object.defineProperty( shiftTabEvent, 'preventDefault', { value: jest.fn() } );
			result.onKeydown( shiftTabEvent );

			// Should wrap to last focusable - verify focus was called on input
			expect( input.focus ).toHaveBeenCalled();
			expect( shiftTabEvent.preventDefault ).toHaveBeenCalled();
		} );

		it( 'moves from root to first focusable on Tab', () => {
			const isActive = ref( true );
			const [ result ] = loadComposable( () => useFocusTrap( {
				getRootEl: () => rootEl,
				isActive
			} ) );

			result.activate();
			jest.advanceTimersByTime( 1 );

			// Focus root
			rootEl.focus();
			expect( document.activeElement ).toBe( rootEl );
			// Clear the mock call from above
			button1.focus.mockClear();

			// Press Tab - use the onKeydown handler directly
			const tabEvent = new KeyboardEvent( 'keydown', { key: 'Tab', bubbles: true, cancelable: true } );
			Object.defineProperty( tabEvent, 'preventDefault', { value: jest.fn() } );
			result.onKeydown( tabEvent );

			// Should move to first focusable - verify focus was called on button1
			expect( button1.focus ).toHaveBeenCalled();
			expect( tabEvent.preventDefault ).toHaveBeenCalled();
		} );

		it( 'moves from root to last focusable on Shift+Tab', () => {
			const isActive = ref( true );
			const [ result ] = loadComposable( () => useFocusTrap( {
				getRootEl: () => rootEl,
				isActive
			} ) );

			result.activate();
			jest.advanceTimersByTime( 1 );

			// Focus root
			rootEl.focus();
			expect( document.activeElement ).toBe( rootEl );
			// Clear the mock call from above
			input.focus.mockClear();

			// Press Shift+Tab - use the onKeydown handler directly
			const shiftTabEvent = new KeyboardEvent( 'keydown', {
				key: 'Tab',
				shiftKey: true,
				bubbles: true,
				cancelable: true
			} );
			Object.defineProperty( shiftTabEvent, 'preventDefault', { value: jest.fn() } );
			result.onKeydown( shiftTabEvent );

			// Should move to last focusable - verify focus was called on input
			expect( input.focus ).toHaveBeenCalled();
			expect( shiftTabEvent.preventDefault ).toHaveBeenCalled();
		} );

		it( 'ignores non-Tab keys', () => {
			const isActive = ref( true );
			const [ result ] = loadComposable( () => useFocusTrap( {
				getRootEl: () => rootEl,
				isActive
			} ) );

			result.activate();
			jest.advanceTimersByTime( 1 );

			button1.focus();
			// Clear the mock call from above
			button1.focus.mockClear();

			// Press Escape (should not be handled)
			const escapeEvent = new KeyboardEvent( 'keydown', { key: 'Escape', bubbles: true, cancelable: true } );
			Object.defineProperty( escapeEvent, 'preventDefault', { value: jest.fn() } );
			result.onKeydown( escapeEvent );

			// Should not call focus (ignored)
			expect( button1.focus ).not.toHaveBeenCalled();
			expect( escapeEvent.preventDefault ).not.toHaveBeenCalled();
		} );

		it( 'does not trap when focus is outside root', () => {
			const isActive = ref( true );
			const outsideButton = document.createElement( 'button' );
			Object.defineProperty( outsideButton, 'offsetWidth', { value: 100, configurable: true } );
			Object.defineProperty( outsideButton, 'offsetHeight', { value: 100, configurable: true } );
			document.body.appendChild( outsideButton );
			// Mock focus for outside button
			outsideButton.focus = jest.fn( () => {
				activeElement = outsideButton;
			} );

			const [ result ] = loadComposable( () => useFocusTrap( {
				getRootEl: () => rootEl,
				isActive
			} ) );

			result.activate();
			jest.advanceTimersByTime( 1 );

			// Focus element outside root
			outsideButton.focus();
			expect( document.activeElement ).toBe( outsideButton );
			// Clear mock calls
			button1.focus.mockClear();
			input.focus.mockClear();

			// Press Tab - should not trap
			const tabEvent = new KeyboardEvent( 'keydown', { key: 'Tab', bubbles: true, cancelable: true } );
			Object.defineProperty( tabEvent, 'preventDefault', { value: jest.fn() } );
			result.onKeydown( tabEvent );

			// Should not call focus on elements inside root (not trapped)
			expect( button1.focus ).not.toHaveBeenCalled();
			expect( input.focus ).not.toHaveBeenCalled();
			expect( tabEvent.preventDefault ).not.toHaveBeenCalled();

			document.body.removeChild( outsideButton );
		} );

		it( 'handles single focusable element', () => {
			const singleRoot = document.createElement( 'div' );
			singleRoot.setAttribute( 'tabindex', '-1' );
			const singleButton = document.createElement( 'button' );
			singleButton.textContent = 'Only Button';
			Object.defineProperty( singleButton, 'offsetWidth', { value: 100, configurable: true } );
			Object.defineProperty( singleButton, 'offsetHeight', { value: 100, configurable: true } );
			singleRoot.appendChild( singleButton );
			container.appendChild( singleRoot );

			// Mock focus for single elements
			singleRoot.focus = jest.fn( () => {
				activeElement = singleRoot;
			} );
			singleButton.focus = jest.fn( () => {
				activeElement = singleButton;
			} );

			const isActive = ref( true );
			const [ result ] = loadComposable( () => useFocusTrap( {
				getRootEl: () => singleRoot,
				isActive
			} ) );

			result.activate();
			jest.advanceTimersByTime( 1 );

			singleButton.focus();
			expect( document.activeElement ).toBe( singleButton );
			// Clear the mock call from above
			singleButton.focus.mockClear();

			// Press Tab
			const tabEvent = new KeyboardEvent( 'keydown', { key: 'Tab', bubbles: true, cancelable: true } );
			Object.defineProperty( tabEvent, 'preventDefault', { value: jest.fn() } );
			result.onKeydown( tabEvent );

			// Should keep focus on the single button - verify focus was called
			expect( singleButton.focus ).toHaveBeenCalled();
			expect( tabEvent.preventDefault ).toHaveBeenCalled();
		} );

		it( 'handles no focusable elements', () => {
			const emptyRoot = document.createElement( 'div' );
			emptyRoot.setAttribute( 'tabindex', '-1' );
			container.appendChild( emptyRoot );

			// Mock focus for empty root
			emptyRoot.focus = jest.fn( () => {
				activeElement = emptyRoot;
			} );

			const isActive = ref( true );
			const [ result ] = loadComposable( () => useFocusTrap( {
				getRootEl: () => emptyRoot,
				isActive
			} ) );

			result.activate();
			jest.advanceTimersByTime( 1 );

			// Set activeElement to something other than emptyRoot but still within it
			// The handler checks: if ( activeEl && activeEl !== rootEl && !rootEl.contains( activeEl ) ) return;
			// So we need activeElement to be either null, rootEl, or contained in rootEl
			// And the handler only calls focus() if document.activeElement !== rootEl
			// So we'll set it to null (no focus) so it will call focus()
			activeElement = null;
			expect( document.activeElement ).not.toBe( emptyRoot );
			// Clear any previous mock calls
			emptyRoot.focus.mockClear();

			// Press Tab
			const tabEvent = new KeyboardEvent( 'keydown', { key: 'Tab', bubbles: true, cancelable: true } );
			Object.defineProperty( tabEvent, 'preventDefault', { value: jest.fn() } );
			result.onKeydown( tabEvent );

			// Should keep focus on root - verify focus was called
			expect( emptyRoot.focus ).toHaveBeenCalled();
			expect( tabEvent.preventDefault ).toHaveBeenCalled();
		} );
	} );

	describe( 'cleanup', () => {
		it( 'removes event listener on unmount', () => {
			const removeEventListenerSpy = jest.spyOn( rootEl, 'removeEventListener' );
			const isActive = ref( true );
			const [ result, wrapper ] = loadComposable( () => useFocusTrap( {
				getRootEl: () => rootEl,
				isActive
			} ) );

			// Manually activate to ensure listener is attached
			result.activate();
			jest.advanceTimersByTime( 1 );

			wrapper.unmount();

			expect( removeEventListenerSpy ).toHaveBeenCalledWith( 'keydown', expect.any( Function ) );
			removeEventListenerSpy.mockRestore();
		} );
	} );
} );
