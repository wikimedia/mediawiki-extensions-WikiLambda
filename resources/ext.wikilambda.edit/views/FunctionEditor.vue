<template>
	<!--
		WikiLambda Vue component for the special view of a ZFunction object.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-editor">
		<div class="ext-wikilambda-function-editor__main">
			<!-- eslint-disable vue/no-v-model-argument -->
			<!-- eslint-disable vue/no-unsupported-features -->
			<cdx-tabs v-model:active="currentTab">
				<cdx-tab
					v-for="( tab, index ) in tabsData"
					:key="index"
					:name="tab.name"
					:label="tab.label"
				>
					<main class="ext-wikilambda-function-editor__main__content">
						<component :is="currentTab"></component>
					</main>
				</cdx-tab>
			</cdx-tabs>
			<aside
				class="ext-wikilambda-function-editor__main__sidebar"
				:aria-label="$i18n( 'wikilambda-editor-additional-details-label' ).text()">
				<fn-editor-visual-display></fn-editor-visual-display>
			</aside>
		</div>
	</div>
</template>

<script>
var CdxTab = require( '@wikimedia/codex' ).CdxTab,
	CdxTabs = require( '@wikimedia/codex' ).CdxTabs,
	FnEditorVisualDisplay = require( '../components/editor/FnEditorVisualDisplay.vue' ),
	functionDefinition = require( './function/FunctionDefinition.vue' ),
	functionImplementations = require( './function/FunctionImplementations.vue' ),
	functionTests = require( './function/FunctionTests.vue' );

// @vue/component
module.exports = exports = {
	name: 'function-editor',
	components: {
		'function-definition': functionDefinition,
		'function-tests': functionTests,
		'function-implementations': functionImplementations,
		'fn-editor-visual-display': FnEditorVisualDisplay,
		'cdx-tab': CdxTab,
		'cdx-tabs': CdxTabs
	},
	data: function () {
		return {
			currentTab: 'function-definition',
			tabsData: [
				{
					name: 'function-definition',
					label: this.$i18n( 'wikilambda-editor-fn-step-function-definition' ).text()
				}
			]
		};
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
			display: none;
		}

		@media screen and ( min-width: @width-breakpoint-desktop-wide ) {
			display: grid;
			grid-template-columns: 1fr 300px;
			gap: 50px;

			&__content {
				position: relative;
				flex: 0 1 100%;
				display: flex;
				flex-direction: column;

				section {
					width: 80%;
					margin: 45px auto;
				}
			}

			& > aside {
				display: block;
			}
		}
	}
}
</style>
