<template>
	<!--
		WikiLambda Vue component for the special view of a ZFunction object.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<div class="ext-wikilambda-function-editor-navbar">
			<tab-container
				:tabs="getVisibleTabs"
				:active-tab="getCurrentView"
				@click="selectTab"
			>
			</tab-container>
		</div>
		<div class="ext-wikilambda-function-editor ext-wikilambda-function-editor__two-cols">
			<main class="ext-wikilambda-function-editor__content">
				<component :is="currentTab"></component>
			</main>
			<aside
				class="ext-wikilambda-function-editor__sidebar"
				:aria-label="$i18n( 'wikilambda-editor-additional-details-label' )">
				<fn-editor-visual-display></fn-editor-visual-display>
			</aside>
		</div>
	</div>
</template>

<script>
var TabContainer = require( '../components/base/TabContainer.vue' ),
	FnEditorVisualDisplay = require( '../components/editor/FnEditorVisualDisplay.vue' ),
	functionDefinition = require( './function/FunctionDefinition.vue' ),
	functionImplementations = require( './function/FunctionImplementations.vue' ),
	functionTests = require( './function/FunctionTests.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	cdxIcons = require( '../../lib/icons.json' );

// @vue/component
module.exports = exports = {
	name: 'function-editor',
	components: {
		'tab-container': TabContainer,
		'function-definition': functionDefinition,
		'function-tests': functionTests,
		'function-implementations': functionImplementations,
		'fn-editor-visual-display': FnEditorVisualDisplay
	},
	data: function () {
		return {
			currentTab: 'function-definition'
		};
	},
	computed: $.extend( {},
		mapGetters( [ 'isNewZObject' ] ),
		mapGetters( 'router', [ 'getCurrentView' ] ),
		{
			getVisibleTabs: function () {
				var tabs = [
					{
						status: 'active',
						id: 'function-definition', // used for routing
						title: this.$i18n( 'wikilambda-editor-fn-step-function-definition' ).text(),
						disabled: false, // this should be computed
						icon: cdxIcons.cdxIconCheck
					}
				];

				if ( !this.isNewZObject ) {
					tabs.push(
						{
							status: 'inactive',
							id: 'function-implementations',
							title: this.$i18n( 'wikilambda-editor-fn-step-implementations' ).text(),
							disabled: false,
							icon: cdxIcons.cdxIconCheck,
							tooltip: {
								header: this.$i18n( 'wikilambda-editor-fn-tests-tooltip-header' ).text(),
								content: this.$i18n( 'wikilambda-editor-fn-tests-tooltip-content' ).text(),
								visible: false
							}
						},
						{
							status: 'inactive',
							id: 'function-tests',
							title: this.$i18n( 'wikilambda-editor-fn-step-tests' ).text(),
							disabled: true,
							icon: cdxIcons.cdxIconCheck,
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
			this.currentTab = tab;
		}
	}
};
</script>

<style lang="less">
@import './../../lib/wikimedia-ui-base.less';

.ext-wikilambda-function-editor {
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
