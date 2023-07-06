<template>
	<!--
		WikiLambda Vue component for the Publish Dialog.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div
		class="ext-wikilambda-publishdialog"
		data-testid="confirm-publish-dialog"
	>
		<cdx-dialog
			id="publish-dialog"
			title=""
			:open="showDialog"
			@update:open="closeDialog"
		>
			<div class="ext-wikilambda-publishdialog__header">
				<span class="ext-wikilambda-publishdialog__header__title">
					{{ $i18n( 'wikilambda-editor-publish-dialog-header' ).text() }}
				</span>
				<cdx-button
					weight="quiet"
					class="ext-wikilambda-publishdialog__header__close-button"
					@click="closeDialog"
				>
					<cdx-icon :icon="icons.cdxIconClose"></cdx-icon>
				</cdx-button>
			</div>
			<div class="ext-wikilambda-publishdialog__summary">
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
						<template v-if="error.message">
							{{ error.message }}
						</template>
						<template v-else>
							{{ messageFromCode( error.code ) }}
						</template>
					</cdx-message>
				</div>

				<!-- Summary section -->
				<div class="ext-wikilambda-publishdialog__summary">
					<div class="ext-wikilambda-publishdialog__summary-label">
						<label
							for="ext-wikilambda-publishdialog__summary-input"
							class="ext-wikilambda-app__text-regular"
						>
							{{ $i18n( 'wikilambda-editor-publish-dialog-how-did-you-improve-label' )
								.text() }}
						</label>
					</div>
					<cdx-text-input
						id="ext-wikilambda-publishdialog__summary-input"
						v-model="summary"
						class="ext-wikilambda-publishdialog__summary-input"
						:aria-label="$i18n( 'wikilambda-editor-publish-dialog-summary-label' ).text()"
						:placeholder="$i18n( 'wikilambda-editor-publish-dialog-summary-placeholder' ).text()"
					></cdx-text-input>
				</div>
				<div class="ext-wikilambda-publishdialog__actions">
					<!-- TODO: (T325821) replace with codex footer slot when available -->
					<cdx-button
						class="ext-wikilambda-publishdialog__actions__button-publish"
						action="progressive"
						weight="primary"
						data-testid="confirm-publish-button"
						@click="publishZObject"
					>
						{{ $i18n( 'wikilambda-publishnew' ).text() }}
					</cdx-button>

					<cdx-button
						class="ext-wikilambda-publishdialog__actions__button-cancel"
						@click="closeDialog"
					>
						{{ $i18n( 'wikilambda-cancel' ).text() }}
					</cdx-button>
				</div>
				<div class="ext-wikilambda-publishdialog__divider">
					<hr>
					<div class="ext-wikilambda-publishdialog__legal-text" v-html="legalText"></div>
				</div>
			</div>
		</cdx-dialog>
	</div>
</template>

<script>
const Constants = require( '../../Constants.js' ),
	CdxTextInput = require( '@wikimedia/codex' ).CdxTextInput,
	CdxMessage = require( '@wikimedia/codex' ).CdxMessage,
	CdxDialog = require( '@wikimedia/codex' ).CdxDialog,
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	icons = require( '../../../lib/icons.json' ),
	eventLogUtils = require( '../../mixins/eventLogUtils.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	name: 'wl-publish-dialog',
	components: {
		'cdx-text-input': CdxTextInput,
		'cdx-message': CdxMessage,
		'cdx-dialog': CdxDialog,
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon
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
		shouldUnattachImplementationAndTester: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	data: function () {
		return {
			summary: '',
			icons: icons
		};
	},
	computed: $.extend( mapGetters( [
		'getCurrentZObjectId',
		'getCurrentZObjectType',
		'getCurrentZImplementationContentType',
		'getErrors',
		'isNewZObject',
		'getUserZlangZID'
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
		 * Submits the ZObject to the wikilambda_edit API
		 * and handles the return value:
		 * 1. If the response contains an error, saves the error
		 *    in the store/errors module and displays the error messages
		 *    in the Publish Dialog notification block.
		 * 2. If the response is successful, navigates to the ZObject
		 *    page.
		 */
		publishZObject: function () {
			// Before sending the request we clear all error and warning notifications
			this.clearAllErrors();

			const summary = this.summary;
			const shouldUnattachImplementationAndTester = this.shouldUnattachImplementationAndTester;

			this.submitZObject( {
				summary,
				shouldUnattachImplementationAndTester
			} ).then( ( pageTitle ) => {
				if ( pageTitle ) {
					window.location.href = new mw.Title( pageTitle ).getUrl() + '?success=true';
				}
			} ).catch( ( error ) => {
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
			} );

			// Log using Metrics Platform
			const customData = {
				isnewzobject: this.isNewZObject,
				zobjectid: this.getCurrentZObjectId || null,
				zobjecttype: this.getCurrentZObjectType || null,
				zlang: this.getUserZlangZID || null,
				haserrors: this.hasErrors
			};
			if ( this.getCurrentZObjectType === Constants.Z_IMPLEMENTATION ) {
				customData.implementationtype = this.getCurrentZImplementationContentType || null;
			}
			this.dispatchEvent( 'wf.ui.editZObject.publish', customData );
		},

		/**
		 * Returns the translated message for a given error code
		 *
		 * @param {string} code
		 * @return {string}
		 */
		messageFromCode: function ( code ) {
			// eslint-disable-next-line mediawiki/msg-doc
			return this.$i18n( code ).text();
		}
	} )
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

/* stylelint-disable selector-max-id */
#publish-dialog .cdx-dialog__header {
	display: none;
}

#publish-dialog .cdx-dialog__body {
	margin: 0 @spacing-50;
}

hr {
	color: @border-color-subtle;
	margin-bottom: @spacing-100;
}

.ext-wikilambda-publishdialog {
	&__errors {
		padding: @spacing-50 0;
	}

	&__warnings {
		padding: @spacing-50 0;

		p:first-child {
			margin-top: 0;
			hyphens: none;
		}
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
