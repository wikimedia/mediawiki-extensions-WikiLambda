<template>
	<div class="ext-wikilambda-tab-container">
		<tab
			v-for="tab in tabs"
			:key="tab.id"
			:status="tab.id === activeTab ? 'active' : 'inactive'"
			:title="tab.title"
			:disabled="tab.disabled"
			:icon="tab.icon"
			@click="selectTab(tab.id)"
		></tab>
	</div>
</template>

<script>
var Tab = require( './Tab.vue' );
module.exports = {
	name: 'tab-container',
	components: {
		tab: Tab
	},
	methods: {
		selectTab: function ( tab ) {
			this.$emit( 'click', tab );
		}
	},
	props: {
		tabs: {
			type: Array
		},
		activeTab: {
			type: String
		}
	}
};
</script>

<style lang="less">
@import '../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-tab-container {
	text-align: center;
	display: flex;
	justify-content: space-evenly;
}
</style>
