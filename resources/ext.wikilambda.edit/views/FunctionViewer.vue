<!--
	WikiLambda Vue component for the special view of a ZFunction object.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-function-viewer">
		<cdx-tabs v-model:active="currentTab" data-testid="function-viewer-tabs">
			<cdx-tab
				v-for="( tab, index ) in tabsData"
				:key="index"
				:name="tab.name"
				:label="tab.label"
				:data-testid="`function-viewer-tab-${index}`"
			>
				<!-- Keep alive helps keeps the local state of the component so that it is not remounted -->
				<keep-alive>
					<component
						:is="tab.name"
						v-if="tab.name === currentTab"
						:name="tab.name"
					></component>
				</keep-alive>
			</cdx-tab>
		</cdx-tabs>
		<div v-if="displaySuccessMessage" class="ext-wikilambda-function-viewer__message">
			<cdx-message
				class="ext-wikilambda-function-viewer__message__success"
				:auto-dismiss="true"
				type="success"
			>
				{{ $i18n( 'wikilambda-publish-successful' ).text() }}
			</cdx-message>
		</div>
	</div>
</template>

<script>
var CdxTab = require( '@wikimedia/codex' ).CdxTab,
	CdxTabs = require( '@wikimedia/codex' ).CdxTabs,
	CdxMessage = require( '@wikimedia/codex' ).CdxMessage,
	FunctionViewerAbout = require( '../components/function/viewer/FunctionViewerAbout.vue' ),
	FunctionViewerDetails = require( '../components/function/viewer/FunctionViewerDetails.vue' );

// @vue/component
module.exports = exports = {
	name: 'wl-function-viewer',
	components: {
		'wl-function-viewer-about': FunctionViewerAbout,
		'wl-function-viewer-details': FunctionViewerDetails,
		'cdx-tab': CdxTab,
		'cdx-tabs': CdxTabs,
		'cdx-message': CdxMessage
	},
	data: function () {
		return {
			currentTab: 'wl-function-viewer-about',
			tabsData: [
				{
					name: 'wl-function-viewer-about',
					label: this.$i18n( 'wikilambda-editor-fn-step-function-about' ).text()
				},
				{
					name: 'wl-function-viewer-details',
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
	},
	mounted: function () {
		this.$emit( 'mounted' );
	}
};
</script>

<style lang="less">
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
