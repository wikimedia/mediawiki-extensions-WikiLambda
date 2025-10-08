/*!
 * WikiLambda unit test suite for the useScroll composable.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const loadComposable = require( '../helpers/loadComposable.js' );
const { mockWindowLocation, restoreWindowLocation } = require( '../fixtures/location.js' );

// Create mock functions
const mockScrollUtils = {
	scrollToElement: jest.fn(),
	scrollToCurrentHash: jest.fn(),
	scrollToElementWithRetry: jest.fn(),
	scrollToCurrentHashWithRetry: jest.fn(),
	createDebouncedHashScroll: jest.fn()
};

// Mock the scrollUtils module
jest.doMock( '../../../resources/ext.wikilambda.app/utils/scrollUtils.js', () => mockScrollUtils );

// Now require the composable after mocking
const useScroll = require( '../../../resources/ext.wikilambda.app/composables/useScroll.js' );

describe( 'useScroll', () => {
	let wrapper, scroll;
	let mockAddEventListener;
	let mockRemoveEventListener;

	beforeEach( () => {
		// Use fake timers for setTimeout testing
		jest.useFakeTimers();

		// Mock window event listeners
		mockAddEventListener = jest.fn();
		mockRemoveEventListener = jest.fn();
		Object.defineProperty( window, 'addEventListener', {
			writable: true,
			value: mockAddEventListener
		} );
		Object.defineProperty( window, 'removeEventListener', {
			writable: true,
			value: mockRemoveEventListener
		} );

		// Mock window.location using helper
		mockWindowLocation( 'http://example.com' );

		// Then set up mock return values
		mockScrollUtils.scrollToElement.mockResolvedValue( true );
		mockScrollUtils.scrollToCurrentHash.mockResolvedValue( true );
		mockScrollUtils.scrollToElementWithRetry.mockResolvedValue( true );
		mockScrollUtils.scrollToCurrentHashWithRetry.mockResolvedValue( true );
		mockScrollUtils.createDebouncedHashScroll.mockReturnValue( jest.fn() );

		const [ result, wrapperInstance ] = loadComposable( () => useScroll() );
		wrapper = wrapperInstance;
		scroll = result;
	} );

	afterEach( () => {
		restoreWindowLocation();
		jest.useRealTimers();
	} );

	describe( 'component lifecycle', () => {
		it( 'sets up hash navigation on mount', () => {

			expect( mockScrollUtils.createDebouncedHashScroll ).toHaveBeenCalled();
			expect( mockAddEventListener ).toHaveBeenCalledWith( 'hashchange', expect.any( Function ) );
		} );

		it( 'removes hash navigation listener on unmount', () => {
			wrapper.unmount();

			expect( mockRemoveEventListener ).toHaveBeenCalledWith( 'hashchange', expect.any( Function ) );
		} );
	} );

	describe( 'scrollToElement', () => {
		it( 'calls scrollUtils.scrollToElement with element ID', async () => {
			await scroll.scrollToElement( 'test-element', { behavior: 'smooth' } );

			expect( mockScrollUtils.scrollToElement ).toHaveBeenCalledWith( 'test-element', { behavior: 'smooth' } );
		} );

		it( 'uses default options when no options provided', async () => {
			await scroll.scrollToElement( 'test-element' );

			expect( mockScrollUtils.scrollToElement ).toHaveBeenCalledWith( 'test-element', {} );
		} );
	} );

	describe( 'scrollToCurrentHash', () => {
		it( 'calls scrollUtils.scrollToCurrentHash', async () => {
			await scroll.scrollToCurrentHash( { block: 'center' } );

			expect( mockScrollUtils.scrollToCurrentHash ).toHaveBeenCalledWith( { block: 'center' } );
		} );
	} );

	describe( 'scrollToElementWithRetry', () => {
		it( 'calls scrollUtils.scrollToElementWithRetry with retry options', async () => {
			await scroll.scrollToElementWithRetry( 'test-element', { maxRetries: 5, retryDelay: 100 } );

			expect( mockScrollUtils.scrollToElementWithRetry ).toHaveBeenCalledWith(
				'test-element',
				{ maxRetries: 5, retryDelay: 100 }
			);
		} );
	} );

	describe( 'scrollToCurrentHashWithRetry', () => {
		it( 'calls scrollUtils.scrollToCurrentHashWithRetry', async () => {
			await scroll.scrollToCurrentHashWithRetry( { maxRetries: 10 } );

			expect( mockScrollUtils.scrollToCurrentHashWithRetry ).toHaveBeenCalledWith( { maxRetries: 10 } );
		} );
	} );

	describe( 'setupHashNavigation', () => {
		it( 'creates debounced hash scroll handler', () => {
			scroll.setupHashNavigation( { behavior: 'auto' } );

			expect( mockScrollUtils.createDebouncedHashScroll ).toHaveBeenCalledWith( { behavior: 'auto' } );
		} );
	} );

	describe( 'cleanupHashNavigation', () => {
		it( 'removes event listener', () => {
			scroll.cleanupHashNavigation();

			expect( mockRemoveEventListener ).toHaveBeenCalled();
		} );
	} );

	describe( 'hasScrolledToHash', () => {
		it( 'starts as false and becomes true after scrollToHashOnMount', () => {
			// After mount, hasScrolledToHash should be true (called automatically in onMounted)
			expect( scroll.hasScrolledToHash.value ).toBe( true );
		} );

		it( 'prevents multiple scrolls to hash', () => {
			// Clear the call from onMounted
			mockScrollUtils.scrollToCurrentHashWithRetry.mockClear();

			scroll.scrollToHashOnMount();
			scroll.scrollToHashOnMount();

			// Should not call again because hasScrolledToHash is already true
			expect( mockScrollUtils.scrollToCurrentHashWithRetry ).not.toHaveBeenCalled();
		} );
	} );

	describe( 'handleHashChange', () => {
		it( 'calls scrollToCurrentHashWithRetry with default options', () => {
			// Reset the mock to track new calls
			mockScrollUtils.scrollToCurrentHashWithRetry.mockClear();

			// Call handleHashChange directly
			scroll.handleHashChange();

			expect( mockScrollUtils.scrollToCurrentHashWithRetry ).toHaveBeenCalledWith( {} );
		} );

		it( 'calls scrollToCurrentHashWithRetry with custom options', () => {
			// Reset the mock to track new calls
			mockScrollUtils.scrollToCurrentHashWithRetry.mockClear();

			// Call handleHashChange with custom options
			scroll.handleHashChange( { behavior: 'smooth' } );

			expect( mockScrollUtils.scrollToCurrentHashWithRetry ).toHaveBeenCalledWith( { behavior: 'smooth' } );
		} );
	} );

	describe( 'scrollToHashOnMount timeout', () => {
		it( 'uses setTimeout to delay scroll execution', async () => {
			// Clear the mock to track new calls
			mockScrollUtils.scrollToCurrentHashWithRetry.mockClear();

			// Reset hasScrolledToHash to allow new calls
			scroll.hasScrolledToHash.value = false;

			// Call the function
			scroll.scrollToHashOnMount( { behavior: 'auto' } );

			// Initially should not be called yet
			expect( mockScrollUtils.scrollToCurrentHashWithRetry ).not.toHaveBeenCalled();

			// Advance timers by 50ms to trigger the setTimeout callback
			jest.advanceTimersByTime( 50 );

			// Now should be called with merged options
			expect( mockScrollUtils.scrollToCurrentHashWithRetry ).toHaveBeenCalledWith(
				expect.objectContaining( { behavior: 'auto' } )
			);
		} );
	} );
} );
