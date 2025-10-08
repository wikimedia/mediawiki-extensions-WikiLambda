/*!
 * WikiLambda Vue scroll composable for hash-based navigation
 *
 * @module ext.wikilambda.app.composables.useScroll
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { ref, onMounted, onBeforeUnmount } = require( 'vue' );
const scrollUtils = require( '../utils/scrollUtils.js' );

/**
 * Scroll composable that provides scroll functionality for components
 * Includes methods for scrolling to elements and handling hash navigation
 *
 * @return {Object} Scroll composable API
 */
module.exports = function useScroll() {
	const hasScrolledToHash = ref( false );
	const debouncedHashScroll = ref( null );

	/**
	 * Scrolls to an element by ID
	 *
	 * @param {string} elementId - The ID of the element to scroll to (without #)
	 * @param {Object} options - Scroll options
	 * @return {Promise<boolean>} - Promise that resolves to true if element was found and scrolled to
	 */
	function scrollToElement( elementId, options = {} ) {
		return scrollUtils.scrollToElement( elementId, options );
	}

	/**
	 * Scrolls to the current URL hash
	 *
	 * @param {Object} options - Scroll options
	 * @return {Promise<boolean>} - Promise that resolves to true if hash element was found and scrolled to
	 */
	function scrollToCurrentHash( options = {} ) {
		return scrollUtils.scrollToCurrentHash( options );
	}

	/**
	 * Scrolls to an element with retry logic for dynamic content
	 *
	 * @param {string} elementId - The ID of the element to scroll to (without #)
	 * @param {Object} options - Scroll options
	 * @return {Promise<boolean>} - Promise that resolves to true if element was eventually found and scrolled to
	 */
	function scrollToElementWithRetry( elementId, options = {} ) {
		return scrollUtils.scrollToElementWithRetry( elementId, options );
	}

	/**
	 * Scrolls to the current hash with retry logic
	 *
	 * @param {Object} options - Scroll options
	 * @return {Promise<boolean>} - Promise that resolves to true
	 * if hash element was eventually found and scrolled to
	 */
	function scrollToCurrentHashWithRetry( options = {} ) {
		return scrollUtils.scrollToCurrentHashWithRetry( options );
	}

	/**
	 * Handles hash change events and scrolls to the new hash
	 *
	 * @param {Object} options - Scroll options
	 */
	function handleHashChange( options = {} ) {
		scrollToCurrentHashWithRetry( options );
	}

	/**
	 * Sets up hash change listener
	 *
	 * @param {Object} options - Scroll options for hash navigation
	 */
	function setupHashNavigation( options = {} ) {
		// Create a debounced version of handleHashChange for this component
		debouncedHashScroll.value = scrollUtils.createDebouncedHashScroll( options );

		// Listen for hash changes
		window.addEventListener( 'hashchange', debouncedHashScroll.value );
	}

	/**
	 * Cleans up hash change listener
	 */
	function cleanupHashNavigation() {
		if ( debouncedHashScroll.value ) {
			window.removeEventListener( 'hashchange', debouncedHashScroll.value );
			debouncedHashScroll.value = null;
		}
	}

	/**
	 * Attempts to scroll to hash on component mount with appropriate timing
	 *
	 * @param {Object} options - Scroll options
	 */
	function scrollToHashOnMount( options = {} ) {
		if ( hasScrolledToHash.value ) {
			return;
		}

		hasScrolledToHash.value = true;

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
			scrollToCurrentHashWithRetry( finalOptions );
		}, 50 );
	}

	// Setup and cleanup lifecycle hooks
	onMounted( () => {
		// Set up hash navigation by default
		setupHashNavigation();

		// Attempt to scroll to hash on mount
		scrollToHashOnMount();
	} );

	onBeforeUnmount( () => {
		cleanupHashNavigation();
	} );

	return {
		hasScrolledToHash,
		scrollToElement,
		scrollToCurrentHash,
		scrollToElementWithRetry,
		scrollToCurrentHashWithRetry,
		handleHashChange,
		setupHashNavigation,
		cleanupHashNavigation,
		scrollToHashOnMount
	};
};
