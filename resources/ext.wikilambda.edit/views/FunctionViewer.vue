<template>
	<!--
		WikiLambda Vue component for the special view of a ZFunction object.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-viewer">
		<!-- eslint-disable vue/no-v-model-argument -->
		<!-- eslint-disable vue/no-unsupported-features -->
		<cdx-tabs v-model:active="currentTab">
			<cdx-tab
				v-for="( tab, index ) in tabsData"
				:key="index"
				:name="tab.name"
				:label="tab.label"
			>
				<component :is="currentTab"></component>
			</cdx-tab>
		</cdx-tabs>
	</div>
</template>

<script>
var CdxTab = require( '@wikimedia/codex' ).CdxTab,
	CdxTabs = require( '@wikimedia/codex' ).CdxTabs,
	functionAbout = require( './function/FunctionAbout.vue' ),
	functionDetails = require( './function/FunctionDetails.vue' );

// @vue/component
module.exports = exports = {
	name: 'function-viewer',
	components: {
		'function-about': functionAbout,
		'function-details': functionDetails,
		'cdx-tab': CdxTab,
		'cdx-tabs': CdxTabs
	},
	data: function () {
		return {
			currentTab: 'function-about',
			tabsData: [
				{
					name: 'function-about',
					label: this.$i18n( 'wikilambda-editor-fn-step-function-about' ).text()
				},
				{
					name: 'function-details',
					label: this.$i18n( 'wikilambda-editor-fn-step-function-details' ).text()
				}
			]
		};
	}
};
</script>

<style lang="less">
@import './../../lib/wikimedia-ui-base.less';

</style>
