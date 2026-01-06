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
const { computed, defineComponent, inject, onBeforeUnmount, onMounted, ref } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const useEventLog = require( '../../../composables/useEventLog.js' );
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

		// Dialog state
		const leaveEditorCallback = ref( undefined );
		const showLeaveEditorDialog = ref( false );
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

		/**
		 * Handle cancel event from Leave dialog
		 */
		function closeLeaveDialog() {
			showLeaveEditorDialog.value = false;
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
			// Emit click cancel event
			emit( 'start-cancel' );
			// Get redirect url
			const cancelTargetUrl = store.isCreateNewPage ?
				new mw.Title( Constants.PATHS.MAIN_PAGE ).getUrl() :
				urlUtils.generateViewUrl( { langCode: store.getUserLangCode, zid: store.getCurrentZObjectId } );
			leaveTo( cancelTargetUrl );
		}

		/**
		 * Handles navigation away from the page.
		 * Currently only handles navigation out when
		 * clicking a link.
		 *
		 * @param {Object} e the click event
		 */
		function handleClickAway( e ) {
			let target = e.target;
			// If the click element is not a link, exit
			while ( target && target.tagName !== 'A' ) {
				target = target.parentNode;
				if ( !target ) {
					return;
				}
			}
			/**
			 * if the link:
			 * - doesn't have a target,
			 * - target property is _blank,
			 * - the link is to the current page, (usually when it's a hash link)
			 * - the link is a button
			 * we are staying in this page, so there's no need to handle cancelation
			 */
			if (
				!target.href ||
				target.target === '_blank' ||
				urlUtils.isLinkCurrentPath( target.href ) ||
				target.role === 'button'
			) {
				return;
			}
			// Else, abandon the page
			e.preventDefault();
			leaveTo( target.href );
		}

		/**
		 * Handles navigation away from the page using the browser
		 * beforeunload event. The dialog shown will be the browser
		 * provided dialog, and when existing through this way we
		 * won't be able to track cancel events with our event
		 * logging system. The beforeunload event has compatibility
		 * and performance issues.
		 *
		 * See:
		 * https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
		 * https://developer.chrome.com/blog/page-lifecycle-api/#the-beforeunload-event
		 *
		 * @param {Object} e the beforeunload event
		 */
		function handleUnload( e ) {
			if ( props.isDirty ) {
				e.preventDefault();
			}
		}

		/**
		 * Handle actions before leaving the edit page:
		 * Show confirmation dialog if there are unsaved changes
		 * and sends a cancelation event when/if we finally leave.
		 *
		 * @param {string} targetUrl
		 */
		function leaveTo( targetUrl ) {
			function leaveAction() {
				removeListeners();
				// Log an event using Metrics Platform's core interaction events
				const interactionData = {
					zobjecttype: store.getCurrentZObjectType || null,
					zobjectid: store.getCurrentZObjectId,
					zlang: store.getUserLangZid || null,
					implementationtype: store.getCurrentZImplementationType || null
				};
				submitInteraction( 'cancel', interactionData );
				window.location.href = targetUrl;
			}

			if ( props.isDirty ) {
				leaveEditorCallback.value = leaveAction;
				showLeaveEditorDialog.value = true;
			} else {
				leaveAction();
			}
		}

		// Event listeners
		/**
		 * Add event listeners.
		 */
		function addListeners() {
			window.addEventListener( 'click', handleClickAway );
			window.addEventListener( 'beforeunload', handleUnload );
		}

		/**
		 * Remove event listeners.
		 */
		function removeListeners() {
			window.removeEventListener( 'click', handleClickAway );
			window.removeEventListener( 'beforeunload', handleUnload );
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

		// Lifecycle
		onMounted( () => {
			addListeners();
		} );

		onBeforeUnmount( () => {
			removeListeners();
		} );

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
