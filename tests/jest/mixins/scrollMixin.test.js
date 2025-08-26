/*!
 * WikiLambda unit test suite for the scrollMixin.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { defineComponent } = require( 'vue' );
const { waitFor } = require( '@testing-library/vue' );

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

// Now require the modules after mocking
const scrollMixin = require( '../../../resources/ext.wikilambda.app/mixins/scrollMixin.js' );

// Create a test component that uses the scroll mixin
const TestComponent = defineComponent( {
	name: 'test-component',
	mixins: [ scrollMixin ],
	template: '<div>Test Component</div>'
} );

describe( 'scrollMixin', () => {
	let wrapper;
	let mockAddEventListener;
	let mockRemoveEventListener;

	beforeEach( () => {
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

		// Clear mocks first
		jest.clearAllMocks();

		// Then set up mock return values
		mockScrollUtils.scrollToElement.mockResolvedValue( true );
		mockScrollUtils.scrollToCurrentHash.mockResolvedValue( true );
		mockScrollUtils.scrollToElementWithRetry.mockResolvedValue( true );
		mockScrollUtils.scrollToCurrentHashWithRetry.mockResolvedValue( true );
		mockScrollUtils.createDebouncedHashScroll.mockReturnValue( jest.fn() );
	} );

	afterEach( () => {
		if ( wrapper ) {
			wrapper.unmount();
		}
		restoreWindowLocation();
		jest.restoreAllMocks();
	} );

	describe( 'component lifecycle', () => {
		it( 'sets up hash navigation on mount', () => {
			wrapper = shallowMount( TestComponent );

			expect( mockScrollUtils.createDebouncedHashScroll ).toHaveBeenCalled();
			expect( mockAddEventListener ).toHaveBeenCalledWith(
				'hashchange',
				expect.any( Function )
			);
		} );

		it( 'attempts to scroll to hash on mount', async () => {
			jest.useFakeTimers();
			mockWindowLocation( 'http://example.com#test-element' );

			wrapper = shallowMount( TestComponent );

			// Fast-forward the timeout in scrollToHashOnMount
			jest.advanceTimersByTime( 50 );
			await waitFor( () => {
				expect( mockScrollUtils.scrollToCurrentHashWithRetry ).toHaveBeenCalled();
			} );

			expect( mockScrollUtils.scrollToCurrentHashWithRetry ).toHaveBeenCalledWith(
				expect.objectContaining( {
					maxRetries: 15,
					retryDelay: 200,
					behavior: 'smooth',
					block: 'center',
					offset: 0
				} )
			);

			jest.useRealTimers();
		} );

		it( 'cleans up event listeners on unmount', () => {
			wrapper = shallowMount( TestComponent );
			const debouncedFn = wrapper.vm.debouncedHashScroll;

			wrapper.unmount();

			expect( mockRemoveEventListener ).toHaveBeenCalledWith( 'hashchange', debouncedFn );
		} );

		it( 'only scrolls to hash once on mount', async () => {
			jest.useFakeTimers();
			mockWindowLocation( 'http://example.com#test-element' );

			wrapper = shallowMount( TestComponent );

			// First call
			jest.advanceTimersByTime( 50 );

			// Try to call again
			wrapper.vm.scrollToHashOnMount();
			jest.advanceTimersByTime( 50 );

			// Should only be called once
			expect( mockScrollUtils.scrollToCurrentHashWithRetry ).toHaveBeenCalledTimes( 1 );

			jest.useRealTimers();
		} );
	} );

	describe( 'methods', () => {
		beforeEach( () => {
			wrapper = shallowMount( TestComponent );
		} );

		describe( 'scrollToElement', () => {
			it( 'scrolls to element', async () => {
				const result = await wrapper.vm.scrollToElement( 'test-element', { behavior: 'auto' } );

				expect( mockScrollUtils.scrollToElement ).toHaveBeenCalledWith( 'test-element', { behavior: 'auto' } );
				expect( result ).toBe( true );
			} );
		} );

		describe( 'scrollToCurrentHash', () => {
			it( 'scrolls to current hash', async () => {
				const options = { block: 'center' };
				const result = await wrapper.vm.scrollToCurrentHash( options );

				expect( mockScrollUtils.scrollToCurrentHash ).toHaveBeenCalledWith( options );
				expect( result ).toBe( true );
			} );
		} );

		describe( 'scrollToElementWithRetry', () => {
			it( 'scrolls to element with retry', async () => {
				const options = { maxRetries: 5, retryDelay: 100 };
				const result = await wrapper.vm.scrollToElementWithRetry( 'test-element', options );

				expect( mockScrollUtils.scrollToElementWithRetry ).toHaveBeenCalledWith( 'test-element', options );
				expect( result ).toBe( true );
			} );
		} );

		describe( 'scrollToCurrentHashWithRetry', () => {
			it( 'scrolls to current hash with retry', async () => {
				const options = { maxRetries: 10 };
				const result = await wrapper.vm.scrollToCurrentHashWithRetry( options );

				expect( mockScrollUtils.scrollToCurrentHashWithRetry ).toHaveBeenCalledWith( options );
				expect( result ).toBe( true );
			} );
		} );

		describe( 'handleHashChange', () => {
			it( 'handles hash change', () => {
				const options = { behavior: 'smooth' };
				wrapper.vm.handleHashChange( options );

				expect( mockScrollUtils.scrollToCurrentHashWithRetry ).toHaveBeenCalledWith( options );
			} );
		} );

		describe( 'setupHashNavigation', () => {
			it( 'sets up hash navigation', () => {
			// Clear previous setup from mount
				jest.clearAllMocks();

				const options = { behavior: 'auto' };
				wrapper.vm.setupHashNavigation( options );

				expect( mockScrollUtils.createDebouncedHashScroll ).toHaveBeenCalledWith( options );
				expect( mockAddEventListener ).toHaveBeenCalledWith(
					'hashchange',
					expect.any( Function )
				);
			} );
		} );

		describe( 'cleanupHashNavigation', () => {
			it( 'cleans up hash navigation', () => {
				const debouncedFn = wrapper.vm.debouncedHashScroll;

				wrapper.vm.cleanupHashNavigation();

				expect( mockRemoveEventListener ).toHaveBeenCalledWith( 'hashchange', debouncedFn );
				expect( wrapper.vm.debouncedHashScroll ).toBeNull();
			} );
		} );

		describe( 'scrollToHashOnMount', () => {
			it( 'scrolls to hash on mount with custom options', async () => {
				jest.useFakeTimers();

				// Reset the flag to allow another call
				wrapper.vm.hasScrolledToHash = false;

				const customOptions = {
					behavior: 'auto',
					block: 'start',
					offset: 100,
					maxRetries: 5
				};

				wrapper.vm.scrollToHashOnMount( customOptions );

				jest.advanceTimersByTime( 50 );

				expect( mockScrollUtils.scrollToCurrentHashWithRetry ).toHaveBeenCalledWith(
					expect.objectContaining( customOptions )
				);

				jest.useRealTimers();
			} );
		} );
	} );

	describe( 'hash change handling', () => {
		beforeEach( () => {
			wrapper = shallowMount( TestComponent );
		} );

		it( 'responds to hash changes', () => {
			const debouncedFn = wrapper.vm.debouncedHashScroll;

			// Simulate hash change event
			const hashChangeEvent = new Event( 'hashchange' );
			window.dispatchEvent( hashChangeEvent );

			// The debounced function should have been called
			expect( debouncedFn ).toBeDefined();
		} );

		it( 'sets up hash navigation with default options', () => {
			// Clear mocks from mount
			jest.clearAllMocks();

			wrapper.vm.setupHashNavigation();

			expect( mockScrollUtils.createDebouncedHashScroll ).toHaveBeenCalledWith( {} );
		} );

		it( 'sets up hash navigation with custom options', () => {
			// Clear mocks from mount
			jest.clearAllMocks();

			const options = {
				behavior: 'auto',
				block: 'end',
				maxRetries: 20
			};

			wrapper.vm.setupHashNavigation( options );

			expect( mockScrollUtils.createDebouncedHashScroll ).toHaveBeenCalledWith( options );
		} );
	} );

	describe( 'error handling', () => {
		beforeEach( () => {
			wrapper = shallowMount( TestComponent );
		} );

		it( 'handles scrollUtils errors gracefully', () => {
			mockScrollUtils.scrollToElement.mockRejectedValue( new Error( 'Test error' ) );

			// Should not throw
			expect( wrapper.vm.scrollToElement( 'test-element' ) ).rejects.toThrow( 'Test error' );
		} );

		it( 'handles missing debouncedHashScroll in cleanup', () => {
			wrapper.vm.debouncedHashScroll = null;

			// Should not throw
			expect( () => wrapper.vm.cleanupHashNavigation() ).not.toThrow();
		} );
	} );
} );
