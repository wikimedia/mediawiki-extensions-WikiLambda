<template>
	<!--
		WikiLambda Vue component for the Leave Editor Dialog which is displayed when the user attempts to leave
		the page before saving their changes.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-leaveeditordialog">
		<cdx-dialog
			:open="showDialog"
			close-button-label="Close"
			:title="$i18n( 'wikilambda-editor-leave-edit-mode-header' ).text()"
			:primary-action="primaryActionText()"
			:default-action="defaultActionText()"
			@update:open="stayOnPage"
			@primary="leavePage"
			@default="stayOnPage"
		>
			<div>
				{{ $i18n( 'wikilambda-publish-lose-changes-prompt' ).text() }}
			</div>
		</cdx-dialog>
	</div>
</template>

<script>
var CdxDialog = require( '@wikimedia/codex' ).CdxDialog;

// @vue/components
module.exports = exports = {
	name: 'wl-leave-editor-dialog',
	components: {
		'cdx-dialog': CdxDialog
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
	methods: {
		stayOnPage: function () {
			this.$emit( 'close-dialog' );
		},
		leavePage: function () {
			this.continueCallback();
		},
		primaryActionText: function () {
			return {
				label: this.$i18n( 'wikilambda-discard-edits' ).text(),
				actionType: 'destructive'
			};
		},
		defaultActionText: function () {
			return { label: this.$i18n( 'wikilambda-continue-editing' ).text() };
		}
	}
};
</script>
