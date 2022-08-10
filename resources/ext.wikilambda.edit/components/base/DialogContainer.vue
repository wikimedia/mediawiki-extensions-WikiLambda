<template>
	<!--
		WikiLambda Vue component for a container for a Dialog

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<Teleport to="#ext-wikilambda-app">
		<base-dialog
			:custom-class="customClass"
			:title="title"
			:description="description"
			:cancel-button-text="cancelButtonTextOrDefault()"
			:confirm-button-text="confirmButtonTextOrDefault()"
			:should-click-to-close="shouldClickToClose"
			:show-action-buttons="showActionButtons"
			@exit-dialog="$emit( 'exit-dialog' ) "
			@close-dialog="$emit( 'close-dialog' )"
			@confirm-dialog="$emit( 'confirm-dialog' )"
		></base-dialog>
	</Teleport>
</template>

<script>
var Dialog = require( './Dialog.vue' );

// @vue/component
module.exports = exports = {
	name: 'base-dialog-container',
	compatConfig: { MODE: 3 },
	components: {
		'base-dialog': Dialog
	},
	props: {
		title: {
			type: String,
			required: true
		},
		description: {
			type: String,
			required: true
		},
		cancelButtonText: {
			type: String,
			required: false,
			// The default value is generated in cancelButtonTextOrDefault
			// Explicitly setting default=undefined here eliminates a grunt warning
			default: undefined
		},
		confirmButtonText: {
			type: String,
			required: false,
			// The default value is generated in confirmButtonTextOrDefault
			// Explicitly setting default=undefined here eliminates a grunt warning
			default: undefined
		},
		shouldClickToClose: {
			type: Boolean,
			// eslint-disable-next-line vue/no-boolean-default
			default: true,
			required: false
		},
		showActionButtons: {
			type: Boolean,
			// eslint-disable-next-line vue/no-boolean-default
			default: true,
			required: false
		},
		customClass: {
			type: String,
			required: false,
			default: ''
		}
	},
	methods: {
		// We can't call this.$i18n in the default value of a prop, so do it here
		cancelButtonTextOrDefault: function () {
			return this.cancelButtonText || this.$i18n( 'wikilambda-cancel' ).text();
		},
		confirmButtonTextOrDefault: function () {
			return this.confirmButtonText || this.$i18n( 'wikilambda-confirm' ).text();
		}
	}
};
</script>

<style lang="less">
@import './../../../lib/wikimedia-ui-base.less';

</style>
