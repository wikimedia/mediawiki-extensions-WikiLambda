<template>
	<!--
		WikiLambda Vue component for the Leave Editor Dialog which is displayed when the user attempts to leave
		the page before saving their changes.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->

	<div class="ext-wikilambda-leaveeditordialog">
		<dialog-container
			ref="dialogBox"
			size="auto"
			:custom-class="leaveEditorDialogCustomClass"
			:show-action-buttons="true"
			:button-action="buttonAction"
			:cancel-button-text="$i18n( 'wikilambda-continue-editing' ).text()"
			:confirm-button-text="$i18n( 'wikilambda-discard-edits' ).text()"
			@exit-dialog="stayOnPage"
			@close-dialog="stayOnPage"
			@confirm-dialog="leavePage">

			<template #dialog-container-title>
				<strong>{{ $i18n( 'wikilambda-editor-leave-edit-mode-header' ).text() }}</strong>
			</template>
			<div class="ext-wikilambda-leaveeditordialog__message">
				{{ $i18n( 'wikilambda-publish-lose-changes-prompt' ).text() }}
			</div>
		</dialog-container>
	</div>
</template>

<script>
var DialogContainer = require( '../base/DialogContainer.vue' );

// @vue/components
module.exports = exports = {
	name: 'leave-editor-dialog',
	components: {
		'dialog-container': DialogContainer
	},
	props: {
		showDialog: {
			type: Boolean,
			required: true,
			default: false
		},
		continueCallback: {
			type: Function,
			required: true
		}
	},
	data: function () {
		return {
			leaveEditorDialogCustomClass: 'ext-wikilambda-leave-editor-dialog-custom-class',
			buttonAction: 'secondary'
		};
	},
	methods: {
		stayOnPage: function () {
			this.$emit( 'close-dialog' );
		},
		leavePage: function () {
			this.continueCallback();
		}
	},
	watch: {
		showDialog: function () {
			if ( this.showDialog ) {
				this.$refs.dialogBox.openDialog();
			}
		}
	}
};
</script>

<style lang="less">
@import './../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-leaveeditordialog__message {
	padding: 8px 16px 0 16px;
}

.ext-wikilambda-leave-editor-dialog-custom-class .ext-wikilambda-dialog {
	&__header {
		margin-top: 16px;
		padding: 0 32px;

		&__title {
			font-size: 1.1em;
		}
	}

	&__action-buttons {
		display: flex;
		justify-content: flex-end;
		padding: 16px 16px;

		button {
			margin-right: 16px;
			width: fit-content;
		}

		/* stylelint-disable-next-line */
		#primary-button {
			color: @wmui-color-red50;
		}
	}

	@media screen and ( max-width: @width-breakpoint-tablet ) {
		&__action-buttons {
			display: flex;
			flex-direction: column;

			button {
				margin-bottom: 8px;
				width: 100%;
			}
		}
	}
}

</style>
