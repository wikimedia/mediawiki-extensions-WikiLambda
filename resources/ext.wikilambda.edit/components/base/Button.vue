<template>
	<button
		class="sd-button"
		:class="builtInClasses"
		:disabled="disabled"
		@click="$emit( 'click' )"
	>
		<sd-icon v-if="icon" :icon="icon"></sd-icon>
		<span class="sd-button__content">
			<slot></slot>
		</span>
	</button>
</template>

<script>
var SdIcon = require( './Icon.vue' );

/**
 * Button with optional icon.
 */
// @vue/component
module.exports = {
	name: 'SdButton',

	components: {
		'sd-icon': SdIcon
	},

	props: {
		disabled: {
			type: Boolean
		},

		frameless: {
			type: Boolean
		},

		// Icon path or object. See Icon.vue for valid icon formats.
		icon: {
			type: [ String, Object ],
			default: null
		},

		// Set to true to hide text node.
		invisibleText: {
			type: Boolean
		},

		// In OOUI, flags are passed in as an array (or a string or an object)
		// and are handled by a separate mixin. Passing them in individually is
		// a bit more readable and intuitive, plus it makes the code in this
		// component simpler.
		progressive: {
			type: Boolean
		},

		destructive: {
			type: Boolean
		},

		primary: {
			type: Boolean
		}
	},

	computed: {
		builtInClasses: function () {
			return {
				'sd-button--framed': !this.frameless,
				'sd-button--icon': this.icon,
				'sd-button--invisible-text': this.invisibleText,
				'sd-button--progressive': this.progressive,
				'sd-button--destructive': this.destructive,
				'sd-button--primary': this.primary
			};
		}
	}
};
</script>
