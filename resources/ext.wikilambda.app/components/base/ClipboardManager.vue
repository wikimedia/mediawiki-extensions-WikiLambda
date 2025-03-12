<!--
	WikiLambda Vue component for Clipboard Manager

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<!-- Placeholder -->
	<div></div>
</template>

<script>
const clipboardMixin = require( '../../mixins/clipboardMixin.js' );
const { defineComponent } = require( 'vue' );

module.exports = exports = defineComponent( {
	name: 'wl-clipboard-manager',
	mixins: [ clipboardMixin ],
	props: {
		classNames: {
			type: Array,
			required: false,
			default: function () {
				return [];
			}
		}
	},
	methods: {
		/**
		 * Display the copied message for the specified element.
		 *
		 * @param {HTMLElement} element - The element to display the copied message for.
		 */
		displayCopiedMessage: function ( element ) {
			element.setAttribute( 'data-copied', 'true' );
			element.innerText = this.getCopiedText;
		},

		/**
		 * Clear the copied message for the specified element.
		 *
		 * @param {HTMLElement} element - The element to clear the copied message for.
		 * @param {string} value - The value to set as the inner text of the element.
		 */
		clearCopiedMessage: function ( element, value ) {
			element.removeAttribute( 'data-copied' );
			element.innerText = value;
		},

		/**
		 * Handle click and keydown events.
		 *
		 * @param {Event} event - Click or keydown events.
		 */
		handleEvent: function ( event ) {
			const element = event.target;

			// If the click was on an element that has the data-copied attribute (meaning it was just copied),
			// or if the click was not on an element with the specified class names, do nothing
			if (
				element.hasAttribute( 'data-copied' ) ||
				!this.classNames.some( ( className ) => element.classList.contains( className ) )
			) {
				return;
			}

			// Check if the Event is a KeyboardEvent so that we can ignore non-Enter key presses
			if ( event instanceof KeyboardEvent && event.key !== 'Enter' ) {
				return;
			}

			const value = element.textContent;
			this.copyToClipboard(
				value,
				this.displayCopiedMessage.bind( this, element ),
				this.clearCopiedMessage.bind( this, element, value )
			);
		}
	},

	mounted() {
		window.addEventListener( 'click', this.handleEvent );
		window.addEventListener( 'keydown', this.handleEvent );
	},
	beforeUnmount() {
		window.removeEventListener( 'click', this.handleEvent );
		window.removeEventListener( 'keydown', this.handleEvent );
	}
} );
</script>
