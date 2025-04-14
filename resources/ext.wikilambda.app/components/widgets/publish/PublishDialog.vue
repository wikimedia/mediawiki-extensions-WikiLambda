<!--
	WikiLambda Vue component for the Publish Dialog.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div data-testid="confirm-publish-dialog">
		<cdx-dialog
			class="ext-wikilambda-app-publish-dialog"
			data-testid="publish-dialog"
			:open="showDialog"
			:title="publishDialogTitle"
			:close-button-label="$i18n( 'wikilambda-dialog-close' ).text()"
			:primary-action="primaryAction"
			:default-action="defaultAction"
			@default="closeDialog"
			@primary="publishZObject"
			@update:open="closeDialog"
		>
			<!-- Error and Warning section -->
			<div
				v-if="hasErrors"
				class="ext-wikilambda-app-publish-dialog__errors"
			>
				<cdx-message
					v-for="( error, index ) in errors"
					:key="'dialog-error-' + index"
					class="ext-wikilambda-app-publish-dialog__error"
					:type="error.type"
				>
					<!-- eslint-disable vue/no-v-html -->
					<div v-html="getErrorMessage( error )"></div>
				</cdx-message>
			</div>

			<!-- Summary section -->
			<cdx-field :status="status">
				<cdx-text-input
					v-model="summary"
					class="ext-wikilambda-app-publish-dialog__summary-input"
					:aria-label="summaryLabel"
					:placeholder="summaryPlaceholder"
					@keydown="handleSummaryKeydown"
				></cdx-text-input>
				<template #label>
					{{ $i18n( 'wikilambda-editor-publish-dialog-summary-help-text' ).text() }}
				</template>

				<template v-if="hasKeyboardSubmitWarning" #warning>
					<!-- eslint-disable-next-line vue/no-v-html -->
					<span v-html="keyboardSubmitMessage"></span>
				</template>
			</cdx-field>

			<!-- Legal text -->
			<template #footer-text>
				<div
					class="ext-wikilambda-app-publish-dialog__legal-text"
					v-html="legalText"
				></div>
			</template>
		</cdx-dialog>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { CdxDialog, CdxField, CdxMessage, CdxTextInput } = require( '../../../../codex.js' );
const { mapActions, mapState } = require( 'pinia' );

const Constants = require( '../../../Constants.js' );
const errorMixin = require( '../../../mixins/errorMixin.js' );
const eventLogMixin = require( '../../../mixins/eventLogMixin.js' );
const useMainStore = require( '../../../store/index.js' );
const urlUtils = require( '../../../utils/urlUtils.js' );

const enterKeyChar = `
	<kbd class="ext-wikilambda-app-publish-dialog__kbd">
		<span class="ext-wikilambda-app-publish-dialog__kbd-enter">&#x21B5;</span>
	</kbd>
`;
const cmdKeyChar = `
	<kbd class="ext-wikilambda-app-publish-dialog__kbd">
		<span class="ext-wikilambda-app-publish-dialog__kbd-cmd">&#x2318;</span>
	</kbd>
`;

const ctrlKeyChar = `
	<kbd class="ext-wikilambda-app-publish-dialog__kbd">
		<span class="ext-wikilambda-app-publish-dialog__kbd-ctrl">Ctrl</span>
	</kbd>
`;
module.exports = exports = defineComponent( {
	name: 'wl-publish-dialog',
	components: {
		'cdx-field': CdxField,
		'cdx-text-input': CdxTextInput,
		'cdx-message': CdxMessage,
		'cdx-dialog': CdxDialog
	},
	mixins: [ eventLogMixin, errorMixin ],
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
			summary: '',
			hasKeyboardSubmitWarning: false
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getUserLangCode',
		'getCurrentZObjectId',
		'getCurrentZObjectType',
		'getCurrentZImplementationType',
		'getErrors',
		'getUserLangZid'
	] ), {

		/**
		 * Returns the status of the summary text field.
		 *
		 * @return {string}
		 */
		status: function () {
			return this.hasKeyboardSubmitWarning ? 'warning' : 'default';
		},

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
		 * Returns an object of type PrimaryModalAction that describes
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
		 * Returns an object of type ModalAction that describes
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
		 * Returns the placeholder for the summary text field
		 *
		 * @return {string}
		 */
		summaryPlaceholder: function () {
			return this.$i18n( 'wikilambda-editor-publish-dialog-summary-placeholder' ).text();
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
				this.$i18n( 'wikifunctions-editing-copyrightwarning-implementation' ).parse() :
				this.$i18n( 'wikifunctions-editing-copyrightwarning-function' ).parse();
		},

		/**
		 * Returns a warning message which informs the user that they can submit using Ctrl/CMD + Enter;
		 *
		 * @return {string}
		 */
		keyboardSubmitMessage: function () {
			const isMac = /Mac|iPod|iPhone|iPad/.test( navigator.userAgent );
			return this.$i18n( 'wikilambda-editor-publish-dialog-keyboard-submit-warning', isMac ? cmdKeyChar : ctrlKeyChar, enterKeyChar );
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'submitZObject',
		'setError',
		'setDirty',
		'clearAllErrors'
	] ),
	{

		/**
		 * Handle pressing the Enter key on the summary field.
		 *
		 * @param {Event} event The keydown event.
		 */
		handleSummaryEnter: function ( event ) {
			event.preventDefault();
			this.hasKeyboardSubmitWarning = true;
		},

		/**
		 * Handles the keydown event on the summary text field.
		 * - If the user presses Ctrl/Cmd + Enter, publishes the ZObject.
		 * - If the user presses Enter, shows a warning message.
		 *
		 * @param {Event} event The keydown event.
		 */
		handleSummaryKeydown: function ( event ) {
			const enterKey = event.key === 'Enter';

			// If the user presses Ctrl/Cmd + Enter, publish the ZObject
			if ( ( event.metaKey || event.ctrlKey ) && enterKey ) {
				this.publishZObject();
				return;
			}

			// If the user presses Enter, show a warning message
			if ( enterKey ) {
				this.handleSummaryEnter( event );
			}
		},

		/**
		 * Clears the error notifications and emits a close-dialog
		 * event for the Publish widget to close the dialog.
		 */
		closeDialog: function () {
			this.hasKeyboardSubmitWarning = false;

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
				urlUtils.generateViewUrl( {
					langCode: this.getUserLangCode,
					zid: pageTitle,
					params: { success: true }
				} );
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
			const disconnectFunctionObjects = this.functionSignatureChanged;

			this.submitZObject( {
				summary,
				disconnectFunctionObjects
			} ).then( ( response ) => {
				this.successfulExit( response.page );
			} ).catch( ( /* ApiError */ error ) => {
				this.clearAllErrors();
				this.setError( {
					rowId: 0,
					errorType: Constants.ERROR_TYPES.ERROR,
					errorMessage: error.messageOrFallback( Constants.ERROR_CODES.UNKNOWN_SAVE_ERROR )
				} );
			} ).finally( () => {
				const interactionData = {
					zobjecttype: this.getCurrentZObjectType || null,
					zobjectid: this.getCurrentZObjectId || null,
					zlang: this.getUserLangZid || null,
					implementationtype: this.getCurrentZImplementationType || null,
					haserrors: this.hasErrors
				};
				this.submitInteraction( 'publish', interactionData );
			} );
		}
	} )
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-publish-dialog {
	.ext-wikilambda-app-publish-dialog__errors {
		margin-bottom: @spacing-200;
	}
	// TODO: Remove this once wikilambda-publish-input-[and-output]-changed-impact-prompt
	// translations have removed the <p> tags
	.ext-wikilambda-app-publish-dialog__error p {
		margin: 0;
	}

	.ext-wikilambda-app-publish-dialog__kbd {
		font-size: @font-size-x-small;
		font-weight: @font-weight-normal;
		line-height: @line-height-x-small;
		color: @color-base;
		background-color: @background-color-interactive-subtle;
		border: @border-width-base @border-style-base @border-color-subtle;
		border-radius: @border-radius-base;
		padding: (@spacing-12 / 2) @spacing-25;
		box-shadow: @box-shadow-drop-small;
		font-family: inherit;
		display: inline-block;
	}

	.ext-wikilambda-app-publish-dialog__kbd-enter {
		position: relative;
		top: (@spacing-12 / 2);
	}

	.ext-wikilambda-app-publish-dialog__legal-text {
		color: @color-placeholder;
	}
}
</style>
