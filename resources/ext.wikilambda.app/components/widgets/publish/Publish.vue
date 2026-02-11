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
				:submit-action="submitAction"
				:success-callback="successCallback"
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
const { computed, defineComponent, inject, ref } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const useEventLog = require( '../../../composables/useEventLog.js' );
const useLeaveEditorDialog = require( '../../../composables/useLeaveEditorDialog.js' );
const urlUtils = require( '../../../utils/urlUtils.js' );
const useMainStore = require( '../../../store/index.js' );

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
			const interactionData = {
				zobjecttype: store.getCurrentZObjectType || null,
				zobjectid: store.getCurrentZObjectId,
				zlang: store.getUserLangZid || null,
				implementationtype: store.getCurrentZImplementationType || null
			};
			submitInteraction( 'cancel', interactionData );
		}

		// Dialog state
		const showPublishDialog = ref( false );

		// Publish button state
		/**
		 * If 'oldid' or 'undo' exist in the query (and are not empty), return true.
		 * If true, this enables the Publish button without needing an event.
		 *
		 * @return {boolean}
		 */
		const revertToEdit = computed( () => ( !store.isCreateNewPage && store.getQueryParams && (
			( typeof store.getQueryParams.oldid === 'string' && store.getQueryParams.oldid.trim() !== '' ) ||
			( typeof store.getQueryParams.undo === 'string' && store.getQueryParams.undo.trim() !== '' )
		) ) );

		// Dialog actions
		/**
		 * Handle cancel event from Publish dialog
		 */
		function closePublishDialog() {
			showPublishDialog.value = false;
		}

		// Publish actions
		/**
		 * Waits for running parsers to return and persist
		 * changes before going ahead and running the function call
		 */
		function waitAndHandlePublish() {
			store.waitForRunningParsers.then( () => handlePublish() );
		}

		/**
		 * Handle click event on Publish button: opens
		 * the publish dialog.
		 */
		function handlePublish() {
			store.clearValidationErrors();
			const isValid = store.validateZObject();
			if ( isValid ) {
				raisePublishWarnings();
				emit( 'start-publish' );
				showPublishDialog.value = true;
			}
		}

		// Warnings
		/**
		 * Check if there are any empty reference warnings in the errors.
		 *
		 * @return {boolean}
		 */
		function hasEmptyReferenceWarnings() {
			return store.getErrorPaths.some( ( errorId ) => store.getErrors( errorId )
				.some( ( error ) => error.errorMessageKey === 'wikilambda-empty-reference-warning' ) );
		}

		/**
		 * Check if we should show a publish dialog warning if:
		 * - there are empty Z9K1/references
		 * - there is Wikifunctions.Debug code in any Z16/Code objects
		 *
		 * This is called only when validation passes and the publish dialog is about to open.
		 */
		function raisePublishWarnings() {
			if ( hasEmptyReferenceWarnings() ) {
				store.setError( {
					errorId: Constants.STORED_OBJECTS.MAIN,
					errorMessageKey: 'wikilambda-empty-references-publish-warning',
					errorType: Constants.ERROR_TYPES.WARNING
				} );
			}
		}

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
				shouldDisconnectFunctionObjects: props.functionSignatureChanged
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
			store.setPublishSuccess( pageTitle );

			// Navigate to page
			window.location.href = !pageTitle ?
				new mw.Title( Constants.PATHS.MAIN_PAGE ).getUrl() :
				urlUtils.generateViewUrl( { langCode: store.getUserLangCode, zid: pageTitle } );
		}

		return {
			closeLeaveDialog,
			closePublishDialog,
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
