<template>
	<!--
		WikiLambda Vue component for the about tab in the ZFunction Viewer.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<main class="ext-wikilambda-function-about">
		<div id="fnDefinitionContainer" class="ext-wikilambda-function-about__container">
			<div class="ext-wikilambda-function-about__summary">
				{{ $i18n( 'wikilambda-function-about-summary' ).text() }}
			</div>
			<div class="ext-wikilambda-function-about__names">
				<function-viewer-names></function-viewer-names>
			</div>
			<div class="ext-wikilambda-function-about__aliases">
				<function-viewer-aliases></function-viewer-aliases>
			</div>
		</div>
	</main>
</template>

<script>
var FunctionViewerAliases = require( './about/function-viewer-aliases.vue' ),
	FunctionViewerNames = require( './about/function-viewer-names.vue' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'function-about',
	components: {
		'function-viewer-aliases': FunctionViewerAliases,
		'function-viewer-names': FunctionViewerNames
	},
	computed: $.extend( {},
		mapGetters( [ 'getCurrentZObjectId' ] )
	)
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-function-about {
	&__container {
		padding-top: 20px;
		padding-left: 27px;
		border: 1px solid @wmui-color-base80;
		min-height: 450px;
		overflow-y: auto;
	}

	&__summary:extend(.ext-wikilambda-edit__text-regular) {
		color: @wmui-color-base30;
	}

	&__names,
	&__aliases {
		margin-top: 10%;
	}
}
</style>
