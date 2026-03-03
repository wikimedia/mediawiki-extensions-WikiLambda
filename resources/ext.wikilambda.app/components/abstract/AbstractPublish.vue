<!--
	WikiLambda Vue component for publishing Abstract content.
	Shown only in edit mode. Contains the Publish button and dialogs.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-abstract-publish">
		<cdx-button
			class="ext-wikilambda-app-abstract-publish__publish"
			action="progressive"
			weight="primary"
			:disabled="!isDirty"
			@click.stop="waitAndHandlePublish"
		>
			{{ i18n( 'wikilambda-publishnew' ).text() }}
		</cdx-button>
		<wl-publish-dialog
			:show-dialog="showPublishDialog"
			:submit-action="submitAction"
			:success-callback="successCallback"
			:error-callback="errorCallback"
			@close-dialog="closePublishDialog"
			@before-exit="removeListeners"
		></wl-publish-dialog>
		<wl-leave-editor-dialog
			:show-dialog="showLeaveEditorDialog"
			:continue-callback="leaveEditorCallback"
			@close-dialog="closeLeaveDialog"
			@before-exit="removeListeners"
		></wl-leave-editor-dialog>
	</div>
</template>

<script>
const { defineComponent, inject, ref } = require( 'vue' );
const { storeToRefs } = require( 'pinia' );

const Constants = require( '../../Constants.js' );
const useLeaveEditorDialog = require( '../../composables/useLeaveEditorDialog.js' );
const useMainStore = require( '../../store/index.js' );

// Dialog components
const LeaveEditorDialog = require( '../widgets/publish/LeaveEditorDialog.vue' );
const PublishDialog = require( '../widgets/publish/PublishDialog.vue' );
// Codex components
const { CdxButton } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-abstract-publish',
	components: {
		'cdx-button': CdxButton,
		'wl-leave-editor-dialog': LeaveEditorDialog,
		'wl-publish-dialog': PublishDialog
	},
	setup() {
		const i18n = inject( 'i18n' );
		const store = useMainStore();
		const { isDirty } = storeToRefs( store );

		// Leave editor dialog
		const {
			closeLeaveDialog,
			leaveEditorCallback,
			removeListeners,
			showLeaveEditorDialog
		} = useLeaveEditorDialog( { isDirty } );

		// Publish state
		const showPublishDialog = ref( false );

		function closePublishDialog() {
			showPublishDialog.value = false;
		}

		function waitAndHandlePublish() {
			store.waitForRunningParsers.then( () => handlePublish() );
		}

		function handlePublish() {
			const isValid = store.validateAbstractWikiContent();
			if ( isValid ) {
				showPublishDialog.value = true;
			}
		}

		function submitAction( { summary } ) {
			return store.submitAbstractWikiContent( { summary } );
		}

		/**
		 * @param {ApiError} error
		 */
		function errorCallback( error ) {
			store.clearErrors( Constants.STORED_OBJECTS.MAIN );

			// Set default save error message if internal error or no message,
			// else, show message returned by the action=edit api
			const errorMessage = error.isInternalApiError || !error.message ?
				i18n( 'wikilambda-unknown-save-error-message' ).text() :
				error.message;

			store.setError( {
				errorId: Constants.STORED_OBJECTS.MAIN,
				errorType: Constants.ERROR_TYPES.ERROR,
				errorMessage
			} );
		}

		function successCallback( response ) {
			const pageUrl = new mw.Title( response.title ).getUrl();
			const linkUrl = new URL( pageUrl, window.location.origin );
			window.location.href = linkUrl;
		}

		return {
			errorCallback,
			closeLeaveDialog,
			closePublishDialog,
			isDirty,
			leaveEditorCallback,
			removeListeners,
			showLeaveEditorDialog,
			showPublishDialog,
			submitAction,
			successCallback,
			waitAndHandlePublish,
			i18n
		};
	}
} );
</script>
