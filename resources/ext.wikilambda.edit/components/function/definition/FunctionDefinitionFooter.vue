<template>
	<!--
		WikiLambda Vue component footer for the Function Editor, including publish, cancel and implement buttons.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-definition-footer">
		<label for="ext-wikilambda-function-definition-name__input" class="ext-wikilambda-app__text-regular">
			{{ $i18n( 'wikilambda-function-definition-footer-label' ).text() }}
		</label>
		<cdx-text-input
			id="ext-wikilambda-function-definition-name__input"
			v-model="summary"
			class="ext-wikilambda-function-definition-footer__summary-input"
			:aria-label="$i18n( 'wikilambda-function-definition-footer-label' ).text()"
			:placeholder="$i18n( 'wikilambda-function-definition-footer-placeholder' ).text()"
		></cdx-text-input>

		<div class="ext-wikilambda-function-definition-footer__actions">
			<cdx-button
				class="ext-wikilambda-function-definition-footer__publish-button"
				action="progressive"
				@click.stop="handlePublish"
			>
				{{ $i18n( 'wikilambda-publishnew' ).text() }}
			</cdx-button>
			<!-- TODO: The following is just a placeholder until it is possible to attach implementation / Testers -->
			<cdx-button
				v-if="isEditing "
				@click="handleFallbackClick"
			>
				{{ $i18n( 'wikilambda-fallback' ).text() }}
			</cdx-button>
			<cdx-button
				class="ext-wikilambda-function-definition-footer__actions__cancel"
				action="destructive"
				type="primary"
				@click.stop="handleCancel"
			>
				{{ $i18n( 'wikilambda-cancel' ).text() }}
			</cdx-button>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../../Constants.js' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxTextInput = require( '@wikimedia/codex' ).CdxTextInput,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	name: 'function-definition-footer',
	components: {
		'cdx-text-input': CdxTextInput,
		'cdx-button': CdxButton
	},
	props: {
		isEditing: {
			type: Boolean
		}
	},
	data: function () {
		return {
			summary: ''
		};
	},
	methods: $.extend( {},
		mapActions( 'router', [ 'navigate' ] ),
		{
			handlePublish: function () {
				// TODO (T297330): include legal text when ready
				/**
				 * event to publish changes to a function (or a new function)
				 */

				this.$emit( 'publish', this.summary );
			},
			handleCancel: function () {
				this.$emit( 'cancel' );
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

	&__summary-input {
		margin-top: 10px;
	}

	&__actions {
		display: flex;
		margin-top: 28px;

		button {
			margin-right: 10px;
			cursor: pointer;
		}
	}
}
</style>
