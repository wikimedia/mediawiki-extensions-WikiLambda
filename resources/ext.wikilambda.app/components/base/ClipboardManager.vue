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
const clipboardUtils = require( '../../mixins/clipboardUtils.js' );
const { defineComponent } = require( 'vue' );

module.exports = exports = defineComponent( {
	name: 'wl-clipboard-manager',
	mixins: [ clipboardUtils ],
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
		 * Handle the window click event.
		 *
		 * @param {MouseEvent} event - The click event.
		 */
		handleWindowClick: function ( event ) {
			const element = event.target;

			// If the click was on an element that has the data-copied attribute (meaning it was just copied),
			// or if the click was not on an element with the specified class names, do nothing
			if (
				element.hasAttribute( 'data-copied' ) ||
				!this.classNames.some( ( className ) => element.classList.contains( className ) )
			) {
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
		window.addEventListener( 'click', this.handleWindowClick );
	},
	beforeUnmount() {
		window.removeEventListener( 'click', this.handleWindowClick );
	}
} );
</script>
