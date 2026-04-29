<!--
	WikiLambda Vue component for the help button and popover shown next to the
	function selector in the Abstract Article editor. Explains why only some
	functions are listed (return type constraint) and links to the help page.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<cdx-toggle-button
		ref="helpButtonRef"
		v-model="isPopoverOpen"
		class="ext-wikilambda-app-function-selector-help"
		size="small"
		quiet
		:aria-label="i18n( 'wikilambda-abstract-fragment-function-selector-popover-title' ).text()"
	>
		<cdx-icon :icon="iconHelpNotice"></cdx-icon>
	</cdx-toggle-button>
	<cdx-popover
		:open="isPopoverOpen"
		:anchor="helpButtonAnchor"
		:render-in-place="true"
		:title="i18n( 'wikilambda-abstract-fragment-function-selector-popover-title' ).text()"
		:use-close-button="true"
		:placement="placement"
		@update:open="isPopoverOpen = $event"
	>
		<p>
			{{ i18n(
				'wikilambda-abstract-fragment-function-selector-popover-body',
				returnType,
				returnTypeLabel
			).text() }}
		</p>
		<p v-i18n-html:wikilambda-abstract-fragment-function-selector-learn-more></p>
	</cdx-popover>
</template>

<script>
const { defineComponent, computed, inject, ref } = require( 'vue' );
const icons = require( '../../../lib/icons.json' );
const { CdxToggleButton, CdxIcon, CdxPopover } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-selector-help',
	components: {
		'cdx-toggle-button': CdxToggleButton,
		'cdx-icon': CdxIcon,
		'cdx-popover': CdxPopover
	},
	props: {
		returnType: {
			type: String,
			required: true
		},
		returnTypeLabel: {
			type: String,
			required: true
		},
		placement: {
			type: String,
			required: false,
			default: 'bottom-start'
		}
	},
	setup() {
		const i18n = inject( 'i18n' );

		const isPopoverOpen = ref( false );
		const helpButtonRef = ref( null );
		const helpButtonAnchor = computed( () => helpButtonRef.value ? helpButtonRef.value.$el : null );
		const iconHelpNotice = icons.cdxIconHelpNotice;

		return {
			helpButtonAnchor,
			helpButtonRef,
			iconHelpNotice,
			isPopoverOpen,
			i18n
		};
	}
} );
</script>
