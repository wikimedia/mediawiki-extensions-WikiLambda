/*!
 * WikiLambda Vue editor: HTML Fragment sanitization store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const apiUtils = require( '../../utils/apiUtils.js' );

module.exports = {
	state: {
		/**
		 * Cache for sanitized HTML fragments.
		 * Key: SHA-256 hash of raw HTML string
		 * Value: sanitized HTML string
		 *
		 * @type {Map<string, string>}
		 */
		sanitizationCache: new Map(),

		/**
		 * Map of in-flight sanitization promises.
		 * Key: SHA-256 hash of raw HTML string
		 * Value: Promise resolving to sanitized HTML string
		 *
		 * @type {Map<string, Promise<string>>}
		 */
		pendingPromises: new Map()
	},

	getters: {},

	actions: {
		/**
		 * Computes SHA-256 hash of a string and returns it as a hex string.
		 *
		 * @param {string} input - The string to hash
		 * @return {Promise<string>} Promise resolving to the hex hash string
		 */
		sha256Hex: function ( input ) {
			const enc = new TextEncoder();
			const data = enc.encode( input );
			return crypto.subtle.digest( 'SHA-256', data ).then( ( hashBuf ) => {
				const hashArr = Array.from( new Uint8Array( hashBuf ) );
				return hashArr.map( ( b ) => b.toString( 16 ).padStart( 2, '0' ) ).join( '' );
			} );
		},

		/**
		 * Sanitises HTML fragment with caching.
		 * Returns cached result if available, otherwise calls API and caches result.
		 *
		 * @param {string} html - The raw HTML to sanitise
		 * @param {AbortSignal} [signal] - Optional AbortSignal to cancel the request
		 * @return {Promise<string>} Promise resolving to the sanitised HTML string
		 */
		sanitiseHtml: function ( html, signal ) {
			if ( !html ) {
				return Promise.resolve( '' );
			}

			// Hash the HTML to use as cache key
			return this.sha256Hex( html ).then( ( hash ) => {
				// Check if we already have a cached sanitized result
				if ( this.sanitizationCache.has( hash ) ) {
					return this.sanitizationCache.get( hash );
				}

				// Check if there's already an in-flight sanitization request for this hash
				if ( this.pendingPromises.has( hash ) ) {
					return this.pendingPromises.get( hash );
				}

				// Not in cache or pending, create new API request
				const requestPromise = apiUtils.sanitiseHtmlFragment( { html, signal } )
					.then( ( data ) => {
						const sanitised = data.html || '';
						// Cache the result
						this.sanitizationCache.set( hash, sanitised );
						// Remove from pending promises
						this.pendingPromises.delete( hash );
						return sanitised;
					} )
					.catch( () => {
						// On error, cache empty string as fallback
						const fallback = '';
						this.sanitizationCache.set( hash, '' );
						// Remove from pending promises
						this.pendingPromises.delete( hash );
						return fallback;
					} );

				// Store the pending promise
				this.pendingPromises.set( hash, requestPromise );
				return requestPromise;
			} );
		},

		/**
		 * Clears the sanitization cache and pending promises.
		 * Useful for testing or when cache needs to be invalidated.
		 */
		clearSanitizationCache: function () {
			this.sanitizationCache.clear();
			this.pendingPromises.clear();
		}
	}
};
