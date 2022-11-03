<template>
	<!--
		WikiLambda Vue component for the Publish Dialog.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-publishdialog">
		<dialog-container
			ref="dialogBox"
			size="auto"
			:show-action-buttons="true"
			:custom-class="publishDialogCustomClass"
			:confirm-button-text="$i18n( 'wikilambda-publishnew' ).text()"
			:cancel-button-text="$i18n( 'wikilambda-cancel' ).text()"
			:legal-text="legalText"
			:primary-button-disabled="hasErrors"
			:button-action="buttonAction"
			@exit-dialog="closeDialog"
			@close-dialog="closeDialog"
			@confirm-dialog="publishZObject">

			<template #dialog-container-title>
				<strong>{{ $i18n( 'wikilambda-editor-publish-dialog-header' ).text() }}</strong>
			</template>
			<template>
				<div v-if="hasErrors" class="ext-wikilambda-publishdialog__errors">
					<cdx-icon class="ext-wikilambda-publishdialog__errors__icon"
						:icon="errorIcon">
					</cdx-icon>
					<div class="ext-wikilambda-publishdialog__errors__messages">
						<div v-for="error in errors"
							:key="error.id"
							class="ext-wikilambda-publishdialog__errors__message"
							v-html="error.message">
						</div>
					</div>
				</div>

				<div v-if="hasWarnings" class="ext-wikilambda-publishdialog__warnings">
					<cdx-icon class="ext-wikilambda-publishdialog__warnings__icon"
						:icon="warningIcon">
					</cdx-icon>
					<div class="ext-wikilambda-publishdialog__warnings__messages">
						<div v-for="warning in warnings"
							:key="warning.id"
							class="ext-wikilambda-publishdialog__warnings__message"
							v-html="warning.message">
						</div>
					</div>
				</div>

				<div class="ext-wikilambda-publishdialog__summary">
					<div class="ext-wikilambda-publishdialog__summary-label">
						<label for="ext-wikilambda-publishdialog__summary-input"
							class="ext-wikilambda-app__text-regular">
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
			</template>
		</dialog-container>
	</div>
</template>

<script>
const Constants = require( '../../Constants.js' ),
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	CdxTextInput = require( '@wikimedia/codex' ).CdxTextInput,
	DialogContainer = require( '../base/DialogContainer.vue' ),
	icons = require( '../../../lib/icons.json' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	name: 'publish-dialog',
	components: {
		'cdx-icon': CdxIcon,
		'cdx-text-input': CdxTextInput,
		'dialog-container': DialogContainer
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
		shouldUnattachImplementationAndTester: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	data: function () {
		return {
			summary: '',
			errorIcon: icons.cdxIconError,
			warningIcon: icons.cdxIconAlert,
			publishDialogCustomClass: 'ext-wikilambda-publishdialog-custom-class',
			buttonAction: 'progressive'
		};
	},
	computed: $.extend( mapGetters( [
		'getCurrentZObjectId',
		'getCurrentZObjectType',
		'getErrors'
	] ), {
		errors: function () {
			return Object.keys( this.getErrors )
				.map( ( key ) => this.getErrors[ key ] )
				.filter( ( error ) => error.type === Constants.errorTypes.ERROR );
		},
		warnings: function () {
			return Object.keys( this.getErrors )
				.map( ( key ) => this.getErrors[ key ] )
				.filter( ( error ) => error.type === Constants.errorTypes.WARNING );
		},
		hasErrors: function () {
			return this.errors.length !== 0;
		},
		hasWarnings: function () {
			return this.warnings.length !== 0;
		},
		legalText: function () {
			// TODO(T321744) Show mobile text on mobile.
			if ( this.getCurrentZObjectType === Constants.Z_IMPLEMENTATION ) {
				return this.$i18n( 'wikilambda-edit-copyrightwarning-implementation' );
			} else {
				return this.$i18n( 'wikilambda-edit-copyrightwarning-function' );
			}
		}
	} ),
	methods: $.extend( mapActions( [
		'submitZObject',
		'setError'
	] ),
	{
		closeDialog: function () {
			if ( this.hasErrors ) {
				this.setError( {
					internalId: this.getCurrentZObjectId,
					errorState: false
				} );
			}
			this.$emit( 'close-dialog' );
		},
		publishZObject: function () {
			var summary = this.summary;
			var shouldUnattachImplementationAndTester = this.shouldUnattachImplementationAndTester;
			this.submitZObject( { summary, shouldUnattachImplementationAndTester } ).then( function ( pageTitle ) {
				if ( pageTitle ) {
					window.location.href = new mw.Title( pageTitle ).getUrl();
					// TODO(T321741): Add success snackbar to redirected page.
				}
			} ).catch( function ( error ) {
				const payload = {
					internalId: this.getCurrentZObjectId,
					errorState: true,
					errorMessage: error.error.message,
					errorType: Constants.errorTypes.ERROR
				};
				this.setError( payload );
			}.bind( this ) );
		}
	} ),
	watch: {
		showDialog: function () {
			if ( this.showDialog ) {
				this.$refs.dialogBox.openDialog();
			}
		}
	}
};
</script>

<style lang="less">
@import './../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-publishdialog {
	display: flex;

	&__warnings {
		align-items: flex-start;
		background: #fef6e7;
		border: solid 1px #fc3;
		display: flex;
		flex-direction: row;
		padding: 16px 24px;
		margin: 8px 16px;

		&__icon {
			color: #fc3;
			padding-right: 8px;
		}

		&__messages {
			display: flex;
			flex-direction: column;
		}
	}

	&__errors {
		align-items: flex-start;
		background: #ffe7e6;
		border: solid 1px #d33;
		display: flex;
		flex-direction: row;
		padding: 16px 24px;
		margin: 8px 16px;

		&__icon {
			color: #d33;
			padding-right: 8px;
		}

		&__messages {
			display: flex;
			flex-direction: column;
		}
	}

	&__summary {
		display: flex;
		flex-direction: column;
		padding: 8px 16px;
	}

	&__summary-label {
		padding-bottom: 8px;
	}
}

.ext-wikilambda-publishdialog-custom-class {
	width: 512px;
}

.ext-wikilambda-publishdialog-custom-class .ext-wikilambda-dialog {
	&__header {
		margin-top: 16px;
		padding: 0 32px;

		&__title {
			font-size: 1.1em;
		}
	}

	&__action-buttons {
		display: flex;
		justify-content: flex-end;
		margin-right: 32px;

		button {
			margin-left: 10px;
			cursor: pointer;
			width: 96px;
		}
	}
}
</style>
