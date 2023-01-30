<template>
	<!--
		WikiLambda Vue component for the about tab in the ZFunction Viewer.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<main class="ext-wikilambda-function-about">
		<div class="ext-wikilambda-function-about__summary">
			<wl-text-component :truncate="300">
				{{ $i18n( 'wikilambda-function-about-summary' ).text() }}
			</wl-text-component>
		</div>
		<section v-if="!hideSidebar" class="ext-wikilambda-function-about__sidebar">
			<div v-if="!hideExamples" class="ext-wikilambda-function-about__examples">
				<wl-function-viewer-about-examples></wl-function-viewer-about-examples>
			</div>
			<div class="ext-wikilambda-function-about__names">
				<wl-function-viewer-about-names></wl-function-viewer-about-names>
			</div>
			<div class="ext-wikilambda-function-about__aliases">
				<wl-function-viewer-about-aliases></wl-function-viewer-about-aliases>
			</div>
		</section>
		<section class="ext-wikilambda-function-about__details">
			<wl-function-viewer-about-details></wl-function-viewer-about-details>
		</section>
	</main>
</template>

<script>
var FunctionViewerAboutAliases = require( './about/FunctionViewerAboutAliases.vue' ),
	FunctionViewerAboutNames = require( './about/FunctionViewerAboutNames.vue' ),
	FunctionViewerAboutDetails = require( './about/FunctionViewerAboutDetails.vue' ),
	FunctionViewerAboutExamples = require( './about/FunctionViewerAboutExamples.vue' ),
	TextComponent = require( '../../components/base/Text.vue' ),
	Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-function-about',
	components: {
		'wl-function-viewer-about-aliases': FunctionViewerAboutAliases,
		'wl-function-viewer-about-names': FunctionViewerAboutNames,
		'wl-function-viewer-about-details': FunctionViewerAboutDetails,
		'wl-function-viewer-about-examples': FunctionViewerAboutExamples,
		'wl-text-component': TextComponent
	},
	computed: $.extend( {},
		mapGetters( [ 'getUserZlangZID', 'getNestedZObjectById', 'getAllItemsFromListById' ] ),
		{
			hideNames: function () {
				var namesListId = this.getNestedZObjectById( 0, [
					Constants.Z_PERSISTENTOBJECT_LABEL,
					Constants.Z_MULTILINGUALSTRING_VALUE
				] ).id;
				var namesList = this.getAllItemsFromListById( namesListId );

				return !namesList.some( function ( nameListLabel ) {
					var language = this.getNestedZObjectById( nameListLabel.id, [
						Constants.Z_MONOLINGUALSTRING_LANGUAGE,
						Constants.Z_REFERENCE_ID
					] ).value;

					return language !== this.getUserZlangZID;
				}.bind( this ) );
			},
			hideAliases: function () {
				return this.getAllItemsFromListById( this.getNestedZObjectById( 0, [
					Constants.Z_PERSISTENTOBJECT_ALIASES,
					Constants.Z_MULTILINGUALSTRINGSET_VALUE
				] ).id ).length === 0;
			},
			// TODO(T320274): Fix and re-show tester examples table.
			hideExamples: function () {
				return true;
			},
			hideSidebar: function () {
				return this.hideNames && this.hideExamples && this.hideAliases;
			}
		}
	)
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-function-about {
	padding-top: @spacing-100;

	&__summary:extend(.ext-wikilambda-edit__text-regular) {
		color: @color-placeholder;
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
