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
			:title="i18n( 'wikilambda-editor-leave-edit-mode-header' ).text()"
			:close-button-label="i18n( 'wikilambda-dialog-close' ).text()"
			:use-close-button="true"
			:primary-action="primaryAction"
			:default-action="defaultAction"
			@update:open="stayOnPage"
			@primary="leavePage"
			@default="stayOnPage"
		>
			<div>{{ i18n( 'wikilambda-publish-lose-changes-prompt' ).text() }}</div>
		</cdx-dialog>
	</div>
</template>

<script>
const { computed, defineComponent, inject } = require( 'vue' );
const { CdxDialog } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
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
	emits: [ 'close-dialog', 'before-exit' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );

		// Dialog actions
		/**
		 * Returns an object of type PrimaryModalAction that describes
		 * the action of the primary (save or publish) dialog button.
		 *
		 * @return {Object}
		 */
		const primaryAction = computed( () => ( {
			actionType: 'destructive',
			label: i18n( 'wikilambda-discard-edits' ).text()
		} ) );

		/**
		 * Returns an object of type ModalAction that describes
		 * the action of the secondary (cancel) button.
		 *
		 * @return {Object}
		 */
		const defaultAction = computed( () => ( {
			label: i18n( 'wikilambda-continue-editing' ).text()
		} ) );

		// Actions
		/**
		 * On click "Continue editing" option, simply close the dialog
		 */
		function stayOnPage() {
			emit( 'close-dialog' );
		}

		/**
		 * On click "Discard edits" option, handle state and event
		 * listeners for exit and close the dialog
		 */
		function leavePage() {
			emit( 'before-exit' );
			if ( props.continueCallback ) {
				props.continueCallback();
			}
		}

		return {
			defaultAction,
			leavePage,
			primaryAction,
			stayOnPage,
			i18n
		};
	}
} );
</script>
