<template>
	<!--
		WikiLambda Vue component footer for the Function Editor, including publish, cancel and implement buttons.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-definition-footer">
		<wl-publish-widget
			:should-unattach-implementation-and-tester="shouldUnattachImplementationAndTester"
			:is-disabled="publishDisabled"
			:show-cancel="true"
			@cancel="handleCancel"
		></wl-publish-widget>
	</div>
</template>

<script>
var Constants = require( '../../../Constants.js' ),
	PublishWidget = require( '../../widgets/Publish.vue' ),
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	name: 'wl-function-definition-footer',
	components: {
		'wl-publish-widget': PublishWidget
	},
	props: {
		shouldUnattachImplementationAndTester: {
			type: Boolean,
			required: false,
			default: false
		},
		publishDisabled: {
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
	padding: 0;
	margin-top: @spacing-150;

	.cdx-card {
		background-color: @background-color-interactive-subtle;
	}
}
</style>
