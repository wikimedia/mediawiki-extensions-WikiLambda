/**
 * WikiLambda Vue editor: Clipboard Mixin
 * Mixin with functions to handle clipboard actions
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

module.exports = exports = {
	data: function () {
		return {
			itemsCopied: []
		};
	},
	computed: {
		getCopiedText() {
			return this.$i18n( 'wikilambda-function-explorer-copied-text' ).text();
		}
	},
	methods: {
		/**
		 * Add the copied value to the array
		 *
		 * @param {string} value The value to copy
		 */
		copy: function ( value ) {
			this.itemsCopied.push( value );
		},

		/**
		 * Remove the copied value from the array
		 */
		clear: function () {
			this.itemsCopied.shift();
		},

		/**
		 * Copy a value to the clipboard and display a "copied" message for a short time
		 *
		 * @param {string} value The value to copy to the clipboard
		 * @param {Function} [copyFunction] Function to call when the value is copied
		 * @param {Function} [clearFunction] Function to call when the "copied" message is cleared
		 */
		copyToClipboard( value, copyFunction, clearFunction ) {
			navigator.clipboard.writeText( value );

			// This will allow us to display a default "copied" message
			// or call a custom function when the value is copied
			if ( copyFunction ) {
				copyFunction();
			} else {
				this.copy( value );
			}

			// Clear the "copied" message after a short time
			setTimeout( () => {
				if ( clearFunction ) {
					clearFunction();
				} else {
					this.clear();
				}
			}, 2000 );
		},

		/**
		 * Show the value or a "copied" message
		 *
		 * @param {string} value The value to display
		 * @return {string} The value or a "copied" message
		 */
		showValueOrCopiedMessage( value ) {
			if ( this.itemsCopied.includes( value ) ) {
				return this.getCopiedText;
			}
			return value;
		}
	}
};
