<template>
	<!--
		WikiLambda Vue component for a container for a Dialog

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<Teleport v-if="isVisible" to="#ext-wikilambda-app">
		<wl-base-dialog
			:custom-class="customClass"
			:cancel-button-text="cancelButtonTextOrDefault"
			:confirm-button-text="confirmButtonTextOrDefault"
			:can-click-outside-to-close="canClickOutsideToClose"
			:show-action-buttons="showActionButtons"
			:size="size"
			:legal-text="legalText"
			:primary-button-disabled="primaryButtonDisabled"
			:button-action="buttonAction"
			@exit-dialog="exitDialog"
			@close-dialog="closeDialog"
			@confirm-dialog="$emit( 'confirm-dialog' )"
		>
			<template #dialog-title>
				<slot name="dialog-container-title"></slot>
			</template>
			<slot></slot>
		</wl-base-dialog>
	</Teleport>
</template>

<script>
var Dialog = require( './Dialog.vue' );

// @vue/component
module.exports = exports = {
	name: 'wl-base-dialog-container',
	components: {
		'wl-base-dialog': Dialog
	},
	props: {
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
		canClickOutsideToClose: {
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
		},
		size: {
			type: String
		},
		legalText: {
			type: String,
			required: false,
			default: ''
		},
		primaryButtonDisabled: {
			type: Boolean,

			default: false,
			required: false
		},
		buttonAction: {
			type: String,
			required: false
		}
	},
	data: function () {
		return {
			isVisible: false
		};
	},
	computed: {
		// We can't call this.$i18n in the default value of a prop, so do it here
		cancelButtonTextOrDefault: function () {
			return this.cancelButtonText || this.$i18n( 'wikilambda-cancel' ).text();
		},
		confirmButtonTextOrDefault: function () {
			return this.confirmButtonText || this.$i18n( 'wikilambda-confirm' ).text();
		}
	},
	methods: {
		// eslint-disable-next-line vue/no-unused-properties
		openDialog: function () {
			this.isVisible = true;
		},
		closeDialog: function () {
			this.isVisible = false;
			this.$emit( 'close-dialog' );
		},
		exitDialog: function () {
			this.isVisible = false;
			this.$emit( 'exit-dialog' );
		}
	}
};
</script>
