/*!
 * Clipboard composable for Vue 3 Composition API.
 * Provides functions to handle clipboard actions
 *
 * @module ext.wikilambda.app.composables.useClipboard
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { ref, computed, inject } = require( 'vue' );

/**
 * Clipboard composable
 *
 * @param {Object} options - Options object
 * @return {Object} Clipboard composable API
 * @exports useClipboard
 */
module.exports = function useClipboard() {
	const i18n = inject( 'i18n' );
	const itemsCopied = ref( [] );

	const getCopiedText = computed( () => i18n( 'wikilambda-function-explorer-copied-text' ).text() );

	/**
	 * Add the copied value to the array
	 *
	 * @param {string} value The value to copy
	 */
	function copy( value ) {
		itemsCopied.value.push( value );
	}

	/**
	 * Remove the copied value from the array
	 */
	function clear() {
		itemsCopied.value.shift();
	}

	/**
	 * Copy a value to the clipboard and display a "copied" message for a short time
	 *
	 * @param {string} value The value to copy to the clipboard
	 * @param {Function} customCopyFn Optional custom copy function
	 * @param {Function} customClearFn Optional custom clear function
	 */
	function copyToClipboard( value, customCopyFn, customClearFn ) {
		navigator.clipboard.writeText( value );

		if ( customCopyFn ) {
			customCopyFn();
		} else {
			copy( value );
		}

		// Clear the "copied" message after 2 seconds
		setTimeout( () => {
			if ( customClearFn ) {
				customClearFn();
			} else {
				clear();
			}
		}, 2000 );
	}

	/**
	 * Show the value or a "copied" message
	 *
	 * @param {string} value The value to display
	 * @return {string} The value or a "copied" message
	 */
	function showValueOrCopiedMessage( value ) {
		if ( itemsCopied.value.includes( value ) ) {
			return getCopiedText.value;
		}
		return value;
	}

	return {
		itemsCopied,
		getCopiedText,
		copy,
		clear,
		copyToClipboard,
		showValueOrCopiedMessage
	};
};
