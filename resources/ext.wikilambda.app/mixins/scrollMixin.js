/*!
 * WikiLambda Vue scroll mixin for hash-based navigation
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const scrollUtils = require( '../utils/scrollUtils.js' );

/**
 * Vue mixin that provides scroll functionality for components
 * Includes methods for scrolling to elements and handling hash navigation
 */
module.exports = exports = {
	data: function () {
		return {
			hasScrolledToHash: false
		};
	},

	methods: {
		/**
		 * Scrolls to an element by ID
		 *
		 * @param {string} elementId - The ID of the element to scroll to (without #)
		 * @param {Object} options - Scroll options
		 * @return {Promise<boolean>} - Promise that resolves to true if element was found and scrolled to
		 */
		scrollToElement: function ( elementId, options = {} ) {
			return scrollUtils.scrollToElement( elementId, options );
		},

		/**
		 * Scrolls to the current URL hash
		 *
		 * @param {Object} options - Scroll options
		 * @return {Promise<boolean>} - Promise that resolves to true if hash element was found and scrolled to
		 */
		scrollToCurrentHash: function ( options = {} ) {
			return scrollUtils.scrollToCurrentHash( options );
		},

		/**
		 * Scrolls to an element with retry logic for dynamic content
		 *
		 * @param {string} elementId - The ID of the element to scroll to (without #)
		 * @param {Object} options - Scroll options
		 * @return {Promise<boolean>} - Promise that resolves to true if element was eventually found and scrolled to
		 */
		scrollToElementWithRetry: function ( elementId, options = {} ) {
			return scrollUtils.scrollToElementWithRetry( elementId, options );
		},

		/**
		 * Scrolls to the current hash with retry logic
		 *
		 * @param {Object} options - Scroll options
		 * @return {Promise<boolean>} - Promise that resolves to true
		 * if hash element was eventually found and scrolled to
		 */
		scrollToCurrentHashWithRetry: function ( options = {} ) {
			return scrollUtils.scrollToCurrentHashWithRetry( options );
		},

		/**
		 * Handles hash change events and scrolls to the new hash
		 *
		 * @param {Object} options - Scroll options
		 */
		handleHashChange: function ( options = {} ) {
			this.scrollToCurrentHashWithRetry( options );
		},

		/**
		 * Sets up hash change listener
		 *
		 * @param {Object} options - Scroll options for hash navigation
		 */
		setupHashNavigation: function ( options = {} ) {
			// Create a debounced version of handleHashChange for this component
			this.debouncedHashScroll = scrollUtils.createDebouncedHashScroll( options );

			// Listen for hash changes
			window.addEventListener( 'hashchange', this.debouncedHashScroll );
		},

		/**
		 * Cleans up hash change listener
		 */
		cleanupHashNavigation: function () {
			if ( this.debouncedHashScroll ) {
				window.removeEventListener( 'hashchange', this.debouncedHashScroll );
				this.debouncedHashScroll = null;
			}
		},

		/**
		 * Attempts to scroll to hash on component mount with appropriate timing
		 *
		 * @param {Object} options - Scroll options
		 */
		scrollToHashOnMount: function ( options = {} ) {
			if ( this.hasScrolledToHash ) {
				return;
			}

			this.hasScrolledToHash = true;

			const defaultOptions = {
				maxRetries: 15,
				retryDelay: 200,
				behavior: 'smooth',
				block: 'center',
				offset: 0 // Account for potential fixed headers
			};

			const finalOptions = Object.assign( {}, defaultOptions, options );

			// Use a small timeout to ensure DOM is ready
			setTimeout( () => {
				this.scrollToCurrentHashWithRetry( finalOptions );
			}, 50 );
		}
	},

	mounted: function () {
		// Set up hash navigation by default
		this.setupHashNavigation();

		// Attempt to scroll to hash on mount
		this.scrollToHashOnMount();
	},

	beforeUnmount: function () {
		this.cleanupHashNavigation();
	}
};
