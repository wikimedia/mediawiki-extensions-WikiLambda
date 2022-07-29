<template>
	<!--
		WikiLambda Vue component for the about tab in the ZFunction Viewer.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<main class="ext-wikilambda-function-about">
		<div class="ext-wikilambda-function-about__summary">
			<text-component :truncate="300">
				{{ $i18n( 'wikilambda-function-about-summary' ).text() }}
			</text-component>
		</div>
		<section class="ext-wikilambda-function-about__sidebar">
			<div class="ext-wikilambda-function-about__examples">
				<function-viewer-about-examples></function-viewer-about-examples>
			</div>
			<div class="ext-wikilambda-function-about__names">
				<function-viewer-about-names></function-viewer-about-names>
			</div>
			<div class="ext-wikilambda-function-about__aliases">
				<function-viewer-about-aliases></function-viewer-about-aliases>
			</div>
		</section>
		<section class="ext-wikilambda-function-about__details">
			<function-viewer-about-details>
			</function-viewer-about-details>
		</section>
	</main>
</template>

<script>
var FunctionViewerAboutAliases = require( './about/FunctionViewerAboutAliases.vue' ),
	FunctionViewerAboutNames = require( './about/FunctionViewerAboutNames.vue' ),
	FunctionViewerAboutDetails = require( './about/FunctionViewerAboutDetails.vue' ),
	FunctionViewerAboutExamples = require( './about/FunctionViewerAboutExamples.vue' ),
	TextComponent = require( '../../components/base/Text.vue' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'function-about',
	components: {
		'function-viewer-about-aliases': FunctionViewerAboutAliases,
		'function-viewer-about-names': FunctionViewerAboutNames,
		'function-viewer-about-details': FunctionViewerAboutDetails,
		'function-viewer-about-examples': FunctionViewerAboutExamples,
		'text-component': TextComponent
	},
	computed: $.extend( {},
		mapGetters( [ 'getCurrentZObjectId' ] )
	)
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';
@import './../../../lib/wikimedia-ui-base.less';
@import './../../../lib/sd-base-variables.less';

.ext-wikilambda-function-about {
	padding-top: 16px;

	&__summary:extend(.ext-wikilambda-edit__text-regular) {
		color: @wmui-color-base30;
		grid-column: 1 ~'/' span 2;
		margin-bottom: 32px;
	}

	&__names,
	&__aliases {
		margin-top: 10%;
	}

	&__sidebar {
		width: 300px;
	}

	@media screen and ( min-width: @width-breakpoint-tablet ) {
		min-height: 450px;
		overflow-y: auto;
		display: grid;
		grid-template-columns: 1fr 1fr;
	}

	@media ( max-width: @width-breakpoint-tablet ) {
		grid-template-columns: 1fr;

		&__details {
			order: 1;
			grid-column: 1;
		}

		&__sidebar {
			order: 2;
			grid-column: 1;
			margin-top: 40px;
		}
	}
}
</style>
