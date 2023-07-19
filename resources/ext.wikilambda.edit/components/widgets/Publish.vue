<template>
	<!--
		Wikilambda Vue component for publishing a zobject.
		Contains both the publish button and the dialog pop-up flow prior
		to submission.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<wl-widget-base class="ext-wikilambda-publish-widget">
		<template #main>
			<cdx-button
				class="ext-wikilambda-publish-widget__cancel-button"
				weight="primary"
				@click.stop="handleCancel"
			>
				{{ $i18n( 'wikilambda-cancel' ).text() }}
			</cdx-button>
			<cdx-button
				class="ext-wikilambda-publish-widget__publish-button"
				action="progressive"
				:disabled="!isDirty"
				data-testid="publish-button"
				@click.stop="handlePublish"
			>
				{{ $i18n( 'wikilambda-publishnew' ).text() }}
			</cdx-button>
			<wl-publish-dialog
				:show-dialog="showPublishDialog"
				:function-signature-changed="functionSignatureChanged"
				@close-dialog="closePublishDialog"
			></wl-publish-dialog>
			<wl-leave-editor-dialog
				:show-dialog="showLeaveEditorDialog"
				:continue-callback="leaveEditorCallback"
				@close-dialog="closeLeaveDialog">
			</wl-leave-editor-dialog>
		</template>
	</wl-widget-base>
</template>

<script>
const CdxButton = require( '@wikimedia/codex' ).CdxButton,
	WidgetBase = require( '../base/WidgetBase.vue' ),
	LeaveEditorDialog = require( './LeaveEditorDialog.vue' ),
	PublishDialog = require( './PublishDialog.vue' ),
	eventLogger = require( '../../mixins/eventLogUtils.js' ).methods,
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
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
	data: function () {
		return {
			leaveEditorCallback: undefined,
			showLeaveEditorDialog: false,
			showPublishDialog: false
		};
	},
	computed: $.extend( mapGetters( [
		'getCurrentZObjectId',
		'getCurrentZObjectType',
		'getCurrentZImplementationType',
		'getUserZlangZID',
		'getZLang',
		'isNewZObject'
	] ), {
		/**
		 * Returns the eventLog data object
		 *
		 * @return {Object}
		 */
		eventData: function () {
			return {
				isnewzobject: this.isNewZObject,
				zobjectid: this.getCurrentZObjectId,
				zobjecttype: this.getCurrentZObjectType || null,
				implementationtype: this.getCurrentZImplementationType || null,
				zlang: this.getUserZlangZID || null,
				isdirty: this.isDirty
			};
		}
	} ),
	methods: $.extend( mapActions( [
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
		 * Handle click event on Publish button: opens
		 * the publish dialog.
		 */
		handlePublish: function () {
			this.clearValidationErrors();
			this.validateZObject().then( ( isValid ) => {
				if ( isValid ) {
					this.$emit( 'start-publish' );
					this.showPublishDialog = true;
				}
			} );
		},

		/**
		 * Handle click event on Cancel button: opens
		 * the leave editor confirmation dialog.
		 */
		handleCancel: function () {
			// Emit click cancel event
			this.$emit( 'start-cancel' );
			// Get redirect url
			const cancelTargetUrl = this.isNewZObject ?
				new mw.Title( 'Wikifunctions:Main_Page' ).getUrl() :
				'/view/' + this.getZLang + '/' + this.getCurrentZObjectId;
			this.leaveTo( cancelTargetUrl );
		},

		/**
		 * Handles navigation away from the page.
		 * Currently only handles navigation out when
		 * chicking a link.
		 *
		 * TODO: figure out how to capture back button
		 * or direct window.location changes
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
			// If the link doesn't have a target or target property is _blank,
			// we are staying in this page, so there's no need to handle cancelation
			if ( !target.href || ( target.target === '_blank' ) ) {
				return;
			}
			// Else, abandon the page
			e.preventDefault();
			this.leaveTo( target.href );
		},

		/**
		 * Abandon page after confirmation, dispatch
		 * cancelation event and redirect to targetUrl
		 *
		 * @param {string} targetUrl
		 */
		leaveTo: function ( targetUrl ) {
			const leaveAction = () => {
				const eventNamespace = eventLogger.getNamespace( this.getCurrentZObjectType );
				eventLogger.dispatchEvent( `wf.ui.${eventNamespace}.cancel`, this.eventData );
				window.removeEventListener( 'click', this.handleClickAway );
				window.location.href = targetUrl;
			};

			if ( this.isDirty ) {
				this.leaveEditorCallback = leaveAction;
				this.showLeaveEditorDialog = true;
			} else {
				leaveAction();
			}
		}
	} ),
	mounted: function () {
		window.addEventListener( 'click', this.handleClickAway );
	}
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-publish-widget {
	&__cancel-button {
		margin-right: @spacing-50;
	}

	.cdx-card__text__title {
		display: none;
	}
}
</style>
