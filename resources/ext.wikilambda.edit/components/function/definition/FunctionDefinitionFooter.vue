<template>
	<!--
		WikiLambda Vue component footer for the Function Editor, including publish, cancel and implement buttons.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-definition-footer">
		<div class="ext-wikilambda-function-definition-footer__actions">
			<z-object-publish :should-unattach-implementation-and-tester="shouldUnattachImplementationAndTester">
			</z-object-publish>
			<!-- TODO: The following is just a placeholder until it is possible to attach implementation / Testers -->
			<cdx-button
				v-if="isEditing"
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
	ZObjectPublish = require( '../../ZObjectPublish.vue' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	name: 'function-definition-footer',
	components: {
		'cdx-button': CdxButton,
		'z-object-publish': ZObjectPublish
	},
	props: {
		isEditing: {
			type: Boolean
		},
		shouldUnattachImplementationAndTester: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	methods: $.extend( {},
		mapActions( 'router', [ 'navigate' ] ),
		{
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

	&__actions {
		display: flex;

		button {
			margin-right: 10px;
			cursor: pointer;
		}
	}
}
</style>
