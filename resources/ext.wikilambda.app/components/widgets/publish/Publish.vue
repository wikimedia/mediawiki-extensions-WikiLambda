<!--
	WikiLambda Vue component for publishing a zobject.
	Contains both the publish button and the dialog pop-up flow prior
	to submission.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-widget-base class="ext-wikilambda-app-publish-widget" data-testid="publish-widget">
		<template #main>
			<cdx-button
				class="ext-wikilambda-app-publish-widget__cancel-button"
				weight="primary"
				@click.stop="handleCancel"
			>
				{{ i18n( 'wikilambda-cancel' ).text() }}
			</cdx-button>
			<cdx-button
				class="ext-wikilambda-app-publish-widget__publish-button"
				action="progressive"
				:disabled="!isDirty && !revertToEdit"
				data-testid="publish-button"
				@click.stop="waitAndHandlePublish"
			>
				{{ i18n( 'wikilambda-publishnew' ).text() }}
			</cdx-button>
			<wl-publish-dialog
				:show-dialog="showPublishDialog"
				:initial-summary="initialSummary"
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
		</template>
	</wl-widget-base>
</template>

<script>
const { computed, defineComponent, inject } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const useEventLog = require( '../../../composables/useEventLog.js' );
const useLeaveEditorDialog = require( '../../../composables/useLeaveEditorDialog.js' );
const usePublish = require( '../../../composables/usePublish.js' );
const urlUtils = require( '../../../utils/urlUtils.js' );
const useMainStore = require( '../../../store/index.js' );
const ApiError = require( '../../../store/classes/ApiError.js' );

// Base components
const WidgetBase = require( '../../base/WidgetBase.vue' );
// Widget components
const LeaveEditorDialog = require( './LeaveEditorDialog.vue' );
const PublishDialog = require( './PublishDialog.vue' );
// Codex components
const { CdxButton } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-publish-widget',
	components: {
		'cdx-button': CdxButton,
		'wl-leave-editor-dialog': LeaveEditorDialog,
		'wl-publish-dialog': PublishDialog,
		'wl-widget-base': WidgetBase
	},
	props: {
		functionSignatureChanged: {
			type: Boolean,
			required: false,
			default: false
		},
		isDirty: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	emits: [ 'start-cancel', 'start-publish' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();
		const { submitInteraction } = useEventLog();

		// Leave editor dialog (link clicks, beforeunload, dialog)
		const {
			closeLeaveDialog,
			leaveEditorCallback,
			removeListeners,
			showLeaveEditorDialog,
			leaveTo
		} = useLeaveEditorDialog( {
			isDirty: computed( () => props.isDirty ),
			onBeforeLeave: submitCancelInteraction
		} );

		/**
		 * Submit cancel interaction metric for event logging.
		 */
		function submitCancelInteraction() {
			const interactionData = Object.assign( {}, store.getInteractionData, {
				implementationtype: store.getCurrentZImplementationType || null
			} );
			submitInteraction( 'cancel', interactionData );
		}

		// Publish button and dialog state
		const {
			closePublishDialog,
			initialSummary,
			revertToEdit,
			showPublishDialog,
			waitAndHandlePublish
		} = usePublish( {
			validate: () => {
				store.clearValidationErrors();
				return store.validateZObject();
			},
			onPublishStart: () => emit( 'start-publish' )
		} );

		// Navigation handling
		/**
		 * Handle click event on Cancel button: opens
		 * the leave editor confirmation dialog.
		 */
		function handleCancel() {
			// emit event to start cancel
			emit( 'start-cancel' );
			// Get redirect url
			const cancelTargetUrl = store.isCreateNewPage ?
				new mw.Title( Constants.PATHS.MAIN_PAGE ).getUrl() :
				urlUtils.generateViewUrl( { langCode: store.getUserLangCode, zid: store.getCurrentZObjectId } );
			leaveTo( cancelTargetUrl );
		}

		// Publish actions
		/**
		 * Call store action for ZObject submission, with summary and
		 * flag to know whether to disconnect implementations and tests.
		 *
		 * @param {Object} payload
		 * @param {string} payload.summary
		 * @return {Promise}
		 */
		function submitAction( { summary } ) {
			return store.submitZObject( {
				summary,
				disconnectFunctionObjects: props.functionSignatureChanged
			} );
		}

		/**
		 * Actions to run after a publish action has finished
		 * successfully.
		 *
		 * @param {Object} response
		 */
		function successCallback( response ) {
			const pageTitle = response.page;

			store.clearErrors( Constants.STORED_OBJECTS.MAIN, true );
			store.setPublishSuccessKey( pageTitle );

			// Navigate to page
			window.location.href = !pageTitle ?
				new mw.Title( Constants.PATHS.MAIN_PAGE ).getUrl() :
				urlUtils.generateViewUrl( { langCode: store.getUserLangCode, zid: pageTitle } );
		}

		/**
		 * Actions to run after a publish action has failed.
		 *
		 * @param {ApiError} error
		 */
		function errorCallback( error ) {
			store.clearErrors( Constants.STORED_OBJECTS.MAIN );
			const errorMessage = error.code === 'badtoken' ?
				i18n( 'wikilambda-loggedout-error-message' ).text() :
				error.messageOrFallback( 'wikilambda-unknown-save-error-message' );
			store.setError( {
				errorId: Constants.STORED_OBJECTS.MAIN,
				errorType: Constants.ERROR_TYPES.ERROR,
				errorMessage
			} );
		}

		return {
			errorCallback,
			closeLeaveDialog,
			closePublishDialog,
			initialSummary,
			handleCancel,
			leaveEditorCallback,
			removeListeners,
			revertToEdit,
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

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-publish-widget {
	.ext-wikilambda-app-publish-widget__cancel-button {
		margin-right: @spacing-50;
	}
}
</style>
