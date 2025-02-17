<!--
	WikiLambda Vue component for the Leave Editor Dialog which is displayed when the user attempts to leave
	the page before saving their changes.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-leave-editor-dialog">
		<cdx-dialog
			:open="showDialog"
			:title="leaveDialogTitle"
			:close-button-label="$i18n( 'wikilambda-dialog-close' ).text()"
			:primary-action="primaryAction"
			:default-action="defaultAction"
			@update:open="stayOnPage"
			@primary="leavePage"
			@default="stayOnPage"
		>
			<div>{{ $i18n( 'wikilambda-publish-lose-changes-prompt' ).text() }}</div>
		</cdx-dialog>
	</div>
</template>

<script>
const { CdxDialog } = require( '../../../../codex.js' );

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
			required: false,
			default: undefined
		}
	},
	computed: {
		/**
		 * Returns the title for the Leave dialog
		 *
		 * @return {string}
		 */
		leaveDialogTitle: function () {
			return this.$i18n( 'wikilambda-editor-leave-edit-mode-header' ).text();
		},

		/**
		 * Returns an object of type PrimaryDialogAction that describes
		 * the action of the primary (save or publish) dialog button.
		 *
		 * @return {Object}
		 */
		primaryAction: function () {
			return {
				actionType: 'destructive',
				label: this.$i18n( 'wikilambda-discard-edits' ).text()
			};
		},

		/**
		 * Returns an object of type DialogAction that describes
		 * the action of the secondary (cancel) button.
		 *
		 * @return {Object}
		 */
		defaultAction: function () {
			return {
				label: this.$i18n( 'wikilambda-continue-editing' ).text()
			};
		}
	},
	methods: {
		/**
		 * On click "Continue editing" option, simply close the dialog
		 */
		stayOnPage: function () {
			this.$emit( 'close-dialog' );
		},

		/**
		 * On click "Discard edits" option, handle state and event
		 * listeners for exit and close the dialog
		 */
		leavePage: function () {
			this.$emit( 'before-exit' );
			if ( this.continueCallback ) {
				this.continueCallback();
			}
		}
	}
};
</script>
