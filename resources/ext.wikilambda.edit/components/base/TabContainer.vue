<template>
	<!--
		WikiLambda Vue component for a container for navigation tabs

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-tab-container">
		<tab
			v-for="tab in tabs"
			:key="tab.id"
			:status="tab.id === activeTab ? 'active' : 'inactive'"
			:title="tab.title"
			:disabled="tab.disabled"
			:icon="tab.icon"
			:tooltip-icon="getTooltipData( tab, 'icon' )"
			:tooltip-header="getTooltipData( tab, 'header' )"
			:tooltip-content="getTooltipData( tab, 'content' )"
			:tooltip-visible="getTooltipData( tab, 'visible' )"
			@click="selectTab( tab.id )"
		></tab>
	</div>
</template>

<script>
var Tab = require( './Tab.vue' );

// @vue/component
module.exports = {
	name: 'tab-container',
	components: {
		tab: Tab
	},
	props: {
		tabs: {
			type: Array,
			required: true
		},
		activeTab: {
			type: String,
			default: ''
		}
	},
	methods: {
		selectTab: function ( tab ) {
			this.$emit( 'click', tab );
		},
		getTooltipData: function ( tab, type ) {
			var value = null;
			if ( tab.tooltip ) {
				switch ( type ) {
					case 'icon':
						value = tab.tooltip.icon;
						break;
					case 'header':
						value = tab.tooltip.header;
						break;
					case 'content':
						value = tab.tooltip.content;
						break;
					case 'visible':
						value = tab.tooltip.visible;
						break;
					default:
						value = null;
						break;
				}
			}
			return value;
		}
	}
};
</script>

<style lang="less">
@import '../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-tab-container {
	text-align: center;
	display: flex;
	padding-left: 3em;
}
</style>
