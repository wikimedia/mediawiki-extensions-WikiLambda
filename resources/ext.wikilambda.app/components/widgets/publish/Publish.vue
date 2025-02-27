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
				{{ $i18n( 'wikilambda-cancel' ).text() }}
			</cdx-button>
			<cdx-button
				class="ext-wikilambda-app-publish-widget__publish-button"
				action="progressive"
				:disabled="!isDirty && !revertToEdit"
				data-testid="publish-button"
				@click.stop="waitAndHandlePublish"
			>
				{{ $i18n( 'wikilambda-publishnew' ).text() }}
			</cdx-button>
			<wl-publish-dialog
				:show-dialog="showPublishDialog"
				:function-signature-changed="functionSignatureChanged"
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
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );
const { CdxButton } = require( '../../../../codex.js' );
const Constants = require( '../../../Constants.js' );
const eventLogUtils = require( '../../../mixins/eventLogUtils.js' );
const urlUtils = require( '../../../mixins/urlUtils.js' );
const useMainStore = require( '../../../store/index.js' );
const LeaveEditorDialog = require( './LeaveEditorDialog.vue' );
const PublishDialog = require( './PublishDialog.vue' );
const WidgetBase = require( '../../base/WidgetBase.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-publish-widget',
	components: {
		'cdx-button': CdxButton,
		'wl-leave-editor-dialog': LeaveEditorDialog,
		'wl-publish-dialog': PublishDialog,
		'wl-widget-base': WidgetBase
	},
	mixins: [ eventLogUtils, urlUtils ],
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
	data: function () {
		return {
			leaveEditorCallback: undefined,
			showLeaveEditorDialog: false,
			showPublishDialog: false
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getCurrentZObjectId',
		'getCurrentZObjectType',
		'getCurrentZImplementationType',
		'getUserLangZid',
		'getUserLangCode',
		'isCreateNewPage',
		'waitForRunningParsers'
	] ), {
		/**
		 * Returns the eventLog data object
		 *
		 * @return {Object}
		 */
		eventData: function () {
			return {
				isnewzobject: this.isCreateNewPage,
				zobjectid: this.getCurrentZObjectId,
				zobjecttype: this.getCurrentZObjectType || null,
				implementationtype: this.getCurrentZImplementationType || null,
				zlang: this.getUserLangZid || null,
				isdirty: this.isDirty
			};
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'clearValidationErrors',
		'validateZObject'
	] ), {
		/**
		 * Handle cancel event from Publish dialog
		 */
		closePublishDialog: function () {
			this.showPublishDialog = false;
		},

		/**
		 * Handle cancel event from Leave dialog
		 */
		closeLeaveDialog: function () {
			this.showLeaveEditorDialog = false;
		},

		/**
		 * If 'oldid' exists in the query, return true.
		 * If true, this enables the Publish button without needing an event.
		 *
		 * @return {boolean}
		 */
		revertToEdit: function () {
			return !!( this.getParameterByName( 'oldid' ) || this.getParameterByName( 'undo' ) );
		},

		/**
		 * Waits for running parsers to return and persist
		 * changes before going ahead and running the function call
		 */
		waitAndHandlePublish: function () {
			this.waitForRunningParsers.then( () => this.handlePublish() );
		},

		/**
		 * Handle click event on Publish button: opens
		 * the publish dialog.
		 */
		handlePublish: function () {
			this.clearValidationErrors();
			const isValid = this.validateZObject();
			if ( isValid ) {
				this.$emit( 'start-publish' );
				this.showPublishDialog = true;
			}
		},

		/**
		 * Handle click event on Cancel button: opens
		 * the leave editor confirmation dialog.
		 */
		handleCancel: function () {
			// Emit click cancel event
			this.$emit( 'start-cancel' );
			// Get redirect url
			const cancelTargetUrl = this.isCreateNewPage ?
				new mw.Title( Constants.PATHS.MAIN_PAGE ).getUrl() :
				`/view/${ this.getUserLangCode }/${ this.getCurrentZObjectId }`;
			this.leaveTo( cancelTargetUrl );
		},

		/**
		 * Handles navigation away from the page.
		 * Currently only handles navigation out when
		 * clicking a link.
		 *
		 * @param {Object} e the click event
		 */
		handleClickAway: function ( e ) {
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
			if ( !target.href || target.target === '_blank' || this.isLinkCurrentPath( target.href ) || target.role === 'button' ) {
				return;
			}
			// Else, abandon the page
			e.preventDefault();
			this.leaveTo( target.href );
		},

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
		handleUnload: function ( e ) {
			if ( this.isDirty ) {
				e.preventDefault();
			}
		},

		/**
		 * Handle actions before leaving the edit page:
		 * Show confirmation dialog if there are unsaved changes
		 * and sends a cancelation event when/if we finally leave.
		 *
		 * @param {string} targetUrl
		 */
		leaveTo: function ( targetUrl ) {
			const leaveAction = () => {
				this.removeListeners();
				// Log an event using Metrics Platform's core interaction events
				const interactionData = {
					zobjecttype: this.getCurrentZObjectType || null,
					zobjectid: this.getCurrentZObjectId,
					zlang: this.getUserLangZid || null,
					implementationtype: this.getCurrentZImplementationType || null
				};
				this.submitInteraction( 'cancel', interactionData );
				window.location.href = targetUrl;
			};

			if ( this.isDirty ) {
				this.leaveEditorCallback = leaveAction;
				this.showLeaveEditorDialog = true;
			} else {
				leaveAction();
			}
		},

		/**
		 * Add event listeners.
		 */
		addListeners: function () {
			window.addEventListener( 'click', this.handleClickAway );
			window.addEventListener( 'beforeunload', this.handleUnload );
		},

		/**
		 * Remove event listeners.
		 */
		removeListeners: function () {
			window.removeEventListener( 'click', this.handleClickAway );
			window.removeEventListener( 'beforeunload', this.handleUnload );
		}
	} ),
	mounted: function () {
		this.addListeners();
	},
	beforeUnmount: function () {
		this.removeListeners();
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
