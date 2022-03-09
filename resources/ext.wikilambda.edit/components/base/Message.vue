<template>
	<div
		class="sd-message"
		:class="builtInClasses"
		:aria-live="type !== 'error' ? 'polite' : false"
		:role="type === 'error' ? 'alert' : false"
	>
		<cdx-icon :icon="icon"></cdx-icon>
		<div class="sd-message__content">
			<slot></slot>
		</div>
	</div>
</template>

<script>
var CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	icons = require( '../../../lib/icons.json' ),
	ICON_MAP = {
		notice: icons.cdxIconInfoFilled,
		error: icons.cdxIconError,
		warning: icons.cdxIconAlert,
		success: icons.cdxIconCheck
	};
/**
 * User-facing message with icon.
 *
 * See CardStack for usage example.
 */
// @vue/component
module.exports = exports = {
	name: 'sd-message',
	components: {
		'cdx-icon': CdxIcon
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
