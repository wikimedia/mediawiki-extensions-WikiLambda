<template>
	<!--
		WikiLambda Vue component for the definition tab in the ZFunction Editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<main class="ext-wikilambda-function-definition">
		<function-definition-name></function-definition-name>
		<function-definition-aliases></function-definition-aliases>
		<function-definition-inputs></function-definition-inputs>
		<function-definition-output></function-definition-output>
	</main>
</template>

<script>
var FunctionDefinitionName = require( '../components/function/definition/function-definition-name.vue' );
var FunctionDefinitionAliases = require( '../components/function/definition/function-definition-aliases.vue' );
var FunctionDefinitionInputs = require( '../components/function/definition/function-definition-inputs.vue' );
var FunctionDefinitionOutput = require( '../components/function/definition/function-definition-output.vue' );

// @vue/component
module.exports = {
	name: 'FunctionDefinition',
	components: {
		'function-definition-name': FunctionDefinitionName,
		'function-definition-aliases': FunctionDefinitionAliases,
		'function-definition-inputs': FunctionDefinitionInputs,
		'function-definition-output': FunctionDefinitionOutput
	}
};

</script>

<style lang="less">
@import './../../lib/wikimedia-ui-base.less';

.ext-wikilambda-function-definition {
	padding-top: 20px;
	padding-left: 27px;
	border: 1px solid @wmui-color-base80;
	min-height: 450px;
}
</style>
