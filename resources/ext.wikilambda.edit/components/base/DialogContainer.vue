<template>
	<!--
		WikiLambda Vue component for a container for a Dialog

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<Teleport to="#ext-wikilambda-app">
		<base-dialog
			:title="title"
			:description="description"
			:cancel-button-text="cancelButtonText"
			:confirm-button-text="confirmButtonText"
			:should-click-to-close="shouldClickToClose"
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
			required: true,
			default() {
				return this.$i18n( 'wikilambda-cancel' ).text();
			}
		},
		confirmButtonText: {
			type: String,
			required: true,
			default() {
				return this.$i18n( 'wikilambda-confirm' ).text();
			}
		},
		shouldClickToClose: {
			type: Boolean,
			// eslint-disable-next-line vue/no-boolean-default
			default: true,
			required: false
		}
	}
};
</script>

<style lang="less">
@import './../../../lib/wikimedia-ui-base.less';

</style>
