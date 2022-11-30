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
				<!-- Keep alive helps keeps the local state of the component so that it is not remounted -->
				<keep-alive>
					<component
						:is="tab.name"
						v-if="tab.name === currentTab"
						:name="tab.name">
					</component>
				</keep-alive>
			</cdx-tab>
		</cdx-tabs>
		<div v-if="displaySuccessMessage" class="ext-wikilambda-function-viewer__message">
			<cdx-message class="ext-wikilambda-function-viewer__message__success"
				:auto-dismiss="true" type="success">
				{{ $i18n( 'wikilambda-publish-successful' ).text() }}
			</cdx-message>
		</div>
	</div>
</template>

<script>
var CdxTab = require( '@wikimedia/codex' ).CdxTab,
	CdxTabs = require( '@wikimedia/codex' ).CdxTabs,
	CdxMessage = require( '@wikimedia/codex' ).CdxMessage,
	functionAbout = require( './function/FunctionAbout.vue' ),
	functionDetails = require( './function/FunctionDetails.vue' );

// @vue/component
module.exports = exports = {
	name: 'function-viewer',
	components: {
		'function-about': functionAbout,
		'function-details': functionDetails,
		'cdx-tab': CdxTab,
		'cdx-tabs': CdxTabs,
		'cdx-message': CdxMessage
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
	},
	computed: {
		displaySuccessMessage: function () {
			if ( mw.Uri().query ) {
				return mw.Uri().query.success === 'true';
			}
			return false;
		}
	}
};
</script>

<style lang="less">
@import './../../lib/wikimedia-ui-base.less';

.ext-wikilambda-function-viewer {
	&__message {
		display: flex;
		align-items: center;
		flex-direction: column;
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;

		&__success {
			max-width: 100%;
		}
	}
}

</style>
