/*!
 * WikiLambda Vue editor: HTML Fragment sanitization store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const apiUtils = require( '../../utils/apiUtils.js' );
const miscUtils = require( '../../utils/miscUtils.js' );

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
			return miscUtils.sha256( html ).then( ( hash ) => {
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
						// Do not cache failures: Map.has() is key-existence, so a cached ''
						// would short-circuit every subsequent call for the same hash and
						// turn any transient failure into a permanent session failure.
						this.pendingPromises.delete( hash );
						return '';
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
