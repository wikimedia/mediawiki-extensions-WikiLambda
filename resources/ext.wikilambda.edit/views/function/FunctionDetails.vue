<template>
	<!--
		WikiLambda Vue component for the details tab in the ZFunction Viewer.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<main class="ext-wikilambda-function-details">
		<div class="ext-wikilambda-function-details__summary">
			{{ $i18n( 'wikilambda-function-details-summary' ).text() }}
		</div>
		<div class="ext-wikilambda-function-details__sidebar">
			<function-viewer-details-sidebar :zobject-id="zObjectValue.id"></function-viewer-details-sidebar>
		</div>
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
	padding-top: 16px;
	min-height: 450px;
	overflow-y: auto;
	display: grid;
	grid-template-columns: 250px 1fr;

	&__summary:extend(.ext-wikilambda-edit__text-regular) {
		color: @wmui-color-base30;
		grid-column: 1 ~'/' span 2;
		margin-bottom: 32px;
	}

	&__sidebar {
		width: 30%;
	}
}
</style>
