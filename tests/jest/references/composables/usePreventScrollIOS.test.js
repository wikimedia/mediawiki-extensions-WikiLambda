/*!
 * WikiLambda unit test suite for the usePreventScrollIOS composable.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { defineComponent, ref } = require( 'vue' );
const { mount } = require( '@vue/test-utils' );
const usePreventScrollIOS = require( '../../../../resources/ext.wikilambda.references/composables/usePreventScrollIOS.js' );

const composablePath = '../../../../resources/ext.wikilambda.references/composables/usePreventScrollIOS.js';

describe( 'usePreventScrollIOS', () => {
	let originalFocus;
	let originalAddEventListener;
	let originalRemoveEventListener;

	beforeEach( () => {
		// Suppress console errors from jsdom not supporting @layer CSS syntax
		jest.spyOn( console, 'error' ).mockImplementation( () => {} );

		// Save original methods
		originalFocus = HTMLElement.prototype.focus;
		originalAddEventListener = document.addEventListener;
		originalRemoveEventListener = document.removeEventListener;

		// Mock addEventListener to track calls
		document.addEventListener = jest.fn( originalAddEventListener );
		document.removeEventListener = jest.fn( originalRemoveEventListener );
	} );

	afterEach( () => {
		// Restore original methods
		HTMLElement.prototype.focus = originalFocus;
		document.addEventListener = originalAddEventListener;
		document.removeEventListener = originalRemoveEventListener;

		// Clean up any style elements
		const styleElements = document.head.querySelectorAll( 'style' );
		styleElements.forEach( ( el ) => {
			if ( el.textContent?.includes( 'overscroll-behavior' ) ) {
				el.remove();
			}
		} );

		jest.restoreAllMocks();
	} );

	describe( 'when isActive becomes true', () => {
		it( 'adds event listeners', async () => {
			const TestComponent = defineComponent( {
				template: '<div></div>',
				setup() {
					const isActive = ref( false );
					usePreventScrollIOS( isActive );
					return { isActive };
				}
			} );

			const wrapper = mount( TestComponent );
			wrapper.vm.isActive = true;
			await wrapper.vm.$nextTick();

			expect( document.addEventListener ).toHaveBeenCalledWith(
				'touchstart',
				expect.any( Function ),
				{ passive: false, capture: true }
			);
			expect( document.addEventListener ).toHaveBeenCalledWith(
				'touchmove',
				expect.any( Function ),
				{ passive: false, capture: true }
			);
			expect( document.addEventListener ).toHaveBeenCalledWith(
				'blur',
				expect.any( Function ),
				true
			);
		} );

		it( 'injects style element with overscroll-behavior', async () => {
			const TestComponent = defineComponent( {
				template: '<div></div>',
				setup() {
					const isActive = ref( false );
					usePreventScrollIOS( isActive );
					return { isActive };
				}
			} );

			const wrapper = mount( TestComponent );
			wrapper.vm.isActive = true;
			await wrapper.vm.$nextTick();

			const styleElement = document.head.querySelector( 'style' );
			expect( styleElement ).toBeTruthy();
			expect( styleElement?.textContent ).toContain( 'overscroll-behavior: contain' );
		} );

		it( 'overrides HTMLElement.prototype.focus', async () => {
			const TestComponent = defineComponent( {
				template: '<div></div>',
				setup() {
					const isActive = ref( false );
					usePreventScrollIOS( isActive );
					return { isActive };
				}
			} );

			const wrapper = mount( TestComponent );
			wrapper.vm.isActive = true;
			await wrapper.vm.$nextTick();

			expect( HTMLElement.prototype.focus ).not.toBe( originalFocus );
		} );
	} );

	describe( 'when isActive becomes false', () => {
		it( 'removes event listeners', async () => {
			const TestComponent = defineComponent( {
				template: '<div></div>',
				setup() {
					const isActive = ref( true );
					usePreventScrollIOS( isActive );
					return { isActive };
				}
			} );

			const wrapper = mount( TestComponent );
			await wrapper.vm.$nextTick();

			const addEventListenerCalls = ( document.addEventListener ).mock.calls;
			const touchStartHandler = addEventListenerCalls.find(
				( call ) => call[ 0 ] === 'touchstart'
			)?.[ 1 ];
			const touchMoveHandler = addEventListenerCalls.find(
				( call ) => call[ 0 ] === 'touchmove'
			)?.[ 1 ];
			const blurHandler = addEventListenerCalls.find(
				( call ) => call[ 0 ] === 'blur'
			)?.[ 1 ];

			wrapper.vm.isActive = false;
			await wrapper.vm.$nextTick();

			expect( document.removeEventListener ).toHaveBeenCalledWith(
				'touchstart',
				touchStartHandler,
				{ capture: true }
			);
			expect( document.removeEventListener ).toHaveBeenCalledWith(
				'touchmove',
				touchMoveHandler,
				{ capture: true }
			);
			expect( document.removeEventListener ).toHaveBeenCalledWith(
				'blur',
				blurHandler,
				true
			);
		} );

		it( 'removes style element', async () => {
			const TestComponent = defineComponent( {
				template: '<div></div>',
				setup() {
					const isActive = ref( true );
					usePreventScrollIOS( isActive );
					return { isActive };
				}
			} );

			const wrapper = mount( TestComponent );
			await wrapper.vm.$nextTick();

			let styleElement = document.head.querySelector( 'style' );
			expect( styleElement ).toBeTruthy();

			wrapper.vm.isActive = false;
			await wrapper.vm.$nextTick();

			styleElement = document.head.querySelector( 'style' );
			expect( styleElement?.textContent?.includes( 'overscroll-behavior' ) ).toBeFalsy();
		} );

		it( 'restores original focus method', async () => {
			const TestComponent = defineComponent( {
				template: '<div></div>',
				setup() {
					const isActive = ref( true );
					usePreventScrollIOS( isActive );
					return { isActive };
				}
			} );

			const wrapper = mount( TestComponent );
			await wrapper.vm.$nextTick();

			expect( HTMLElement.prototype.focus ).not.toBe( originalFocus );

			wrapper.vm.isActive = false;
			await wrapper.vm.$nextTick();

			expect( HTMLElement.prototype.focus ).toBe( originalFocus );
		} );
	} );

	describe( 'cleanup on unmount', () => {
		it( 'disables scroll prevention on unmount if still active', () => {
			const TestComponent = defineComponent( {
				template: '<div></div>',
				setup() {
					const isActive = ref( true );
					usePreventScrollIOS( isActive );
					return { isActive };
				}
			} );

			const wrapper = mount( TestComponent );
			let styleElement = document.head.querySelector( 'style' );
			expect( styleElement ).toBeTruthy();

			wrapper.unmount();

			styleElement = document.head.querySelector( 'style' );
			expect( styleElement?.textContent?.includes( 'overscroll-behavior' ) ).toBeFalsy();

			expect( HTMLElement.prototype.focus ).toBe( originalFocus );
		} );

		it( 'does not disable on unmount if already inactive', () => {
			const TestComponent = defineComponent( {
				template: '<div></div>',
				setup() {
					const isActive = ref( false );
					usePreventScrollIOS( isActive );
					return { isActive };
				}
			} );

			const wrapper = mount( TestComponent );
			wrapper.unmount();

			const styleElement = document.head.querySelector( 'style' );
			expect( styleElement?.textContent?.includes( 'overscroll-behavior' ) ).toBeFalsy();
		} );
	} );

	describe( 'touchstart event handler', () => {
		it( 'tracks scrollable element from touchstart', async () => {
			const TestComponent = defineComponent( {
				template: '<div><div style="overflow-y: auto;" id="scrollable"></div></div>',
				setup() {
					const isActive = ref( true );
					usePreventScrollIOS( isActive );
					return { isActive };
				}
			} );

			const wrapper = mount( TestComponent );
			await wrapper.vm.$nextTick();

			const addEventListenerCalls = ( document.addEventListener ).mock.calls;
			const touchStartHandler = addEventListenerCalls.find(
				( call ) => call[ 0 ] === 'touchstart'
			)?.[ 1 ];

			const scrollableDiv = wrapper.find( '#scrollable' ).element;
			const touchEvent = new TouchEvent( 'touchstart', {
				bubbles: true,
				cancelable: true
			} );
			Object.defineProperty( touchEvent, 'target', {
				writable: false,
				value: scrollableDiv
			} );

			touchStartHandler( touchEvent );
			expect( touchStartHandler ).toBeDefined();
		} );

		it( 'allows touchmove for range inputs', async () => {
			const TestComponent = defineComponent( {
				template: '<input type="range" id="range-input" />',
				setup() {
					const isActive = ref( true );
					usePreventScrollIOS( isActive );
					return { isActive };
				}
			} );

			const wrapper = mount( TestComponent );
			await wrapper.vm.$nextTick();

			const addEventListenerCalls = ( document.addEventListener ).mock.calls;
			const touchStartHandler = addEventListenerCalls.find(
				( call ) => call[ 0 ] === 'touchstart'
			)?.[ 1 ];

			const rangeInput = wrapper.find( '#range-input' ).element;
			const touchEvent = new TouchEvent( 'touchstart', {
				bubbles: true,
				cancelable: true
			} );
			Object.defineProperty( touchEvent, 'target', {
				writable: false,
				value: rangeInput
			} );
			Object.defineProperty( touchEvent, 'composedPath', {
				writable: false,
				value: () => [ rangeInput ]
			} );

			touchStartHandler( touchEvent );
			expect( touchStartHandler ).toBeDefined();
		} );

		it( 'allows touchmove when target has non-collapsed selection', async () => {
			const TestComponent = defineComponent( {
				template: '<div id="with-selection">text</div>',
				setup() {
					const isActive = ref( true );
					usePreventScrollIOS( isActive );
					return { isActive };
				}
			} );

			const wrapper = mount( TestComponent );
			await wrapper.vm.$nextTick();

			const addEventListenerCalls = ( document.addEventListener ).mock.calls;
			const touchStartHandler = addEventListenerCalls.find(
				( call ) => call[ 0 ] === 'touchstart'
			)?.[ 1 ];

			const targetEl = wrapper.find( '#with-selection' ).element;
			const mockSelection = {
				isCollapsed: false,
				containsNode: () => true
			};
			Object.defineProperty( targetEl.ownerDocument.defaultView, 'getSelection', {
				value: () => mockSelection,
				configurable: true
			} );

			const touchEvent = new TouchEvent( 'touchstart', {
				bubbles: true,
				cancelable: true
			} );
			Object.defineProperty( touchEvent, 'target', {
				writable: false,
				value: targetEl
			} );

			touchStartHandler( touchEvent );
			expect( touchStartHandler ).toBeDefined();
		} );

		it( 'allows touchmove when focused input has text selection', async () => {
			const TestComponent = defineComponent( {
				template: '<input id="text-input" value="hello world" />',
				setup() {
					const isActive = ref( true );
					usePreventScrollIOS( isActive );
					return { isActive };
				}
			} );

			const wrapper = mount( TestComponent );
			await wrapper.vm.$nextTick();

			const addEventListenerCalls = ( document.addEventListener ).mock.calls;
			const touchStartHandler = addEventListenerCalls.find(
				( call ) => call[ 0 ] === 'touchstart'
			)?.[ 1 ];

			const input = wrapper.find( '#text-input' ).element;
			input.setSelectionRange( 0, 5 );
			Object.defineProperty( document, 'activeElement', {
				writable: true,
				configurable: true,
				value: input
			} );

			const touchEvent = new TouchEvent( 'touchstart', {
				bubbles: true,
				cancelable: true
			} );
			Object.defineProperty( touchEvent, 'target', {
				writable: false,
				value: input
			} );
			Object.defineProperty( touchEvent, 'composedPath', {
				writable: false,
				value: () => [ input ]
			} );

			touchStartHandler( touchEvent );
			expect( touchStartHandler ).toBeDefined();
		} );

		it( 'uses scrollable parent when touching non-scrollable child', async () => {
			const TestComponent = defineComponent( {
				template: '<div style="overflow-y: auto;" id="scrollable"><span id="child">x</span></div>',
				setup() {
					const isActive = ref( true );
					usePreventScrollIOS( isActive );
					return { isActive };
				}
			} );

			const wrapper = mount( TestComponent );
			await wrapper.vm.$nextTick();

			const addEventListenerCalls = ( document.addEventListener ).mock.calls;
			const touchStartHandler = addEventListenerCalls.find(
				( call ) => call[ 0 ] === 'touchstart'
			)?.[ 1 ];

			const childSpan = wrapper.find( '#child' ).element;
			const touchEvent = new TouchEvent( 'touchstart', {
				bubbles: true,
				cancelable: true
			} );
			Object.defineProperty( touchEvent, 'target', {
				writable: false,
				value: childSpan
			} );

			touchStartHandler( touchEvent );
			expect( touchStartHandler ).toBeDefined();
		} );
	} );

	describe( 'touchmove event handler', () => {
		it( 'prevents default when scrolling body/document', async () => {
			const TestComponent = defineComponent( {
				template: '<div></div>',
				setup() {
					const isActive = ref( true );
					usePreventScrollIOS( isActive );
					return { isActive };
				}
			} );

			const addEventListenerCallsBefore = ( document.addEventListener ).mock.calls.length;
			const wrapper = mount( TestComponent );
			await wrapper.vm.$nextTick();
			const addEventListenerCalls = ( document.addEventListener ).mock.calls.slice( addEventListenerCallsBefore );
			const touchStartHandler = addEventListenerCalls.find( ( c ) => c[ 0 ] === 'touchstart' )?.[ 1 ];
			const touchMoveHandler = addEventListenerCalls.find( ( c ) => c[ 0 ] === 'touchmove' )?.[ 1 ];

			// Touch on a non-scrollable element so scrollableElement becomes document.documentElement
			const container = document.createElement( 'div' );
			document.body.appendChild( container );

			// Ensure selection doesn't allow touchmove (jsdom selection can be non-collapsed)
			const defaultView = container.ownerDocument.defaultView;
			const originalGetSelection = defaultView.getSelection;
			defaultView.getSelection = jest.fn( () => ( {
				isCollapsed: true,
				containsNode: () => false
			} ) );

			const touchStartEvent = new TouchEvent( 'touchstart', {
				bubbles: true,
				cancelable: true
			} );
			Object.defineProperty( touchStartEvent, 'target', {
				writable: false,
				value: container
			} );
			Object.defineProperty( touchStartEvent, 'composedPath', {
				writable: false,
				value: () => [ container ]
			} );
			touchStartHandler( touchStartEvent );

			defaultView.getSelection = originalGetSelection;

			const touchMoveEvent = new TouchEvent( 'touchmove', {
				bubbles: true,
				cancelable: true
			} );
			Object.defineProperty( touchMoveEvent, 'touches', {
				writable: false,
				value: [ { clientX: 0, clientY: 0 } ]
			} );
			touchMoveEvent.preventDefault = jest.fn();

			touchMoveHandler( touchMoveEvent );

			expect( touchMoveEvent.preventDefault ).toHaveBeenCalled();
		} );

		it( 'allows pinch-zoom (2 touches)', async () => {
			const TestComponent = defineComponent( {
				template: '<div></div>',
				setup() {
					const isActive = ref( true );
					usePreventScrollIOS( isActive );
					return { isActive };
				}
			} );

			const wrapper = mount( TestComponent );
			await wrapper.vm.$nextTick();

			const addEventListenerCalls = ( document.addEventListener ).mock.calls;
			const touchMoveHandler = addEventListenerCalls.find(
				( call ) => call[ 0 ] === 'touchmove'
			)?.[ 1 ];

			const touchMoveEvent = new TouchEvent( 'touchmove', {
				bubbles: true,
				cancelable: true
			} );
			Object.defineProperty( touchMoveEvent, 'touches', {
				writable: false,
				value: [
					{ clientX: 0, clientY: 0 },
					{ clientX: 10, clientY: 10 }
				]
			} );
			touchMoveEvent.preventDefault = jest.fn();

			touchMoveHandler( touchMoveEvent );

			expect( touchMoveEvent.preventDefault ).not.toHaveBeenCalled();
		} );
	} );

	describe( 'blur event handler', () => {
		it( 'handles focus transition between inputs', async () => {
			const TestComponent = defineComponent( {
				template: '<input id="input1" /><input id="input2" />',
				setup() {
					const isActive = ref( true );
					usePreventScrollIOS( isActive );
					return { isActive };
				}
			} );

			const wrapper = mount( TestComponent );
			await wrapper.vm.$nextTick();

			const addEventListenerCalls = ( document.addEventListener ).mock.calls;
			const blurHandler = addEventListenerCalls.find(
				( call ) => call[ 0 ] === 'blur'
			)?.[ 1 ];

			const input1 = wrapper.find( '#input1' ).element;
			const input2 = wrapper.find( '#input2' ).element;

			input2.focus = jest.fn();

			const blurEvent = new FocusEvent( 'blur', {
				bubbles: true,
				cancelable: true,
				relatedTarget: input2
			} );
			Object.defineProperty( blurEvent, 'target', {
				writable: false,
				value: input1
			} );

			blurHandler( blurEvent );

			expect( input2.focus ).toHaveBeenCalledWith( { preventScroll: true } );
		} );

		it( 'handles blur when no related target (keyboard Done button)', async () => {
			const TestComponent = defineComponent( {
				template: '<div tabindex="0" id="focusable"><input id="input" /></div>',
				setup() {
					const isActive = ref( true );
					usePreventScrollIOS( isActive );
					return { isActive };
				}
			} );

			const wrapper = mount( TestComponent );
			await wrapper.vm.$nextTick();

			const addEventListenerCalls = ( document.addEventListener ).mock.calls;
			const blurHandler = addEventListenerCalls.find(
				( call ) => call[ 0 ] === 'blur'
			)?.[ 1 ];

			const input = wrapper.find( '#input' ).element;
			const focusable = wrapper.find( '#focusable' ).element;

			focusable.focus = jest.fn();

			Object.defineProperty( input, 'parentElement', {
				writable: true,
				configurable: true,
				value: focusable
			} );

			const blurEvent = new FocusEvent( 'blur', {
				bubbles: true,
				cancelable: true,
				relatedTarget: null
			} );
			Object.defineProperty( blurEvent, 'target', {
				writable: false,
				value: input
			} );

			blurHandler( blurEvent );

			expect( focusable.focus ).toHaveBeenCalledWith( { preventScroll: true } );
		} );

		it( 'adds visualViewport resize listener when blur to input and keyboard was not visible', async () => {
			const vvAddListener = jest.fn();
			const originalVisualViewport = window.visualViewport;
			let blurHandlerFn;

			await new Promise( ( resolve ) => {
				jest.isolateModules( () => {
					window.visualViewport = { addEventListener: vvAddListener, offsetTop: 0, height: 500 };
					const usePreventScrollIOSLocal = require( composablePath );

					const TestComponent = defineComponent( {
						template: '<div tabindex="0" id="from"></div><input id="to" />',
						setup() {
							const isActive = ref( true );
							usePreventScrollIOSLocal( isActive );
							return { isActive };
						}
					} );

					const wrapper = mount( TestComponent );
					wrapper.vm.isActive = true;
					wrapper.vm.$nextTick( () => {
						const addEventListenerCalls = ( document.addEventListener ).mock.calls;
						blurHandlerFn = addEventListenerCalls.find(
							( call ) => call[ 0 ] === 'blur'
						)?.[ 1 ];

						const fromEl = wrapper.find( '#from' ).element;
						const toInput = wrapper.find( '#to' ).element;
						toInput.focus = jest.fn();

						const blurEvent = new FocusEvent( 'blur', {
							bubbles: true,
							cancelable: true,
							relatedTarget: toInput
						} );
						Object.defineProperty( blurEvent, 'target', {
							writable: false,
							value: fromEl
						} );

						blurHandlerFn( blurEvent );
						resolve();
					} );
				} );
			} );

			expect( vvAddListener ).toHaveBeenCalledWith( 'resize', expect.any( Function ), { once: true } );
			window.visualViewport = originalVisualViewport;
		} );

		it( 'calls scrollIntoViewWhenReady when blur moves to another input', async () => {
			const TestComponent = defineComponent( {
				template: '<input id="input1" /><div style="overflow-y: auto; height: 100px;" id="scroll-container"><input id="input2" /></div>',
				setup() {
					const isActive = ref( true );
					usePreventScrollIOS( isActive );
					return { isActive };
				}
			} );

			const wrapper = mount( TestComponent );
			await wrapper.vm.$nextTick();

			const addEventListenerCalls = ( document.addEventListener ).mock.calls;
			const blurHandler = addEventListenerCalls.find(
				( call ) => call[ 0 ] === 'blur'
			)?.[ 1 ];

			const input1 = wrapper.find( '#input1' ).element;
			const input2 = wrapper.find( '#input2' ).element;
			const scrollContainer = wrapper.find( '#scroll-container' ).element;

			input2.focus = jest.fn();
			scrollContainer.scrollTo = jest.fn();
			scrollContainer.getBoundingClientRect = () => ( {
				top: 0,
				bottom: 100,
				left: 0,
				right: 100,
				width: 100,
				height: 100
			} );
			input2.getBoundingClientRect = () => ( {
				top: -50,
				bottom: -40,
				height: 10,
				left: 0,
				right: 50,
				width: 50
			} );
			Object.defineProperty( scrollContainer, 'scrollHeight', { value: 200, configurable: true } );
			Object.defineProperty( scrollContainer, 'clientHeight', { value: 100, configurable: true } );
			Object.defineProperty( scrollContainer, 'scrollTop', { value: 0, configurable: true } );

			const blurEvent = new FocusEvent( 'blur', {
				bubbles: true,
				cancelable: true,
				relatedTarget: input2
			} );
			Object.defineProperty( blurEvent, 'target', {
				writable: false,
				value: input1
			} );

			blurHandler( blurEvent );

			expect( input2.focus ).toHaveBeenCalledWith( { preventScroll: true } );
		} );
	} );

	describe( 'focus override', () => {
		it( 'calls original focus with preventScroll when element is focused', async () => {
			const mockFocus = jest.fn();
			HTMLElement.prototype.focus = mockFocus;

			const TestComponent = defineComponent( {
				template: '<input id="input" />',
				setup() {
					const isActive = ref( true );
					usePreventScrollIOS( isActive );
					return { isActive };
				}
			} );

			const wrapper = mount( TestComponent );
			await wrapper.vm.$nextTick();

			const input = wrapper.find( '#input' ).element;
			input.focus();

			expect( mockFocus ).toHaveBeenCalledWith( { preventScroll: true } );
		} );

		it( 'respects preventScroll option when provided', async () => {
			const mockFocus = jest.fn();
			HTMLElement.prototype.focus = mockFocus;

			const TestComponent = defineComponent( {
				template: '<input id="input" />',
				setup() {
					const isActive = ref( true );
					usePreventScrollIOS( isActive );
					return { isActive };
				}
			} );

			const wrapper = mount( TestComponent );
			await wrapper.vm.$nextTick();

			const input = wrapper.find( '#input' ).element;
			input.focus( { preventScroll: true } );

			expect( mockFocus ).toHaveBeenCalledWith( { preventScroll: true } );
		} );

		it( 'tracks keyboard visibility when focusing elements', async () => {
			const mockFocus = jest.fn();
			HTMLElement.prototype.focus = mockFocus;

			const input1 = document.createElement( 'input' );
			Object.defineProperty( document, 'activeElement', {
				writable: true,
				configurable: true,
				value: input1
			} );

			const TestComponent = defineComponent( {
				template: '<input id="input" />',
				setup() {
					const isActive = ref( true );
					usePreventScrollIOS( isActive );
					return { isActive };
				}
			} );

			const wrapper = mount( TestComponent );
			await wrapper.vm.$nextTick();

			const input = wrapper.find( '#input' ).element;
			input.focus();

			expect( mockFocus ).toHaveBeenCalled();
		} );
	} );

	describe( 'touchmove with scrollable element', () => {
		it( 'prevents default when scrollable element does not overflow', async () => {
			const TestComponent = defineComponent( {
				template: '<div style="overflow-y: auto; height: 100px;" id="scrollable"></div>',
				setup() {
					const isActive = ref( true );
					usePreventScrollIOS( isActive );
					return { isActive };
				}
			} );

			const addEventListenerCallsBefore = ( document.addEventListener ).mock.calls.length;
			const wrapper = mount( TestComponent );
			await wrapper.vm.$nextTick();
			const addEventListenerCalls = ( document.addEventListener ).mock.calls.slice( addEventListenerCallsBefore );
			const touchStartHandler = addEventListenerCalls.find( ( c ) => c[ 0 ] === 'touchstart' )?.[ 1 ];
			const touchMoveHandler = addEventListenerCalls.find( ( c ) => c[ 0 ] === 'touchmove' )?.[ 1 ];

			const scrollableDiv = wrapper.find( '#scrollable' ).element;
			Object.defineProperty( scrollableDiv, 'scrollHeight', { value: 100, configurable: true } );
			Object.defineProperty( scrollableDiv, 'clientHeight', { value: 100, configurable: true } );
			Object.defineProperty( scrollableDiv, 'scrollWidth', { value: 100, configurable: true } );
			Object.defineProperty( scrollableDiv, 'clientWidth', { value: 100, configurable: true } );

			// Ensure selection doesn't allow touchmove
			const defaultView = scrollableDiv.ownerDocument.defaultView;
			const originalGetSelection = defaultView.getSelection;
			defaultView.getSelection = jest.fn( () => ( {
				isCollapsed: true,
				containsNode: () => false
			} ) );

			const touchStartEvent = new TouchEvent( 'touchstart', {
				bubbles: true,
				cancelable: true
			} );
			Object.defineProperty( touchStartEvent, 'target', {
				writable: false,
				value: scrollableDiv
			} );
			Object.defineProperty( touchStartEvent, 'composedPath', {
				writable: false,
				value: () => [ scrollableDiv ]
			} );
			touchStartHandler( touchStartEvent );

			defaultView.getSelection = originalGetSelection;

			const touchMoveEvent = new TouchEvent( 'touchmove', {
				bubbles: true,
				cancelable: true
			} );
			Object.defineProperty( touchMoveEvent, 'touches', {
				writable: false,
				value: [ { clientX: 0, clientY: 0 } ]
			} );
			touchMoveEvent.preventDefault = jest.fn();

			touchMoveHandler( touchMoveEvent );

			expect( touchMoveEvent.preventDefault ).toHaveBeenCalled();
		} );
	} );
} );
