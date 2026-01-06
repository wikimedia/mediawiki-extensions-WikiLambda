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
			:title="i18n( 'wikilambda-editor-publish-dialog-header' ).text()"
			:close-button-label="i18n( 'wikilambda-dialog-close' ).text()"
			:use-close-button="true"
			:primary-action="primaryAction"
			:default-action="defaultAction"
			@default="closeDialog"
			@primary="publishPage"
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
					<wl-safe-message :error="error"></wl-safe-message>
				</cdx-message>
			</div>

			<!-- Summary section -->
			<cdx-field :status="status">
				<cdx-text-input
					v-model="summary"
					class="ext-wikilambda-app-publish-dialog__summary-input"
					:aria-label="i18n( 'wikilambda-editor-publish-dialog-summary-label' ).text()"
					:placeholder="i18n( 'wikilambda-editor-publish-dialog-summary-placeholder' ).text()"
					@keydown="handleSummaryKeydown"
				></cdx-text-input>
				<template #label>
					{{ i18n( 'wikilambda-editor-publish-dialog-summary-help-text' ).text() }}
				</template>

				<template v-if="hasKeyboardSubmitWarning" #warning>
					<!-- eslint-disable-next-line vue/no-v-html -->
					<span v-html="keyboardSubmitMessage"></span>
				</template>
			</cdx-field>

			<!-- Legal text -->
			<template #footer-text>
				<!-- eslint-disable vue/no-v-html -->
				<div
					class="ext-wikilambda-app-publish-dialog__legal-text"
					v-html="legalText"
				></div>
				<!-- eslint-enable vue/no-v-html -->
			</template>
		</cdx-dialog>
	</div>
</template>

<script>
const { computed, defineComponent, inject, ref } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const useEventLog = require( '../../../composables/useEventLog.js' );
const useMainStore = require( '../../../store/index.js' );

// Base components:
const SafeMessage = require( '../../base/SafeMessage.vue' );
// Codex components
const { CdxDialog, CdxField, CdxMessage, CdxTextInput } = require( '../../../../codex.js' );

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
		'cdx-dialog': CdxDialog,
		'wl-safe-message': SafeMessage
	},
	inject: {
		viewmode: { default: false }
	},
	props: {
		showDialog: {
			type: Boolean,
			required: true,
			default: false
		},
		submitAction: {
			type: Function,
			required: false,
			default: undefined
		},
		successCallback: {
			type: Function,
			required: false,
			default: undefined
		}
	},
	emits: [ 'before-exit', 'close-dialog' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const eventLogUtils = useEventLog();
		const store = useMainStore();

		// Dialog state
		const summary = ref( '' );
		const hasKeyboardSubmitWarning = ref( false );
		const isPublishing = ref( false );

		/**
		 * Clears the error notifications and emits a close-dialog
		 * event for the Publish widget to close the dialog.
		 */
		function closeDialog() {
			hasKeyboardSubmitWarning.value = false;

			// Clear all publish dialog errors/warnings (errorId: "main"), preserve field-level warnings
			store.clearErrors( Constants.STORED_OBJECTS.MAIN );
			emit( 'close-dialog' );
		}

		/**
		 * Returns an object of type PrimaryModalAction that describes
		 * the action of the primary (save or publish) dialog button.
		 *
		 * @return {Object}
		 */
		const primaryAction = computed( () => ( {
			actionType: 'progressive',
			label: i18n( 'wikilambda-publishnew' ).text(),
			disabled: isPublishing.value
		} ) );

		/**
		 * Returns an object of type ModalAction that describes
		 * the action of the secondary (cancel) button.
		 *
		 * @return {Object}
		 */
		const defaultAction = {
			label: i18n( 'wikilambda-cancel' ).text()
		};

		// Errors and warnings
		/**
		 * Returns the array of errors and warnings of the page
		 *
		 * @return {Array}
		 */
		const errors = computed( () => store.getErrors( Constants.STORED_OBJECTS.MAIN ) );

		/**
		 * Returns whether there are any errors in the page
		 * to show in the publish dialog
		 *
		 * @return { boolean }
		 */
		const hasErrors = computed( () => errors.value.length !== 0 );

		/**
		 * Returns the status of the summary text field.
		 *
		 * @return {string}
		 */
		const status = computed( () => hasKeyboardSubmitWarning.value ? 'warning' : 'default' );

		// Submission state
		/**
		 * Submits the page to the appropriate API and handles the return value:
		 * 1. If the response contains an error, saves the error
		 *    in the store/errors module and displays the error messages
		 *    in the Publish Dialog notification block.
		 * 2. If the response is successful, navigates to the content page.
		 */
		function publishPage() {
			if ( props.submitAction ) {
				isPublishing.value = true;

				props.submitAction( {
					summary: summary.value
				} ).then( ( response ) => {
					// Successful submission: push event, unset dirty and close
					emit( 'before-exit' );
					store.setDirty( false );
					closeDialog();
					// Finally, run additional success actions passed by parent
					if ( props.successCallback ) {
						props.successCallback( response );
					}
				} ).catch( ( /* ApiError */ error ) => {

					// TODO error handling for abstract content
					store.clearErrors( Constants.STORED_OBJECTS.MAIN );
					const errorMessage = error.code === 'badtoken' ?
						i18n( 'wikilambda-loggedout-error-message' ).text() :
						error.messageOrFallback( 'wikilambda-unknown-save-error-message' );
					store.setError( {
						errorId: Constants.STORED_OBJECTS.MAIN,
						errorType: Constants.ERROR_TYPES.ERROR,
						errorMessage
					} );
				} ).finally( () => {
					isPublishing.value = false;
					// TODO event submission for abstract content
					const interactionData = {
						zobjecttype: store.getCurrentZObjectType || null,
						zobjectid: store.getCurrentZObjectId || null,
						zlang: store.getUserLangZid || null,
						implementationtype: store.getCurrentZImplementationType || null,
						haserrors: hasErrors.value
					};
					eventLogUtils.submitInteraction( 'publish', interactionData );
				} );
			}
		}

		// Keyboard handling
		/**
		 * Handle pressing the Enter key on the summary field.
		 *
		 * @param {Event} event The keydown event.
		 */
		function handleSummaryEnter( event ) {
			event.preventDefault();
			hasKeyboardSubmitWarning.value = true;
		}

		/**
		 * Returns a warning message which informs the user that they can submit using Ctrl/CMD + Enter;
		 *
		 * @return {string}
		 */
		const keyboardSubmitMessage = computed( () => {
			const isMac = /Mac|iPod|iPhone|iPad/.test( navigator.userAgent );
			// Make sure the message is escaped, but insert the key HTML without escaping it
			return i18n( 'wikilambda-editor-publish-dialog-keyboard-submit-warning' ).escaped()
				.replace( '$1', isMac ? cmdKeyChar : ctrlKeyChar )
				.replace( '$2', enterKeyChar );
		} );

		/**
		 * Handles the keydown event on the summary text field.
		 * - If the user presses Ctrl/Cmd + Enter, publishes the page.
		 * - If the user presses Enter, shows a warning message.
		 *
		 * @param {Event} event The keydown event.
		 */
		function handleSummaryKeydown( event ) {
			const enterKey = event.key === 'Enter';

			// If the user presses Ctrl/Cmd + Enter, publish the page
			if ( ( event.metaKey || event.ctrlKey ) && enterKey ) {
				publishPage();
				return;
			}

			// If the user presses Enter, show a warning message
			if ( enterKey ) {
				handleSummaryEnter( event );
			}
		}

		// Legal text
		/**
		 * Returns the legal text to display in the Publish Dialog, depending
		 * on the type of object that is being submitted:
		 * * Special message for implementations (Apache 2.0 licence for code).
		 * * General message for all other kinds of ZObjects (CC0).
		 *
		 * @return { string }
		 */
		const legalText = computed( () => (
			store.getCurrentZObjectType === Constants.Z_IMPLEMENTATION ?
				i18n( 'wikifunctions-editing-copyrightwarning-implementation' ).parse() :
				i18n( 'wikifunctions-editing-copyrightwarning-function' ).parse()
		) );

		// Return all properties and methods for the template
		return {
			closeDialog,
			defaultAction,
			errors,
			handleSummaryKeydown,
			hasErrors,
			hasKeyboardSubmitWarning,
			i18n,
			keyboardSubmitMessage,
			legalText,
			primaryAction,
			publishPage,
			status,
			summary
		};
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-publish-dialog {
	.ext-wikilambda-app-publish-dialog__errors {
		margin-bottom: @spacing-200;
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
