<template>
	<!--
		WikiLambda Vue component for the details tab in the ZFunction Viewer.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<main class="ext-wikilambda-function-details">
		<div class="ext-wikilambda-function-details__summary">
			{{ $i18n( 'wikilambda-function-details-summary' ).text() }}
			<!-- TODO(T309199): link to process page once it exists -->
			<a href="#"> {{ $i18n( 'wikilambda-function-details-summary-learn-more' ).text() }} </a>
		</div>
		<section>
			<div class="ext-wikilambda-function-details__sidebar">
				<function-viewer-details-sidebar :zobject-id="zObjectValue.id"></function-viewer-details-sidebar>
			</div>
		</section>
	</main>
</template>

<script>
var FunctionViewerDetailsSidebar = require( './details/function-viewer-details-sidebar.vue' ),
	Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'function-details',
	components: {
		'function-viewer-details-sidebar': FunctionViewerDetailsSidebar
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			required: false,
			default: 0
		}
	},
	computed: $.extend( {},
		mapGetters( [
			'getZObjectChildrenById'
		] ),
		{
			zobject: function () {
				return this.getZObjectChildrenById( this.zobjectId );
			},
			zObjectValue: function () {
				return this.findKeyInArray( Constants.Z_PERSISTENTOBJECT, this.zobject );
			}
		}
	)
};
</script>

<style lang="less">
@import './../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-function-details {
	display: flex;
	-webkit-flex-flow: row wrap;
	flex-flow: row wrap;

	&__summary:extend(.ext-wikilambda-edit__text-regular) {
		color: @wmui-color-base30;
		margin-bottom: 32px;
		width: 100%;
		padding-top: 16px;
	}

	&__sidebar {
		width: 30%;
	}

	&__action {
		display: flex;
		order: 3;
		margin-bottom: 32px;
		width: 100%;

		button {
			height: 32px;

			&:last-child {
				margin-left: -1px;
			}
		}
	}

	@media screen and ( min-width: @width-breakpoint-tablet ) {
		&__action {
			order: unset;
			margin-bottom: 32px;
			width: 300px;
			justify-content: flex-end;
		}
	}
}
</style>
