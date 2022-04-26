<template>
	<!--
		WikiLambda Vue component for the special view of a ZFunction object.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-editor">
		<div class="ext-wikilambda-function-editor-navbar">
			<tab-container
				:tabs="getVisibleTabs"
				:active-tab="getCurrentView"
				@click="selectTab"
			>
			</tab-container>
		</div>
		<div class="ext-wikilambda-function-editor__main">
			<main class="ext-wikilambda-function-editor__main__content">
				<component :is="currentTab"></component>
			</main>
			<aside
				class="ext-wikilambda-function-editor__main__sidebar"
				:aria-label="$i18n( 'wikilambda-editor-additional-details-label' ).text()">
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
			/**
			 * get the list of tabs to display at the top of the page for navigation
			 *
			 * @return {Array} list of tab objects
			 */
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
				// only show implementation and tester tabs if the function already exists
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
@import './../../lib/sd-base-variables.less';

.ext-wikilambda-function-editor {
	&__main {
		&__content {
			width: 100%;
		}

		& > aside {
			grid-column-start: 2;
		}

		@media screen and ( min-width: @width-breakpoint-tablet ) {
			display: grid;
			grid-template-columns: 1fr 300px;

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
		}
	}
}
</style>
