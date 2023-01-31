<template>
	<!--
		WikiLambda Vue component for inline callers for ZTester objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-inline-tester-call">
		<span v-for="argument in zFunctionArguments" :key="argument.key">
			{{ argument.label }}:
			<!--
				ZInlineTesterCall -> ZObjectKey -> ZObject -> ZFunction -> ZTesterList ->
				ZTesterAdHoc -> ZInlinetesterCall
			-->
			<!-- eslint-disable-next-line vue/no-unregistered-components -->
			<wl-z-object-key
				:zobject-id="findArgumentId( argument.key )"
				:persistent="false"
				:parent-type="Constants.Z_FUNCTION_CALL"
				:z-key="argument.key"
			></wl-z-object-key>
		</span>
	</div>
</template>

<script>
var ZFunctionCall = require( '../main-types/ZFunctionCall.vue' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-z-inline-tester-call',
	extends: ZFunctionCall,
	provide: function () {
		return {
			viewmode: this.getViewMode
		};
	},
	computed: mapGetters( [ 'getViewMode' ] )
};
</script>

<style lang="less">
.ext-wikilambda-inline-tester-call {
	display: inline;
}
</style>
