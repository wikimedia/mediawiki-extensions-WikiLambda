/*!
 * WikiLambda Vue editor: HTML Fragment sanitization store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const apiUtils = require( '../../utils/apiUtils.js' );
const miscUtils = require( '../../utils/miscUtils.js' );
const storeUtils = require( '../../utils/storeUtils.js' );

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
		 * Map of in-flight sanitization promises. Written only by
		 * `storeUtils.doDeduplicatedFetch`.
		 * Key: SHA-256 hash of raw HTML string
		 * Value: Promise resolving to sanitized HTML string
		 *
		 * @type {Map<string, Promise<string>>}
		 */
		sanitizationPromises: new Map()
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
			return miscUtils.sha256( html ).then( ( hash ) => storeUtils.doDeduplicatedFetch( {
				inFlight: this.sanitizationPromises,
				key: hash,
				getCached: ( key ) => this.sanitizationCache.get( key ),
				setCached: ( key, value ) => this.sanitizationCache.set( key, value ),
				run: () => apiUtils.sanitiseHtmlFragment( { html, signal } )
					.then( ( data ) => data.html || '' )
			} )
				// Give the caller an empty fragment on failure, but let the helper
				// leave the cache untouched: a cached '' would short-circuit every
				// later call for the same hash, and turn any transient failure into
				// a permanent one for the rest of the session.
				.catch( () => '' ) );
		},

		/**
		 * Clears the sanitization cache and in-flight promises.
		 * Useful for testing or when cache needs to be invalidated.
		 */
		clearSanitizationCache: function () {
			this.sanitizationCache.clear();
			this.sanitizationPromises.clear();
		}
	}
};
