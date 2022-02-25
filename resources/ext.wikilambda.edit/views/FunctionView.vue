<template>
	<!--
		WikiLambda Vue component for the special view of a ZFunction object.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<div class="ext-wikilambda-function-view-navbar">
			<tab-container
				:tabs="getVisibleTabs"
				:active-tab="$route.name"
				@click="selectTab"
			>
			</tab-container>
		</div>
		<div class="ext-wikilambda-function-view ext-wikilambda-function-view__two-cols">
			<main class="ext-wikilambda-function-view__content">
				<router-view></router-view>
			</main>
			<aside
				class="ext-wikilambda-function-view__sidebar"
				:aria-label="$i18n( 'wikilambda-editor-additional-details-label' )">
				<fn-editor-visual-display></fn-editor-visual-display>
			</aside>
		</div>
	</div>
</template>

<script>
var TabContainer = require( '../components/base/TabContainer.vue' ),
	FnEditorVisualDisplay = require( '../components/editor/FnEditorVisualDisplay.vue' ),
	Constants = require( '../../../ext.wikilambda.edit/Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	icons = require( './../../lib/icons.js' );

// @vue/component
module.exports = {
	name: 'function-view',
	components: {
		'tab-container': TabContainer,
		'fn-editor-visual-display': FnEditorVisualDisplay
	},
	computed: $.extend( {},
		mapGetters( [
			'isNewZObject'
		] ),
		{
			getVisibleTabs: function () {
				var tabs = [
					{
						status: 'active',
						id: 'functionDefinition', // used for routing
						title: this.$i18n( 'wikilambda-editor-fn-step-function-definition' ).text(),
						disabled: false, // this should be computed
						icon: icons.sdIconCheck
					}
				];

				if ( !this.isNewZObject ) {
					tabs.push(
						{
							status: 'inactive',
							id: 'functionImplementation',
							title: this.$i18n( 'wikilambda-editor-fn-step-implementations' ).text(),
							disabled: false,
							icon: icons.sdIconCheck,
							tooltip: {
								header: this.$i18n( 'wikilambda-editor-fn-tests-tooltip-header' ).text(),
								content: this.$i18n( 'wikilambda-editor-fn-tests-tooltip-content' ).text(),
								visible: false
							}
						},
						{
							status: 'inactive',
							id: 'functionTests',
							title: this.$i18n( 'wikilambda-editor-fn-step-tests' ).text(),
							disabled: true,
							icon: icons.sdIconCheck,
							tooltip: {
								header: this.$i18n( 'wikilambda-editor-fn-tests-tooltip-header' ).text(),
								content: this.$i18n( 'wikilambda-editor-fn-tests-tooltip-content' ).text(),
								visible: true
							}
						}
					);
				}
				return tabs;
			}
		}
	),
	methods: {
		selectTab: function ( tab ) {
			this.$router.push( {
				name: tab,
				query: {
					type: 'newDesign',
					zid: Constants.Z_FUNCTION
				}
			} );
		}
	}
};
</script>

<style lang="less">
@import './../../lib/wikimedia-ui-base.less';

.ext-wikilambda-function-view {
	display: grid;

	&__content {
		position: relative;
		flex: 0 1 100%;
		margin: 0 3em;
		display: flex;
		flex-direction: column;

		section {
			width: 80%;
			margin: 45px auto;
		}
	}

	&__two-cols {
		grid-template-columns: 1fr 300px;

		& > aside {
			grid-column-start: 2;
		}
	}
}
</style>
