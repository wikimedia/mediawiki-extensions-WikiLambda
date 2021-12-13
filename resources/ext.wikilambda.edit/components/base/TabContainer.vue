<template>
	<div class="ext-wikilambda-tab-container">
		<tab
			v-for="( tab, i ) in tabs"
			:key="i"
			:status="tab.status"
			:title="tab.title"
			:disabled="tab.disabled"
			:icon="tab.icon"
			@click="selectTab('function-definition')"
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
		selectTab: function ( tabName ) {
			this.$emit( 'click', tabName );
		}
	},
	props: {
		tabs: {
			type: Array
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
