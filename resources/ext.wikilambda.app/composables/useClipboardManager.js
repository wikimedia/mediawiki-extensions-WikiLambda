/*!
 * WikiLambda Vue composable for managing clipboard operations across the app
 *
 * @module ext.wikilambda.app.composables.useClipboardManager
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { onMounted, onBeforeUnmount } = require( 'vue' );
const useClipboard = require( './useClipboard.js' );

/**
 * Composable that sets up global clipboard event listeners for specified CSS classes.
 * Automatically attaches/detaches listeners on mount/unmount.
 *
 * @param {Object} options - Configuration options
 * @param {Array<string>} options.classNames - Array of CSS class names to watch for copy events
 * @return {Object} Clipboard functionality
 */
module.exports = function useClipboardManager( { classNames = [] } = {} ) {
	const clipboard = useClipboard();

	/**
	 * Display "Copied!" message on the element
	 *
	 * @param {HTMLElement} element - The element to display the copied message on
	 */
	function displayCopiedMessage( element ) {
		element.setAttribute( 'data-copied', 'true' );
		element.innerText = clipboard.getCopiedText.value;
	}

	/**
	 * Clear the copied message and restore original text
	 *
	 * @param {HTMLElement} element - The element to clear the copied message for
	 * @param {string} value - The original value to restore
	 */
	function clearCopiedMessage( element, value ) {
		element.removeAttribute( 'data-copied' );
		element.innerText = value;
	}

	/**
	 * Handle click and keydown events for copy operations
	 *
	 * @param {Event} event - Click or keydown event
	 */
	function handleEvent( event ) {
		const element = event.target;

		// If already copied, or doesn't match target classes, do nothing
		if (
			element.hasAttribute( 'data-copied' ) ||
			!classNames.some( ( className ) => element.classList.contains( className ) )
		) {
			return;
		}

		// Check if Event is a KeyboardEvent and ignore non-Enter keys
		if ( event instanceof KeyboardEvent && event.key !== 'Enter' ) {
			return;
		}

		const value = element.textContent;
		clipboard.copyToClipboard(
			value,
			() => displayCopiedMessage( element ),
			() => clearCopiedMessage( element, value )
		);
	}

	// Set up event listeners on mount
	onMounted( () => {
		window.addEventListener( 'click', handleEvent );
		window.addEventListener( 'keydown', handleEvent );
	} );

	// Clean up event listeners on unmount
	onBeforeUnmount( () => {
		window.removeEventListener( 'click', handleEvent );
		window.removeEventListener( 'keydown', handleEvent );
	} );

	// Return clipboard functionality (optional - for components that need it)
	return clipboard;
};
