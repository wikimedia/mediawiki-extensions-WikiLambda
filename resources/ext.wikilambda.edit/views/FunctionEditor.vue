<template>
	<!--
		WikiLambda Vue component for the special view of a ZFunction object.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-editor">
		<div class="ext-wikilambda-function-editor__main">
			<main class="ext-wikilambda-function-editor__main__content">
				<function-definition></function-definition>
			</main>
		</div>
	</div>
</template>

<script>
var functionDefinition = require( './function/FunctionDefinition.vue' );

// @vue/component
module.exports = exports = {
	name: 'function-editor',
	components: {
		'function-definition': functionDefinition
	},
	mounted: function () {
		this.$emit( 'mounted' );
	}
};
</script>

<style lang="less">
@import './../../lib/wikimedia-ui-base.less';
@import './../../lib/sd-base-variables.less';

.ext-wikilambda-function-editor {
	&__main {
		&__content {
			width: 100%;
		}
	}
}
</style>
