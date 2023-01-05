<template>
	<!--
		WikiLambda Vue component for the Publish Dialog.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-publishdialog">
		<!-- eslint-disable vue/no-v-model-argument -->
		<!-- eslint-disable vue/no-unsupported-features -->
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
					type="quiet"
					class="ext-wikilambda-publishdialog__header__close-button"
					@click="closeDialog"
				>
					<cdx-icon :icon="icons.cdxIconClose"></cdx-icon>
				</cdx-button>
			</div>
			<div class="ext-wikilambda-publishdialog__summary">
				<div v-if="hasErrors" class="ext-wikilambda-publishdialog__errors">
					<div v-for="error in errors" :key="error.id">
						<cdx-message
							class="ext-wikilambda-publishdialog__errors__message"
							type="error"
						>
							{{ error.message }}
						</cdx-message>
					</div>
				</div>
				<div v-if="hasWarnings" class="ext-wikilambda-publishdialog__warnings">
					<div v-for="warning in warnings" :key="warning.id">
						<cdx-message
							class="ext-wikilambda-publishdialog__warnings__message"
							type="warning"
						>
							<p v-html="warning.message"></p>
						</cdx-message>
					</div>
				</div>

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
						type="primary"
						@click="publishZObject"
					>
						{{ $i18n( 'wikilambda-publishnew' ).text() }}
					</cdx-button>

					<cdx-button
						class="ext-wikilambda-publishdialog__actions__button-cancel"
						type="primary"
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
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	name: 'publish-dialog',
	components: {
		'cdx-text-input': CdxTextInput,
		'cdx-message': CdxMessage,
		'cdx-dialog': CdxDialog,
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon
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
			icons: icons
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
			// Special message for implementations (Apache 2.0 licence for code).
			if ( this.getCurrentZObjectType === Constants.Z_IMPLEMENTATION ) {
				return this.$i18n( 'wikifunctions-edit-copyrightwarning-implementation' );
			}

			// General message for all other kinds of ZObjects (CC0).
			return this.$i18n( 'wikifunctions-edit-copyrightwarning-function' );
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
					window.location.href = new mw.Title( pageTitle ).getUrl() + '?success=true';
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
	} )
};
</script>

<style lang="less">
@import './../../../lib/wikimedia-ui-base.less';

/* stylelint-disable selector-max-id */
#publish-dialog .cdx-dialog__header {
	display: none;
}

#publish-dialog .cdx-dialog__body {
	margin: 0 8px;
}

hr {
	color: #c8ccd1;
	margin-bottom: 16px;
}

.ext-wikilambda-publishdialog {
	&__errors {
		padding: 8px 0;
	}

	&__warnings {
		padding: 8px 0;

		p:first-child {
			margin-top: 0;
			hyphens: none;
		}
	}

	&__summary {
		display: flex;
		flex-direction: column;
		padding: 8px 0;
		color: @wmui-color-base30;
	}

	&__summary-label {
		padding-bottom: 4px;
	}

	&__divider {
		margin-top: 16px;
	}

	&__actions {
		display: flex;
		flex-direction: row-reverse;

		&__button-cancel {
			margin-right: 8px;
		}
	}

	&__legal-text {
		color: @wmui-color-base30;
	}

	&__body {
		padding: 0 16px 16px;
	}

	&__header {
		display: flex;
		justify-content: space-between;
		padding: 8px 0;
		position: sticky;
		top: 0;
		background: @wmui-color-base100;

		&__title {
			width: 100%;
			font-weight: bold;
			font-size: 1.15em;
			margin: auto;
		}

		&__close-button {
			display: flex;
			color: #202122;
			justify-content: center;
			align-items: center;
			height: 32px;
			width: 32px;
			background: none;
			border: 0;
			margin: auto;
		}
	}
}
</style>
