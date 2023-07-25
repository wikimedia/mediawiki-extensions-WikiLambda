<!--
	WikiLambda Vue component for the Publish Dialog.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-publishdialog"
		data-testid="confirm-publish-dialog"
	>
		<cdx-dialog
			:open="showDialog"
			:title="publishDialogTitle"
			:close-button-label="closeLabel"
			:primary-action="primaryAction"
			:default-action="defaultAction"
			@default="closeDialog"
			@primary="publishZObject"
			@update:open="closeDialog"
		>
			<!-- Error and Warning section -->
			<div
				v-if="hasErrors"
				class="ext-wikilambda-publishdialog__errors"
			>
				<cdx-message
					v-for="( error, index ) in errors"
					:key="'dialog-error-' + index"
					class="ext-wikilambda-publishdialog__error"
					:type="error.type"
				>
					<div v-html="getErrorMessage( error )"></div>
				</cdx-message>
			</div>

			<!-- Summary section -->
			<cdx-field>
				<cdx-text-input
					v-model="summary"
					class="ext-wikilambda-publishdialog__summary-input"
					:aria-label="summaryLabel"
					:placeholder="summaryPlaceholder"
				></cdx-text-input>
				<template #label>
					{{ summaryHelpText }}
				</template>
			</cdx-field>

			<!-- Legal text -->
			<template #footer-text>
				<div
					class="ext-wikilambda-publishdialog__legal-text"
					v-html="legalText"
				></div>
			</template>
		</cdx-dialog>
	</div>
</template>

<script>
const Constants = require( '../../Constants.js' ),
	CdxField = require( '@wikimedia/codex' ).CdxField,
	CdxTextInput = require( '@wikimedia/codex' ).CdxTextInput,
	CdxMessage = require( '@wikimedia/codex' ).CdxMessage,
	CdxDialog = require( '@wikimedia/codex' ).CdxDialog,
	eventLogUtils = require( '../../mixins/eventLogUtils.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	name: 'wl-publish-dialog',
	components: {
		'cdx-field': CdxField,
		'cdx-text-input': CdxTextInput,
		'cdx-message': CdxMessage,
		'cdx-dialog': CdxDialog
	},
	mixins: [ eventLogUtils ],
	inject: {
		viewmode: { default: false }
	},
	props: {
		showDialog: {
			type: Boolean,
			required: true,
			default: false
		},
		functionSignatureChanged: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	data: function () {
		return {
			summary: ''
		};
	},
	computed: $.extend( mapGetters( [
		'getZLang',
		'getCurrentZObjectId',
		'getCurrentZObjectType',
		'getCurrentZImplementationType',
		'getErrors',
		'getUserZlangZID',
		'isNewZObject'
	] ), {
		/**
		 * Returns the array of errors and warnings of the page
		 *
		 * @return {Array}
		 */
		errors: function () {
			return this.getErrors( 0 );
		},

		/**
		 * Returns whether there are any errors in the page
		 * to show in the publish dialog
		 *
		 * @return { boolean }
		 */
		hasErrors: function () {
			return this.errors.length !== 0;
		},

		/**
		 * Returns an object of type PrimaryDialogAction that describes
		 * the action of the primary (save or publish) dialog button.
		 *
		 * @return {Object}
		 */
		primaryAction: function () {
			return {
				actionType: 'progressive',
				label: this.$i18n( 'wikilambda-publishnew' ).text()
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
				label: this.$i18n( 'wikilambda-cancel' ).text()
			};
		},

		/**
		 * Returns the title for the Publish dialog
		 *
		 * @return {string}
		 */
		publishDialogTitle: function () {
			return this.$i18n( 'wikilambda-editor-publish-dialog-header' ).text();
		},

		/**
		 * Returns the label for the summary text field
		 *
		 * @return {string}
		 */
		summaryLabel: function () {
			return this.$i18n( 'wikilambda-editor-publish-dialog-summary-label' ).text();
		},

		/**
		 * Returns the help text for the summary text field
		 *
		 * @return {string}
		 */
		summaryHelpText: function () {
			return this.$i18n( 'wikilambda-editor-publish-dialog-summary-help-text' ).text();
		},

		/**
		 * Returns the placeholder for the summary text field
		 *
		 * @return {string}
		 */
		summaryPlaceholder: function () {
			return this.$i18n( 'wikilambda-editor-publish-dialog-summary-placeholder' ).text();
		},

		/**
		 * Returns the name for the Close dialog button
		 *
		 * @return {string}
		 */
		closeLabel: function () {
			return this.$i18n( 'wikilambda-toast-close' ).text();
		},

		/**
		 * Returns the legal text to display in the Publish Dialog, depending
		 * on the type of object that is being submitted:
		 * * Special message for implementations (Apache 2.0 licence for code).
		 * * General message for all other kinds of ZObjects (CC0).
		 *
		 * @return { string }
		 */
		legalText: function () {
			return ( this.getCurrentZObjectType === Constants.Z_IMPLEMENTATION ) ?
				this.$i18n( 'wikifunctions-edit-copyrightwarning-implementation' ).text() :
				this.$i18n( 'wikifunctions-edit-copyrightwarning-function' ).text();
		}
	} ),
	methods: $.extend( mapActions( [
		'submitZObject',
		'setError',
		'setDirty',
		'clearAllErrors'
	] ),
	{
		/**
		 * Clears the error notifications and emits a close-dialog
		 * event for the Publish widget to close the dialog.
		 */
		closeDialog: function () {
			if ( this.hasErrors ) {
				this.clearAllErrors();
			}
			this.$emit( 'close-dialog' );
		},

		/**
		 * Before exiting the page after successful publishing, handle
		 * state and remove exit event listeners.
		 *
		 * @param {string | undefined} pageTitle
		 */
		successfulExit: function ( pageTitle ) {
			this.$emit( 'before-exit' );
			this.setDirty( false );
			this.closeDialog();
			window.location.href = !pageTitle ?
				new mw.Title( Constants.PATHS.MAIN_PAGE ).getUrl() :
				`/view/${this.getZLang}/${pageTitle}?success=true`;
		},

		/**
		 * Submits the ZObject to the wikilambda_edit API
		 * and handles the return value:
		 * 1. If the response contains an error, saves the error
		 *    in the store/errors module and displays the error messages
		 *    in the Publish Dialog notification block.
		 * 2. If the response is successful, navigates to the ZObject
		 *    page.
		 */
		publishZObject: function () {
			const summary = this.summary;
			const detachFunctionObjects = this.functionSignatureChanged;

			this.submitZObject( {
				summary,
				detachFunctionObjects
			} ).then( ( pageTitle ) => {
				this.successfulExit( pageTitle );
			} ).catch( ( error ) => {
				this.clearAllErrors();
				// If error.error.message: known ZError
				// Else, PHP error or exception captured in error.error.info
				// Additionally, if nothing available, show generic unknown error message
				const errorMessage = ( error && error.error ) ?
					( error.error.message || error.error.info ) :
					undefined;

				const payload = {
					rowId: 0,
					errorType: Constants.errorTypes.ERROR,
					errorMessage,
					errorCode: !errorMessage ? Constants.errorCodes.UNKNOWN_ERROR : undefined
				};

				this.setError( payload );
			} ).finally( () => {
				// After receiving the response, log a publish event
				const eventNamespace = this.getNamespace( this.getCurrentZObjectType );
				const customData = {
					isnewzobject: this.isNewZObject,
					zobjectid: this.getCurrentZObjectId,
					zobjecttype: this.getCurrentZObjectType || null,
					implementationtype: this.getCurrentZImplementationType || null,
					zlang: this.getUserZlangZID || null,
					haserrors: this.hasErrors
				};
				this.dispatchEvent( `wf.ui.${eventNamespace}.publish`, customData );
			} );
		},

		/**
		 * Returns the translated message for a given error code.
		 * Error messages can have html tags.
		 *
		 * @param {Object} error
		 * @return {string}
		 */
		getErrorMessage: function ( error ) {
			// eslint-disable-next-line mediawiki/msg-doc
			return error.message || this.$i18n( error.code ).text();
		}
	} )
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-publishdialog {
	&__errors {
		margin-bottom: @spacing-200;
	}

	&__summary {
		display: flex;
		flex-direction: column;
		padding: @spacing-50 0;
		color: @color-placeholder;
	}

	&__summary-label {
		padding-bottom: @spacing-25;
	}

	&__divider {
		margin-top: @spacing-100;
	}

	&__actions {
		display: flex;
		flex-direction: row-reverse;

		&__button-cancel {
			margin-right: @spacing-50;
		}
	}

	&__legal-text {
		color: @color-placeholder;
	}

	&__body {
		padding: 0 @spacing-100 @spacing-100;
	}

	&__header {
		display: flex;
		justify-content: space-between;
		padding: @spacing-50 0;
		position: sticky;
		top: @spacing-100;
		background: @background-color-base;

		&__title {
			width: 100%;
			font-weight: bold;
			font-size: 1.15em;
			margin: auto;
		}

		&__close-button {
			display: flex;
			color: @color-notice;
			justify-content: center;
			align-items: center;
			height: @size-200;
			width: @size-200;
			background: none;
			border: 0;
			margin: auto;
		}
	}
}
</style>
