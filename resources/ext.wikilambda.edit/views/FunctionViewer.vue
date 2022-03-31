<template>
	<!--
		WikiLambda Vue component for the special view of a ZFunction object.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<div class="ext-wikilambda-function-viewer-navbar">
			<tab-container
				:tabs="getVisibleTabs"
				:active-tab="getCurrentView"
				@click="selectTab"
			>
			</tab-container>
		</div>
		<div class="ext-wikilambda-function-viewer ext-wikilambda-function-viewer__two-cols">
			<main class="ext-wikilambda-function-viewer__content">
				<component :is="currentTab"></component>
			</main>
			<aside
				class="ext-wikilambda-function-viewer__sidebar"
				:aria-label="$i18n( 'wikilambda-editor-additional-details-label' ).text()">
			</aside>
		</div>
	</div>
</template>

<script>
var TabContainer = require( '../components/base/TabContainer.vue' ),
	functionAbout = require( './function/FunctionAbout.vue' ),
	functionDetails = require( './function/FunctionDetails.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	cdxIcons = require( '../../lib/icons.json' );

// @vue/component
module.exports = exports = {
	name: 'function-viewer',
	components: {
		'tab-container': TabContainer,
		'function-about': functionAbout,
		'function-details': functionDetails
	},
	data: function () {
		return {
			currentTab: 'function-about'
		};
	},
	computed: $.extend( {},
		mapGetters( 'router', [ 'getCurrentView' ] ),
		{
			getVisibleTabs: function () {
				var tabs = [
					{
						status: 'active',
						id: 'function-about', // used for routing
						title: this.$i18n( 'wikilambda-editor-fn-step-function-about' ).text(),
						disabled: false, // this should be computed
						icon: cdxIcons.cdxIconCheck
					},
					{
						status: 'active',
						id: 'function-details', // used for routing
						title: this.$i18n( 'wikilambda-editor-fn-step-function-details' ).text(),
						disabled: false, // this should be computed
						icon: cdxIcons.cdxIconCheck
					}
				];

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

.ext-wikilambda-function-viewer {
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
