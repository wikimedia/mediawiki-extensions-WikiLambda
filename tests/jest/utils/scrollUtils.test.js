/*!
 * WikiLambda unit test suite for the scrollUtils utility.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const scrollUtils = require( '../../../resources/ext.wikilambda.app/utils/scrollUtils.js' );
const { mockWindowLocation, restoreWindowLocation } = require( '../fixtures/location.js' );

describe( 'scrollUtils', () => {
	let mockElement;
	let mockScrollTo;
	let mockScrollIntoView;

	beforeEach( () => {
		// Mock DOM element
		mockScrollIntoView = jest.fn();
		mockElement = {
			getBoundingClientRect: jest.fn().mockReturnValue( {
				top: 100,
				left: 0,
				width: 200,
				height: 50
			} ),
			scrollIntoView: mockScrollIntoView
		};

		// Mock window methods
		mockScrollTo = jest.fn();
		Object.defineProperty( window, 'scrollTo', {
			writable: true,
			value: mockScrollTo
		} );

		Object.defineProperty( window, 'pageYOffset', {
			writable: true,
			value: 500
		} );

		// Mock document.getElementById
		document.getElementById = jest.fn();

		// Mock window.location
		mockWindowLocation( 'http://example.com' );

		// Clear all mocks
		jest.clearAllMocks();
	} );

	afterEach( () => {
		restoreWindowLocation();
		jest.restoreAllMocks();
	} );

	describe( 'scrollToElement', () => {
		it( 'scrolls to element using scrollIntoView when no offset', async () => {
			document.getElementById.mockReturnValue( mockElement );

			const result = await scrollUtils.scrollToElement( 'test-element' );

			expect( document.getElementById ).toHaveBeenCalledWith( 'test-element' );
			expect( mockScrollIntoView ).toHaveBeenCalledWith( {
				behavior: 'smooth',
				block: 'start',
				inline: 'nearest'
			} );
			expect( result ).toBe( true );
		} );

		it( 'scrolls to element using window.scrollTo when offset provided', async () => {
			document.getElementById.mockReturnValue( mockElement );

			const result = await scrollUtils.scrollToElement( 'test-element', { offset: 80 } );

			expect( document.getElementById ).toHaveBeenCalledWith( 'test-element' );
			expect( mockScrollTo ).toHaveBeenCalledWith( {
				top: 520, // 100 (element top) + 500 (pageYOffset) - 80 (offset)
				behavior: 'smooth'
			} );
			expect( mockScrollIntoView ).not.toHaveBeenCalled();
			expect( result ).toBe( true );
		} );

		it( 'returns false when element not found', async () => {
			document.getElementById.mockReturnValue( null );

			const result = await scrollUtils.scrollToElement( 'nonexistent-element' );

			expect( document.getElementById ).toHaveBeenCalledWith( 'nonexistent-element' );
			expect( mockScrollIntoView ).not.toHaveBeenCalled();
			expect( mockScrollTo ).not.toHaveBeenCalled();
			expect( result ).toBe( false );
		} );

		it( 'uses custom scroll options', async () => {
			document.getElementById.mockReturnValue( mockElement );

			await scrollUtils.scrollToElement( 'test-element', {
				behavior: 'auto',
				block: 'center',
				inline: 'start'
			} );

			expect( mockScrollIntoView ).toHaveBeenCalledWith( {
				behavior: 'auto',
				block: 'center',
				inline: 'start'
			} );
		} );

		it( 'delays scroll when delay option provided', async () => {
			document.getElementById.mockReturnValue( mockElement );
			jest.useFakeTimers();

			const scrollPromise = scrollUtils.scrollToElement( 'test-element', { delay: 100 } );

			// Should not have scrolled yet
			expect( mockScrollIntoView ).not.toHaveBeenCalled();

			// Fast-forward time
			jest.advanceTimersByTime( 100 );

			const result = await scrollPromise;

			expect( mockScrollIntoView ).toHaveBeenCalled();
			expect( result ).toBe( true );

			jest.useRealTimers();
		} );
	} );

	describe( 'scrollToCurrentHash', () => {
		it( 'scrolls to element when hash exists', async () => {
			mockWindowLocation( 'http://example.com#test-element' );
			document.getElementById.mockReturnValue( mockElement );

			const result = await scrollUtils.scrollToCurrentHash();

			expect( document.getElementById ).toHaveBeenCalledWith( 'test-element' );
			expect( mockScrollIntoView ).toHaveBeenCalled();
			expect( result ).toBe( true );
		} );

		it( 'returns false when no hash', async () => {
			mockWindowLocation( 'http://example.com' );

			const result = await scrollUtils.scrollToCurrentHash();

			expect( document.getElementById ).not.toHaveBeenCalled();
			expect( result ).toBe( false );
		} );

		it( 'returns false when hash is just #', async () => {
			mockWindowLocation( 'http://example.com#' );

			const result = await scrollUtils.scrollToCurrentHash();

			expect( document.getElementById ).not.toHaveBeenCalled();
			expect( result ).toBe( false );
		} );

		it( 'passes options to scrollToElement', async () => {
			mockWindowLocation( 'http://example.com#test-element' );
			document.getElementById.mockReturnValue( mockElement );

			await scrollUtils.scrollToCurrentHash( {
				behavior: 'auto',
				block: 'end'
			} );

			expect( mockScrollIntoView ).toHaveBeenCalledWith( {
				behavior: 'auto',
				block: 'end',
				inline: 'nearest'
			} );
		} );
	} );

	describe( 'scrollToElementWithRetry', () => {
		it( 'succeeds on first attempt when element exists', async () => {
			document.getElementById.mockReturnValue( mockElement );

			const result = await scrollUtils.scrollToElementWithRetry( 'test-element' );

			expect( document.getElementById ).toHaveBeenCalledTimes( 1 );
			expect( mockScrollIntoView ).toHaveBeenCalled();
			expect( result ).toBe( true );
		} );

		it( 'retries when element not found initially', async () => {
			jest.useFakeTimers();

			// First call returns null, second call returns element
			document.getElementById
				.mockReturnValueOnce( null )
				.mockReturnValueOnce( mockElement );

			const retryPromise = scrollUtils.scrollToElementWithRetry( 'test-element', {
				maxRetries: 2,
				retryDelay: 50
			} );

			// First attempt should fail
			await Promise.resolve();
			expect( document.getElementById ).toHaveBeenCalledTimes( 1 );
			expect( mockScrollIntoView ).not.toHaveBeenCalled();

			// Fast-forward to trigger retry
			jest.advanceTimersByTime( 50 );
			const result = await retryPromise;

			expect( document.getElementById ).toHaveBeenCalledTimes( 2 );
			expect( mockScrollIntoView ).toHaveBeenCalled();
			expect( result ).toBe( true );

			jest.useRealTimers();
		} );

		it( 'gives up after max retries', async () => {
			// The problem is that scrollToElement returns a Promise,
			// and the nested setTimeout with promise chains makes it very complex for Jest's fake timers.
			// So, we're using the original setTimeout instead of the Jest mock.
			const originalSetTimeout = global.setTimeout;
			global.setTimeout = jest.fn( ( callback ) => {
				callback();
				return 1;
			} );

			document.getElementById.mockReturnValue( null );

			const result = await scrollUtils.scrollToElementWithRetry( 'test-element', {
				maxRetries: 2,
				retryDelay: 50
			} );

			expect( document.getElementById ).toHaveBeenCalledTimes( 3 ); // Initial + 2 retries
			expect( mockScrollIntoView ).not.toHaveBeenCalled();
			expect( result ).toBe( false );

			// Restore original setTimeout
			global.setTimeout = originalSetTimeout;
		} );

		it( 'uses default retry options', async () => {
			// The problem is that scrollToElement returns a Promise,
			// and the nested setTimeout with promise chains makes it very complex for Jest's fake timers.
			// So, we're using the original setTimeout instead of the Jest mock.
			const originalSetTimeout = global.setTimeout;
			global.setTimeout = jest.fn( ( callback ) => {
				callback();
				return 1;
			} );

			document.getElementById.mockReturnValue( null );

			await scrollUtils.scrollToElementWithRetry( 'test-element' );

			expect( document.getElementById ).toHaveBeenCalledTimes( 11 ); // Initial + 10 retries

			// Restore original setTimeout
			global.setTimeout = originalSetTimeout;
		} );
	} );

	describe( 'scrollToCurrentHashWithRetry', () => {
		it( 'scrolls to hash with retry logic', async () => {
			mockWindowLocation( 'http://example.com#test-element' );
			document.getElementById.mockReturnValue( mockElement );

			const result = await scrollUtils.scrollToCurrentHashWithRetry();

			expect( document.getElementById ).toHaveBeenCalledWith( 'test-element' );
			expect( result ).toBe( true );
		} );

		it( 'returns false when no hash', async () => {
			mockWindowLocation( 'http://example.com' );

			const result = await scrollUtils.scrollToCurrentHashWithRetry();

			expect( document.getElementById ).not.toHaveBeenCalled();
			expect( result ).toBe( false );
		} );

		it( 'retries when element not found', async () => {
			// The problem is that scrollToElement returns a Promise,
			// and the nested setTimeout with promise chains makes it very complex for Jest's fake timers.
			// So, we're using the original setTimeout instead of the Jest mock.
			const originalSetTimeout = global.setTimeout;
			global.setTimeout = jest.fn( ( callback ) => {
				callback();
				return 1;
			} );

			mockWindowLocation( 'http://example.com#test-element' );

			document.getElementById
				.mockReturnValueOnce( null )
				.mockReturnValueOnce( mockElement );

			const result = await scrollUtils.scrollToCurrentHashWithRetry( {
				maxRetries: 1,
				retryDelay: 50
			} );

			expect( document.getElementById ).toHaveBeenCalledTimes( 2 );
			expect( result ).toBe( true );

			// Restore original setTimeout
			global.setTimeout = originalSetTimeout;
		} );
	} );

	describe( 'createDebouncedHashScroll', () => {
		it( 'creates a debounced function', () => {
			const debouncedFn = scrollUtils.createDebouncedHashScroll();

			expect( typeof debouncedFn ).toBe( 'function' );
		} );

		it( 'debounces multiple rapid calls', async () => {
			jest.useFakeTimers();
			mockWindowLocation( 'http://example.com#test-element' );
			document.getElementById.mockReturnValue( mockElement );

			const debouncedFn = scrollUtils.createDebouncedHashScroll( {}, 100 );

			// Call multiple times rapidly
			debouncedFn();
			debouncedFn();
			debouncedFn();

			// Should not have scrolled yet
			expect( document.getElementById ).not.toHaveBeenCalled();

			// Fast-forward past debounce delay
			jest.advanceTimersByTime( 100 );

			// Allow promises to resolve
			await Promise.resolve();

			// Should have scrolled only once
			expect( document.getElementById ).toHaveBeenCalledTimes( 1 );

			jest.useRealTimers();
		} );

		it( 'uses custom debounce delay', async () => {
			jest.useFakeTimers();
			mockWindowLocation( 'http://example.com#test-element' );
			document.getElementById.mockReturnValue( mockElement );

			const debouncedFn = scrollUtils.createDebouncedHashScroll( {}, 500 );

			debouncedFn();

			// Should not scroll before custom delay
			jest.advanceTimersByTime( 400 );
			expect( document.getElementById ).not.toHaveBeenCalled();

			// Should scroll after custom delay
			jest.advanceTimersByTime( 100 );
			await Promise.resolve();
			expect( document.getElementById ).toHaveBeenCalled();

			jest.useRealTimers();
		} );

		it( 'cancels previous timeout on new call', async () => {
			jest.useFakeTimers();
			mockWindowLocation( 'http://example.com#test-element' );
			document.getElementById.mockReturnValue( mockElement );

			const debouncedFn = scrollUtils.createDebouncedHashScroll( {}, 100 );

			debouncedFn();
			jest.advanceTimersByTime( 50 );

			// Call again before first timeout completes
			debouncedFn();
			jest.advanceTimersByTime( 50 );

			// Should not have scrolled yet (first timeout was cancelled)
			expect( document.getElementById ).not.toHaveBeenCalled();

			// Complete the second timeout
			jest.advanceTimersByTime( 50 );
			await Promise.resolve();

			// Should have scrolled only once
			expect( document.getElementById ).toHaveBeenCalledTimes( 1 );

			jest.useRealTimers();
		} );
	} );
} );
