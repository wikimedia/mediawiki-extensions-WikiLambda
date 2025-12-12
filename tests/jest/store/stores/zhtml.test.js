/*!
 * WikiLambda unit test suite for the zhtml store.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { createPinia, setActivePinia } = require( 'pinia' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'zhtml store', () => {
	let store;
	let mockPostWithEditToken;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		// Initialize Maps in store state
		store.sanitizationCache = new Map();
		store.pendingPromises = new Map();

		// Mock mw.Api's postWithEditToken method
		mockPostWithEditToken = jest.fn().mockResolvedValue( {
			wikifunctions_html_sanitiser: { value: '' }
		} );
		mw.Api = jest.fn( () => ( {
			postWithEditToken: mockPostWithEditToken
		} ) );
	} );

	describe( 'sanitiseHtml', () => {
		it( 'returns empty string promise for empty HTML', async () => {
			const result = await store.sanitiseHtml( '' );
			expect( result ).toBe( '' );
			expect( mockPostWithEditToken ).not.toHaveBeenCalled();
		} );

		it( 'calls API and returns sanitized HTML', async () => {
			const rawHtml = '<script>alert("xss")</script><p>Safe content</p>';
			const sanitizedHtml = '<p>Safe content</p>';
			mockPostWithEditToken.mockResolvedValueOnce( {
				wikifunctions_html_sanitiser: { value: sanitizedHtml }
			} );

			const result = await store.sanitiseHtml( rawHtml );

			expect( mockPostWithEditToken ).toHaveBeenCalledWith( {
				action: 'wikifunctions_html_sanitiser',
				format: 'json',
				formatversion: '2',
				html: rawHtml
			}, {
				signal: undefined
			} );
			expect( result ).toBe( sanitizedHtml );
		} );

		it( 'caches sanitized HTML and returns cached value on second call', async () => {
			const rawHtml = '<p>Test content</p>';
			const sanitizedHtml = '<p>Test content</p>';
			mockPostWithEditToken.mockResolvedValueOnce( {
				wikifunctions_html_sanitiser: { value: sanitizedHtml }
			} );

			// First call
			const result1 = await store.sanitiseHtml( rawHtml );
			expect( mockPostWithEditToken ).toHaveBeenCalledTimes( 1 );
			expect( result1 ).toBe( sanitizedHtml );

			// Second call with same HTML - should use cache
			const result2 = await store.sanitiseHtml( rawHtml );
			expect( mockPostWithEditToken ).toHaveBeenCalledTimes( 1 ); // Still 1, not 2
			expect( result2 ).toBe( sanitizedHtml );
		} );

		it( 'coalesces concurrent requests for the same HTML', async () => {
			const rawHtml = '<p>Test</p>';
			const sanitizedHtml = '<p>Test</p>';
			let resolvePromise;
			const promise = new Promise( ( resolve ) => {
				resolvePromise = resolve;
			} );
			mockPostWithEditToken.mockReturnValueOnce( promise );

			// Start two concurrent requests
			const promise1 = store.sanitiseHtml( rawHtml );
			const promise2 = store.sanitiseHtml( rawHtml );

			// Wait for hash to resolve and API call to be made
			// webcrypto.digest uses microtasks, so we need to wait for the event loop
			await new Promise( ( resolve ) => {
				setTimeout( resolve, 0 );
			} );
			await new Promise( ( resolve ) => {
				setTimeout( resolve, 0 );
			} );

			// Both requests should result in the same API call being made
			// (after hashing, they'll have the same hash and coalesce at the sanitization level)
			expect( mockPostWithEditToken ).toHaveBeenCalledTimes( 1 );

			// Resolve the API call
			resolvePromise( {
				wikifunctions_html_sanitiser: { value: sanitizedHtml }
			} );

			const result1 = await promise1;
			const result2 = await promise2;

			expect( result1 ).toBe( sanitizedHtml );
			expect( result2 ).toBe( sanitizedHtml );
		} );

		it( 'handles API errors by returning empty string', async () => {
			const rawHtml = '<p>Test</p>';
			mockPostWithEditToken.mockRejectedValueOnce( new Error( 'API error' ) );

			const result = await store.sanitiseHtml( rawHtml );

			expect( result ).toBe( '' );
		} );

		it( 'caches error fallback result (empty string) for failed requests', async () => {
			const rawHtml = '<p>Test</p>';
			mockPostWithEditToken.mockRejectedValueOnce( new Error( 'API error' ) );

			// First call - should error and cache empty string
			const result1 = await store.sanitiseHtml( rawHtml );
			expect( result1 ).toBe( '' );
			expect( mockPostWithEditToken ).toHaveBeenCalledTimes( 1 );

			// Second call - should return cached empty string
			const result2 = await store.sanitiseHtml( rawHtml );
			expect( result2 ).toBe( '' );
			expect( mockPostWithEditToken ).toHaveBeenCalledTimes( 1 ); // Still 1, not 2
		} );

		it( 'passes AbortSignal if provided', async () => {
			const rawHtml = '<p>Test</p>';
			const abortSignal = { aborted: false };
			mockPostWithEditToken.mockResolvedValueOnce( {
				wikifunctions_html_sanitiser: { value: rawHtml }
			} );

			await store.sanitiseHtml( rawHtml, abortSignal );

			expect( mockPostWithEditToken ).toHaveBeenCalledWith( {
				action: 'wikifunctions_html_sanitiser',
				format: 'json',
				formatversion: '2',
				html: rawHtml
			}, {
				signal: abortSignal
			} );
		} );
	} );

	describe( 'clearSanitizationCache', () => {
		it( 'clears the sanitization cache', async () => {
			const rawHtml = '<p>Test</p>';
			const sanitizedHtml = '<p>Test</p>';
			mockPostWithEditToken.mockResolvedValue( {
				wikifunctions_html_sanitiser: { value: sanitizedHtml }
			} );

			// First call - caches result
			await store.sanitiseHtml( rawHtml );
			expect( mockPostWithEditToken ).toHaveBeenCalledTimes( 1 );

			// Clear cache
			store.clearSanitizationCache();

			// Second call - should make new API call
			await store.sanitiseHtml( rawHtml );
			expect( mockPostWithEditToken ).toHaveBeenCalledTimes( 2 );
		} );
	} );
} );
