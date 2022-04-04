<template>
	<!--
		WikiLambda Vue component footer for the Function Editor, including publish, cancel and implement buttons.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-definition-footer">
		<dialog-container
			v-if="openDialog"
			:title="$i18n( 'wikilambda-function-are-you-sure-dialog-header' ).text()"
			:description="$i18n( 'wikilambda-function-are-you-sure-dialog-description' ).text()"
			:cancel-button="cancelButton"
			:confirm-button="confirmButton"
			@exit-dialog="openDialog = false"
			@close-dialog="openDialog = false"
			@confirm-dialog="confirmCancel">
		</dialog-container>
		<label for="ext-wikilambda-function-definition-name__input" class="ext-wikilambda-app__text-regular">
			{{ $i18n( 'wikilambda-function-definition-footer-label' ).text() }}
		</label>
		<input
			v-model="summary"
			class="ext-wikilambda-function-definition-footer__text-input"
			:aria-label="$i18n( 'wikilambda-function-definition-footer-label' ).text()"
			:placeholder="$i18n( 'wikilambda-function-definition-footer-placeholder' ).text()"
		>
		<div class="ext-wikilambda-function-definition-footer__actions">
			<button
				class="ext-wikilambda-function-definition-footer__publish-button"
				:class="publishButtonStyle"
				:disabled="!publishButtonValidity"
				@click="handlePublish"
			>
				{{ $i18n( 'wikilambda-publishnew' ).text() }}
			</button>
			<!-- TODO: The following is just a placeholder until it is possible to attach implementation / Testers -->
			<button
				v-if="isEditing "
				@click="handleFallbackClick"
			>
				{{ $i18n( 'wikilambda-fallback' ).text() }}
			</button>
			<button
				class="ext-wikilambda-function-definition-footer__actions__cancel"
				@click.stop="handleCancel"
			>
				{{ $i18n( 'wikilambda-cancel' ).text() }}
			</button>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../../Constants.js' ),
	DialogContainer = require( '../../base/DialogContainer.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	name: 'function-definition-footer',
	components: {
		'dialog-container': DialogContainer
	},
	props: {
		isEditing: {
			type: Boolean
		}
	},
	data: function () {
		return {
			summary: '',
			openDialog: false
		};
	},
	computed: $.extend( mapGetters( [
		'currentZFunctionHasInputs',
		'currentZFunctionHasOutput'
	] ),
	{
		publishButtonValidity: function () {
			// publish button is only valid if function has inputs and outputs defined
			// TODO: this should also reset if there are local changes on an already published function
			return this.currentZFunctionHasInputs && this.currentZFunctionHasOutput;
		},
		publishButtonStyle: function () {
			return this.publishButtonValidity ?
				'ext-wikilambda-function-definition-footer__actions__valid-publish' :
				'ext-wikilambda-function-definition-footer__actions__invalid';
		},
		cancelButton: function () {
			return {
				style: '',
				text: this.$i18n( 'wikilambda-continue-editing' ).text()
			};
		},
		confirmButton: function () {
			return {
				style: 'ext-wikilambda-dialog_danger',
				text: this.$i18n( 'wikilambda-discard-edits' ).text()
			};
		}
	} ),
	methods: $.extend( {},
		mapActions( [ 'submitZObject' ] ),
		mapActions( 'router', [ 'navigate' ] ),
		{
			handleCancel: function () {
				// if leaving without saving edits
				if ( this.isEditing ) {
					this.openDialog = true;
				} else {
					// if not editing, go to previous page
					history.back();
				}
			},
			confirmCancel: function () {
				if ( this.openDialog ) {
					this.openDialog = false;
				}
				window.location.href = new mw.Title( this.$route.query.title ).getUrl();
			},
			handlePublish: function () {
				// TODO (T297330): include legal text when ready
				/**
				 * event to publish changes to a function (or a new function)
				 */
				this.$emit( 'publish', this.summary );
			},
			handleFallbackClick: function () {
				var payload = {
					to: Constants.VIEWS.Z_OBJECT_EDITOR
				};
				this.navigate( payload );
			}
		}
	)
};

</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.less';

.ext-wikilambda-function-definition-footer {
	display: flex;
	flex-direction: column;
	background-color: @wmui-color-base90;
	padding: 30px;

	&__text-input {
		padding: 6px 8px;
		margin-top: 10px;
		margin-bottom: 10px;
	}

	&__actions {
		display: flex;

		button {
			padding: 5px;
			margin: 5px;
			border-radius: 2px;
			cursor: pointer;
		}

		&__valid-publish {
			background-color: @wmui-color-accent50;
			color: @wmui-color-base100;
			border: 0;
		}

		&__published {
			background-color: @wmui-color-accent90;
			border: 0;
		}

		&__cancel {
			color: @wmui-color-red50;
			border: 0;
		}

		&__invalid {
			background-color: @wmui-color-base70;
			color: @wmui-color-base100;
			border: 0;
		}

		input {
			width: 300px;
			height: 20px;
			padding: 4px 6px;
		}
	}
}
</style>
