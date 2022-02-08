<template>
	<div
		class="sd-message"
		:class="builtInClasses"
		:aria-live="type !== 'error' ? 'polite' : false"
		:role="type === 'error' ? 'alert' : false"
	>
		<sd-icon :icon="icon"></sd-icon>
		<div class="sd-message__content">
			<slot></slot>
		</div>
	</div>
</template>

<script>
var SdIcon = require( './Icon.vue' ),
	icons = require( './../../../lib/icons.js' ),
	ICON_MAP = {
		notice: icons.sdIconInfoFilled,
		error: icons.sdIconError,
		warning: icons.sdIconAlert,
		success: icons.sdIconCheck
	};
/**
 * User-facing message with icon.
 *
 * See CardStack for usage example.
 */
// @vue/component
module.exports = {
	name: 'sd-message',
	components: {
		'sd-icon': SdIcon
	},
	props: {
		// Should be one of notice, warning, error, or success.
		type: {
			type: String,
			default: 'notice'
		},
		inline: {
			type: Boolean
		}
	},
	computed: {
		typeClass: function () {
			return 'sd-message--' + this.type;
		},
		builtInClasses: function () {
			var classes = { 'sd-message--block': !this.inline };
			classes[ this.typeClass ] = true;
			return classes;
		},
		icon: function () {
			return ICON_MAP[ this.type ];
		}
	}
};
</script>
