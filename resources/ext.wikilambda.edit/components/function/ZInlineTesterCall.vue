<template>
	<div class="ext-wikilambda-inline-tester-call">
		<span v-for="argument in zFunctionArguments" :key="argument.key">
			{{ argument.label }}:
			<z-object-key
				:zobject-id="findArgumentId(argument.key)"
				:persistent="false"
				:parent-type="Constants.Z_FUNCTION_CALL"
				:z-key="argument.key"
			></z-object-key>
		</span>
	</div>
</template>

<script>
var ZFunctionCall = require( '../types/ZFunctionCall.vue' );

module.exports = {
	extends: ZFunctionCall
};
</script>

<style lang="less">
.ext-wikilambda-inline-tester-call {
	display: inline;
}
</style>
